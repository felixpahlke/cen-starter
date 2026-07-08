# Deployment

## Build

Build from the repository root:

```bash
docker build -f deploy/Dockerfile -t cen-app:latest .
```

The image builds the full pnpm workspace, prunes production backend dependencies with `pnpm deploy`, then runs the Hono API and serves the built SPA from `./static`.

## Run Locally

The container listens on port 8080. `DATABASE_URL` must point to a PostgreSQL server reachable from inside the container.

```bash
docker run --rm -p 8080:8080 \
  -e DATABASE_URL='postgres://USER:PASSWORD@host.docker.internal:5432/DATABASE' \
  -e BETTER_AUTH_SECRET='replace-with-at-least-32-random-characters' \
  -e BETTER_AUTH_URL='http://localhost:8080' \
  cen-app:latest
```

Verify:

```bash
curl http://localhost:8080/api/health
```

## OpenShift

Create `.env.production` from `.env.production.example`, set production values, and push the image to a registry the cluster can pull from.

```bash
./deploy/deploy.sh -n <namespace> -i <registry>/<repo>/cen-app:<tag>
```

The script creates or updates the `app-env` secret from `.env.production`, applies the kustomize base in `deploy/openshift`, optionally sets the image, and waits for the rollout.

## Code Engine

Create or update the secret first:

```bash
ibmcloud ce secret create --name app-env --from-env-file .env.production
ibmcloud ce secret update --name app-env --from-env-file .env.production
```

Create the app:

```bash
ibmcloud ce app create --name cen-app \
  --image <registry>/<repo>/cen-app:<tag> \
  --port 8080 \
  --env-from-secret app-env \
  --min-scale 1
```

Update an existing app:

```bash
ibmcloud ce app update --name cen-app \
  --image <registry>/<repo>/cen-app:<tag> \
  --port 8080 \
  --env-from-secret app-env \
  --min-scale 1
```

Use `--min-scale 1` for production web traffic to avoid cold starts. For lower-cost non-production environments, `--min-scale 0` is acceptable if cold starts are tolerable.

## Migrations

Run migrations before deploying a new image, from a source checkout with dependencies installed and `DATABASE_URL` set:

```bash
pnpm --filter @cen/backend db:migrate
```

This can run as a CI pre-deploy step or a one-off job. The runtime image intentionally does not contain `drizzle-kit` or the Drizzle config, so migrations are not run from the production container.
