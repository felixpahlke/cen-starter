# no-database

Removes PostgreSQL, Drizzle, Better Auth persistence, and the example items resource. The app
boots with zero Docker: Hono API, Swagger UI, frontend shell, and shared package remain.

## When to choose it

The app is stateless — a proxy, an integration service, a demo without persistence, or the
data lives entirely in external systems. If the user is unsure whether they'll need their own
tables, keep the base instead: subtracting later means redoing this flavor's changes by hand.

**Combines with `backend-only`** for stateless API services such as watsonx Orchestrate
tools: `pnpm flavor apply backend-only no-database` (that order — backend-only first).
**Conflicts with `carbon` and `oauth-proxy`** (Carbon reworks pages this flavor deletes;
oauth-proxy needs the user table).

## What it changes

- Deletes `backend/src/db/`, `drizzle.config.ts`, `docker-compose.yml`, the items resource
  (schema, route, tests, frontend page), and the login/signup/settings/admin routes.
- **Auth seam swap**: `backend/src/auth/index.ts` becomes an API-key implementation with the
  identical exported interface (`getSession`, `requireAuth`, `Session`). A request with
  `x-api-key: $API_KEY` gets a synthetic admin session for `api@local`; everything else is
  unauthenticated. Without persistence, local accounts can't be durable — an API key reflects
  the real constraint.
- Frontend keeps a shell without auth guard or user menu; `frontend/src/lib/auth.ts` stays as
  a stub with the same exports so future code doesn't pull better-auth back into the bundle.
- `pnpm dev` no longer starts Docker; env needs `API_KEY` instead of `DATABASE_URL`/auth vars.
- Production: `deploy/Dockerfile` loses its copy-migrations step and `.env.production.example`
  asks for `API_KEY` — skip the migrations step in the deploy skills.
- Deletes the now-inapplicable `db-migrations` and `add-resource` skills (the canonical
  resource pattern assumes Drizzle; new endpoints follow `backend/src/routes/health.ts`).

## Post-apply checks

1. `pnpm check` and `pnpm test` are green (apply runs them; rerun if in doubt).
2. Boot without Docker and verify:

   ```bash
   API_KEY=dev-only-api-key pnpm --filter @cen/backend dev
   curl http://localhost:3000/api/health   # {"status":"ok"}
   ```

3. Protected routes now expect the `x-api-key` header — tell your user.

## Retrofitting late (flavor no longer applies)

Once the project has its own code, `flavor apply` will refuse (anchors drift by design). To
remove the database from a grown project, do the same changes manually: this list under "What
it changes" is your checklist, and the pristine template repo shows the target state of the
auth seam and frontend shell.
