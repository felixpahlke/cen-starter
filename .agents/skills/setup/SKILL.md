---
name: setup
description: >-
  Configure a freshly cloned CEN Starter template: interview the user about what they need,
  apply the matching flavors, verify, and finalize. Use when flavors/ exists (cen.finalized
  is false in package.json) — this project has not been set up yet.
---

# Template setup

This repo is a **maximal base app** (database, local auth, admin panel, shadcn/ui frontend,
example `items` resource). Flavors subtract or swap parts of it. Your job: find out what your
user actually needs, apply the matching flavors, then hand over a running app.

This skill and the `flavors/` machinery are deleted by `pnpm flavor finalize` — in a finalized
project none of this applies.

## 1. Interview the user

Ask only about decisions a flavor exists for — run `pnpm flavor list` to see what's available,
and read `references/<flavor>.md` for any flavor you're considering. The canonical questions:

- **Do you need a database?** Persistent data, user accounts → keep the base. Stateless API,
  proxy, demo without persistence → `no-database`.
- **Which design system?** The base is shadcn/ui with an IBM-flavored theme (safe default,
  fully ownable code). Hard requirement for IBM Carbon components → `carbon` (if available).
- **Do you need the frontend at all?** API-only service → `backend-only` (if available).
- **How will users authenticate?** Local email/password (base) works instantly. Company SSO in
  front of the app → `oauth-proxy` (if available).

Don't ask about things the user already told you. Don't offer flavors that don't exist in
`flavors/`. When in doubt, keep the base — subtracting later is documented in each reference
file; re-adding is manual work.

## 2. Apply

```bash
pnpm flavor apply <name>        # one at a time; validates everything before touching files
```

The engine dry-runs the whole manifest first — a failing apply changes nothing. After each
apply, run the flavor's post-apply checks from `references/<flavor>.md`, then commit:

```bash
git add -A && git commit -m "Apply <name> flavor"
```

## 3. First-time boot

Follow **"First-time setup"** in `AGENTS.md` (env file, port conflicts, `pnpm dev`,
verification, first user). Do this even if no flavor was applied.

## 4. Finalize — only with explicit user confirmation

When the user confirms the choices are settled (typically after the app runs and they've seen
it), strip the template machinery:

```bash
pnpm flavor finalize            # requires a clean git tree; commit first
git add -A && git commit -m "Finalize template setup"
```

This deletes `flavors/`, `scripts/flavor.ts`, `scripts/bootstrap.ts`, and this skill. It is not
reversible except via git. If the user is unsure, leave it un-finalized and tell them how to
finalize later.
