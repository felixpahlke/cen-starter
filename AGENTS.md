# AGENTS.md

Guidelines for AI agents working in this repository.

## Project location — check this before anything else

Confirm that this clone lives in the durable location the user wants. Hidden agent workspaces
and temporary paths (for example `~/.bob/`, `~/.codex/`, `/tmp/`, or macOS `/var/folders/`)
are scratch space, not a project home, unless the user explicitly chose them.

If the user started from a URL or an empty workspace and did not choose a destination, stop
before installing dependencies, applying flavors, bootstrapping, or editing files. Ask one
plain question: **"Where would you like me to create this project?"** If useful, inspect their
home directory for an existing visible development folder and recommend a concrete
`<folder>/<project-name>` path; do not invent several arbitrary locations. Confirm the absolute
target, create a named project subfolder there, and continue all work in that location.

If the repository was already cloned into scratch space, preserve any work, recreate or move
it to the confirmed destination, and continue there. Do not delete the scratch copy without
permission.

## Setup mode — check this first

If `flavors/` exists (equivalently: `cen.finalized` is `false` in package.json), this is a
template whose setup is **not complete**, even if a flavor was already applied or the app
runs. Do not start building features. Use `.agents/skills/setup/SKILL.md` to choose the
configuration, bootstrap it, boot and verify it, obtain explicit approval, and finalize it.
Post-setup feature skills are intentionally staged outside `.agents/skills/` and become
discoverable only when finalization succeeds. If `flavors/` is gone and `cen.finalized` is
`true`, setup is complete — skip this section.

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
pnpm verify       # check + test + production build
pnpm fix          # auto-fix lint/format
pnpm db:generate  # generate migration from schema.ts changes
pnpm db:migrate   # apply migrations (needs the db running)
```

## First-time boot (doing this for your user)

1. Preconditions: Git, Node matching `.nvmrc`, pnpm, and a running Docker-compatible daemon (`docker info`).
2. In setup mode, follow the setup skill and use `pnpm bootstrap`; it creates `.env` after
   applying flavors. In an already-finalized developer clone, use `pnpm install` and copy
   `.env.example` to `.env` if needed.
3. Check configured ports for conflicts **before** starting. Never stop containers you don't
   recognize — they belong to other projects.
4. `pnpm dev` — starts the services included by the selected flavors with hot reload.
5. Verify: `curl http://localhost:3000/api/health` returns `{"status":"ok"}`. If a frontend
   exists, confirm it loads; Swagger UI is at `/api/docs`.
6. Exercise the configured auth path. With local auth and a database, have the user sign up;
   promote them through `pnpm db:studio` only if an admin is needed. With `oauth-proxy`, use
   the bundled local test IdP.
7. Run `pnpm verify`. This proves a healthy baseline, but setup mode is not complete until the
   setup skill's approval and finalization gate also succeeds.

## Rules

1. **Copy the canonical resource.** `shared/src/schemas/items.ts` + `backend/src/routes/items.ts` show the pattern for every resource: schemas in shared, `createRoute` definitions, one chained `OpenAPIHono`. Don't invent a second style.
2. **Schemas live in `shared/`.** The zod schema is the single source of truth — API validation, OpenAPI docs, and frontend forms all derive from it. Never duplicate a schema on one side.
3. **Auth is a seam.** Feature code goes through the seam only: `getSession` / `requireAuth` / `Session` from `backend/src/auth` on the server, `frontend/src/lib/auth` in the browser. Never import better-auth anywhere else (the seam files and the `/api/auth/*` mount in `backend/src/index.ts` are the only exceptions) — the implementation is swappable and feature code must not know which one is installed.
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

For normal work in a finalized project, done means `pnpm check` is green. Template setup has
the stricter completion gate in the setup skill.
