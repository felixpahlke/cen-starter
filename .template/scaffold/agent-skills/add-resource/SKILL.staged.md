---
name: add-resource
description: Add a complete CRUD resource — shared zod schema, database table, migration, API route, tests, and frontend page — from the reference implementation shipped inside this skill.
---

# Add a resource

Use this when the user asks for a new entity ("add projects", "we need customers"). This
skill contains a complete, verified reference implementation of a `projects` resource in
`assets/projects/`. You are copying its structure and adapting names and fields — not
inventing a structure.

Read `references/patterns.md` once before your first resource: it explains the type-safe
chain and the rules the reference files follow. Browser projects also ship one frontend
reference in `references/` (matching this project's design system) explaining the page
anatomy.

## Decide first

Collect only what is genuinely missing from the request:

1. Resource name — singular and plural (e.g. `project` / `projects`).
2. Fields and their constraints (required? max length? nullable?).
3. Ownership — default is user-owned: an `ownerId` referencing `user.id`, every query
   scoped to the signed-in user. Only drop this if records are genuinely shared.
4. Which UI the user needs — full CRUD page in the sidebar is the default; skip the
   frontend steps if they only asked for an API.

## Copy map

Copy each asset to its destination, then rename `project`/`Project`/`projects` to the new
resource and adapt the fields. **Delete the first line of every copied file** (the
`// @ts-nocheck — skill asset` marker — it belongs to the reference file, not to app code).

| Asset (in `assets/projects/`)     | Destination                                  |
| --------------------------------- | -------------------------------------------- |
| `shared/projects.ts`              | `shared/src/schemas/<resource>.ts`           |
| `backend/db/projects.ts`          | `backend/src/db/schema/<resource>.ts`        |
| `backend/routes/projects.ts`      | `backend/src/routes/<resource>.ts`           |
| `backend/routes/projects.test.ts` | `backend/src/routes/<resource>.test.ts`      |
| `frontend/*/projects.tsx`         | `frontend/src/routes/_layout/<resource>.tsx` |

## Steps

1. **Shared contract** — copy the schema file, adapt fields, and export it from
   `shared/src/index.ts` (`export * from "./schemas/<resource>";`).
2. **Table** — copy the schema file into `backend/src/db/schema/<resource>.ts` (one file
   per resource) and export it from `backend/src/db/schema/index.ts`.
3. **Migration** — `pnpm db:generate`, **read the generated SQL**, then `pnpm db:migrate`
   (database running: `docker compose up -d --wait`).
4. **Route** — copy the route file, then register it in `backend/src/index.ts` on the
   chained `api`: `.route("/<resource>", <resource>Route)`. The chain is what carries
   types to the frontend — never assign intermediate variables between `.route()` calls.
5. **Tests** — copy the test file. It is hermetic (PGlite + mocked auth seam); adapt the
   field names and keep the ownership-boundary tests.
6. **Frontend page** (when the project has a `frontend/` workspace and the user wants UI) —
   copy the page from `assets/projects/frontend/`, adapt fields and copy text.
7. **Navigation** — in `frontend/src/routes/_layout.tsx`: add the path to the `AppRoute`
   union and an entry to `navItems`. `routeTree.gen.ts` regenerates on `dev`/`build` —
   never edit it by hand.

## Verify

- `pnpm check` and `pnpm test` green.
- The new endpoints appear in Swagger UI (`/api/docs`) with correct schemas.
- Exercise one round trip (create + list) through the UI or `curl` with a session cookie.

## Pitfalls

- Schemas live in `shared/` only — the backend and frontend both import them; never restate
  a shape.
- `z.input` vs `z.output`: schemas with `.default()` or transforms have different input and
  output types; forms are typed on the input, mutations on the output (the reference page
  shows the pattern).
- Serialize `Date` fields (`toISOString()`) in the route — the contract says
  `z.iso.datetime()`.
- Ownership checks return 404, not 403 — do not reveal that a foreign record exists.
