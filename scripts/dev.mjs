import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import process from "node:process";
import { fileURLToPath } from "node:url";
import containerEngine from "./container-engine.cjs";

const { resolveContainerEngine } = containerEngine;

const root = fileURLToPath(new URL("..", import.meta.url));
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const signalExitCodes = { SIGHUP: 129, SIGINT: 130, SIGTERM: 143 };

let activeChild;
let cleaningUp = false;
let requestedSignal;

for (const signal of Object.keys(signalExitCodes)) {
  process.on(signal, () => {
    requestedSignal ??= signal;
    if (!cleaningUp) stopActiveChild(signal);
  });
}

let composeStarted = false;
let engine;
let exitCode = 0;

try {
  await required(process.execPath, ["scripts/check-ports.mjs"]);

  if (existsSync(new URL("../docker-compose.yml", import.meta.url))) {
    process.loadEnvFile(new URL("../.env", import.meta.url));
    engine = resolveContainerEngine();
    await required(engine, ["compose", "up", "-d", "--wait"]);
    composeStarted = true;
    await required(pnpm, ["db:migrate"]);
    await required(pnpm, ["db:seed"]);
  }

  const result = await run(pnpm, ["--recursive", "--parallel", "dev"], {
    processGroup: true,
  });
  exitCode = result.code ?? signalExitCodes[result.signal] ?? 1;
} catch (error) {
  exitCode = error.exitCode ?? 1;
  if (!requestedSignal) console.error(`\n✗ ${error.message}`);
} finally {
  if (composeStarted) {
    cleaningUp = true;
    console.log("\nStopping development services…");
    const result = await run(engine, ["compose", "down"]);
    if (result.code !== 0 && exitCode === 0) exitCode = result.code ?? 1;
  }
}

process.exitCode = requestedSignal ? signalExitCodes[requestedSignal] : exitCode;

async function required(command, args) {
  const result = await run(command, args);
  if (result.error) throw result.error;
  if (result.code !== 0) {
    const error = new Error(`${command} ${args.join(" ")} failed.`);
    error.exitCode = result.code ?? signalExitCodes[result.signal] ?? 1;
    throw error;
  }
}

function run(command, args, { processGroup = false } = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: "inherit",
      detached: processGroup && process.platform !== "win32",
    });
    const running = { child, processGroup };
    activeChild = running;

    let error;
    child.once("error", (value) => {
      error = value;
    });
    child.once("close", (code, signal) => {
      if (activeChild === running) activeChild = undefined;
      resolve({ code, signal, error });
    });
  });
}

function stopActiveChild(signal) {
  if (!activeChild?.child.pid) return;

  try {
    if (activeChild.processGroup && process.platform !== "win32") {
      process.kill(-activeChild.child.pid, signal);
    } else {
      activeChild.child.kill(signal);
    }
  } catch (error) {
    if (error.code !== "ESRCH") throw error;
  }
}
