# Add a feature, end to end

The core loop of this template: data model → API → frontend, one type-safe chain.

> 🤖 **With your agent:** "Add projects. A project has a name and an optional description,
> belongs to the signed-in user, and gets a page in the sidebar." That's the whole feature —
> the `add-resource` skill collects what's missing, creates every file, generates the
> migration, and verifies the result. The rest of this page is the same work by hand.

## The chain

One zod schema in `shared/` feeds everything — no client generation step; the frontend
infers API types straight from the backend code (Hono RPC):

```
shared zod schema
  → backend request validation (@hono/zod-openapi)
  → OpenAPI spec + Swagger UI (generated from the same schemas)
  → AppType (the chained router type in backend/src/index.ts)
  → typed frontend client (hc<AppType> in frontend/src/lib/api.ts)
  → form validation (zodResolver, same schema again)
```

Two rules keep it intact: schemas are defined once, in `shared/`; and the backend router
stays one unbroken chain (`.route("/a", aRoute).route("/b", bRoute)` — no intermediate
variables).

## The reference implementation

The canonical pattern lives in the `add-resource` skill: a complete reference
implementation of a `projects` resource — real files, compiled and tested against every
release of the template:

```
.agents/skills/add-resource/
  SKILL.md                     the step-by-step workflow
  references/patterns.md       why the files look the way they do
  references/frontend-*.md     page anatomy for this project's design system
  assets/projects/             the files you copy
```

## Doing it by hand

Copy each reference file to its destination, rename `project`/`Project`/`projects` to your
resource, adapt the fields, and delete the first line of each copied file (the
`// @ts-nocheck — skill asset` marker):

| Copy from `assets/projects/`      | To                                           |
| --------------------------------- | -------------------------------------------- |
| `shared/projects.ts`              | `shared/src/schemas/<resource>.ts`           |
| `backend/db/projects.ts`          | `backend/src/db/schema/<resource>.ts`        |
| `backend/routes/projects.ts`      | `backend/src/routes/<resource>.ts`           |
| `backend/routes/projects.test.ts` | `backend/src/routes/<resource>.test.ts`      |
| `frontend/*/projects.tsx`         | `frontend/src/routes/_layout/<resource>.tsx` |

Then wire the five registration points:

**1. Export the schema** from `shared/src/index.ts`:

```ts
export * from "./schemas/<resource>";
```

**2. Export the table** from `backend/src/db/schema/index.ts` (one schema file per
resource):

```ts
export * from "./<resource>";
```

**3. Generate and apply the migration** (database running: `docker compose up -d --wait`):

```bash
pnpm db:generate   # writes the SQL migration — read it before applying
pnpm db:migrate
```

Never edit generated migration files by hand.

**4. Register the route** on the chained `api` in `backend/src/index.ts` — this is the step
that carries the types to the frontend:

```ts
import { projectsRoute } from "./routes/projects";

const api = new OpenAPIHono().route("/health", healthRoute).route("/projects", projectsRoute);
```

**5. Add the sidebar entry** in `frontend/src/routes/_layout.tsx`: add the path to the
`AppRoute` union and an entry to `navItems`. `routeTree.gen.ts` regenerates itself on
`dev`/`build` — never edit it.

## Done means green

```bash
pnpm check
pnpm test
```

The endpoints appear in Swagger UI (http://localhost:3000/api/docs), and a record created
in the UI survives a reload — schema to database to API to screen, with one definition of
the shape.

Want the deeper why — ownership scoping, `z.input` vs `z.output`, serialization, the
dialog lifecycle? Read `references/patterns.md` and the frontend reference next to the
assets; they're written for humans as much as for agents.
