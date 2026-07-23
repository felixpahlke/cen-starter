# macOS

## Choose the installation route

On a managed Mac, check the company software portal first. Otherwise, Homebrew is the preferred
route for command-line tools; graphical installers remain a good option for less technical users.

## Git and Homebrew

Install Apple's command-line tools if Git is missing:

```bash
xcode-select --install
```

If Homebrew is approved, install it from [brew.sh](https://brew.sh/). Show the official command
and ask before running it. Follow the installer's printed PATH instruction, then verify:

```bash
brew --version
git --version
```

## Node and pnpm

Use NVM so projects can select their own Node versions. Follow the official
[NVM installation instructions](https://github.com/nvm-sh/nvm), showing the install command
and asking before running it. Open a new terminal, then let `.nvmrc` select Node 24:

```bash
nvm install
nvm use
```

Then install current Corepack metadata and enable the repository-pinned pnpm version:

```bash
npm install --global corepack@latest
corepack enable pnpm
pnpm --version
```

## Container runtime

Install Rancher Desktop from the company portal or the
[official installer](https://docs.rancherdesktop.io/getting-started/installation/). Do not
install Docker Desktop on IBM-managed machines.

In Rancher Desktop, select the **Moby/dockerd** container engine and disable Kubernetes unless
the project specifically needs it. Wait until the engine is running, then verify with
`docker info` and `docker compose version`.

If Podman is already installed or is the approved choice, start its machine and verify
`podman info` and `podman compose version` instead. Do not install a second engine when one
working option already exists.

Use [Colima](https://github.com/abiosoft/colima) only when Rancher Desktop is unavailable and
company policy approves it.
