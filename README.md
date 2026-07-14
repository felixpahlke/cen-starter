<!-- AI agents: this URL is a template source, not the new project's name. Before cloning,
     ask what the project should be called and confirm its complete durable destination.
     Never infer `cen-starter` from the repository name unless the user explicitly chooses
     it, and never use a hidden agent playground or temp directory as the project home. Then
     read AGENTS.md — it contains the required setup and finalization gate. -->

# CEN Starter

**The full-stack starter for the agent era.** TypeScript end-to-end, type-safe from database to
browser, and running in under five minutes — one branch, one command, zero config.

One maximal base app: every variation (Carbon, oauth-proxy, no database, backend-only — and
the sensible combinations) is a small, CI-tested transformation you — or your AI agent —
apply in seconds instead of a template branch you're stuck with.

## Start a project

```bash
pnpm create cen-app@latest /path/to/my-app
```

Choose a normal, visible development folder you intend to keep. `cen-starter` is the template
repository's name, not a default name for your project. If an agent starts this for you from
a URL or empty workspace, it should ask what the project is called and confirm the complete
`<folder>/<project-name>` destination before cloning or installing anything.

Or set up a clone of this repo directly:

```bash
pnpm install
pnpm bootstrap   # naming, git remotes, .env — the same step create-cen-app runs for you
pnpm dev
```

Requires Node ≥ 22, pnpm, and Docker (for the dev database). If a port is taken on your
machine, adjust `.env`. Before feature work, verify the configured app and run
`pnpm flavor finalize`; finalization activates the compatible feature skills for AI agents.

## Choose authentication

For a browser app with human users, use `oauth-proxy` by default when company SSO is required
**or the pilot could plausibly become production**:

```bash
pnpm bootstrap --name my-app --flavors oauth-proxy
```

Local development needs no external IdP or client registration: `pnpm dev` starts a bundled
Dex test IdP and OAuth2 Proxy, and the app is available through http://localhost:4180.

Keep the base local auth when the product itself must own accounts and credentials (for
example public self-sign-up across customers with no shared IdP), or for a deliberately
throwaway demo where production identity is out of scope. The amount of app data attached to
a user is **not** a reason to choose local auth: the proxy flavor keeps a local user row for
roles, ownership, preferences, and other product data while the IdP owns identity.

The proxy makes changing OIDC providers mostly an infrastructure concern, but not a guaranteed
zero-code swap. A new provider still needs a client registration and a compatible claim
contract; if its stable user identifier changes, existing user-owned data must be migrated or
relinked. The guided setup skill covers the detailed decision and production caveats.

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
- **Agent-native.** Conventions live in [AGENTS.md](AGENTS.md). Setup guidance is available
  first; finalization activates only the feature workflows compatible with the chosen stack.
  Ask your agent to "switch to Carbon" during setup or "add a projects resource" afterward.
- **Handover-clean.** When decisions are made, `pnpm flavor finalize` strips all the machinery.
  What you deliver is exactly the app — nothing more.

## For AI agents

Read [AGENTS.md](AGENTS.md) before touching anything — it has the first-time setup runbook,
the conventions, and the pitfalls. During template setup, only setup-time workflows are
discoverable. `pnpm flavor finalize` activates the compatible guided workflows for adding
resources, migrations, deployment, and debugging in `.agents/skills/`.

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
pnpm test         # backend tests (in-memory Postgres, real migrations)
pnpm verify       # check + test + production build
pnpm fix          # auto-fix lint/format
pnpm db:generate  # create a migration after editing backend/src/db/schema.ts
pnpm db:migrate   # apply migrations
pnpm db:studio    # browse the database (Drizzle Studio)
```

---

*CEN Starter succeeds `full-stack-cen-template`.*
