import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readdir, readFile, rm } from "node:fs/promises";
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
      const label = names.join(" + ");
      const workspace = path.join(temporaryRoot, names.join("--"));
      console.log(`\n=== Verifying ${label} ===`);
      await copySource(workspace);

      try {
        run("git", ["init", "--quiet"], workspace);
        run(pnpm, ["install", "--frozen-lockfile"], workspace);
        run(pnpm, ["flavor", "apply", ...names], workspace);
        run(pnpm, ["build"], workspace);
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
  const variants = available.map((manifest) => [manifest.name]);

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

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
