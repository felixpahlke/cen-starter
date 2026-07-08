---
name: no-database
description: >-
  Apply the no-database flavor to remove PostgreSQL, Drizzle, persistent auth, and the example
  items resource.
---

# No Database Flavor

## When To Use

Use this flavor when the generated app should boot without Docker, PostgreSQL, Drizzle, or
local email/password accounts. It keeps the Hono API, Swagger UI, frontend shell, and shared
package, but removes the example items CRUD resource and all database-backed auth screens.

## Apply

Run from the repository root:

```bash
pnpm flavor apply no-database
```

The flavor runner validates delete globs, edit anchors, overlay paths, and package patches before
changing files. It then installs dependencies and runs `pnpm check`.

## Check Afterwards

1. Confirm `pnpm check` is green.
2. Start the backend with an API key, for example:

   ```bash
   API_KEY=dev-only-api-key API_PORT=3107 pnpm --filter @cen/backend dev
   ```

3. Verify `curl http://localhost:3107/api/health` returns `{"status":"ok"}` without Docker or a
   database.
4. Use `x-api-key: dev-only-api-key` for future protected API routes that call `requireAuth`.

## Auth Replacement Decision

The backend auth seam is replaced with an API-key implementation in `backend/src/auth/index.ts`.
A request whose `x-api-key` header equals `env.API_KEY` receives a synthetic admin session for
`api@local`; all other requests are unauthenticated.

The frontend deletes the login, signup, settings, and admin routes and overlays a shell without
the auth guard or user menu. `frontend/src/lib/auth.ts` remains as a tiny stub with the same
exported names so future local code can still import the auth seam without pulling `better-auth`
back into the browser bundle.

This is smaller to maintain than preserving the full email/password UI against fake client
methods, and it reflects the real constraint: without persistence, local better-auth accounts
cannot be durable.
