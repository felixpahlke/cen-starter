# cen-template

Full-stack TypeScript starter: Hono API + React SPA, end-to-end type-safe, one command to run.

## Quickstart

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Requires Node ≥ 22, pnpm, and Docker (for the dev database). If a port is taken on your
machine, adjust `.env`.

| URL | What |
|---|---|
| http://localhost:5173 | Web app (Vite dev server) |
| http://localhost:3000/api | API |
| http://localhost:3000/api/docs | Swagger UI (generated from the zod schemas) |

## Stack

- **backend/** — [Hono](https://hono.dev) + zod-openapi (validation + OpenAPI + Swagger UI from one schema), [better-auth](https://better-auth.com) (email/password + admin), [Drizzle](https://orm.drizzle.team) on PostgreSQL
- **frontend/** — React + Vite + TanStack Router/Query + Tailwind + shadcn/ui. Fully typed API client via Hono RPC — no code generation, types flow directly from the backend
- **shared/** — zod schemas used by both sides (API validation and form validation can't drift apart)

## Everyday commands

```bash
pnpm dev          # database (docker) + migrations + api + web, hot reload
pnpm check        # typecheck + lint — green means done
pnpm fix          # auto-fix lint/format
pnpm db:generate  # create a migration after editing backend/src/db/schema.ts
pnpm db:migrate   # apply migrations
pnpm db:studio    # browse the database (Drizzle Studio)
```

## Working with AI agents

This repo is built for it — see [AGENTS.md](AGENTS.md) for conventions and `skills/` for
guided workflows (adding resources, deploying, changing stack flavors).
