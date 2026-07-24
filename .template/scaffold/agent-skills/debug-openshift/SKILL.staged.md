---
name: debug-openshift
description: Triage a broken OpenShift deployment of this app with the oc CLI — pods, events, logs, rollouts, and the app-specific failure modes.
---

# Debug an OpenShift deployment

Runbook for "the deployment is broken / pending / crashing". Work top-down; don't guess at
fixes before you've seen events and logs. Manifests live in `infra/deploy/openshift/`.

## Triage order

```bash
oc project                                        # confirm you're in the right namespace
oc get pods                                       # what state is the app actually in?
oc get events --sort-by=.lastTimestamp | tail -20 # the cluster's own explanation
oc logs deploy/<app> --previous                   # last crash's output (drop --previous if running)
oc describe pod <pod>                             # probes, image, mounts, limits
oc rollout status deploy/<app>                    # stuck rollout?
```

## Failure modes, most likely first

- **CrashLoopBackOff** — read the log's first lines. This app validates env on boot
  (`app/backend/src/env.ts`) and prints exactly which variable is missing or malformed; fix the
  `app-env` secret, don't guess: `oc set data secret/app-env KEY=value` then restart. Second
  suspect: database unreachable (check `DATABASE_URL`, network policy, DB pod).
- **Migration failure on startup** — logs show the failing SQL. See `.agents/skills/db-migrations/`
  ("Migration fails on deploy"). Never edit the applied migration.
- **ImagePullBackOff** — wrong image ref or missing pull secret: `oc describe pod` shows which.
- **OOMKilled** (`oc describe pod` → Last State) — raise the memory limit in the deployment
  before hunting leaks; the default limits are modest.
- **Route serves nothing / TLS errors** — `oc get route`, confirm service targets port 8080 and
  `curl -sk https://<route>/api/health` from outside. App must listen on `PORT` (set to 8080).
- **oauth-proxy flavor only:** sidecar misconfig — check cookie secret length, redirect URL
  matching the route host, and the IdP's registered callback.

## Discipline

State the root cause in one sentence → apply the smallest fix → verify with the same command
that showed the failure → summarize for the user (what broke, why, what you changed).
Read-only by default: don't scale, delete, or restart anything until the evidence points at it.
