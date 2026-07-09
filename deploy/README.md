# Deployment

## Build

Build from the repository root:

```bash
docker build -f deploy/Dockerfile -t cen-starter:latest .
```

The image builds the full pnpm workspace, prunes production backend dependencies with `pnpm deploy`, then runs the Hono API and serves the built SPA from `./static`.

## Run Locally

The container listens on port 8080. `DATABASE_URL` must point to a PostgreSQL server reachable from inside the container.

```bash
docker run --rm -p 8080:8080 \
  -e DATABASE_URL='postgres://USER:PASSWORD@host.docker.internal:5432/DATABASE' \
  -e BETTER_AUTH_SECRET='replace-with-at-least-32-random-characters' \
  -e BETTER_AUTH_URL='http://localhost:8080' \
  cen-starter:latest
```

Verify:

```bash
curl http://localhost:8080/api/health
```

## OpenShift

Create `.env.production` from `.env.production.example` and set production values. Two modes:

```bash
# Auto-deploy (recommended for internal tools/pilots): one-time setup, then git push = deploy.
# The cluster builds the image itself (ImageStream + BuildConfig + GitHub webhook).
GITHUB_TOKEN=<token> ./deploy/deploy.sh -n <namespace> --autodeploy

# Explicit: build/push yourself, deploy a specific image.
./deploy/deploy.sh -n <namespace> -i <registry>/<repo>/cen-starter:<tag>
```

Either way the script creates/updates the `app-env` secret from `.env.production` (filtering
out `GITHUB_TOKEN`), applies the kustomize base in `deploy/openshift`, and waits for rollout.

**Database convention**: if `.env.production` contains no `DATABASE_URL`, the script deploys
an in-cluster PostgreSQL (`deploy/openshift/postgres.yaml`, pilot/demo grade) and injects the
generated `DATABASE_URL` into `app-env`. Set `DATABASE_URL` to use a managed PostgreSQL
instead — recommended for production engagements.

## Code Engine

Create or update the secret first:

```bash
ibmcloud ce secret create --name app-env --from-env-file .env.production
ibmcloud ce secret update --name app-env --from-env-file .env.production
```

Create the app:

```bash
ibmcloud ce app create --name cen-starter \
  --image <registry>/<repo>/cen-starter:<tag> \
  --port 8080 \
  --env-from-secret app-env \
  --min-scale 1
```

Update an existing app:

```bash
ibmcloud ce app update --name cen-starter \
  --image <registry>/<repo>/cen-starter:<tag> \
  --port 8080 \
  --env-from-secret app-env \
  --min-scale 1
```

Use `--min-scale 1` for production web traffic to avoid cold starts. For lower-cost non-production environments, `--min-scale 0` is acceptable if cold starts are tolerable.

## Migrations

The image migrates its own schema at boot: in production the backend applies pending
migrations (shipped as SQL in the image, applied via drizzle-orm under a Postgres advisory
lock) before it starts serving. No manual step, and deploying a new image is always
schema-safe — including webhook-triggered auto-deploys.

To manage migrations manually instead, set `MIGRATE_ON_START=false` in the environment and
run them from a source checkout with `DATABASE_URL` set:

```bash
pnpm --filter @cen/backend db:migrate
```

The runtime image intentionally does not contain `drizzle-kit`; the boot-time migrator uses
drizzle-orm's runtime migrator over the bundled SQL files.
