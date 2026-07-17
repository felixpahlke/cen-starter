import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";

type FlavorManifest = {
  name: string;
  combinesWith?: string[];
};

const root = process.cwd();
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const ignoredDirectories = new Set([".git", ".codex", "coverage", "dist", "node_modules"]);
const ignoredFiles = new Set([".env", ".env.production"]);

async function main() {
  const variants = await flavorVariants();
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "cen-flavor-check-"));
  let failed = false;

  try {
    for (const names of variants) {
      const label = names.length ? names.join(" + ") : "base";
      const workspace = path.join(temporaryRoot, names.length ? names.join("--") : "cen-starter");
      console.log(`\n=== Verifying ${label} ===`);
      await copySource(workspace);

      try {
        run("git", ["init", "--quiet"], workspace);
        run("git", ["config", "user.name", "CEN Flavor Check"], workspace);
        run("git", ["config", "user.email", "flavor-check@local"], workspace);
        commit(workspace, "Pristine template");
        run(pnpm, ["install", "--frozen-lockfile"], workspace);
        if (!names.length) {
          expectFailure(
            pnpm,
            ["flavor", "finalize"],
            workspace,
            "Refusing to finalize before `pnpm bootstrap`",
          );
          expectFailure(
            pnpm,
            ["bootstrap", "--flavors", "none"],
            workspace,
            "Choose a project name",
            "\n",
          );
          expectFailure(pnpm, ["db:generate"], workspace, "setup mode");
        }

        run(
          pnpm,
          [
            "bootstrap",
            "--name",
            names.length ? `flavor-check-${label.replaceAll(" + ", "-")}` : "cen-starter",
            "--flavors",
            names.length ? names.join(",") : "none",
          ],
          workspace,
        );
        const stagedSkills = await skillNames(path.join(workspace, "scaffold/agent-skills"));
        if (!stagedSkills.length)
          throw new Error(`${label} left no post-setup skills to activate.`);

        run(pnpm, ["verify"], workspace);
        commit(workspace, `Configure ${label}`);
        run(pnpm, ["flavor", "finalize"], workspace);
        await assertFinalized(workspace, stagedSkills);
      } catch (error) {
        failed = true;
        console.error(`Failed workspace retained at ${workspace}`);
        throw error;
      }

      await rm(workspace, { recursive: true, force: true });
    }
  } finally {
    if (!failed) await rm(temporaryRoot, { recursive: true, force: true });
  }

  console.log(`\nVerified ${variants.length} flavor variants.`);
}

async function flavorVariants() {
  const available = await readManifests();
  const names = new Set(available.map((manifest) => manifest.name));
  const variants = [[], ...available.map((manifest) => [manifest.name])];

  for (const manifest of available) {
    for (const combined of manifest.combinesWith ?? []) {
      if (!names.has(combined)) {
        throw new Error(`Flavor "${manifest.name}" combines with unknown flavor "${combined}".`);
      }
      variants.push([combined, manifest.name]);
    }
  }

  return variants;
}

async function skillNames(directory: string) {
  const entries = await readdir(directory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

async function assertFinalized(workspace: string, stagedSkills: string[]) {
  for (const relative of [
    "flavors",
    "scaffold",
    ".agents/skills/setup",
    ".agents/skills/template-maintenance",
    "scripts/guard-setup.mjs",
  ]) {
    if (await exists(path.join(workspace, relative))) {
      throw new Error(`Finalization did not remove ${relative}.`);
    }
  }

  for (const skill of stagedSkills) {
    if (!(await exists(path.join(workspace, ".agents/skills", skill, "SKILL.md")))) {
      throw new Error(`Finalization did not activate skill "${skill}".`);
    }
    if (await exists(path.join(workspace, ".agents/skills", skill, "SKILL.staged.md"))) {
      throw new Error(`Finalization left skill "${skill}" staged as SKILL.staged.md.`);
    }
  }

  const agents = await readFile(path.join(workspace, "AGENTS.md"), "utf8");
  if (agents.includes("not set up yet")) {
    throw new Error("Finalization did not install the project AGENTS.md.");
  }

  const pkg = JSON.parse(await readFile(path.join(workspace, "package.json"), "utf8"));
  if (pkg.cen?.bootstrapped !== true || pkg.cen?.finalized !== true) {
    throw new Error("Finalization did not persist the bootstrap/finalized markers.");
  }
}

async function readManifests() {
  const flavorsDirectory = path.join(root, "flavors");
  const entries = await readdir(flavorsDirectory, { withFileTypes: true });
  const directories = entries
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));

  return Promise.all(
    directories.map(async (directory): Promise<FlavorManifest> => {
      const file = path.join(flavorsDirectory, directory.name, "manifest.json");
      const manifest = JSON.parse(await readFile(file, "utf8")) as FlavorManifest;
      if (manifest.name !== directory.name) {
        throw new Error(`Manifest name "${manifest.name}" must match flavors/${directory.name}.`);
      }
      if (
        manifest.combinesWith !== undefined &&
        (!Array.isArray(manifest.combinesWith) ||
          !manifest.combinesWith.every((name) => typeof name === "string"))
      ) {
        throw new Error(`Manifest combinesWith must be a string array: ${file}`);
      }
      return manifest;
    }),
  );
}

async function copySource(target: string) {
  await cp(root, target, {
    recursive: true,
    filter(source) {
      const relative = path.relative(root, source);
      if (!relative) return true;
      const parts = relative.split(path.sep);
      if (parts.some((part) => ignoredDirectories.has(part))) return false;
      if (parts.length === 1 && ignoredFiles.has(relative)) return false;
      return !relative.endsWith(".local");
    },
  });
}

function run(command: string, args: string[], cwd: string) {
  const result = spawnSync(command, args, {
    cwd,
    env: { ...process.env, CI: "true" },
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}.`);
  }
}

function expectFailure(
  command: string,
  args: string[],
  cwd: string,
  expected: string,
  input?: string,
) {
  const result = spawnSync(command, args, {
    cwd,
    env: { ...process.env, CI: "true" },
    encoding: "utf8",
    input,
  });
  if (result.error) throw result.error;
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  if (result.status === 0 || !output.includes(expected)) {
    throw new Error(
      `${command} ${args.join(" ")} should fail with ${JSON.stringify(expected)}.\n${output}`,
    );
  }
}

function commit(cwd: string, message: string) {
  run("git", ["add", "-A"], cwd);
  run("git", ["commit", "--quiet", "--no-verify", "-m", message], cwd);
}

async function exists(file: string) {
  return stat(file)
    .then(() => true)
    .catch(() => false);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
