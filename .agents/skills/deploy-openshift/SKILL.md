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

## Preconditions (ask the user, don't guess)

- `oc` CLI logged in (`oc whoami`) and a namespace you may deploy to
- **Auto-deploy path**: a GitHub (Enterprise) token with repo + webhook scope, and a cluster
  that can reach the git host
- **Explicit path**: a registry the cluster can pull from (and you can push to)

## Recommended: auto-deploy (internal tools, pilots)

One-time setup; afterwards **`git push` to `main` is the deploy** — the cluster builds the
image itself (BuildConfig + webhook), no local Docker needed:

```bash
# 1. Production env — never commit this file
cp .env.production.example .env.production   # fill in BETTER_AUTH_SECRET (openssl rand -hex 32)
                                             # and BETTER_AUTH_URL (the route URL);
                                             # leave DATABASE_URL unset for the in-cluster db

# 2. One command
export GITHUB_TOKEN=<token>                  # or put GITHUB_TOKEN= in .env.production
                                             # (deploy.sh keeps it out of the app secret)
./deploy/deploy.sh -n <namespace> --autodeploy
```

This sets up ImageStream + BuildConfig (from `deploy/Dockerfile`), registers the webhook on
the repo, starts the first build, and waits for rollout. If webhook creation fails (token
scope, GHE policy), the script prints the webhook URL to add manually in repo settings —
everything else still works.

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

Then open the route in a browser: sign-up must work end-to-end (`BETTER_AUTH_URL` must equal
the route URL, or auth requests fail). Check the pod log for the migration line on first
boot. Promote the first admin: set `role = 'admin'` on the user's row in the database.

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
