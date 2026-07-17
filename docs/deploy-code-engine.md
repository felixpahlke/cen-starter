# Deploy to IBM Cloud Code Engine

Same single container as everywhere else (API + built SPA, port 8080, migrations applied
at boot), run as a serverless Code Engine app. `deploy/ce-deploy.sh` does the heavy lifting
and is safe to rerun — it builds the image **in the cloud** from your working tree, so you
don't need Docker locally. Reference details: [deploy/README.md](../deploy/README.md).

> 🤖 **With your agent:** "Deploy this to Code Engine, project `<name>`." — the
> `deploy-code-engine` skill runs this guide and verifies the result.

## Before you start

1. **IBM Cloud CLI + plugins:**

   ```bash
   curl -fsSL https://clis.cloud.ibm.com/install/osx | sh   # or /linux
   ibmcloud plugin install code-engine container-registry
   ibmcloud login --sso
   ibmcloud target -g <resource-group>     # or pass -g to the script
   ```

2. **A PostgreSQL database** reachable from IBM Cloud — typically
   [Databases for PostgreSQL](https://cloud.ibm.com/databases/databases-for-postgresql/create).
   Grab its connection string for `DATABASE_URL`. (Code Engine has no in-cluster database
   option — the script requires `DATABASE_URL` and tells you if it's missing.)

You do **not** need to create the Code Engine project, the registry namespace, or the
registry secret — the script creates whatever is missing.

## Configure production values

```bash
cp .env.production.example .env.production    # never commit this file
```

- `DATABASE_URL` — the connection string from above.
- Secrets you own — `BETTER_AUTH_SECRET` (`openssl rand -hex 32`), or on the oauth-proxy
  flavor the IdP client values (`OAUTH2_PROXY_OIDC_ISSUER_URL`, `OAUTH2_PROXY_CLIENT_ID`,
  `OAUTH2_PROXY_CLIENT_SECRET`).
- URL-dependent values — **leave them on the example values.** The script reads the real
  app URL from Code Engine and injects them into the app secret itself (`BETTER_AUTH_URL`;
  on the oauth-proxy flavor `OAUTH2_PROXY_REDIRECT_URL`, `OAUTH2_PROXY_UPSTREAMS`, and a
  generated-once `OAUTH2_PROXY_COOKIE_SECRET`). Every derived value is printed in the
  deploy summary.
- `IAM_API_KEY` — only needed the very first time, so the script can create the registry
  secret. Create one under [API keys](https://cloud.ibm.com/iam/apikeys); put it in
  `.env.production` (it never reaches the app) or export `IBMCLOUD_API_KEY` instead.

## Deploy

```bash
./deploy/ce-deploy.sh -p <project-name>
```

One command, first time and every time after. It selects or creates the project, ensures
the registry namespace and secret, uploads your working tree for a cloud-side image build,
creates or updates the `app-env` secret and the app, then derives the URL-dependent values
and rolls a fresh revision with them. On the oauth-proxy flavor it also deploys the
`oauth2-proxy` front app and switches the main app to project-only visibility, so identity
headers can't be spoofed from the internet — the URL you share is the proxy's.

Flags: `-g <resource-group>` to target one, `-r <registry-namespace>` to override the
default (derived from the project name; ICR namespaces are account-global).

## Verify

The summary prints the application URL (on oauth-proxy: the proxy URL — the main app is
project-only by design).

```bash
curl https://<app-url>/api/health        # {"status":"ok"}
```

Open the URL and log in end-to-end. If auth fails, compare the `Derived env:` lines from
the summary — an explicit override in `.env.production` that drifted from the real URL is
the usual cause. Promote the first admin by setting `role = 'admin'` on that user's row in
the database.

## Updating

- **New code:** rerun `./deploy/ce-deploy.sh -p <project>`. It rebuilds from your working
  tree and rolls a new revision. Schema changes need nothing extra — the new image migrates
  at boot before serving.
- **Env change:** edit `.env.production`, rerun the script — it re-applies the secret and
  rolls a new revision.
- Every update is a new revision; rollback means routing traffic back to the previous one.

Something broken? Ask your agent — the `debug-code-engine` skill exists for exactly that.
