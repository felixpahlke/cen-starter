# Changelog

Template releases. Projects created from this template can pull updates from the `upstream`
remote (set up by `pnpm bootstrap`); this file tells you what you're pulling.
Format: [Keep a Changelog](https://keepachangelog.com), semver on `cen.templateVersion`.

## [Unreleased]

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
