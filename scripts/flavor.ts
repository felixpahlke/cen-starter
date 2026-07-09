import { execFileSync, spawnSync } from "node:child_process";
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { z } from "zod";

const FindEdit = z
  .object({ file: z.string().min(1), find: z.string().min(1), replace: z.string() })
  .strict();
const YamlEdit = z.object({ file: z.string().min(1), removeYamlKey: z.string().min(1) }).strict();
const ManifestSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().min(1),
    conflicts: z.array(z.string()),
    requires: z.array(z.string()),
    delete: z.array(z.string()),
    overlay: z.string().min(1).optional(),
    edits: z.array(z.union([FindEdit, YamlEdit])).optional(),
    packageJson: z
      .record(
        z.string(),
        z
          .object({
            add: z.record(z.string(), z.string()).optional(),
            remove: z.array(z.string()).optional(),
          })
          .strict(),
      )
      .optional(),
    verify: z.array(z.string()),
  })
  .strict();

type JsonObject = Record<string, unknown>;
type Manifest = z.infer<typeof ManifestSchema>;
type Edit = NonNullable<Manifest["edits"]>[number];
type PackagePatches = NonNullable<Manifest["packageJson"]>;

const root = process.cwd();
const flavorsDir = path.join(root, "flavors");
const skippedDirs = new Set([".git", "node_modules"]);

async function main() {
  const [command, name] = process.argv.slice(2);
  if (command === "list") return list();
  if (command === "apply" && name) return apply(name);
  if (command === "finalize") return finalize();
  throw new Error("Usage: pnpm flavor list | pnpm flavor apply <name> | pnpm flavor finalize");
}

async function list() {
  const applied = getCen(await readJson("package.json")).flavors;
  for (const manifest of await allManifests()) {
    const marker = applied.includes(manifest.name) ? " (applied)" : "";
    console.log(`${manifest.name}${marker} - ${manifest.description}`);
  }
}

async function apply(name: string) {
  const manifest = await readManifest(name);
  const cen = getCen(await readJson("package.json"));
  if (cen.finalized) throw new Error("Refusing to apply a flavor after cen.finalized is true.");
  if (cen.flavors.includes(name)) throw new Error(`Flavor "${name}" is already applied.`);
  for (const required of manifest.requires) {
    if (!cen.flavors.includes(required))
      throw new Error(`Flavor "${name}" requires "${required}".`);
  }
  for (const conflict of manifest.conflicts) {
    if (cen.flavors.includes(conflict)) {
      throw new Error(`Flavor "${name}" conflicts with "${conflict}".`);
    }
  }
  for (const applied of await appliedManifests(cen.flavors)) {
    if (applied.conflicts.includes(name)) {
      throw new Error(`Flavor "${name}" conflicts with already-applied "${applied.name}".`);
    }
  }

  const deletes = await resolveDeletes(manifest.delete);
  const overlay = await validateOverlay(name, manifest.overlay);
  await validateEdits(manifest.edits ?? []);
  const packages = await validatePackagePatches(manifest.packageJson ?? {});

  for (const target of deletes) await rm(abs(target), { recursive: true, force: true });
  if (overlay) await copyOverlay(overlay, root);
  await applyEdits(manifest.edits ?? []);
  await applyPackagePatches(manifest.packageJson ?? {}, packages);
  await recordFlavor(name);

  try {
    run("pnpm install --no-frozen-lockfile");
    for (const command of manifest.verify) run(command);
  } catch (error) {
    console.error(
      `Flavor "${name}" was applied, but install or verification failed. ` +
        'Inspect the tree, or reset with "git checkout . && git clean -fd".',
    );
    throw error;
  }
}

async function finalize() {
  const status = execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" });
  if (status.trim()) throw new Error("Refusing to finalize with a dirty git working tree.");

  const hadSetup = await exists(abs("scripts/setup.ts"));
  await rm(abs("flavors"), { recursive: true, force: true });
  await rm(abs("scripts/flavor.ts"), { force: true });
  if (hadSetup) await rm(abs("scripts/setup.ts"), { force: true });

  const pkg = await readJson("package.json");
  delete objectAt(pkg, "scripts").flavor;
  if (hadSetup) delete objectAt(pkg, "scripts").setup;
  objectAt(pkg, "cen").finalized = true;
  await writeJson("package.json", pkg);
  await removeEmptyScriptsDir();
}

async function allManifests() {
  if (!(await exists(flavorsDir))) return [];
  const entries = await readdir(flavorsDir, { withFileTypes: true });
  const manifests = await Promise.all(
    entries.filter((entry) => entry.isDirectory()).map((entry) => readManifest(entry.name)),
  );
  return manifests.sort((left, right) => left.name.localeCompare(right.name));
}

async function appliedManifests(names: string[]) {
  const manifests: Manifest[] = [];
  for (const name of names) {
    if (await exists(path.join(flavorsDir, name, "manifest.json"))) {
      manifests.push(await readManifest(name));
    }
  }
  return manifests;
}

async function readManifest(name: string) {
  const manifest = ManifestSchema.parse(
    await readJson(path.join(flavorsDir, name, "manifest.json")),
  );
  if (manifest.name !== name) {
    throw new Error(`Manifest name "${manifest.name}" must match flavors/${name}.`);
  }
  return manifest;
}

async function resolveDeletes(patterns: string[]) {
  const paths = await repoPaths();
  const targets = new Set<string>();
  for (const pattern of patterns) {
    const safePattern = safe(pattern);
    const matcher = globRegExp(safePattern);
    const matches = new Set(paths.filter((candidate) => matcher.test(candidate)));
    if (safePattern.endsWith("/**")) {
      const base = safePattern.slice(0, -3).replace(/\/$/, "");
      if (base && (await exists(abs(base)))) matches.add(base);
    }
    if (!matches.size) throw new Error(`Delete pattern matched nothing: ${pattern}`);
    for (const match of matches) targets.add(match);
  }
  return [...targets].sort((left, right) => left.length - right.length);
}

async function validateOverlay(name: string, overlay?: string) {
  if (!overlay) return null;
  const source = path.join(flavorsDir, name, safe(overlay));
  const info = await stat(source).catch(() => null);
  if (!info?.isDirectory()) throw new Error(`Overlay must be a directory: ${overlay}`);
  await rejectSymlinks(source);
  return source;
}

async function validateEdits(edits: Edit[]) {
  for (const edit of edits) {
    const text = await readFile(abs(edit.file), "utf8");
    if ("find" in edit) {
      const count = occurrences(text, edit.find);
      if (count !== 1) {
        throw new Error(
          `Edit anchor in ${edit.file} matched ${count} times; expected exactly once.`,
        );
      }
    } else if (!yamlRange(text.split("\n"), edit.removeYamlKey.split("."))) {
      throw new Error(`YAML key "${edit.removeYamlKey}" was not found in ${edit.file}.`);
    }
  }
}

async function validatePackagePatches(patches: PackagePatches) {
  const packages = await workspacePackages();
  for (const name of Object.keys(patches)) {
    if (!packages.has(name)) throw new Error(`Workspace package not found: ${name}`);
  }
  return packages;
}

async function applyEdits(edits: Edit[]) {
  for (const edit of edits) {
    const file = abs(edit.file);
    const text = await readFile(file, "utf8");
    if ("find" in edit) {
      await writeFile(file, text.replace(edit.find, edit.replace));
      continue;
    }
    const next = removeYamlKey(text, edit.removeYamlKey.split("."));
    if (next === null) throw new Error(`YAML key "${edit.removeYamlKey}" was not found.`);
    await writeFile(file, next);
  }
}

async function applyPackagePatches(patches: PackagePatches, packages: Map<string, string>) {
  for (const [name, patch] of Object.entries(patches)) {
    const file = packages.get(name);
    if (!file) throw new Error(`Workspace package not found: ${name}`);
    const pkg = await readJson(file);
    for (const dependency of patch.remove ?? []) removeDependency(pkg, dependency);
    const additions = patch.add ?? {};
    if (Object.keys(additions).length) Object.assign(objectAt(pkg, "dependencies"), additions);
    await writeJson(file, pkg);
  }
}

async function workspacePackages() {
  const packages = new Map<string, string>();
  for (const file of await packageFiles("")) {
    const pkg = await readJson(file);
    if (typeof pkg.name === "string") packages.set(pkg.name, absolute(file));
  }
  return packages;
}

async function packageFiles(relativeDir: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(abs(relativeDir), { withFileTypes: true })) {
    const relative = posix(path.join(relativeDir, entry.name));
    if (entry.isDirectory() && !skippedDirs.has(entry.name) && entry.name !== "flavors") {
      files.push(...(await packageFiles(relative)));
    } else if (entry.isFile() && entry.name === "package.json") {
      files.push(relative);
    }
  }
  return files;
}

async function recordFlavor(name: string) {
  const pkg = await readJson("package.json");
  getCen(pkg).flavors.push(name);
  await writeJson("package.json", pkg);
}

function getCen(pkg: JsonObject) {
  const cen = objectAt(pkg, "cen");
  const flavors = cen.flavors;
  if (!Array.isArray(flavors) || !flavors.every((flavor) => typeof flavor === "string")) {
    throw new Error('package.json field "cen.flavors" must be a string array.');
  }
  if (typeof cen.finalized !== "boolean") {
    throw new Error('package.json field "cen.finalized" must be a boolean.');
  }
  return { flavors, finalized: cen.finalized };
}

function removeDependency(pkg: JsonObject, dependency: string) {
  for (const key of [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "peerDependencies",
  ]) {
    const section = pkg[key];
    if (isObject(section)) delete section[dependency];
  }
}

async function repoPaths(relativeDir = ""): Promise<string[]> {
  const paths: string[] = [];
  for (const entry of await readdir(abs(relativeDir), { withFileTypes: true })) {
    if (skippedDirs.has(entry.name)) continue;
    const relative = posix(path.join(relativeDir, entry.name));
    paths.push(relative);
    if (entry.isDirectory()) paths.push(...(await repoPaths(relative)));
  }
  return paths;
}

async function rejectSymlinks(directory: string) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new Error(`Overlay contains a symlink: ${entry.name}`);
    if (entry.isDirectory()) await rejectSymlinks(path.join(directory, entry.name));
  }
}

async function copyOverlay(source: string, target: string) {
  const info = await stat(source);
  if (info.isDirectory()) {
    await mkdir(target, { recursive: true });
    for (const entry of await readdir(source)) {
      await copyOverlay(path.join(source, entry), path.join(target, entry));
    }
    return;
  }

  if (!/\.(ts|tsx)$/.test(source)) {
    await cp(source, target, { force: true });
    return;
  }

  await writeFile(target, stripOverlayTsNoCheck(await readFile(source, "utf8")));
}

function stripOverlayTsNoCheck(text: string) {
  const newline = text.indexOf("\n");
  const firstLine = newline === -1 ? text : text.slice(0, newline);
  if (!firstLine.startsWith("// @ts-nocheck")) return text;
  return newline === -1 ? "" : text.slice(newline + 1);
}

function removeYamlKey(text: string, keyPath: string[]) {
  const finalNewline = text.endsWith("\n");
  const lines = text.split("\n");
  if (finalNewline) lines.pop();
  const range = yamlRange(lines, keyPath);
  if (!range) return null;
  lines.splice(range.start, range.end - range.start);
  return `${lines.join("\n")}${finalNewline ? "\n" : ""}`;
}

function yamlRange(lines: string[], keyPath: string[]) {
  let start = 0;
  let end = lines.length;
  let parentIndent = -1;
  let found: { start: number; end: number } | null = null;
  for (const key of keyPath.filter(Boolean)) {
    const indent = parentIndent < 0 ? 0 : childIndent(lines, start, end, parentIndent);
    if (indent === null) return null;
    const keyLine = findYamlKey(lines, start, end, indent, key);
    if (keyLine === null) return null;
    found = { start: keyLine, end: yamlBlockEnd(lines, keyLine, end, indent) };
    start = keyLine + 1;
    end = found.end;
    parentIndent = indent;
  }
  return found;
}

function childIndent(lines: string[], start: number, end: number, parentIndent: number) {
  let indent: number | null = null;
  for (let index = start; index < end; index += 1) {
    const current = yamlIndent(lines[index] ?? "");
    if (current !== null && current > parentIndent) indent = Math.min(indent ?? current, current);
  }
  return indent;
}

function findYamlKey(lines: string[], start: number, end: number, indent: number, key: string) {
  const pattern = new RegExp(`^ {${indent}}${escapeRegExp(key)}\\s*:`);
  for (let index = start; index < end; index += 1) {
    if (pattern.test(lines[index] ?? "")) return index;
  }
  return null;
}

function yamlBlockEnd(lines: string[], start: number, limit: number, indent: number) {
  for (let index = start + 1; index < limit; index += 1) {
    const current = yamlIndent(lines[index] ?? "");
    if (current !== null && current <= indent) return index;
  }
  return limit;
}

function yamlIndent(line: string) {
  if (!line.trim() || line.trimStart().startsWith("#")) return null;
  return line.match(/^ */)?.[0].length ?? 0;
}

async function readJson(file: string): Promise<JsonObject> {
  const parsed = JSON.parse(await readFile(absolute(file), "utf8")) as unknown;
  if (!isObject(parsed)) throw new Error(`Expected JSON object in ${file}`);
  return parsed;
}

async function writeJson(file: string, value: JsonObject) {
  await writeFile(absolute(file), `${JSON.stringify(value, null, 2)}\n`);
}

function objectAt(parent: JsonObject, key: string) {
  if (isObject(parent[key])) return parent[key];
  const created: JsonObject = {};
  parent[key] = created;
  return created;
}

function globRegExp(pattern: string) {
  let source = "^";
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    if (char === "*" && pattern[index + 1] === "*") {
      source += ".*";
      index += 1;
    } else if (char === "*") source += "[^/]*";
    else if (char === "?") source += "[^/]";
    else source += escapeRegExp(char ?? "");
  }
  return new RegExp(`${source}$`);
}

function safe(value: string) {
  const normalized = value.replaceAll("\\", "/").replace(/^\.\//, "");
  const parts = normalized.split("/");
  if (
    !normalized ||
    normalized.startsWith("/") ||
    parts.includes("..") ||
    normalized.includes("\0")
  ) {
    throw new Error(`Unsafe relative path: ${value}`);
  }
  return normalized;
}

function abs(relative: string) {
  return path.join(root, safe(relative || "."));
}

function absolute(file: string) {
  return path.isAbsolute(file) ? file : abs(file);
}

function posix(file: string) {
  return file.split(path.sep).join("/");
}

function escapeRegExp(value: string) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

function occurrences(text: string, find: string) {
  return text.split(find).length - 1;
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function exists(file: string) {
  return stat(file)
    .then(() => true)
    .catch(() => false);
}

async function removeEmptyScriptsDir() {
  const scripts = abs("scripts");
  try {
    if (!(await readdir(scripts)).length) await rm(scripts, { recursive: true });
  } catch {
    return;
  }
}

function run(command: string) {
  const result = spawnSync(command, { cwd: root, shell: true, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`Command failed: ${command}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
