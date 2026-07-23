# Troubleshooting

- **Command not found:** open a new terminal, then inspect PATH with `command -v <tool>` on
  macOS/Linux or `Get-Command <tool>` on Windows. Do not append guessed directories blindly.
- **Wrong Node version:** use Node 24 from `.nvmrc`. Do not remove another project's Node
  version without permission.
- **Corepack or pnpm signature error:** run `npm install --global corepack@latest`, then
  `corepack enable pnpm`.
- **Docker CLI works, daemon does not:** start Rancher Desktop or the container service. Check
  that Rancher uses Moby/dockerd, then inspect `docker context ls`; do not reset or delete data.
- **`docker compose` is missing:** install the Compose plugin. Do not silently substitute the
  legacy `docker-compose` command.
- **`podman compose` is missing:** install or configure a supported Compose provider; do not
  create a `docker` symlink as a workaround.
- **Permission denied on Docker:** use the official platform guidance. Do not make the socket
  world-writable.
- **Proxy or certificate failure:** use company proxy and CA instructions. Never disable TLS
  verification or npm certificate checks.
- **WSL or virtualization failure:** report whether WSL 2 and hardware virtualization are
  enabled. A restart, BIOS change, or IT action may be required.
- **IBM Cloud plugin incompatibility:** update the base IBM Cloud CLI, then retry the plugin.
- **`oc` version mismatch:** download the client offered by the target cluster's web console.

When blocked, give the exact failed command and error, what is already working, and the one
user or IT action needed next.
