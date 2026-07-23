const { spawnSync } = require("node:child_process");

const engines = ["docker", "podman"];

function resolveContainerEngine({ env = process.env, probe = commandWorks, required = true } = {}) {
  const requested = env.CEN_CONTAINER_ENGINE?.trim().toLowerCase() || "auto";
  if (requested !== "auto" && !engines.includes(requested)) {
    throw new Error("CEN_CONTAINER_ENGINE must be auto, docker, or podman.");
  }

  const candidates = requested === "auto" ? engines : [requested];
  for (const engine of candidates) {
    if (probe(engine, ["info"]) && probe(engine, ["compose", "version"])) return engine;
  }

  if (!required) return undefined;
  const choice = requested === "auto" ? "Docker or Podman" : requested;
  throw new Error(
    `${choice} is not ready. Start its runtime and ensure the Compose provider is installed.`,
  );
}

function commandWorks(command, args) {
  return spawnSync(command, args, { stdio: "ignore" }).status === 0;
}

module.exports = { resolveContainerEngine };
