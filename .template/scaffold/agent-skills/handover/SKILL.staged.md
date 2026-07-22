---
name: handover
description: Prepare this finalized project for handover to a client or another team — rewrite the README, verify docs/env/deploy state, and prove a fresh clone runs.
---

# Project handover

The goal: the receiving team clones the repo and succeeds without talking to you. Everything
below serves that one test.

## Checklist

1. **Confirm setup is finalized.** `package.json` must have `cen.finalized: true`, and
   `.template/` must be absent. If not, stop and complete the setup workflow first.
2. **README rewrite.** The README still sells the template; the client needs it to describe
   *their project*: what it does, how to run it (3 commands), where it's deployed, who to
   contact. Keep the agent pointer to AGENTS.md. Delete template marketing.
3. **AGENTS.md accuracy pass.** It documents conventions — check they're still true after
   months of project work (new packages? changed auth? extra services?). An agent-facing doc
   that lies is worse than none.
4. **Env hygiene.** `.env.example` lists every variable `backend/src/env.ts` requires, with
   comments; no real secrets committed anywhere (`git log -p -- .env` should show nothing —
   if it does, rotate those secrets, don't just delete the file).
5. **Deploy reality.** `deploy/` docs match where the app actually runs: namespace, image
   registry, route URL, who owns the database. Undocumented manual cluster tweaks are the #1
   handover killer — hunt for them (`oc diff -k deploy/openshift`).
6. **Known issues** honestly listed (README section or HANDOVER.md): open bugs, tech debt,
   "don't touch X because Y".
7. **The proof:** fresh-clone test in a temp dir — clone, `pnpm install`, `cp .env.example
   .env`, `pnpm dev`, sign up, click through. If any step needs knowledge that isn't written
   down, write it down and repeat.

## Done means

A fresh clone reaches a running app using only the README, and `pnpm check && pnpm test` is
green on it.
