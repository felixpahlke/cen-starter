# Flavors

**If this folder exists, the template has not been configured yet.** Agent? Stop and read
`.agents/skills/setup/SKILL.md` first: interview your user (database? design system?
frontend? auth?), apply the matching flavors, and only then start building features.

## What this is

The base app is maximal; each flavor is a one-time, subtractive transformation applied at
project setup:

- `<flavor>/manifest.json` — declarative recipe: `delete` globs, exact-match `edits`,
  `packageJson` dependency removals, `verify` commands
- `<flavor>/overlay/` — files copied over the tree (mirrors repo paths); `.ts`/`.tsx` overlay
  files start with a `// @ts-nocheck` line that is stripped on apply

```bash
pnpm flavor list            # what's available
pnpm flavor apply <name>    # validates everything first — a failing apply changes nothing
pnpm flavor finalize        # when choices are settled: deletes this folder and all machinery
```

Flavor decision guidance lives in `.agents/skills/setup/references/<flavor>.md`.

## Maintaining flavors (template repo only)

If you change the base app, verify the flavors still apply — in CI (the `flavors` matrix job)
or locally in a scratch copy:

```bash
git worktree add /tmp/flavor-check && cd /tmp/flavor-check
pnpm install && pnpm flavor apply <name>   # runs pnpm check + the manifest's verify commands
```

A broken edit anchor fails the apply step loudly (every `find` must match exactly once). When
touching manifests, prefer `delete` + `overlay` over `edits` — anchors are the fragile part.
New flavor? Add it to the CI matrix in `.github/workflows/ci.yml` and write its
`references/<flavor>.md`.
