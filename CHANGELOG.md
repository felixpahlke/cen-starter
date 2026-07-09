# Changelog

Template releases. Projects created from this template can pull updates from the `upstream`
remote (set up by `pnpm bootstrap`); this file tells you what you're pulling.
Format: [Keep a Changelog](https://keepachangelog.com), semver on `cen.templateVersion`.

## [Unreleased]

## [0.2.0] — 2026-07-09

Flavor composition: two flavors can now be applied together when the manifests declare it.

- Engine: `pnpm flavor apply <name> [<name>...]` applies flavors in order; `combinesWith`
  in a manifest whitelists a combination; overlays skip files an earlier flavor deleted;
  colliding files resolve via `flavors/<name>/combo/<other>/`; install + verify run once
  per invocation. Wrong order or untested pairs fail with an explanatory error.
- `oauth-proxy carbon` — the classic IBM-internal setup: Carbon UI behind company SSO
- `backend-only no-database` — stateless API services (e.g. watsonx Orchestrate tools)
- Setup skill interview is now scenario-driven: it recommends a configuration from what the
  project is (client-branded app, IBM-internal asset, SSO requirement, headless service)
- CI flavor matrix covers both combinations
- Verified against real agents: three setup scenarios run by weaker models on fresh clones;
  fixes from that exercise — flavor apply preserves a bootstrap-renamed compose project
  name, warns when a flavor changes `.env.example` under an existing `.env`,
  `cen.setupDone` renamed to `cen.bootstrapped`, placeholder favicon
- Release-audit fixes: `no-database` now also fixes the production Dockerfile and
  `.env.production.example`, removes inapplicable skills (as does `backend-only`), and
  `pnpm bootstrap` writes `.env` after flavors so flavored env examples land in it;
  invalid flavor sequences are rejected before any file changes

## [0.1.0] — 2026-07-09

Initial release of the single-branch template (successor to `full-stack-cen-template`).

- Base app: Hono + zod-openapi backend (Swagger UI from the zod schemas), React/Vite/TanStack
  frontend with shadcn/ui and a Carbon-flavored theme, better-auth (email/password + admin),
  Drizzle + PostgreSQL, end-to-end types via Hono RPC (no codegen)
- Flavor engine: `pnpm flavor list/apply/finalize` with four flavors: `no-database`,
  `backend-only`, `oauth-proxy` (oauth2-proxy + bundled Dex for local dev), and `carbon`
  (full @carbon/react UI with Carbon-token Tailwind bridge)
- Agent surface: AGENTS.md (setup mode + runbook), `.agents/skills/` (setup, add-resource,
  add-page, db-migrations, deploy + debug for OpenShift and Code Engine)
- Backend test setup: vitest + in-memory PGlite running the real migrations
- Production: single container (API serves the SPA), kustomize manifests, idempotent
  `deploy/deploy.sh`, CI with a flavor matrix and a Postgres smoke job
- `pnpm bootstrap`: post-clone naming, remotes, `.env`, optional flavor apply
