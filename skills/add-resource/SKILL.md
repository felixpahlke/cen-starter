---
name: add-resource
description: Add a complete CRUD resource — zod schema, database table, migration, API route, and frontend usage — following the canonical items pattern.
---

# Add a resource

Use this when the user asks for a new entity ("add projects", "we need customers"). The `items`
resource is the canonical pattern — you are copying its structure, not inventing one.
Read these before writing anything: `shared/src/schemas/items.ts`, `backend/src/routes/items.ts`,
`backend/src/db/schema.ts`.

## Steps

1. **Schema** — `shared/src/schemas/<resource>.ts`: `XSchema` (full shape), `XCreateSchema`,
   `XUpdateSchema`, derived with `.pick`/`.partial` like the items file. Export from
   `shared/src/index.ts`.
2. **Table** — add the drizzle table to `backend/src/db/schema.ts`. Follow the existing column
   style (`uuid` pk with `defaultRandom()`, `timestamp` `createdAt` with `defaultNow()`, owner
   references `user.id` with `onDelete: "cascade"` if the resource is user-owned).
3. **Migration** — `pnpm db:generate`, review the generated SQL, then `pnpm db:migrate`
   (database must be running: `docker compose up -d --wait`).
4. **Route** — `backend/src/routes/<resource>.ts`: copy `items.ts` structure exactly — one
   `createRoute` per operation, one chained `OpenAPIHono`, `requireAuth` middleware, a
   `serialize` helper for `Date → string`. Register it in `backend/src/index.ts` on the chained
   `api` (`.route("/<resource>", …)`) — the chain is what carries types to the frontend.
5. **Frontend** — use the typed client: `api.<resource>.$get(...)` etc. with TanStack Query;
   reuse the shared zod schemas for form validation. If an items page exists, copy its pattern.

## Verify

- `pnpm check` green.
- The new endpoints appear in Swagger UI (`/api/docs`) with correct schemas.
- Exercise one round-trip (create + list) via the UI or `curl` with a session cookie.

## Pitfalls

- Don't define schemas in the backend — `shared/` is the single source of truth.
- Don't break the `OpenAPIHono` chain (no intermediate variables between `.openapi()` calls);
  register middleware as a statement (`app.use(...)`) like `items.ts` does.
- Return `Date` fields serialized (`toISOString()`) — the schema says `z.iso.datetime()`.
