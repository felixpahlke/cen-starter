# oauth-proxy

Authentication moves out of the app into an [oauth2-proxy](https://oauth2-proxy.github.io/)
in front of it, connected to a company IdP via OIDC. better-auth is removed; the database,
Drizzle, and the items resource stay.

## When to choose it

The organization requires SSO (W3ID, Entra, any OIDC provider) or forbids app-local accounts.
If the project just needs "log in and build" without an IdP conversation, keep the base —
this flavor's production setup requires an OIDC client registration from whoever owns the IdP.

**Conflicts with `no-database`** (users get a database row for role/ownership) **and
`backend-only`** (it reworks the frontend shell). Declared in the manifest.

## How auth works after apply

- oauth2-proxy authenticates every request and forwards identity headers
  (`x-forwarded-email`, `x-forwarded-user`, `x-forwarded-preferred-username`).
- The auth seam (`backend/src/auth/index.ts`) reads those headers and **JIT-provisions** a
  row in the `user` table (id = OIDC subject). Accounts live in the IdP; the local row
  carries `role` and satisfies ownership FKs.
- **Trust boundary:** the headers are only trustworthy because the app is reachable
  exclusively through the proxy — compose network locally, sidecar in production. Never
  expose the app port directly.
- Admin promotion: set `role = 'admin'` on the user's row (`pnpm db:studio`). The admin UI
  and settings pages are removed (the IdP owns identity); `role` still drives API authz.
- Frontend gets the session from `GET /api/me`; sign-out goes to `/oauth2/sign_out`.

## Local dev (bundled Dex — zero external IdP)

The flavor sets Vite's `server.host: true` — the proxy runs in Docker and cannot reach a
localhost-only dev server.

`pnpm dev` starts Postgres + [Dex](https://dexidp.io/) (a dev OIDC provider) + oauth2-proxy
in compose. **The app entry URL becomes http://localhost:4180** (the proxy). Log in with
`admin@example.com` / `password` (defined in `dev/dex/config.yaml`). Opening :5173 directly
shows the not-authenticated state — that's expected, headers only exist behind the proxy.

## Post-apply checks

1. `pnpm check` and `pnpm test` green.
2. `pnpm dev`, open http://localhost:4180 → Dex login → app renders with the Dex user shown
   in the user menu; items CRUD works; `/api/me` returns the user.
3. Sign out via the user menu → back to the Dex login.

## Production

The OpenShift deployment gains an oauth2-proxy sidecar configured via `OAUTH2_PROXY_*`
values in `.env.production` (issuer URL, client id/secret from the IdP registration, cookie
secret, redirect URL = the route URL + `/oauth2/callback`). The service targets the proxy
port (4180), not the app port. Get the OIDC client registered early — it's the long pole.

## Retrofitting late (flavor no longer applies)

The seam makes this feasible by hand even in a grown project: replace
`backend/src/auth/index.ts` with the header-reading implementation (template repo shows the
target), remove better-auth and its tables (keep `user` reduced to id/name/email/role),
delete login/signup/settings/admin UI, add the compose Dex/proxy services and the deploy
sidecar. Ownership FKs keep working via JIT provisioning.
