import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { connect } from "node:net";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

try {
  process.loadEnvFile(path.join(root, ".env"));
} catch {
  fail("Missing or unreadable .env. Run `pnpm bootstrap` or copy .env.example first.");
}

const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
if (pkg.cen?.finalized === false) {
  console.warn(
    "⚠ setup mode: this template is not finalized. Booting to verify setup is fine, but do not\n" +
      "  build features yet — follow .agents/skills/setup/SKILL.md through finalization.",
  );
}
const flavors = new Set(pkg.cen?.flavors ?? []);
const ports = [
  ...(!flavors.has("no-database") ? [port("DB_PORT", "PostgreSQL", 5432, "db")] : []),
  port("API_PORT", "API", 3000),
  ...(!flavors.has("backend-only") ? [port("WEB_PORT", "web app", 5173)] : []),
  ...(flavors.has("oauth-proxy")
    ? [
        port("DEX_PORT", "Dex", 5556, "dex"),
        port("OAUTH_PROXY_PORT", "OAuth proxy", 4180, "oauth2-proxy"),
      ]
    : []),
];

const duplicates = Map.groupBy(ports, ({ value }) => value);
const overlaps = [...duplicates].filter(([, entries]) => entries.length > 1);
if (overlaps.length) {
  fail(
    `Configured ports overlap:\n${overlaps
      .map(([value, entries]) => `- ${value}: ${entries.map(({ env }) => env).join(", ")}`)
      .join("\n")}`,
  );
}

if (!flavors.has("no-database")) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) fail("DATABASE_URL is required.");
  const databasePort = Number(new URL(databaseUrl).port || "5432");
  const configuredPort = ports.find(({ env }) => env === "DB_PORT").value;
  if (databasePort !== configuredPort) {
    fail(`DB_PORT=${configuredPort} does not match DATABASE_URL port ${databasePort}.`);
  }
}

const published = dockerPublishedPorts();
const availability = await Promise.all(
  ports.map(async (entry) => {
    if (ownsPort(entry)) return { ...entry, available: true };
    const container = published.get(entry.value);
    if (container) return { ...entry, available: false, culprit: `container ${container}` };
    return { ...entry, available: await isFree(entry.value) };
  }),
);
const conflicts = availability.filter(({ available }) => !available);
if (conflicts.length) {
  fail(
    `Local ports are occupied:\n${conflicts
      .map(
        ({ env, label, value, culprit }) =>
          `- ${env}=${value} (${label})${culprit ? ` — published by ${culprit}` : ""}`,
      )
      .join("\n")}\nUpdate all affected values in .env, then run pnpm dev again.`,
  );
}

console.log(
  `local ports ready: ${ports.map(({ label, value }) => `${label} ${value}`).join(", ")}`,
);

function port(env, label, fallback, composeService) {
  const raw = process.env[env] || String(fallback);
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    fail(`${env} must be an integer between 1 and 65535 (received ${JSON.stringify(raw)}).`);
  }
  return { env, label, value, composeService, containerPort: fallback };
}

function ownsPort({ value, composeService, containerPort }) {
  if (!composeService) return false;
  const result = spawnSync("docker", ["compose", "port", composeService, String(containerPort)], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return (
    result.status === 0 &&
    result.stdout
      .trim()
      .split("\n")
      .some((address) => Number(address.slice(address.lastIndexOf(":") + 1)) === value)
  );
}

// Ports published by any running container, so conflicts can name the culprit. A bind
// probe alone is not enough: on macOS SO_REUSEADDR lets 127.0.0.1 bind while Docker's
// proxy holds 0.0.0.0 on the same port.
function dockerPublishedPorts() {
  const result = spawnSync("docker", ["ps", "--format", "{{.Names}}\t{{.Ports}}"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  const map = new Map();
  if (result.status !== 0) return map;
  for (const line of result.stdout.trim().split("\n")) {
    const [name, portList = ""] = line.split("\t");
    for (const match of portList.matchAll(/:(\d+)->/g)) map.set(Number(match[1]), name);
  }
  return map;
}

// Probe by connecting, not binding: anything listening on the port answers regardless of
// which interface it bound.
function isFree(value) {
  return new Promise((resolve) => {
    const socket = connect({ host: "127.0.0.1", port: value });
    socket.unref();
    socket.once("connect", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", (error) => resolve(error.code === "ECONNREFUSED"));
  });
}

function fail(message) {
  console.error(`\n✗ ${message}`);
  process.exit(1);
}
