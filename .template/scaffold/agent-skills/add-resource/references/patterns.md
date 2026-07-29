# Cross-stack patterns behind the reference implementation

Why the files in `assets/projects/` look the way they do. Read once; afterwards the code
itself is the reference.

## The type-safe chain

One zod schema in `shared/` feeds everything:

```
shared zod schema
  → backend route validation (@hono/zod-openapi validates requests against it)
  → OpenAPI spec (Swagger UI is generated from the same schemas)
  → AppType (the chained Hono router's type, exported from backend/src/index.ts)
  → typed frontend client (hc<AppType> in frontend/src/lib/api.ts)
  → form validation (zodResolver with the same schema)
```

There is no codegen step. The chain only works if two rules hold:

- **Schemas are defined once, in `shared/`.** The backend never restates a shape; the
  frontend never restates a validation rule.
- **The backend router is one unbroken chain.** `protectedRouter().openapi(...).openapi(...)`
  in the route file, `.route("/a", aRoute).route("/b", bRoute)` in `index.ts`. Assigning an
  intermediate variable between calls widens the type and the frontend loses inference.

## Schema derivation

The full shape (`ProjectSchema`) is the source; variants are derived, never rewritten:

- `Create` = `.pick()` the client-settable fields. Fields the server fills in (`id`,
  `ownerId`, `createdAt`) are never in a request body.
- Optional-on-create fields get `.default(null)` — the client may omit them, the handler
  still receives a complete object.
- `Update` = `.pick().partial()` plus a `.refine` that rejects an empty PATCH body.
- `.trim()` and length limits live on the base schema, so every variant inherits them.

`.default()` and transforms make a schema's input and output types differ. That is why the
frontend page defines both: `z.input<typeof Schema>` types the form (what the user may
type), `z.output<typeof Schema>` types the mutation (what the API receives after parsing).

## Ownership and authorization

- `protectedRouter()` (from `backend/src/routes/lib.ts`) applies `requireAuth`; handlers
  read the user from `c.get("session").user.id`.
- Every query is scoped to the owner: list filters on `ownerId`, get/patch/delete match
  `and(eq(id), eq(ownerId))`.
- A foreign record answers **404, not 403** — the API does not reveal that the record
  exists. The nav-level `admin` flag in the frontend only hides links; real protection is
  only ever the backend check.
- The owner column cascades on user deletion (`onDelete: "cascade"`).

## Serialization

Drizzle returns `Date` objects; the contract says `z.iso.datetime()`. Every route file has
a `serialize` helper that converts before responding. If you add more `Date`/`Decimal`-like
columns, extend that helper — do not weaken the schema.

## Database schema files

One file per resource in `backend/src/db/schema/`, exported from `schema/index.ts`. The
drizzle query API (`db.query.<name>`) uses the export name, so export the table under the
name you want to query. Migrations are generated (`pnpm db:generate`), reviewed, then
applied — drizzle-kit occasionally picks a destructive interpretation for renames, which is
why reading the SQL is a step, not a suggestion.

## Queries and mutations (frontend)

- One `const <resource>QueryKey = ["<resource>"] as const` per resource; every query and
  every invalidation uses it.
- Mutations invalidate on success (`queryClient.invalidateQueries({ queryKey })`) — the
  table refreshes without manual cache surgery.
- Buttons disable on `mutation.isPending`; errors surface as toasts; the table renders all
  four states (pending skeleton, error, empty, rows).
- The typed client throws with the HTTP status (`Could not load projects (500)`). Routes
  that declare error response schemas can use `errorMessage(...)` instead; plain status
  throws are the safe default.

## Tests

The test file is hermetic: PGlite (in-memory Postgres) runs the real migrations, and the
auth seam is mocked at module level (`vi.mock("../auth")`) with an `x-test-user` header
standing in for a session. No Docker, no network. The tests that matter most are the
ownership boundaries — keep "lists only the signed-in user's records" and "hides another
user's record" in every adapted copy.
