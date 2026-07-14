---
name: deploy-code-engine
description: Deploy this app to IBM Cloud Code Engine — build and push the image, create the secret and app with ibmcloud ce, verify. For broken deployments use debug-code-engine instead.
---

# Deploy to IBM Cloud Code Engine

Same single container as everywhere else (API + SPA, port 8080), run as a Code Engine app.

## Preconditions (ask the user, don't guess)

- `ibmcloud` CLI with the `code-engine` plugin, logged in, correct resource group targeted
- A Code Engine project: `ibmcloud ce project select --name <project>` (create if missing)
- A registry Code Engine can pull from — IBM Container Registry (`icr.io`) is the default fit;
  private registries need a registry secret (`ibmcloud ce registry create`)
- A reachable PostgreSQL — typically IBM Cloud Databases for PostgreSQL; get its connection
  string for `DATABASE_URL`

## First deploy

```bash
# 1. Production env — never commit this file
cp .env.production.example .env.production        # DATABASE_URL, BETTER_AUTH_SECRET,
                                                  # BETTER_AUTH_URL (fill after first deploy, see below)

# 2. Build + push
docker build -f deploy/Dockerfile -t icr.io/<namespace>/cen-starter:<tag> .
docker push icr.io/<namespace>/cen-starter:<tag>

# 3. Migrations — nothing to do: the image migrates its own schema at boot
#    (MIGRATE_ON_START, production default). To manage them manually instead, set
#    MIGRATE_ON_START=false in .env.production and run:
#    DATABASE_URL='<production url>' pnpm --filter @cen/backend db:migrate

# 4. Secret + app
ibmcloud ce secret create --name app-env --from-env-file .env.production
ibmcloud ce app create --name cen-starter \
  --image icr.io/<namespace>/cen-starter:<tag> \
  --port 8080 --env-from-secret app-env \
  --min-scale 1 --cpu 0.5 --memory 1G
```

`--min-scale 1` because scale-to-zero cold-starts hurt an app with auth sessions; drop to 0
only if the user asks for it. The create command prints the app URL — set `BETTER_AUTH_URL`
to exactly that URL, update the secret, and restart:

```bash
ibmcloud ce secret update --name app-env --from-env-file .env.production
ibmcloud ce app update --name cen-starter       # new revision picks up the secret
```

## Verify — before telling the user it's live

```bash
ibmcloud ce app get --name cen-starter          # Ready, and note the URL
curl -s https://<app-url>/api/health        # {"status":"ok"}
```

Open the URL: sign-up must work end-to-end. Promote the first admin by setting
`role = 'admin'` on the user's row in the database.

## Update an existing deployment

New code: build + push a new tag, `ibmcloud ce app update --name cen-starter --image <new-ref>`.
Schema changed? Nothing extra — the new image migrates the schema at boot before serving
traffic (unless `MIGRATE_ON_START=false`, in which case run step 3's manual command first).
Env change: `ibmcloud ce secret update ... && ibmcloud ce app update --name cen-starter`.
Every update creates a new revision — rollback is `ibmcloud ce app get` (list revisions) and
routing traffic back.

## When something is broken

Switch to `.agents/skills/debug-code-engine/` — don't debug ad hoc.
