---
name: deploy-openshift
description: Deploy this app to OpenShift — build and push the production image, provision env and database, run deploy.sh, verify. For broken deployments use debug-openshift instead.
---

# Deploy to OpenShift

One container: the API serves the built SPA on port 8080. Manifests live in
`deploy/openshift/` (kustomize), the entry point is `deploy/deploy.sh` — idempotent, safe to
rerun. Details: `deploy/README.md`.

## Preconditions (ask the user, don't guess)

- `oc` CLI logged in (`oc whoami`) and a namespace you may deploy to
- A registry the cluster can pull from (and you can push to)
- A reachable PostgreSQL — an OpenShift Postgres deployment, IBM Cloud Databases, or existing
  instance. The app does not deploy its own database.

## First deploy

```bash
# 1. Production env — never commit this file
cp .env.production.example .env.production        # then fill in real values:
#    DATABASE_URL, BETTER_AUTH_SECRET (openssl rand -hex 32), BETTER_AUTH_URL (the route URL)

# 2. Build + push (from repo root; use the cluster-reachable registry ref)
docker build -f deploy/Dockerfile -t <registry>/<repo>/cen-starter:<tag> .
docker push <registry>/<repo>/cen-starter:<tag>

# 3. Migrations — run BEFORE deploying; the runtime image deliberately has no drizzle-kit
DATABASE_URL='<production url>' pnpm --filter @cen/backend db:migrate

# 4. Deploy — creates/updates the app-env secret, applies kustomize, waits for rollout
./deploy/deploy.sh -n <namespace> -i <registry>/<repo>/cen-starter:<tag>
```

## Verify — before telling the user it's live

```bash
oc get route -n <namespace>                       # note the host
curl -s https://<route-host>/api/health           # {"status":"ok"}
```

Then open the route in a browser: sign-up must work end-to-end (`BETTER_AUTH_URL` must equal
the route URL, or auth requests fail). Promote the first admin: set `role = 'admin'` on the
user's row in the database.

## Update an existing deployment

Build + push a new tag, rerun `deploy.sh` with `-i`. Schema changed? Run migrations first
(step 3 above) — always before the new image serves traffic. Env change: edit
`.env.production`, rerun `deploy.sh` (it re-applies the secret), then
`oc rollout restart deploy/cen-starter` so pods pick it up.

## When something is broken

Switch to `.agents/skills/debug-openshift/` — don't debug ad hoc.
