---
name: setup
description: >-
  Mandatory first workflow for ANY task in an unfinalized CEN Starter checkout (flavors/
  exists; cen.finalized is false in package.json) — including direct feature requests such
  as "build a todo app" or "add a page". Pause feature work, guide the user through
  outcome-focused configuration choices, apply the matching flavors, bootstrap, verify the
  running app, and finalize with explicit approval before building anything.
---

# Template setup

This repo is a **maximal base app** (database, local auth, admin panel, shadcn/ui frontend,
example `items` resource). Flavors subtract or swap parts of it. Your job: find out what your
user actually needs, apply the matching flavors, then hand over a running app.

This skill and the `flavors/` machinery are deleted by `pnpm flavor finalize` — in a finalized
project none of this applies.

## 1. Confirm the project location

`cen-starter` is the source template's name, not a default project name, and hidden agent
workspaces or temporary paths (for example `~/.bob/`, `~/.codex/`, `/tmp/`, macOS
`/var/folders/`) are scratch space, not a project home, unless the user explicitly chose
them.

Before any setup mutation, confirm both the user-chosen project name and its complete
durable path. If either is unknown, stop before installing dependencies, applying flavors,
or editing files, and ask: **"What should the project be called, and where would you like
me to create it?"** (The role question from section 3 always comes first, on its own —
ask this one after it.) If useful, inspect the home directory for an
existing visible development folder and recommend one concrete `<folder>/<project-name>`
path. Do not infer the name from the template URL or invent several arbitrary locations.

If the repository is already cloned into scratch space, or into a folder named `cen-starter`
the user did not deliberately choose, preserve any work, move or recreate the clone at the
confirmed destination, and continue there. Do not delete the scratch copy without
permission. A checkout named `cen-starter` is correct only for template maintenance or when
the user explicitly picked that name.

## 2. Check the basics

Before the configuration interview, verify the standard workstation baseline. If anything is
missing, use the `prepare-workstation` skill before continuing.

## 3. Interview the user

Open with the project, not the tech: **what are you building, and who is it for?** Then
recommend a configuration with reasons — act like an experienced colleague, not a form. Run
`pnpm flavor list` to see what exists; read `references/<flavor>.md` for any flavor you're
about to recommend.

### Adapt to the user

The user's role is your **first question, asked on its own** — before the project name,
before anything else, and never bundled with another question in the same message. If your
environment has a question tool (structured options the user clicks), you **must** use it
for this — never a numbered list in prose. Offer exactly these options (a plain
one-word-answer list only when no such tool exists):

**"So I can pitch this right — what's your background?"**

- Technical — developer, architect, AI engineer
- Design — UX/UI
- Product / business — PM, consulting, sales
- Something else

Do not ask people to rate their technical skill; the role is enough. Calibrate everything
after it: **technical** → technical terms, commands as-is. **Everyone else** → plain
language, jargon defined on first use, every terminal step spelled out ("open the Terminal
app, paste this line, press Enter"), and run whatever you can yourself instead of
delegating steps to the user — with one exception: never run `pnpm dev` or any other
never-exiting command as a blocking command (see step 5). If the role is skipped or
ambiguous, mirror the technical depth of the user's own language and default to plain
language. Use the question tool for the other interview decisions with fixed options too.

### The decision tree — the only configurations that exist

The configuration space is exactly: **base**, `carbon`, `oauth-proxy`, `backend-only`,
`no-database`, and the combos `oauth-proxy,carbon` and `backend-only,no-database`. Every
recommendation is one of these outcomes. Never offer or accept an option outside them — in
particular there is **no "no auth" configuration** for browser apps: every browser variant
ships working sign-in (local auth with a seeded development account, or the OAuth proxy),
and it costs the user nothing.

Walk the tree one question at a time with the question tool, phrased as visible product
behavior — never flavor names, packages, or architecture. In the question tool, the
recommended outcome is always the **first** option and its label ends with
"(recommended)"; the one-line why goes in that option's description, not only in prose
above the question. Always allow "I'm not sure — choose the sensible default." Skip any
question the user's context already
answered ("I want to build a web app" settles question 1 — never re-ask it or infer
`backend-only` against it). Do not start setup mutations while a question is open.

1. **Browser app or service?** "Will people use this through pages in a browser, or is
   this a service other software calls (an API, agent tools, watsonx Orchestrate)?"
   - Browser app → the database stays; do not offer to remove it (sign-in and the admin
     area need it, and a UI without persistence is almost never right). Continue with 2.
   - Service → `backend-only`. Skip to 4.
2. **Who manages the accounts?** Recommend the OAuth proxy, and give the user the why:
   adding it at the start makes the app production-ready from day one — if this ever goes
   over to a customer, they plug in their identity provider (IBM SSO, Entra, …) and their
   users can sign in without changing a line of code, while local development stays fully
   self-contained. Read `references/oauth-proxy.md` before recommending. Offer exactly
   these options, in this order:
   - "People sign in with accounts that already exist somewhere — a company, team, or
     client identity provider, or just me (recommended)" → `oauth-proxy`. A personal or
     internal tool takes this path too.
   - "The app manages its own accounts — people sign up themselves, or admins invite and
     manage users inside the app" → base local auth. During development this means "you'll
     sign in with the built-in development account" — never call it "no auth," and never
     present it as "easier" or "fine for now."
   - "Not sure" → take the recommended.
3. **Which look?** "Does it need the official IBM Carbon design, or should the UI carry
   your (or the client's) own brand?" IBM-internal asset or Carbon compliance → `carbon`
   (with the proxy from 2: `--flavors oauth-proxy,carbon`). Client-branded or unsure →
   keep the base shadcn/ui; it's ownable code, restyled freely to the client's brand.
4. **Service state?** (service path only) "Does the service store data of its own?"
   Yes → keep the database (`backend-only`). Stateless tools or pure orchestration →
   `--flavors backend-only,no-database`.

When in doubt, keep the base: subtracting later is documented in each reference file,
re-adding is manual work. The one deliberate bias is question 2 — default to `oauth-proxy`
unless the app must own its accounts, because handing the app over later means plugging in
the customer's identity provider, while migrating an established account system is far
more disruptive.

## 4. Bootstrap the chosen configuration

```bash
pnpm install
pnpm bootstrap --name <project-name> --flavors <comma-separated-names|none>
```

Bootstrap names the package and Compose project, preserves the template remote as `upstream`,
applies all chosen flavors in one validated operation, creates `.env` from the resulting
`.env.example`, and sets `cen.bootstrapped` only after every step succeeds. On a fresh clone,
do not copy `.env` or run flavor commands separately first.

Supported combinations are declared in the manifests (`combinesWith`) and **order matters**:
the combining flavor goes last (`oauth-proxy,carbon`, `backend-only,no-database`). Everything
else is refused with an explanation. If bootstrap fails, stop and repair or reset the setup;
do not build features in a partially configured tree.

After bootstrap, run the post-apply checks from each selected flavor's
`references/<flavor>.md`.

## 5. Boot, verify, and commit

`pnpm dev` never exits — never run it as a plain blocking command. Background it with both
output streams detached (a bare `&` still hangs sandboxes: they wait on the inherited
output pipe), and keep the log outside the repo (an untracked file blocks finalize's
clean-tree check):

```bash
pnpm dev > /tmp/cen-dev.log 2>&1 &
```

Poll `curl -s http://localhost:3000/api/health` (`API_PORT` from `.env`) — the first boot
downloads Docker images, so allow a couple of minutes — and read the log on failure.

If your environment cannot background at all, have the user run `pnpm dev` with
click-level directions: in IBM Bob or VS Code, top menu bar → **Terminal → New Terminal**
(it opens at the project folder), paste `pnpm dev`, press Enter, keep the panel open. Say
what success looks like (the ports line, services starting) and ask them to paste back
anything red.

`pnpm dev` checks every selected port before starting. If it reports conflicts, update all
affected `.env` values together (including `DATABASE_URL` when changing `DB_PORT`) and
rerun it. Do not stop services belonging to other projects.

For local auth, `pnpm dev` applies migrations and repeat-safely creates the development admin
`admin@example.com` / `ChangeMe` if missing; it never resets an existing password and refuses
to seed outside local development. With `oauth-proxy`, Dex owns those credentials and the
backend creates the local admin profile from the real authenticated subject on first login.
This rule matches the named local identity, not the first person to log in.

Verify `/api/health` returns `{"status":"ok"}` (Swagger UI is at `/api/docs`), load the
frontend if present, and exercise the actual auth boundary:

- **Base/local auth:** log in with the development admin and confirm the authenticated admin
  experience (or, for `backend-only`, its cookie-auth session through `/api/auth/*`).
- **`oauth-proxy`:** enter through `OAUTH_PROXY_PORT` from `.env` (4180 by default), log in to
  Dex with the development admin, and confirm `/api/me` reports that user with the `admin`
  role. Do not treat opening Vite directly on `WEB_PORT` as an auth test.
- **`no-database`:** there is deliberately no human account; verify a protected endpoint
  with `x-api-key: $API_KEY` instead.

Do not finalize merely because typechecking and builds pass: the configured runtime login or
API-key path must work. Then run the full baseline verification and commit the configured
state:

```bash
pnpm verify
git add -A && git commit -m "Configure CEN Starter"
```

## 6. Finalize — only with explicit user confirmation

When the user confirms the choices are settled (typically after the app runs and they've seen
it), strip the template machinery and activate the compatible feature skills:

```bash
pnpm flavor finalize            # requires successful bootstrap + a clean tree; reruns pnpm verify
git add -A && git commit -m "Finalize template setup"
```

This deletes the flavor/setup machinery and promotes the post-setup skills from their staging
area into `.agents/skills/`. It is not reversible except via git. Only say **setup is
complete** after finalization succeeds and its changes are committed.

If the user is not ready to confirm, report the exact state as **configured and verified;
finalization pending**. Do not start feature work: post-setup feature skills intentionally do
not become discoverable until finalization.
