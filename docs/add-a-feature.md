# Add a feature, end to end

The core loop of this template: data model → API → frontend, one type-safe chain. This
walkthrough adds a complete **notes** feature. It's the same recipe for every resource —
the built-in **items** feature is the canonical version of this pattern, and when in doubt
you copy from it.

> 🤖 **With your agent:** "Add a notes resource — a note has text content, belongs to the
> signed-in user, newest first — and give it a page in the sidebar." That's the whole
> feature (the `add-resource` and `add-page` skills). The steps below are what happens
> under the hood — worth doing by hand once to understand the chain.

There is **no client generation step** anywhere below. The frontend infers API types
directly from the backend code (Hono RPC) — when you finish step 4, the frontend already
knows the new endpoints.

## 1. Schema — the single source of truth

Create a new file `shared/src/schemas/notes.ts` — one zod schema, used by API validation,
the OpenAPI spec, and frontend forms:

```ts
import { z } from "zod";

export const NoteSchema = z.object({
  id: z.uuid(),
  content: z.string().trim().min(1).max(5000),
  ownerId: z.string(),
  createdAt: z.iso.datetime(),
});

export const NoteCreateSchema = NoteSchema.pick({ content: true });

// The consts above export the runtime validators; these export the matching
// compile-time types, so components write `import { type Note }` instead of
// re-deriving the shape with z.infer at every use site.
export type Note = z.infer<typeof NoteSchema>;
export type NoteCreate = z.infer<typeof NoteCreateSchema>;
```

Then make the new file part of the `@cen/shared` package by adding one line to
`shared/src/index.ts`, which now reads:

```ts
export * from "./schemas/items";
export * from "./schemas/notes";
export * from "./schemas/pagination";
```

(Alphabetical order — the linter enforces it. If `pnpm check` ever complains about
formatting or ordering, `pnpm fix` sorts it out literally.)

That's what lets the backend and frontend write `import { NoteSchema } from "@cen/shared"`.
Never restate these shapes anywhere else — `.pick` and `.partial` derive the variants.

## 2. Table + migration

In `backend/src/db/schema.ts`, add the table at the bottom, under the
`// --- application tables ---` comment where `items` already lives:

```ts
export const notes = pgTable("note", {
  id: uuid("id").primaryKey().defaultRandom(),
  content: text("content").notNull(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

Then generate and apply the migration:

```bash
pnpm db:generate   # writes the SQL migration — review it
pnpm db:migrate    # applies it (database must be running)
```

Never edit generated migration files by hand.

## 3. API route

`backend/src/routes/notes.ts` — copy the structure of `backend/src/routes/items.ts`: one
`createRoute` definition per operation, one chained sub-router built with
`protectedRouter()` (every route on it requires a signed-in user). Condensed to
list + create:

```ts
import { NoteCreateSchema, NoteSchema, PaginationSchema } from "@cen/shared";
import { createRoute, z } from "@hono/zod-openapi";
import { desc, eq } from "drizzle-orm";
import { db } from "../db";
import { notes } from "../db/schema";
import { json, protectedRouter } from "./lib";

const listNotes = createRoute({
  method: "get",
  path: "/",
  tags: ["notes"],
  request: { query: PaginationSchema },
  responses: { 200: json(z.array(NoteSchema), "List notes") },
});

const createNote = createRoute({
  method: "post",
  path: "/",
  tags: ["notes"],
  request: { body: json(NoteCreateSchema, "Note to create") },
  responses: { 201: json(NoteSchema, "Created note") },
});

function serialize(row: typeof notes.$inferSelect) {
  return { ...row, createdAt: row.createdAt.toISOString() };
}

export const notesRoute = protectedRouter()
  .openapi(listNotes, async (c) => {
    const { limit, offset } = c.req.valid("query");
    const rows = await db.query.notes.findMany({
      where: eq(notes.ownerId, c.get("session").user.id),
      orderBy: desc(notes.createdAt),
      limit,
      offset,
    });
    return c.json(rows.map(serialize), 200);
  })
  .openapi(createNote, async (c) => {
    const [row] = await db
      .insert(notes)
      .values({ ...c.req.valid("json"), ownerId: c.get("session").user.id })
      .returning();
    if (!row) throw new Error("insert returned no row");
    return c.json(serialize(row), 201);
  });
```

Keep the chain unbroken (no intermediate variables between `.openapi()` calls) — the chain
is what carries the types to the frontend.

## 4. Register the route

In `backend/src/index.ts`, import the route at the top with the other route imports:

```ts
import { notesRoute } from "./routes/notes";
```

and add it to the chained `api`, which now reads:

```ts
const api = new OpenAPIHono()
  .route("/health", healthRoute)
  .route("/items", itemsRoute)
  .route("/notes", notesRoute);
```

**Checkpoint:** open http://localhost:3000/api/docs — the notes endpoints are in Swagger,
with request/response schemas derived from step 1. Nothing was generated; the zod schemas
*are* the documentation.

## 5. The page — where the types pay off

A file under `frontend/src/routes/_layout/` *is* a route (TanStack Router), and it inherits
the auth guard, sidebar, and header automatically. Create
`frontend/src/routes/_layout/notes.tsx` — this is the complete file:

```tsx
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_layout/notes")({
  component: NotesPage,
});

function NotesPage() {
  const notesQuery = useQuery({
    queryKey: ["notes"],
    queryFn: async () => {
      const res = await api.notes.$get({ query: { limit: 50, offset: 0 } });
      if (!res.ok) throw new Error(`Could not load notes (${res.status})`);
      return res.json(); // typed — hover it: the Note shape from step 1
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="font-semibold text-2xl">Notes</h1>
      {notesQuery.data?.map((note) => (
        <div key={note.id} className="rounded-lg border bg-card p-4">
          <p>{note.content}</p>
          <p className="text-muted-foreground text-sm">
            {new Date(note.createdAt).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}
```

The typed client (`api` from `@/lib/api`) already knows `api.notes` — the types flowed in
when you registered the route in step 4. Typos in paths, wrong query params, changed
response shapes: all compile errors now, not runtime surprises.

Notes on the file:

- `routeTree.gen.ts` regenerates itself while `pnpm dev` runs — never edit it. If the
  route type isn't picked up, the dev server isn't running.
- Style with the semantic tokens (`bg-card`, `text-muted-foreground`, …), never hardcoded
  colors; reuse the vendored components in `@/components/ui/`.
- For a create form, validate with the same `NoteCreateSchema` from `@cen/shared` via
  `zodResolver` — copy the dialog pattern from `frontend/src/routes/_layout/items.tsx`.

## 6. Add it to the sidebar

In `frontend/src/routes/_layout.tsx`, two small edits. Extend the `AppRoute` union:

```tsx
type AppRoute = "/" | "/items" | "/notes" | "/settings" | "/admin";
```

and add the entry to `navItems` (add `StickyNote` to the existing `lucide-react` import at
the top of the file):

```tsx
const navItems: NavItem[] = [
  { to: "/", label: "Dashboard", icon: Home },
  { to: "/items", label: "Items", icon: Package },
  { to: "/notes", label: "Notes", icon: StickyNote },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/admin", label: "Admin", icon: Shield, admin: true },
];
```

## 7. Done means green

```bash
pnpm check
```

Create a note in the UI, reload, and it's still there — schema to database to API to
screen, with one definition of the shape.
