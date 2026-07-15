# AGENTS.md

## Stack map

pnpm workspace with up to three packages — setup may have removed some; what exists in this
tree is what applies:

- `backend/` — Hono on Node. Routes are defined with `@hono/zod-openapi` (`createRoute`),
  which gives request validation, the OpenAPI spec, and Swagger UI (`/api/docs`) from one
  definition. Auth sits behind a seam (rule 3). Database is PostgreSQL via Drizzle.
- `frontend/` — React SPA: Vite, TanStack Router (file-based) + TanStack Query, Tailwind.
  Talks to the API through the Hono RPC client (`hc<AppType>`) — types flow from the
  backend with no codegen.
- `shared/` — zod schemas used by both sides.

Dev services run in Docker Compose; the apps themselves run natively.

## Commands

```bash
pnpm dev          # check ports and start everything — never exits; agents: run in background or let the user run it
pnpm check        # typecheck + lint — run this before considering any task done
pnpm verify       # check + test + production build
pnpm fix          # auto-fix lint/format
pnpm db:generate  # generate migration from schema.ts changes
pnpm db:migrate   # apply migrations (needs the db container running)
```

Fresh clone: `pnpm install`, copy `.env.example` to `.env`, then `pnpm dev`.

## Rules

1. **Copy the canonical resource.** `shared/src/schemas/items.ts` + `backend/src/routes/items.ts` show the pattern for every resource: schemas in shared, `createRoute` definitions, one chained `OpenAPIHono`. Don't invent a second style.
2. **Schemas live in `shared/`.** The zod schema is the single source of truth — API validation, OpenAPI docs, and frontend forms all derive from it. Never duplicate a schema on one side.
3. **Auth is a seam.** Feature code goes through the seam only: `getSession` / `requireAuth` / `Session` from `backend/src/auth` on the server, `frontend/src/lib/auth` in the browser. Never import the auth implementation anywhere else (the seam files and the auth mount in `backend/src/index.ts` are the only exceptions) — it is swappable and feature code must not know which one is installed.
4. **Database changes**: edit `backend/src/db/schema.ts` → `pnpm db:generate` → `pnpm db:migrate`. Never edit generated migration files by hand.
5. **New env vars** go into `backend/src/env.ts` (zod-validated, the server refuses to boot without them) *and* `.env.example`, always both.
6. **Register new routes** on the chained `api` in `backend/src/index.ts` — the chain is what makes RPC types reach the frontend.
7. **Frontend imports backend types type-only**: `import type { AppType } from "@cen/backend"`. A value import would pull server code into the bundle.
8. **pnpm only.** Never npm or yarn.
9. Don't weaken `tsconfig`, Biome rules, or zod schemas to make an error go away — fix the cause.

## Pitfalls

- Ports live in the root `.env`; `pnpm dev` reports all conflicts together. Change `DB_PORT`
  together with the port inside `DATABASE_URL`, and never stop containers you don't
  recognize — they belong to other projects.
- `admin@example.com` / `ChangeMe` is the well-known development identity. It exists only in
  local development; never copy it into production configuration.
- Generated files are never edited by hand: database migrations and
  `frontend/src/routeTree.gen.ts` (regenerates on `dev`/`build`).
- With shadcn/ui (the default frontend): everything under `frontend/src/components/ui/` is
  vendored, owned code — edit freely but intentionally. Style with the semantic tokens
  (`bg-background`, `text-muted-foreground`, …), never hardcoded colors; themes live in
  `frontend/src/styles/themes/`. With the Carbon variant, use `@carbon/react` components and
  Carbon tokens instead.

Done means `pnpm check` is green.
