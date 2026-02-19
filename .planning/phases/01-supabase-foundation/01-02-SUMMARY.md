---
phase: 01-supabase-foundation
plan: 02
subsystem: database
tags: [supabase, postgres, rls, row-level-security, jwt, plpgsql, auth-hook]

# Dependency graph
requires:
  - phase: 01-01
    provides: "33-table Drizzle schema with userBusinessUnits junction table"
provides:
  - "supabase/migrations/0001_enable_rls.sql — RLS enabled on all 33 public tables"
  - "supabase/migrations/0002_auth_hook.sql — Custom Access Token Hook injecting per-BU role map into JWT"
  - "supabase_auth_admin RLS policy and GRANT SELECT on user_business_units"
affects:
  - 01-03-supabase-auth
  - 01-04-supabase-vercel
  - rls-policies

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Custom Access Token Hook pattern: PL/pgSQL STABLE function reading user_business_units and injecting {id, role} array into app_metadata.business_units"
    - "supabase_auth_admin access pattern: GRANT USAGE on schema + GRANT SELECT on table + CREATE POLICY FOR SELECT TO supabase_auth_admin USING (true)"
    - "Hook permission pattern: GRANT EXECUTE to supabase_auth_admin, REVOKE from authenticated/anon/public"

key-files:
  created:
    - "supabase/migrations/0001_enable_rls.sql"
    - "supabase/migrations/0002_auth_hook.sql"
  modified: []

key-decisions:
  - "supabase_auth_admin needs both a GRANT SELECT and a CREATE POLICY to bypass RLS — GRANT alone is insufficient when RLS is enabled on the table"
  - "Hook function declared STABLE (not VOLATILE) — reads DB but does not write, allows Postgres optimizer to cache within a transaction"
  - "COALESCE to empty array in hook — users with no BU memberships get [] not NULL, prevents null-pointer issues in RLS policies"

patterns-established:
  - "Migration numbering: supabase/migrations/0001_*, 0002_* for manual SQL migrations separate from Drizzle migrations/"
  - "Hook claims path: app_metadata.business_units array of {id, role} objects — all downstream RLS policies reference this path"

requirements-completed: [AUTH-05, RLS-01, RLS-06]

# Metrics
duration: 2min
completed: 2026-02-19
---

# Phase 1 Plan 02: Supabase Foundation — RLS and Auth Hook Summary

**RLS enabled on all 33 public tables and Custom Access Token Hook installed — per-BU role map injected as [{id, role}] array into JWT app_metadata.business_units on every token issuance**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-19T13:50:57Z
- **Completed:** 2026-02-19T13:52:05Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `supabase/migrations/0001_enable_rls.sql` enabling RLS on all 33 public tables — tables now deny all access by default until explicit policies are added (Plan 03)
- Created `supabase/migrations/0002_auth_hook.sql` with PL/pgSQL `custom_access_token_hook` function that reads `user_business_units` and injects a per-BU role array into every JWT's `app_metadata.business_units` claim
- Granted `supabase_auth_admin` EXECUTE on hook function, REVOKED from authenticated/anon/public
- Created `supabase_auth_admin_select` RLS policy and GRANT SELECT on `user_business_units` so the hook can read memberships despite RLS being enabled

## Task Commits

Each task was committed atomically:

1. **Task 1: Create RLS enablement migration for all 33 tables** - `8805d58` (feat)
2. **Task 2: Create Custom Access Token Hook migration with permissions** - `3dfdc55` (feat)

## Files Created/Modified

- `supabase/migrations/0001_enable_rls.sql` — ALTER TABLE ... ENABLE ROW LEVEL SECURITY for all 33 public tables
- `supabase/migrations/0002_auth_hook.sql` — Custom Access Token Hook function, GRANT/REVOKE permissions, supabase_auth_admin_select RLS policy, GRANT SELECT on user_business_units

## Decisions Made

- **supabase_auth_admin needs both GRANT SELECT and CREATE POLICY:** When RLS is enabled, a GRANT SELECT alone does not bypass RLS for non-superuser roles. `supabase_auth_admin` requires both table-level permission (GRANT SELECT) and an explicit policy (CREATE POLICY FOR SELECT TO supabase_auth_admin USING (true)) to read rows.
- **Hook declared STABLE:** The hook reads the database but does not write. Using STABLE instead of VOLATILE allows Postgres to make optimization decisions and signals correct intent.
- **COALESCE to empty array:** Users with no BU memberships receive `[]` not `NULL`. This prevents null-pointer failures in downstream RLS policy expressions that reference the array.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**Dashboard step required after migration is applied:**

After running the migration against Supabase, enable the hook in the Supabase Dashboard:
- Navigate to: **Authentication > Hooks > Custom Access Token**
- Select function: `public.custom_access_token_hook`
- Click Save

This is a one-time manual step. The SQL migration installs the function; the dashboard toggle activates it for Auth to call.

## Next Phase Readiness

- Both migration files are ready to apply once `DATABASE_URL_DIRECT` is set (see Plan 01-01 SUMMARY)
- After migration is applied and hook is enabled in Dashboard, Plan 01-03 (auth integration) can proceed
- Plan 01-03 (RLS policies) can be written now — the `app_metadata.business_units` JWT path and its structure are established
- All downstream RLS policies should reference `(auth.jwt()->'app_metadata'->'business_units')` to extract the per-BU role array

---
*Phase: 01-supabase-foundation*
*Completed: 2026-02-19*

## Self-Check: PASSED

- FOUND: `supabase/migrations/0001_enable_rls.sql`
- FOUND: `supabase/migrations/0002_auth_hook.sql`
- FOUND: `.planning/phases/01-supabase-foundation/01-02-SUMMARY.md`
- FOUND: commit `8805d58` — feat(01-02): RLS enablement migration
- FOUND: commit `3dfdc55` — feat(01-02): auth hook migration
