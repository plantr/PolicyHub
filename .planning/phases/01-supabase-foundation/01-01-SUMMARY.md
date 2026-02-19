---
phase: 01-supabase-foundation
plan: 01
subsystem: database
tags: [supabase, postgres, drizzle, drizzle-orm, postgres.js, migrations, rbac]

# Dependency graph
requires: []
provides:
  - "33-table Drizzle schema with userBusinessUnits junction table and authUserId on users"
  - "postgres.js driver configured with prepare:false for Supabase transaction-mode pooler"
  - "drizzle.config.ts using DATABASE_URL_DIRECT for migrations with DATABASE_URL fallback"
  - "migrations/0000_clammy_big_bertha.sql — full DDL for all 33 tables"
affects:
  - 01-02-supabase-rls
  - 01-03-supabase-auth
  - 01-04-supabase-vercel

# Tech tracking
tech-stack:
  added:
    - "postgres@3.4.8 — postgres.js driver (replaces pg/node-postgres as direct dependency)"
    - "drizzle-orm/postgres-js — Drizzle adapter for postgres.js"
  patterns:
    - "Two-URL connection pattern: DATABASE_URL (pooler port 6543) for runtime, DATABASE_URL_DIRECT (direct port 5432) for migrations"
    - "prepare: false on postgres.js client — required for Supabase transaction-mode pooler"

key-files:
  created:
    - "migrations/0000_clammy_big_bertha.sql"
    - "migrations/meta/0000_snapshot.json"
    - "migrations/meta/_journal.json"
  modified:
    - "shared/schema.ts"
    - "server/db.ts"
    - "drizzle.config.ts"
    - "package.json"

key-decisions:
  - "postgres.js chosen over node-postgres (pg) because it supports prepare:false required for Supabase transaction-mode pooler compatibility"
  - "drizzle.config.ts env var guard removed from module-level to allow drizzle-kit generate without DB credentials (generate reads schema only, not DB)"
  - "DATABASE_URL_DIRECT || DATABASE_URL fallback in drizzle.config.ts allows local dev without provisioning direct connection"
  - "userBusinessUnits.userId stored as text (not FK) to reference auth.users.id (UUID) in Supabase Auth — cross-schema reference not enforceable via Drizzle FK"

patterns-established:
  - "Drizzle schema imports: unique from drizzle-orm/pg-core for composite unique constraints"
  - "Migration workflow: drizzle-kit generate (no DB needed) → drizzle-kit migrate (requires DATABASE_URL_DIRECT)"

requirements-completed: [INFRA-01, INFRA-02, INFRA-03, INFRA-04]

# Metrics
duration: 3min
completed: 2026-02-19
---

# Phase 1 Plan 01: Supabase Foundation — Database Schema and Driver Summary

**postgres.js driver with prepare:false, userBusinessUnits junction table, auth_user_id on users, and full 33-table SQL migration generated for Supabase deployment**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-19T13:44:53Z
- **Completed:** 2026-02-19T13:48:06Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Replaced node-postgres (pg) with postgres.js configured with `prepare: false` for Supabase transaction-mode pooler compatibility
- Added `userBusinessUnits` junction table with `userId` (text, references auth.users UUID), `businessUnitId` (FK to business_units), `role`, and `UNIQUE(user_id, business_unit_id)` constraint
- Added `authUserId` column to users table for linking profile records to Supabase Auth identities
- Generated `migrations/0000_clammy_big_bertha.sql` covering all 33 tables with correct DDL, constraints, and foreign keys
- Configured `drizzle.config.ts` for two-URL pattern: `DATABASE_URL_DIRECT` for migrations, `DATABASE_URL` fallback for local dev

## Task Commits

1. **Task 1: Add user_business_units table, auth_user_id column, switch to postgres.js** - `5947800` (feat)
2. **Task 2: Generate SQL migration for all 33 tables** - `de0b031` (feat)

## Files Created/Modified

- `shared/schema.ts` — Added `unique` import, `authUserId` column on users, `userBusinessUnits` table definition, `insertUserBusinessUnitSchema`, `UserBusinessUnit` type
- `server/db.ts` — Replaced pg/Pool with postgres.js client using `prepare: false`, removed exported `pool`
- `drizzle.config.ts` — Two-URL pattern with `DATABASE_URL_DIRECT || DATABASE_URL || ""` fallback, removed module-level env guard
- `package.json` — Added `postgres@^3.4.8`, removed `pg` as direct dependency
- `migrations/0000_clammy_big_bertha.sql` — Full DDL for 33 tables
- `migrations/meta/` — Drizzle migration journal and snapshot files

## Decisions Made

- **postgres.js over node-postgres:** Supabase transaction-mode pooler requires `prepare: false` which postgres.js supports natively; node-postgres does not support this flag. This is a hard requirement for Supabase serverless compatibility.
- **Module-level env guard removed from drizzle.config.ts:** `drizzle-kit generate` reads schema files only and does not connect to the database. Throwing at module load prevented generation without credentials. The fallback empty string `""` allows generate to run; migrate/push will fail at connection time if no URL is set.
- **userBusinessUnits.userId as text:** Drizzle cannot create FK constraints across Supabase's internal `auth` schema. Storing auth.users.id as text is the correct pattern — referential integrity is enforced by application logic and RLS policies.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed module-level env var guard from drizzle.config.ts**
- **Found during:** Task 2 (Generate Drizzle SQL migration)
- **Issue:** `drizzle.config.ts` threw `Error: DATABASE_URL_DIRECT must be set for migrations` at module load time, preventing `drizzle-kit generate` from running even though generate does not use the database connection
- **Fix:** Replaced `if (!process.env.DATABASE_URL_DIRECT) { throw }` guard with inline fallback `url: process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL || ""` — generate succeeds, migrate/push will fail at connection time if no valid URL is set
- **Files modified:** `drizzle.config.ts`
- **Verification:** `npx drizzle-kit generate` produced 33-table migration successfully
- **Committed in:** de0b031 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking issue)
**Impact on plan:** Required to execute Task 2. No scope creep — config behavior aligned with plan intent while allowing generate to work without DB credentials.

## Issues Encountered

- Pre-existing TypeScript errors in `server/replit_integrations/` and `server/routes.ts` (unrelated to changes). Logged to `.planning/phases/01-supabase-foundation/deferred-items.md`. None are in files modified by this plan.

## User Setup Required

Before `npx drizzle-kit migrate` can be run, set the following environment variables:

```bash
DATABASE_URL=postgres://[user]:[password]@[host]:6543/[db]?pgbouncer=true
DATABASE_URL_DIRECT=postgres://[user]:[password]@[host]:5432/[db]
```

Both values are available from: **Supabase Dashboard > Project Settings > Database > Connection string**
- `DATABASE_URL` — Transaction mode (port 6543) — used by runtime
- `DATABASE_URL_DIRECT` — Direct connection (port 5432) — used by migrations

Once set, apply migration:
```bash
npx drizzle-kit migrate
```

## Next Phase Readiness

- Schema is complete and migration file is ready to apply
- Next plan (01-02) can add RLS policies once migration is applied to Supabase
- `authUserId` column on users table is ready for Plan 01-03 (auth integration)
- `userBusinessUnits` table is ready for Plan 01-02 (RLS policies referencing it)

---
*Phase: 01-supabase-foundation*
*Completed: 2026-02-19*

## Self-Check: PASSED

- FOUND: `.planning/phases/01-supabase-foundation/01-01-SUMMARY.md`
- FOUND: `migrations/0000_clammy_big_bertha.sql`
- FOUND: commit `5947800` — feat(01-01): Task 1
- FOUND: commit `de0b031` — feat(01-01): Task 2
