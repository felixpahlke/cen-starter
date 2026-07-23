# Linux

Use the distribution's package manager for Git and basic tools. On a managed workstation,
follow company repositories and proxy guidance.

## Git, Node, and pnpm

Install Git with the distribution's supported package. Prefer
[NVM](https://github.com/nvm-sh/nvm) for Node, then let the repository select Node 24:

```bash
nvm install
nvm use
```

Enable the repository-pinned pnpm version:

```bash
npm install --global corepack@latest
corepack enable pnpm
pnpm --version
```

Do not replace a system Node installation or change shell startup files without the user's
approval.

## Container runtime

Follow company policy. Use Rancher Desktop with the **Moby/dockerd** engine if it is the
company standard; otherwise install Docker Engine, the CLI, Buildx, and Compose from the
[official Engine guide](https://docs.docker.com/engine/install/). Docker Desktop is not needed.
Avoid Docker's convenience script unless the user explicitly approves it after reviewing it.

Podman with a working Compose provider is equally supported when it is installed or preferred
by company policy; verify it with `podman info` and `podman compose version` instead.

Start the daemon if necessary, then verify:

```bash
sudo systemctl start docker
docker info
docker compose version
```

Docker group membership grants root-equivalent access. Explain that before adding the user to
the group; use the official post-installation guidance and require confirmation.
