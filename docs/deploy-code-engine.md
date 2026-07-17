# Deploy to IBM Cloud Code Engine

Same single container as everywhere else (API + built SPA, port 8080, migrations applied
at boot), run as a serverless Code Engine app. Reference details:
[deploy/README.md](../deploy/README.md).

> 🤖 **With your agent:** "Deploy this to Code Engine, project `<name>`." — the
> `deploy-code-engine` skill runs this guide and verifies the result.

## Before you start

1. **IBM Cloud CLI + plugins:**

   ```bash
   curl -fsSL https://clis.cloud.ibm.com/install/osx | sh   # or /linux
   ibmcloud plugin install code-engine container-registry
   ibmcloud login --sso
   ibmcloud target -g <resource-group>
   ```

2. **A Code Engine project:**

   ```bash
   ibmcloud ce project create --name my-app    # or: project select --name <existing>
   ```

3. **A registry namespace** in IBM Container Registry:

   ```bash
   ibmcloud cr region-set global
   ibmcloud cr namespace-add <namespace>
   ibmcloud cr login
   ```

4. **A PostgreSQL database** reachable from IBM Cloud — typically
   [Databases for PostgreSQL](https://cloud.ibm.com/databases/databases-for-postgresql/create).
   Grab its connection string for `DATABASE_URL`.

## Configure production values

```bash
cp .env.production.example .env.production    # never commit this file
```

Set `DATABASE_URL`, generate `BETTER_AUTH_SECRET` (`openssl rand -hex 32`), and leave
`BETTER_AUTH_URL` for after the first deploy — Code Engine assigns the URL.

## First deploy

```bash
# Build + push — --platform matters on Apple Silicon, Code Engine runs amd64
docker build --platform linux/amd64 -f deploy/Dockerfile -t icr.io/<namespace>/my-app:v1 .
docker push icr.io/<namespace>/my-app:v1

# Secret + app
ibmcloud ce secret create --name app-env --from-env-file .env.production
ibmcloud ce app create --name my-app \
  --image icr.io/<namespace>/my-app:v1 \
  --port 8080 --env-from-secret app-env \
  --min-scale 1 --cpu 0.5 --memory 1G
```

`--min-scale 1` avoids cold starts, which hurt an app with auth sessions; `--min-scale 0`
is fine for cheap non-production environments.

The create command prints the app URL. Set `BETTER_AUTH_URL` to exactly that URL, then:

```bash
ibmcloud ce secret update --name app-env --from-env-file .env.production
ibmcloud ce app update --name my-app     # new revision picks up the secret
```

## Verify

```bash
ibmcloud ce app get --name my-app        # Ready, and shows the URL
curl https://<app-url>/api/health        # {"status":"ok"}
```

Open the URL and log in end-to-end. Promote the first admin by setting `role = 'admin'`
on that user's row in the database.

## Updating

- **New code:** build + push a new tag, then
  `ibmcloud ce app update --name my-app --image icr.io/<namespace>/my-app:v2`.
  Schema changes need nothing extra — the new image migrates at boot before serving.
- **Env change:** `ibmcloud ce secret update … && ibmcloud ce app update --name my-app`.
- Every update is a new revision; rollback means routing traffic back to the previous one.

Something broken? Ask your agent — the `debug-code-engine` skill exists for exactly that.
