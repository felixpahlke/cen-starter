---
name: setup
description: >-
  Configure a freshly cloned CEN Starter template: guide the user through outcome-focused
  choices at an appropriate technical depth, apply the matching flavors, verify, and
  finalize. Use when flavors/ exists (cen.finalized is false in package.json) — this project
  has not been set up yet.
---

# Template setup

This repo is a **maximal base app** (database, local auth, admin panel, shadcn/ui frontend,
example `items` resource). Flavors subtract or swap parts of it. Your job: find out what your
user actually needs, apply the matching flavors, then hand over a running app.

This skill and the `flavors/` machinery are deleted by `pnpm flavor finalize` — in a finalized
project none of this applies.

## 1. Confirm the project location

Before any setup mutation, apply the **Project location** gate in `AGENTS.md`. Confirm both
the user-chosen project name and its complete durable path; never inherit `cen-starter` merely
because it is the template repository's name. A clone inside a hidden agent playground or
temporary directory is not a durable project. If either name or destination is unknown, ask,
confirm the absolute target, and continue there. Do not install dependencies or configure a
scratch or ambiguously named clone first. A checkout named `cen-starter` is fine when the task
is maintaining this template or the user explicitly chose that project name.

## 2. Check the basics

Before the configuration interview, verify the standard workstation baseline. If anything is
missing, use the `prepare-workstation` skill before continuing.

## 3. Interview the user

Open with the project, not the tech: **what are you building, and who is it for?** Then
recommend a configuration with reasons — act like an experienced colleague, not a form. Run
`pnpm flavor list` to see what exists; read `references/<flavor>.md` for any flavor you're
about to recommend. When choosing between local auth and `oauth-proxy`, always read
`references/oauth-proxy.md`; it documents the default and the exceptions.

### Adapt to the user

Infer the appropriate depth from the user's language and mirror it. Do not make users rate
their own technical experience: beginners may not know the categories, and experts usually
signal their context naturally. If the preferred depth is genuinely unclear, ask once:
**"Would you like me to choose sensible defaults, or walk you through the technical
trade-offs?"** Default to plain language and sensible recommendations.

- Treat what the user already said as a constraint. "I want to build a web app" settles that
  a frontend is needed; never infer `backend-only` or ask them to choose it.
- Ask about visible product behavior, not flavor names, packages, or architecture. Say "Should
  the app remember data people create?" rather than "persistent state or stateless?" Explain
  PostgreSQL/Drizzle only if the user wants the technical detail.
- Recommend one option and its user-visible reason instead of presenting an unranked menu.
  Always allow "I'm not sure — choose the sensible default." Introduce the flavor command only
  after the decision is understood.
- Ask only when the answer would change the configuration. Do not quiz the user on every
  flavor axis, and do not start setup mutations while waiting for an answer.

Use these beginner-friendly decision questions when the context has not already answered them:

- **Frontend:** "Will people use this through pages in a browser, or will only other software
  call it?" Default to the full web app.
- **Database:** "Should it remember anything users create after a restart?" If unsure, keep
  the database.
- **Design system:** "Does it have to use the official IBM Carbon components?" If not, keep
  the editable default UI.
- **Authentication:** "Will people sign in with a company account, and could this pilot become
  a real production app?" If yes or maybe, recommend the OAuth proxy. Explain that local
  development uses the included test identity provider and needs no company IdP setup; client
  registration is a production deployment task.

Typical CEN scenarios and what to recommend:

- **App for a client, branded as theirs** → keep the base. The shadcn/ui components are
  ownable code — restyle them to the client's brand so the solution feels like the client's
  own product.
- **IBM-internal asset or tool, or Carbon compliance is a requirement** → `carbon`. Real
  `@carbon/react`; it looks like an IBM product out of the box.
- **Browser app with human users that requires company SSO or could plausibly reach
  production** → `oauth-proxy`. This is the default when production likelihood is unknown;
  bundled Dex keeps local development self-contained. For the classic internal-tool setup,
  combine it with Carbon by passing `--flavors oauth-proxy,carbon` to bootstrap.
- **Product-owned accounts** (public self-sign-up across customers with no shared IdP,
  app-owned password/account lifecycle) → keep the base local auth. Also acceptable for a
  deliberately throwaway demo where production identity is explicitly out of scope.
- **Backend service — tools for watsonx Orchestrate, an agent backend, another team's
  frontend** → `backend-only`. If it holds no state of its own (stateless tools, pure
  orchestration), drop the database too with `--flavors backend-only,no-database`.
- **User profiles, roles, preferences, ownership, or other user-linked product data** → do
  not use this to choose auth. Both variants keep a local `user` row; choose based on who owns
  identity and credentials.

Ask one or two clarifying questions at most, one at a time, and only about decisions a flavor
exists for (database? frontend? design system? auth?). When in doubt, keep the base —
subtracting later is documented in each reference file; re-adding is manual work. The
exception is auth for a human-facing pilot that may reach production: default to
`oauth-proxy`, because moving an established account system later is usually more disruptive
than configuring the production IdP early.

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

Run `pnpm dev`. It checks every selected port before starting. If it reports conflicts,
update all affected `.env` values together (including `DATABASE_URL` when changing
`DB_PORT`) and rerun it. Do not stop services belonging to other projects.

For local auth, `pnpm dev` applies migrations and repeat-safely creates the development admin
`admin@example.com` / `ChangeMe` if missing; it never resets an existing password and refuses
to seed outside local development. With `oauth-proxy`, Dex owns those credentials and the
backend creates the local admin profile from the real authenticated subject on first login.
This rule matches the named local identity, not the first person to log in.

Verify `/api/health`, load the frontend if present, and exercise the actual auth boundary:

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
