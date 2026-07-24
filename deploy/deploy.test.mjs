import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { access, chmod, cp, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

test("autodeploy uses gh + SSH and verifies namespace webhook access", async (t) => {
  const fixture = await createFixture(t);
  const result = runDeploy(fixture);

  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /Added a read-only OpenShift deploy key/);
  assert.match(result.output, /Verified GitHub can reach the OpenShift webhook endpoint/);
  assert.match(result.output, /Autodeploy: git push to main/);

  const manifests = await readFile(fixture.manifests, "utf8");
  assert.match(manifests, /kind: RoleBinding/);
  assert.match(manifests, /name: system:webhook/);
  assert.match(manifests, /name: system:unauthenticated/);
  assert.match(manifests, /uri: "git@github\.ibm\.com:example\/todo-app\.git"/);

  const ocLog = await readFile(fixture.ocLog, "utf8");
  assert.match(ocLog, /--type=kubernetes\.io\/ssh-auth/);
  assert.doesNotMatch(ocLog, /kubernetes\.io\/basic-auth/);
  const privateKeyPath = ocLog.match(/--from-file=ssh-privatekey=([^\s]+)/)?.[1];
  assert.ok(privateKeyPath, "the OpenShift SSH secret should come from a temporary key file");
  await assert.rejects(access(privateKeyPath), "the temporary private key should be removed");

  const ghLog = await readFile(fixture.ghLog, "utf8");
  assert.match(ghLog, /repos\/example\/todo-app\/keys/);
  assert.match(ghLog, /repos\/example\/todo-app\/hooks\/42\/pings/);
  assert.match(ghLog, /repos\/example\/todo-app\/hooks\/42\/deliveries/);

  const appEnv = await readFile(fixture.appEnv, "utf8");
  assert.doesNotMatch(appEnv, /legacy-token-must-not-reach-the-app/);
});

test("autodeploy stops before mutation when gh is not authenticated", async (t) => {
  const fixture = await createFixture(t, { ghAuthenticated: false });
  const result = runDeploy(fixture);

  assert.notEqual(result.status, 0);
  assert.match(result.output, /gh auth login --hostname github\.ibm\.com --web/);

  const ocLog = await readFile(fixture.ocLog, "utf8");
  assert.doesNotMatch(ocLog, /\b(create|apply|set|start-build)\b/);
});

async function createFixture(t, { ghAuthenticated = true } = {}) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "cen-deploy-test-"));
  t.after(async () => {
    const { rm } = await import("node:fs/promises");
    await rm(directory, { recursive: true, force: true });
  });

  await cp(path.join(root, "deploy"), path.join(directory, "deploy"), {
    recursive: true,
    filter(source) {
      return !source.endsWith("deploy.test.mjs");
    },
  });
  await writeFile(
    path.join(directory, ".env.production"),
    [
      "DATABASE_URL=postgres://app:password@postgres.example:5432/app",
      "BETTER_AUTH_SECRET=test-secret-with-at-least-32-characters",
      "BETTER_AUTH_URL=https://cen-starter.example.com",
      "GITHUB_TOKEN=legacy-token-must-not-reach-the-app",
      "",
    ].join("\n"),
  );

  const bin = path.join(directory, "bin");
  const state = path.join(directory, "state");
  await mkdir(bin);
  await mkdir(state);

  const fixture = {
    appEnv: path.join(state, "app-env"),
    bin,
    directory,
    ghAuthenticated,
    ghLog: path.join(state, "gh.log"),
    manifests: path.join(state, "manifests.yaml"),
    ocLog: path.join(state, "oc.log"),
    state,
  };
  await Promise.all([
    writeExecutable(path.join(bin, "git"), gitMock),
    writeExecutable(path.join(bin, "gh"), ghMock),
    writeExecutable(path.join(bin, "oc"), ocMock),
    writeFile(fixture.ghLog, ""),
    writeFile(fixture.manifests, ""),
    writeFile(fixture.ocLog, ""),
  ]);
  return fixture;
}

function runDeploy(fixture) {
  const result = spawnSync("bash", ["deploy/deploy.sh", "-n", "test-project", "--autodeploy"], {
    cwd: fixture.directory,
    encoding: "utf8",
    env: {
      ...process.env,
      GH_AUTHENTICATED: fixture.ghAuthenticated ? "true" : "false",
      MOCK_STATE: fixture.state,
      PATH: `${fixture.bin}:${process.env.PATH}`,
    },
  });
  return {
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
    status: result.status,
  };
}

async function writeExecutable(file, content) {
  await writeFile(file, content);
  await chmod(file, 0o755);
}

const gitMock = String.raw`#!/usr/bin/env bash
set -euo pipefail
case "$*" in
  "remote get-url origin") printf '%s\n' 'https://github.ibm.com/example/todo-app.git' ;;
  "ls-remote --exit-code origin refs/heads/main")
    printf '%s\n' '0123456789012345678901234567890123456789	refs/heads/main'
    ;;
  *) printf 'unexpected git call: %s\n' "$*" >&2; exit 1 ;;
esac
`;

const ghMock = String.raw`#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" >> "$MOCK_STATE/gh.log"

if [[ "$*" == auth\ status* ]]; then
  [[ "$GH_AUTHENTICATED" == true ]]
  exit
fi

if [[ "$*" == *'/keys'* ]]; then
  exit 0
fi

if [[ "$*" == *'/deliveries?'* ]]; then
  if [[ -f "$MOCK_STATE/pinged" ]]; then printf '101\t200\n'; fi
  exit 0
fi

if [[ "$*" == *'/pings'* ]]; then
  : > "$MOCK_STATE/pinged"
  exit 0
fi

if [[ "$*" == *'--method POST'* && "$*" == *'/hooks '* ]]; then
  printf '42\n'
  exit 0
fi

if [[ "$*" == *'/hooks'* ]]; then
  printf '[[]]\n'
  exit 0
fi

printf 'unexpected gh call: %s\n' "$*" >&2
exit 1
`;

const ocMock = String.raw`#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" >> "$MOCK_STATE/oc.log"

if [[ "$*" == "whoami" ]]; then printf 'test-user\n'; exit 0; fi
if [[ "$*" == "whoami --show-server" ]]; then
  printf 'https://api.openshift.example:6443\n'
  exit 0
fi
if [[ "$*" == "get namespace test-project" ]]; then exit 0; fi

if [[ "$1" == get && "$2" == secret ]]; then exit 1; fi

if [[ "$1" == get && "$2" == route ]]; then
  if [[ "$*" == *'.spec.host'* ]]; then printf 'todo.test.example\n'; fi
  if [[ "$*" == *'.spec.tls.termination'* ]]; then printf 'edge\n'; fi
  exit 0
fi

if [[ "$1" == get && "$*" == *'build/'* && "$*" == *'.status.phase'* ]]; then
  printf 'Complete\n'
  exit 0
fi

if [[ "$1" == create && "$2" == secret ]]; then
  for argument in "$@"; do
    if [[ "$argument" == --from-env-file=* ]]; then
      env_file=$(printf '%s' "$argument" | cut -d= -f2-)
      cp "$env_file" "$MOCK_STATE/app-env"
    fi
  done
  printf '%s\n' 'apiVersion: v1' 'kind: Secret'
  exit 0
fi

if [[ "$1" == apply ]]; then
  if [[ "$*" == *' -f -'* ]]; then cat >> "$MOCK_STATE/manifests.yaml"; fi
  exit 0
fi

if [[ "$1" == start-build ]]; then
  printf 'build.build.openshift.io/cen-starter-1\n'
  exit 0
fi

if [[ "$1" == set || "$1" == rollout ]]; then exit 0; fi

printf 'unexpected oc call: %s\n' "$*" >&2
exit 1
`;
