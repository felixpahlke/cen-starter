---
name: prepare-workstation
description: >-
  Prepare a computer for CEN Starter development by diagnosing and installing the standard
  workstation baseline: Git, Node.js, pnpm, Rancher Desktop, OpenShift and IBM Cloud CLIs,
  IBM Bob, and supporting editor extensions. Use when prerequisites are missing, containers
  are unavailable, setup fails before the app starts, or a user needs beginner-friendly
  workstation help on macOS, Windows, WSL, Linux, or a managed company device.
---

# Prepare workstation

Get the machine ready without assuming terminal experience. Fix one missing prerequisite at a
time and explain what each action does.

## Guardrails

- Audit first; do not reinstall working tools.
- Before installing software, using `sudo`/administrator access, or changing system settings,
  summarize the action and get the user's confirmation.
- On managed devices, prefer the company software portal or IT instructions. Never bypass
  device policy, proxies, certificates, or endpoint protection.
- Do not install Docker Desktop on IBM-managed machines. Prefer Rancher Desktop with the Moby
  engine where a local container runtime is required.
- Use official installers and documentation. Do not pipe a downloaded script into a shell
  without showing the command and getting confirmation.
- Do not uninstall an existing runtime, reset Docker, or stop unrelated containers without
  explicit permission.

## 1. Audit

Run what is available:

```bash
git --version
node --version
pnpm --version
docker --version
docker compose version
docker info
oc version --client
ibmcloud --version
ibmcloud plugin show code-engine
ibmcloud plugin show container-registry
```

Node must satisfy `package.json` and should match `.nvmrc`. pnpm should match the
`packageManager` field. `docker info` must reach a running daemon; having only the CLI is not
enough.

## 2. Install what is missing

Detect the operating system and read exactly one guide:

- macOS: `references/macos.md`
- Windows or WSL: `references/windows.md`
- Linux: `references/linux.md`

Also read `references/deployment-tools.md` and `references/editor.md`. If an install or check
fails, read `references/troubleshooting.md`.

After an installer finishes, open a new terminal when PATH or shell configuration changed.
Restart the computer when Windows, WSL, virtualization, or company policy requires it.

## 3. Verify

Repeat the audit, then run:

```bash
pnpm install --frozen-lockfile
```

Do not start project configuration until every required check passes. Once they do, return to
the workflow that requested workstation preparation.
