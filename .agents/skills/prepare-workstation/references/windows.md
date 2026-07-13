# Windows and WSL

Prefer the company software portal on a managed device. Keep the repository and its Node tools
in one environment: either Windows or WSL, not split across both.

## Windows-native route

Open PowerShell. Install Git and Node 24 through approved installers or `winget`:

```powershell
winget install --id Git.Git -e --source winget
winget install --id OpenJS.NodeJS.LTS -e --source winget
```

Use the Node 24 download from [nodejs.org](https://nodejs.org/en/download) if the package does
not install Node 24. NVM for Unix does not support native Windows; use it only inside WSL.
Open a new PowerShell window, then run:

```powershell
npm install --global corepack@latest
corepack enable pnpm
```

## Rancher Desktop and WSL 2

Install Rancher Desktop from the company portal or the
[official installer](https://docs.rancherdesktop.io/getting-started/installation/). Do not
install Docker Desktop on IBM-managed machines. Rancher Desktop uses WSL 2; if WSL is missing,
ask before opening an administrator PowerShell and running:

```powershell
wsl --install
```

Restart when prompted. In Rancher Desktop, select the **Moby/dockerd** engine and disable
Kubernetes unless the project specifically needs it.

If development happens inside WSL, install Git and NVM inside that distribution, run
`nvm install`, and enable pnpm there. Store the repository in the Linux filesystem, not under
`/mnt/c`, for better file performance.

Verify in the shell where development will happen:

```text
git --version
node --version
pnpm --version
docker info
docker compose version
```
