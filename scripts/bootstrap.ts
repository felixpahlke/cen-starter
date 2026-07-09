import { execFileSync, spawnSync } from "node:child_process";
import { constants } from "node:fs";
import { copyFile, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createInterface } from "node:readline/promises";

// Post-clone bootstrap (run as `pnpm bootstrap`, or by create-cen-app). One-time by design:
// refuses to run twice and is deleted by `pnpm flavor finalize`.
// ("setup" would shadow pnpm's own builtin `pnpm setup` command — don't rename it back.)
// Usage: pnpm bootstrap [--name <project-name>] [--flavors <a,b|none>]

const root = path.resolve(import.meta.dirname, "..");

const args = process.argv.slice(2);
function flag(name: string) {
  const index = args.indexOf(`--${name}`);
  return index !== -1 ? args[index + 1] : undefined;
}

function fail(message: string): never {
  console.error(`\n✗ ${message}`);
  process.exit(1);
}

function run(command: string, argv: string[], opts: { allowFail?: boolean } = {}) {
  const result = spawnSync(command, argv, { cwd: root, stdio: "inherit" });
  if (result.status !== 0 && !opts.allowFail) fail(`${command} ${argv.join(" ")} failed.`);
  return result.status === 0;
}

function tryGit(argv: string[]) {
  try {
    return execFileSync("git", argv, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    return null;
  }
}

async function main() {
  // --- refuse to run twice -----------------------------------------------
  const pkgPath = path.join(root, "package.json");
  const pkg = JSON.parse(await readFile(pkgPath, "utf8"));
  if (pkg.cen?.finalized) fail("This project is finalized — setup no longer applies.");
  if (pkg.cen?.bootstrapped) fail("Bootstrap already ran here. Continue with `pnpm dev`.");

  // --- preflight ----------------------------------------------------------
  const major = Number(process.versions.node.split(".")[0]);
  if (major < 22) fail(`Node ≥ 22 required (found ${process.versions.node}). Use nvm or mise.`);
  if (spawnSync("pnpm", ["--version"], { stdio: "ignore" }).status !== 0) {
    fail("pnpm not found. Enable it with `corepack enable` and re-run.");
  }
  const dockerUp = spawnSync("docker", ["info"], { stdio: "ignore" }).status === 0;
  if (!dockerUp) {
    console.warn(
      "⚠ Docker is not running. The default stack needs it for the dev database — start it\n" +
        "  before `pnpm dev` (not needed if you apply the no-database flavor).",
    );
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  // --- project name -------------------------------------------------------
  let name = flag("name");
  if (!name) {
    const answer = await rl.question(`Project name [${path.basename(root)}]: `);
    name = answer.trim() || path.basename(root);
  }
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(name)) {
    fail(`"${name}" is not a valid package name (lowercase letters, digits, ".", "_", "-").`);
  }

  pkg.name = name;
  const composePath = path.join(root, "docker-compose.yml");
  try {
    const compose = await readFile(composePath, "utf8");
    await writeFile(composePath, compose.replace(/^name: .*$/m, `name: ${name}`));
  } catch {
    // no compose file (flavored away) — fine
  }

  // --- remotes: template stays reachable as `upstream` ---------------------
  const origin = tryGit(["remote", "get-url", "origin"]);
  if (origin && tryGit(["remote", "get-url", "upstream"]) === null) {
    tryGit(["remote", "rename", "origin", "upstream"]);
    console.log(`✓ Renamed remote origin → upstream (template updates stay pullable);`);
    console.log("  add your project's own repo as origin when you have one.");
  }

  // --- flavors (optional here; the agent-guided interview is the main path) -
  const flavorsArg = flag("flavors");
  let chosen: string[] = [];
  try {
    const entries = await readdir(path.join(root, "flavors"), { withFileTypes: true });
    const available = entries.filter((e) => e.isDirectory()).map((e) => e.name);
    if (flavorsArg !== undefined) {
      chosen = flavorsArg === "none" ? [] : flavorsArg.split(",").map((f) => f.trim());
      const unknown = chosen.filter((f) => !available.includes(f));
      if (unknown.length)
        fail(`Unknown flavor(s): ${unknown.join(", ")}. Available: ${available.join(", ")}`);
    } else if (available.length) {
      console.log(`\nAvailable flavors: ${available.join(", ")}`);
      console.log("Tip: skip this and let your AI agent walk you through it (it reads");
      console.log(".agents/skills/setup/) — or answer with a comma-separated list.");
      const answer = await rl.question("Apply flavors now? [none]: ");
      chosen =
        answer.trim() && answer.trim() !== "none" ? answer.split(",").map((f) => f.trim()) : [];
    }
  } catch {
    // flavors/ gone — nothing to offer
  }

  rl.close();

  await writeFile(
    pkgPath,
    `${JSON.stringify({ ...pkg, cen: { ...pkg.cen, bootstrapped: true } }, null, 2)}\n`,
  );
  console.log(`✓ Project renamed to "${name}"`);

  for (const flavor of chosen) {
    console.log(`\nApplying flavor: ${flavor}`);
    run("pnpm", ["flavor", "apply", flavor]);
  }

  // --- .env ----------------------------------------------------------------
  try {
    await copyFile(
      path.join(root, ".env.example"),
      path.join(root, ".env"),
      constants.COPYFILE_EXCL,
    );
    console.log("✓ Created .env from .env.example");
  } catch {
    console.log("• .env already exists — left untouched");
  }

  // --- done -----------------------------------------------------------------
  console.log(`
Next steps:
  pnpm dev          # database + api + web, hot reload
  http://localhost:5173

Working with an AI agent? Point it at this repo — AGENTS.md tells it everything,
including how to finish configuration (flavors) and add your first resource.`);
}

main();
