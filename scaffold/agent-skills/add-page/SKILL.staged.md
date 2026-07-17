---
name: add-page
description: Add a page to the frontend — file-based route, navigation entry, data fetching via the typed API client — following the existing layout and patterns.
---

# Add a page

Use this when the user asks for a new screen ("add a reports page"). Routing is file-based
(TanStack Router): a file under `frontend/src/routes/` *is* the route. Read one existing page
first — `frontend/src/routes/_layout/items.tsx` is the full-featured reference (data, forms,
dialogs), `_layout/index.tsx` the minimal one.

## Steps

1. **Route file.** Protected page (the normal case): `frontend/src/routes/_layout/<name>.tsx`
   — it inherits the auth guard, sidebar, and header from `_layout.tsx`. Public page (rare):
   top-level `frontend/src/routes/<name>.tsx` like `login.tsx`.

   ```tsx
   export const Route = createFileRoute("/_layout/reports")({
     component: ReportsPage,
   });
   ```

2. **`routeTree.gen.ts` regenerates itself** on `dev`/`build` — never edit it. If types don't
   pick the new route up, the dev server isn't running.

3. **Navigation.** In `frontend/src/routes/_layout.tsx`: add the path to the `AppRoute` union,
   then an entry in `navItems` (lucide icon; `admin: true` to show it to admins only — that
   flag only hides the link, real protection belongs in the backend route).

4. **Data.** TanStack Query + the typed client from `@/lib/api` — types flow from the backend,
   no codegen:

   ```tsx
   const { data } = useQuery({
     queryKey: ["reports"],
     queryFn: async () => {
       const res = await api.reports.$get({ query: { limit: 50, offset: 0 } });
       if (!res.ok) throw new Error(`Could not load reports (${res.status})`);
       return res.json();
     },
   });
   ```

   (Throw with the status like `items.tsx` does. `errorMessage(await res.json())` only
   typechecks on routes that declare error response schemas — the json union has no
   `message` field otherwise.)

   If the page needs a new API resource, do `.agents/skills/add-resource/` first.

5. **Forms** use react-hook-form + the zod schema from `@cen/shared` (`zodResolver`) — copy the
   dialog pattern from `items.tsx`, don't restate validation rules in the component.

## Style rules

- Semantic theme tokens only (`bg-background`, `text-muted-foreground`, `border-border`, …) —
  never hardcoded colors; the theme system depends on it.
- Reuse `@/components/ui/*` (vendored shadcn — owned code, extend it there, not inline).
- Loading states: `Skeleton`, matching the layout of the loaded content. Errors: `toast.error`
  with `errorMessage(...)` from `@/lib/errors`.

**Done means:** page renders, nav highlights it, `pnpm check` green.
