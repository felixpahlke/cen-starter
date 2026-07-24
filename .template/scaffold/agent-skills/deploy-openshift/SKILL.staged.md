---
name: deploy-openshift
description: Deploy this app to OpenShift — auto-deploy pipeline (git push = deploy) or explicit image deploys, optional in-cluster PostgreSQL, deploy.sh, verification. For broken deployments use debug-openshift instead.
---

# Deploy to OpenShift

One container: the API serves the built SPA on port 8080. Manifests live in
`deploy/openshift/` (kustomize), the entry point is `deploy/deploy.sh` — idempotent, safe to
rerun. Details: `deploy/README.md`.

Two things happen automatically so you don't handle them:

- **Database**: if `.env.production` has no `DATABASE_URL`, `deploy.sh` deploys an in-cluster
  PostgreSQL (pilot/demo grade) and wires the URL into the app secret itself. For real
  engagements, set `DATABASE_URL` to a managed PostgreSQL — then nothing extra is deployed.
- **Migrations**: the image migrates its own schema at boot (`MIGRATE_ON_START`, default on
  in production, guarded by an advisory lock). There is no manual migration step. Teams that
  want manual control set `MIGRATE_ON_START=false` in `.env.production`.

## Preconditions

- `oc` CLI logged in (`oc whoami`) and a namespace the user may deploy to. If login is
  missing, tell them: OpenShift web console → user menu in the top-right → **Copy login
  command**, then run that command in their terminal — never paste its token into chat. If
  they have no cluster or namespace, ask their engagement or tech lead for the assigned
  target; do not invent or provision one.
- **Auto-deploy path**: inspect `origin`, its remote heads, and the current upstream first.
  Respect an existing GitHub host and repository. If there is no project repository, offer
  to create it and explicitly confirm host, owner, name, and visibility; recommend
  `github.ibm.com` + private for IBM work. Check `gh --version` and
  `gh auth status --hostname <host>` before saying creation or administration is unavailable.
  Browser login is `gh auth login --hostname <host> --web`; never request a GitHub token.
- **Explicit path**: a registry the cluster can pull from (and you can push to)

Create `.env.production` from the example and put application runtime secrets there. Do not
ask users to paste secrets into chat or expose them in shell command text. For IBM App ID,
the convenient credentials JSON may be saved locally as `.secrets/appid.json` (ignored);
read it from there and map the issuer/client values into `.env.production`.

## Recommended: auto-deploy (internal tools, pilots)

One-time setup; afterwards **`git push` to `main` is the deploy** — the cluster builds the
image itself (BuildConfig + webhook), no local Docker needed:

```bash
# 1. Production env — never commit this file
cp .env.production.example .env.production   # fill in the values only you can know (secrets,
                                             # IdP client config); leave DATABASE_URL unset for
                                             # the in-cluster db. URL-dependent values
                                             # (BETTER_AUTH_URL — or OAUTH2_PROXY_REDIRECT_URL
                                             # and the cookie secret on the oauth-proxy flavor)
                                             # are derived by deploy.sh; set them only to override.

# 2. One command — deploy.sh uses the existing gh login to install a read-only
#    SSH deploy key and the GitHub webhook; no GitHub token is requested.
./deploy/deploy.sh -n <namespace> --autodeploy
```

This sets up ImageStream + BuildConfig (from `deploy/Dockerfile`), grants the namespace-scoped
OpenShift webhook role, installs a generated read-only SSH deploy key, registers the webhook,
verifies a GitHub ping reaches OpenShift, starts the first build, and waits for rollout. Do
not replace this flow with ad-hoc `oc` patches; switch to `debug-openshift` if it fails.

## Alternative: explicit deploys (client projects, release gates)

```bash
cp .env.production.example .env.production   # as above; set DATABASE_URL for managed Postgres

docker build -f deploy/Dockerfile -t <registry>/<repo>/cen-starter:<tag> .
docker push <registry>/<repo>/cen-starter:<tag>

./deploy/deploy.sh -n <namespace> -i <registry>/<repo>/cen-starter:<tag>
```

## Verify — before telling the user it's live

```bash
oc get route -n <namespace>                       # note the host
curl -s https://<route-host>/api/health           # {"status":"ok"}
```

Then open the route in a browser: sign-in must work end-to-end. The deploy summary prints
every derived value (`Derived env: …`) — if auth fails, compare those against the route URL
first; an explicit override in `.env.production` that drifted from the route is the usual
cause. Check the pod log for the migration line on first boot. Promote the first admin: set
`role = 'admin'` on the user's row in the database.

For IBM App ID, give the user the exact callback printed by the deployer and this location:
App ID instance → **Manage Authentication → Authentication settings → Add web redirect URI**.
The callback ends in `/oauth2/callback`.

## Update an existing deployment

- **Auto-deploy**: `git push`. That's it — build, rollout, and schema migration happen alone.
- **Explicit**: build + push a new tag, rerun `deploy.sh -i <new tag>`.
- **Env change**: edit `.env.production`, rerun `deploy.sh` (it re-applies the secret), then
  `oc rollout restart deploy/cen-starter` so pods pick it up.
- **Pilot db → managed db**: set `DATABASE_URL` in `.env.production`, rerun `deploy.sh`,
  restart. The schema is recreated by migrate-on-start; moving existing *data* is a manual
  `pg_dump`/`pg_restore`. Remove the pilot db with
  `oc delete -f deploy/openshift/postgres.yaml` and `oc delete secret postgres-env` when done.

## When something is broken

Switch to `.agents/skills/debug-openshift/` — don't debug ad hoc.
