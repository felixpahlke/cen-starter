<!-- AI agents: setting this project up for your user? Read AGENTS.md first — it contains
     the setup runbook (env, port conflicts, verification) and links the guided workflows
     in skills/. Do not start guessing; the runbook covers the whole path. -->

# CEN-APP

**The full-stack starter for the agent era.** TypeScript end-to-end, type-safe from database to
browser, and running in under five minutes — one branch, one command, zero config.

One maximal base app: every variation (Carbon, oauth-proxy, no database, backend-only) is a
small, CI-tested transformation you — or your AI agent — apply in seconds instead of a template
branch you're stuck with.

## Start a project

```bash
pnpm create cen-app@latest
```

Or set up a clone of this repo directly:

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

## Why you'll like it

- **Instant start.** Local auth works out of the box — no identity provider, no accounts, no
  setup call. Sign up and build.
- **Type-safe without the ceremony.** The frontend infers API types straight from the backend
  (Hono RPC). No client generation step to forget — and you still get a full OpenAPI spec and
  Swagger UI, derived from the same zod schemas that validate every request.
- **Agent-native.** Conventions live in [AGENTS.md](AGENTS.md), guided workflows in `skills/`.
  Ask your agent to "switch to Carbon" or "add a projects resource" and it knows exactly how.
- **Handover-clean.** When decisions are made, `pnpm flavor finalize` strips all the machinery.
  What you deliver is exactly the app — nothing more.

## For AI agents

Read [AGENTS.md](AGENTS.md) before touching anything — it has the first-time setup runbook,
the conventions, and the pitfalls. Guided workflows (adding resources, migrations, deployment
debugging) live in `skills/`.

## Stack

- **backend/** — [Hono](https://hono.dev) + zod-openapi (validation + OpenAPI + Swagger UI from one schema), [better-auth](https://better-auth.com) (email/password + admin panel), [Drizzle](https://orm.drizzle.team) on PostgreSQL
- **frontend/** — React + Vite + TanStack Router/Query + Tailwind + shadcn/ui, styled IBM by default (Carbon-flavored theme, swappable in one line)
- **shared/** — zod schemas used by both sides (API validation and form validation can't drift apart)

Production ships as a single container: the API serves the built SPA. One image, one deploy —
OpenShift and Code Engine scripts included.

## Everyday commands

```bash
pnpm dev          # database (docker) + migrations + api + web, hot reload
pnpm check        # typecheck + lint — green means done
pnpm fix          # auto-fix lint/format
pnpm db:generate  # create a migration after editing backend/src/db/schema.ts
pnpm db:migrate   # apply migrations
pnpm db:studio    # browse the database (Drizzle Studio)
```

---

*CEN-APP succeeds `full-stack-cen-template`.*
