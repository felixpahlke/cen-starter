---
name: template-maintenance
description: Maintain the CEN Starter template repository itself — keep flavors applying, add flavors, release versions. Template repo only; not for projects created from it (deleted at finalize).
---

# Template maintenance

Only applies in the **template repository** (`cen-starter` itself). If this is a project created
from the template, stop — this skill is not for you (finalize removes it).

The template repository never finalizes, so the root `AGENTS.md` stays the setup gate
permanently. The working conventions for finished projects live in `scaffold/AGENTS.md`
(installed as the project's `AGENTS.md` at finalization) — keep that file accurate when the
base changes. The root `pnpm db:generate` is guarded while `cen.finalized` is false; for
base-schema work run `CEN_TEMPLATE_MAINTENANCE=1 pnpm db:generate`.

## Changing the base app

Every base change can break flavors — their edit anchors match exact strings, their overlays
assume the base's shape. After any change, verify every standalone flavor and supported
combination in disposable copies of the current working tree:

```bash
pnpm verify:flavors
```

The command derives its variants from the manifests, then applies, checks, tests, and builds
each one. A broken anchor fails loudly at the apply step, naming the anchor. When fixing
manifests, prefer converting fragile `edits` into `delete` + `overlay` — anchors are the
maintenance cost.

Keep the canonical resource (`backend/src/routes/items.ts`, `shared/src/schemas/items.ts`)
exemplary: it gets copied into every project resource, flaws included.

## Adding a flavor

1. `flavors/<name>/manifest.json` — bias delete+overlay over edits; declare `conflicts` in
   BOTH directions (this manifest and the conflicting ones).
2. Overlay `.ts`/`.tsx` files start with the `// @ts-nocheck — template overlay; …` line
   (stripped on apply). Exception: files that already carry their own `@ts-nocheck` (e.g.
   generated `routeTree.gen.ts`) get NO template header — stripping would remove theirs.
3. Declare supported combinations with `combinesWith`; `pnpm verify:flavors` discovers them.
4. Write `.agents/skills/setup/references/<name>.md`: when to choose it, what it changes,
   post-apply checks, late-retrofit notes.
5. If the flavor makes a feature skill inapplicable, delete
   `scaffold/agent-skills/<skill>/**` in its manifest. Feature skills stay staged there as
   `SKILL.md.template` files until finalization renames them back; do not put them directly
   in `.agents/skills/`, and do not name a staged file `SKILL.md`.
6. Run `pnpm verify:flavors`; it verifies bootstrap, the configured app, finalization, and
   promotion of every compatible staged skill.

## Releasing

1. Update `CHANGELOG.md` (Unreleased → version + date, human-readable — projects read this
   when pulling updates).
2. Bump `cen.templateVersion` in package.json (semver: breaking = flavor/manifest/seam
   changes projects must react to).
3. Tag: `git tag v<version> && git push --tags`.

## Dependency bumps

Versions are pinned once in the `pnpm-workspace.yaml` catalog. Bump there, `pnpm install`,
`pnpm verify`, then `pnpm verify:flavors` — dependency changes break overlays too (they
reference package APIs).
