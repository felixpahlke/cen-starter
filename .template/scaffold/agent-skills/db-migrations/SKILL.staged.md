---
name: db-migrations
description: Create, apply, and repair Drizzle database migrations — including schema drift and failed-migration recovery.
---

# Database migrations

Schema truth lives in `app/backend/src/db/schema.ts`; migrations are generated from it by
drizzle-kit into `app/backend/src/db/migrations/`. Never edit schema and database independently.

## Normal flow

1. Edit `app/backend/src/db/schema.ts`.
2. `pnpm db:generate` — creates a migration. **Read the generated SQL** before applying;
   drizzle-kit occasionally chooses a destructive interpretation (drop + recreate) for renames.
3. `pnpm db:migrate` (database running: `docker compose up -d --wait`).
4. `pnpm check`, and verify with `pnpm db:studio` if the change is structural.

## Rules

- Never hand-edit an **applied** migration file. Fix forward with a new migration.
- Editing a migration that is merely generated-but-unapplied locally is fine — regenerate
  instead when possible (`delete the file + pnpm db:generate` again).
- While the project is unreleased (no shared environment has applied them), you may squash:
  delete `app/backend/src/db/migrations/` entirely, reset the dev database (below), regenerate one
  clean migration.

## Repair

- **Dev database drifted / migration journal confused:** dev data is disposable —
  `docker compose down -v && pnpm dev` gives a clean database with all migrations applied.
- **Migration fails on deploy:** read the failing SQL statement in the logs; the fix is a new
  migration, not an edit to the failed one. If the deploy applied it partially, compare actual
  schema (`\d` via psql or Studio) against the journal before deciding.
- **"relation already exists":** the database has state the journal doesn't know about —
  usually a table created manually or by better-auth's CLI. Reconcile by making schema.ts match
  reality, then `pnpm db:generate` and inspect the diff it produces.
