---
name: template-maintenance
description: Maintain the CEN Starter template repository itself — keep flavors applying, add flavors, release versions. Template repo only; not for projects created from it (deleted at finalize).
---

# Template maintenance

Only applies in the **template repository** (`cen-starter` itself). If this is a project created
from the template, stop — this skill is not for you (finalize removes it).

## Changing the base app

Every base change can break flavors — their edit anchors match exact strings, their overlays
assume the base's shape. After any change:

```bash
# per flavor — in a scratch copy or worktree, never the real tree
git worktree add /tmp/flavor-check HEAD && cd /tmp/flavor-check
pnpm install && pnpm flavor apply <name>       # dry-run validates first; runs check + verify
cd - && git worktree remove --force /tmp/flavor-check
```

CI runs the same matrix on every PR (`.github/workflows/ci.yml`). A broken anchor fails
loudly at the apply step, naming the anchor. When fixing manifests, prefer converting fragile
`edits` into `delete` + `overlay` — anchors are the maintenance cost.

Keep the canonical resource (`backend/src/routes/items.ts`, `shared/src/schemas/items.ts`)
exemplary: it gets copied into every project resource, flaws included.

## Adding a flavor

1. `flavors/<name>/manifest.json` — bias delete+overlay over edits; declare `conflicts` in
   BOTH directions (this manifest and the conflicting ones).
2. Overlay `.ts`/`.tsx` files start with the `// @ts-nocheck — template overlay; …` line
   (stripped on apply). Exception: files that already carry their own `@ts-nocheck` (e.g.
   generated `routeTree.gen.ts`) get NO template header — stripping would remove theirs.
3. Add the flavor to the CI matrix.
4. Write `.agents/skills/setup/references/<name>.md`: when to choose it, what it changes,
   post-apply checks, late-retrofit notes.
5. Verify for real in a scratch copy: apply → `pnpm check`/`test`/`build` → boot the result →
   `finalize` still works.

## Releasing

1. Update `CHANGELOG.md` (Unreleased → version + date, human-readable — projects read this
   when pulling updates).
2. Bump `cen.templateVersion` in package.json (semver: breaking = flavor/manifest/seam
   changes projects must react to).
3. Tag: `git tag v<version> && git push --tags`.

## Dependency bumps

Versions are pinned once in the `pnpm-workspace.yaml` catalog. Bump there, `pnpm install`,
full check/test/build, then run the flavor matrix — dependency changes break overlays too
(they reference package APIs).
