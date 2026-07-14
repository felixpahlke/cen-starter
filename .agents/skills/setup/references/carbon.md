# carbon

Swaps the shadcn/ui frontend for the real IBM Carbon Design System (`@carbon/react`):
UI Shell header layout, Carbon components on every page, g10 (light) / g90 (dark) theme
zones, IBM Plex stays self-hosted.

## When to choose it

A hard requirement for genuine Carbon — IBM-internal tooling, client insists on Carbon
compliance, or the team already knows Carbon. Otherwise keep the base: it already *looks*
IBM (Carbon-flavored theme on shadcn) while every component stays owned, editable code.
The trade: Carbon components are a dependency you style within, not code you own.

**Combines with `oauth-proxy`** — the classic IBM-internal setup (Carbon UI behind company
SSO): pass `--flavors oauth-proxy,carbon` to bootstrap, in that order (carbon composes on top; a combo
variant of the layout drops the login/settings/admin pages the proxy flavor removes).
**Conflicts with `no-database` and `backend-only`** — if one of those matters more, apply it
and restyle by hand using the template repo's `carbon` overlay as the reference.

## What it changes

- `@carbon/react` + `@carbon/icons-react` + `sass-embedded` added (explicit versions, not
  catalog refs — the engine can't extend the catalog); shadcn's radix/cva/clsx/lucide deps
  removed. react-hook-form, zod resolvers, sonner, TanStack stay.
- Deletes `components/ui/` (vendored shadcn), `mode-toggle`, `lib/utils` (cn), the CSS-variable
  themes. `styles/carbon.scss` imports Carbon (font-face emission off — Plex is self-hosted).
- **Theme**: ThemeProvider stamps `cds--g10`/`cds--g90` zone classes on `<html>` next to the
  Tailwind `dark` class. Toggle lives in the header.
- **Tailwind bridge** (`styles/carbon-map.css`): all ~230 Carbon color tokens (incl. the AI
  set) exposed as Tailwind colors — `text-text-secondary`, `bg-layer-01`, … Use Tailwind for
  layout/spacing, Carbon components for controls, mapped tokens for custom color needs.
  Generated from `@carbon/themes`; regeneration is a template-maintenance task.
- Pages: UI Shell layout (Header/nav/global actions/account panel), Carbon forms
  (TextInput/PasswordInput + react-hook-form Controller, `invalidText` errors), items as
  DataTable + Modals + OverflowMenu row actions, admin as user DataTable with role/status Tags.

## Post-apply checks

1. `pnpm check` and `pnpm test` green (apply runs them).
2. `pnpm dev`, then log in with `admin@example.com` / `ChangeMe` and click through: dashboard
   (UI Shell renders, active nav underline) → items create/edit/delete via modals → theme
   toggle (g10 ↔ g90, body background must follow) → account panel sign-out. With the
   `oauth-proxy,carbon` combination, enter through `OAUTH_PROXY_PORT` from `.env` and use its
   Dex login.
3. The canonical copy pattern changes: new pages copy `_layout/items.tsx` (DataTable + Modal
   pattern), not a shadcn page. `.agents/skills/add-page` still applies for routing/nav.

## Retrofitting late

Feasible by hand: the template repo's `flavors/carbon/overlay/` shows the target state of
every touched file. Biggest chunks are the layout (UI Shell) and any pages built on vendored
shadcn components in the meantime.
