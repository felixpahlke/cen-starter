# Page anatomy — Carbon variant

How `assets/projects/frontend/carbon/projects.tsx` is put together, top to bottom. Adapt
it; don't restructure it.

## Route file

The page lives at `frontend/src/routes/_layout/<resource>.tsx` and registers itself:

```tsx
export const Route = createFileRoute("/_layout/projects")({
  component: ProjectsPage,
});
```

Under `_layout/` it inherits the auth guard and the Carbon UI Shell. `routeTree.gen.ts`
regenerates on `dev`/`build`; never edit the generated file.

## DataTable

Carbon's `DataTable` is a render-prop component over *flat string rows*:

- `toProjectRow` maps each API record to a display row (formatted date, fallback
  description text). Keep the raw records in a `Map` by id — action handlers need the real
  record, not the display row.
- `headers` is a module-level constant with `satisfies DataTableHeader[]`.
- Inside the render prop, spread `getHeaderProps`/`getRowProps`/`getCellProps` and pull
  `key` out first (React wants it passed directly, not spread).
- Row actions are an `OverflowMenu` (flipped, `size="sm"`) in the last cell; delete is an
  `OverflowMenuItem` with `isDelete`.
- The toolbar (`TableToolbar` → `TableToolbarContent`) holds the "New" button with
  `renderIcon={Add}`.
- All four states render explicitly: `SkeletonText` rows shaped like real rows, error and
  empty states as full-width cells.

## Modals

- Create/edit use `Modal` with `onRequestSubmit={() => void form.handleSubmit(onSubmit)()}`
  — Carbon's primary button lives outside the `<Form>`, so submit is invoked manually.
- `primaryButtonDisabled={mutation.isPending}` plus `loadingStatus`/`loadingDescription`
  give the built-in busy state.
- Delete is its own `Modal` with `danger` — Carbon's pattern for destructive confirmation.
- Form lifecycle is identical to every variant: reset-on-success for create, `useEffect`
  reset when the edit target changes, `""` ↔ `null` normalization for nullable fields
  (see `patterns.md`).

## Form controls

react-hook-form's `Controller` wires Carbon inputs: `TextInput`/`TextArea` with a unique
`id`, `labelText`, and inline validation via `invalid={!!fieldState.error}` +
`invalidText={fieldState.error?.message}`. Validation copy comes from the shared zod
schema — never restated in the component.

## Styling rules

- Carbon type classes for text (`cds--type-heading-05`, `cds--type-body-01`) and semantic
  Carbon tokens through the Tailwind mapping (`text-text-secondary`, `text-support-error`)
  — never hardcoded colors, never shadcn imports.
- Layout may use Tailwind utilities (`flex`, `gap-6`, `max-w-md truncate`); colors and
  type always go through Carbon tokens.
- Errors surface with `errorMessage(error, "fallback")` from `@/lib/errors` in toasts.

## API helpers

Plain functions at the bottom of the file — one per operation, each through the typed
client, each throwing with the HTTP status on failure. Identical across design systems;
only the rendering differs.
