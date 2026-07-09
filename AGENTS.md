# AGENTS.md

Guidelines for AI agents working in this repository.

## Setup mode — check this first

If `flavors/` exists (equivalently: `cen.finalized` is `false` in package.json), this is a
freshly cloned template that has **not been configured yet**. Do not start building features.
Read `.agents/skills/setup/SKILL.md` and follow it: interview your user about what they need
(database? design system? frontend? auth?), apply the matching flavors, then run the
first-time setup below. If `flavors/` is gone, setup is done — skip this section.

## Stack map

pnpm workspace with three packages:

- `backend/` — Hono on Node. Routes are defined with `@hono/zod-openapi` (`createRoute`), which gives request validation, the OpenAPI spec, and Swagger UI (`/api/docs`) from one definition. Auth is better-auth (email/password + admin plugin) behind a seam (see rule 3). Database is PostgreSQL via Drizzle.
- `frontend/` — React SPA: Vite, TanStack Router (file-based) + TanStack Query, Tailwind, shadcn/ui. Talks to the API through the Hono RPC client (`hc<AppType>`) — types flow from the backend with no codegen.
- `shared/` — zod schemas used by both sides.

Dev services (PostgreSQL) run in Docker Compose; the apps themselves run natively.

## Commands

```bash
pnpm dev          # everything: db + migrations + api + web
pnpm check        # typecheck + lint — run this before considering any task done
pnpm fix          # auto-fix lint/format
pnpm db:generate  # generate migration from schema.ts changes
pnpm db:migrate   # apply migrations (needs the db running)
```

## First-time setup (doing this for your user)

1. Preconditions: Node ≥ 22 (`node --version`), pnpm (`corepack enable` if missing), Docker running (`docker info`).
2. `pnpm install`, then `cp .env.example .env`.
3. Check for port conflicts **before** starting: `lsof -nP -iTCP:5432 -sTCP:LISTEN` (repeat for 3000 and 5173). If a port is taken, edit `.env`: `DB_PORT` (also change the port inside `DATABASE_URL`), `API_PORT` (also change `BETTER_AUTH_URL`), or `WEB_PORT`. Never stop containers you don't recognize — they belong to other projects.
4. `pnpm dev` — starts Postgres in Docker, applies migrations, boots API and web with hot reload.
5. Verify: `curl http://localhost:3000/api/health` returns `{"status":"ok"}`; the web app (port 5173) shows "API connected". Swagger UI: `/api/docs`.
6. Have your user sign up in the app (or `POST /api/auth/sign-up/email`). To promote a user to admin, set `role` to `admin` on their row via `pnpm db:studio`.
7. `pnpm check` green = healthy baseline. You're done.

## Skills

Guided workflows live in `.agents/skills/` — read the matching `SKILL.md` **before** starting that kind of work:

- `.agents/skills/setup/` — configure a fresh clone: interview, flavors, finalize (deleted once setup is finalized)
- `.agents/skills/add-resource/` — add a complete CRUD resource (schema → table → migration → route → frontend)
- `.agents/skills/db-migrations/` — create, apply, and repair database migrations
- `.agents/skills/debug-openshift/` — triage a broken OpenShift deployment (`oc`)
- `.agents/skills/debug-code-engine/` — triage a broken Code Engine deployment (`ibmcloud ce`)

## Rules

1. **Copy the canonical resource.** `shared/src/schemas/items.ts` + `backend/src/routes/items.ts` show the pattern for every resource: schemas in shared, `createRoute` definitions, one chained `OpenAPIHono`. Don't invent a second style.
2. **Schemas live in `shared/`.** The zod schema is the single source of truth — API validation, OpenAPI docs, and frontend forms all derive from it. Never duplicate a schema on one side.
3. **Auth is a seam.** Routes only use `getSession` / `requireAuth` / `Session` from `backend/src/auth`. Never import better-auth outside `backend/src/auth/` — the implementation is swappable and other code must not know which one is installed.
4. **Database changes**: edit `backend/src/db/schema.ts` → `pnpm db:generate` → `pnpm db:migrate`. Never edit generated migration files by hand.
5. **New env vars** go into `backend/src/env.ts` (zod-validated, the server refuses to boot without them) *and* `.env.example`, always both.
6. **Register new routes** on the chained `api` in `backend/src/index.ts` — the chain is what makes RPC types reach the frontend.
7. **Frontend imports backend types type-only**: `import type { AppType } from "@cen/backend"`. A value import would pull server code into the bundle.
8. **pnpm only.** Never npm or yarn.
9. Don't weaken `tsconfig`, Biome rules, or zod schemas to make an error go away — fix the cause.

## Pitfalls

- Ports are configured in the root `.env`. If 5432, 3000, or 5173 is taken on this machine, change `DB_PORT` (together with the port inside `DATABASE_URL`), `API_PORT` (together with `BETTER_AUTH_URL`), or `WEB_PORT` — don't kill other projects' containers.
- `pnpm db:migrate` needs the database container running (`docker compose up -d --wait`).
- Everything under `frontend/src/components/ui/` is vendored shadcn — edit freely, it's owned code, but keep changes intentional.
- `frontend/src/routeTree.gen.ts` is generated by the TanStack Router plugin — never edit it; it regenerates on `dev`/`build`.
- The look is themed via CSS variables: `frontend/src/styles/themes/` (Carbon-flavored is active, stock shadcn available). To switch, change the one theme import in `styles/index.css`. Style components with the semantic tokens (`bg-background`, `text-muted-foreground`, …), never hardcoded colors.

**Done means `pnpm check` is green.**
