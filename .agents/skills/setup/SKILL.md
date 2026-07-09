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

Open with the project, not the tech: **what are you building, and who is it for?** Then
recommend a configuration with reasons — act like an experienced colleague, not a form. Run
`pnpm flavor list` to see what exists; read `references/<flavor>.md` for any flavor you're
about to recommend.

Typical CEN scenarios and what to recommend:

- **App for a client, branded as theirs** → keep the base. The shadcn/ui components are
  ownable code — restyle them to the client's brand so the solution feels like the client's
  own product.
- **IBM-internal asset or tool, or Carbon compliance is a requirement** → `carbon`. Real
  `@carbon/react`; it looks like an IBM product out of the box.
- **Company SSO in front of the app** (W3ID, Entra, any OIDC IdP) → `oauth-proxy`. For the
  classic internal-tool setup, combine it with Carbon:
  `pnpm flavor apply oauth-proxy carbon`.
- **Backend service — tools for watsonx Orchestrate, an agent backend, another team's
  frontend** → `backend-only`. If it holds no state of its own (stateless tools, pure
  orchestration), drop the database too: `pnpm flavor apply backend-only no-database`.
- **Quick demo or PoC with user accounts** → base as-is; local email/password works
  instantly, no IdP conversation needed.

Ask one or two clarifying questions at most, and only about decisions a flavor exists for
(database? frontend? design system? auth?). Don't ask about things the user already told you.
When in doubt, keep the base — subtracting later is documented in each reference file;
re-adding is manual work.

## 2. Apply

```bash
pnpm flavor apply <name> [<name>...]    # validates before touching files
```

The engine dry-runs each manifest first — a failing apply changes nothing. Supported
combinations are declared in the manifests (`combinesWith`) and **order matters**: the
combining flavor goes last (`oauth-proxy carbon`, `backend-only no-database`). Everything
else the engine refuses with an explanation. After applying, run the post-apply checks from
each flavor's `references/<flavor>.md`, then commit:

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
