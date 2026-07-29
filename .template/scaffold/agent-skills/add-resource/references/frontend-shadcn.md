# Page anatomy — shadcn variant

How `assets/projects/frontend/shadcn/projects.tsx` is put together, top to bottom. Adapt
it; don't restructure it.

## Route file

The page lives at `frontend/src/routes/_layout/<resource>.tsx` and registers itself:

```tsx
export const Route = createFileRoute("/_layout/projects")({
  component: ProjectsPage,
});
```

Under `_layout/` it inherits the auth guard, sidebar, and header. `routeTree.gen.ts`
regenerates on `dev`/`build`; if route types don't pick the file up, the dev server isn't
running — never edit the generated file.

## Page component

- One query (`useQuery` with the shared query key) drives the table.
- Dialog state is lifted: `createOpen` (boolean) and `editingProject` (the row being
  edited, or `null`). The edit dialog's open state *is* `!!editingProject` — no separate
  boolean to drift out of sync.
- Delete uses `window.confirm` plus a mutation — the smallest honest confirmation. Swap in
  an `AlertDialog` if the product needs styled confirmation.
- The table renders all four states explicitly: pending (skeleton rows shaped like real
  rows), error (message in a full-width cell), empty ("No projects yet"), and data.

## Create dialog

- `useForm<Input, unknown, Output>` — input type for what the user types, output type for
  what `zodResolver` produces (see patterns.md on `z.input`/`z.output`).
- On success: invalidate the query key, `form.reset(...)` back to defaults, close, toast.
  Reset on success — not on close — so a cancelled dialog keeps the user's draft.
- Nullable text fields are edited as `""` and normalized to `null` on submit
  (`normalizeDescription`). The form never holds `null`; the API never receives `""`.

## Edit dialog

- Same form setup, but a `useEffect` resets the form whenever the edit target changes —
  opening row B after row A must show B's values, not A's leftovers.
- Submit guards on the target still existing, then mutates with `{ id, values }`.

## Styling rules

- Semantic tokens only: `text-muted-foreground`, `text-destructive`, `bg-background` — never
  hardcoded colors; both themes depend on it.
- Reuse `@/components/ui/*` (vendored shadcn — owned code; extend it there, not inline).
- Icons are lucide, passed as children to `Button` (`<Pencil />`, sized by the button).

## API helpers

Plain functions at the bottom of the file — one per operation, each through the typed
client (`api.projects.$get`, `api.projects[":id"].$patch`, …), each throwing with the HTTP
status on failure. They stay in the page file until a second consumer appears.
