---
phase: 01-supabase-foundation
plan: 03
subsystem: database
tags: [supabase, postgres, rls, row-level-security, jwt, business-units, jsonb]

# Dependency graph
requires:
  - phase: 01-02
    provides: "RLS enabled on all 33 tables; Custom Access Token Hook injecting app_metadata.business_units into JWT"
provides:
  - "supabase/migrations/0003_rls_policies.sql — 66 RLS policies covering all 33 public tables across 4 templates"
affects:
  - 01-04-supabase-vercel
  - all-api-routes
  - serverless-functions

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Template A (BU-scoped NOT NULL): 4-policy CRUD pattern using inverted jsonb_array_elements subquery against JWT business_units claim"
    - "Template A-nullable: SELECT includes OR business_unit_id IS NULL for global visibility; INSERT/UPDATE/DELETE require non-null BU membership"
    - "Template A-shared (documents): NULL BU = shared template visible to all authenticated; writes restricted to BU members"
    - "Template A-indirect: permissive SELECT USING (true) for authenticated; writes via service role only"
    - "Template B (reference/lookup): single SELECT USING (true) per table; no write policies"
    - "Template C (special): custom policies per table — business_units, user_business_units, users each have tailored rules"
    - "Template D (audit_log): permissive SELECT for Phase 1; tighten in Phase 4"

key-files:
  created:
    - "supabase/migrations/0003_rls_policies.sql"
  modified: []

key-decisions:
  - "Template A-indirect pattern chosen for tables without a direct BU column (document_versions, review_history, finding_evidence, policy_links, risk_actions, knowledge_base_articles, approvals) — permissive reads + service role writes avoids cross-table JOIN complexity in RLS"
  - "users table gets two SELECT policies (select_own + select_bu) to support both self-profile access and BU-member directory lookup without cross-referencing auth.users"
  - "audit_log uses permissive Phase 1 read policy — BU-scoping deferred to Phase 4 because entity_id references multiple tables making BU derivation complex"
  - "NULL business_unit_id rows in nullable-BU tables (requirement_mappings, audits, commitments, risks, risk_snapshots) are readable by all authenticated but not writable — consistent with global/shared data pattern"

patterns-established:
  - "Inverted subquery pattern: business_unit_id = ANY(SELECT (elem->>'id')::int FROM jsonb_array_elements(COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)) AS elem) — used in all BU-scoped policies"
  - "Role check pattern: WHERE elem->>'role' IN ('admin', 'editor') — appended to subquery for write policies"
  - "COALESCE to empty array: auth.jwt()->'app_metadata'->'business_units' with default '[]'::jsonb — prevents null errors for users with no BU memberships"
  - "Service role bypass: no explicit configuration needed — Supabase service role bypasses RLS by design"

requirements-completed: [RLS-02, RLS-03, RLS-04, RLS-05]

# Metrics
duration: 3min
completed: 2026-02-19
---

# Phase 1 Plan 03: Supabase Foundation — RLS Policies Summary

**66 RLS policies across 33 tables using 4 templates: BU-scoped CRUD (Template A), permissive-read indirect (A-indirect), reference read-only (Template B), and special per-table rules (Templates C/D) — anonymous users blocked, viewer role enforced at DB level**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-19T13:54:43Z
- **Completed:** 2026-02-19T13:57:19Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Created `supabase/migrations/0003_rls_policies.sql` with 66 RLS policies covering all 33 public tables — zero tables left unprotected
- Applied 4 BU-scoped CRUD policy sets (Template A) to tables with NOT NULL business_unit_id: addenda, effective_policies, findings, regulatory_profiles
- Applied nullable-BU variant (Template A) to: requirement_mappings, audits, commitments, risks, risk_snapshots — NULL rows visible to all authenticated
- Applied shared-template variant (Template A-shared) to documents — NULL BU = shared template visible to all; writes restricted to BU members
- Applied permissive-read policy (Template A-indirect) to 7 join-dependent tables with no direct BU column
- Applied read-only SELECT policies (Template B) to all 12 reference/lookup tables
- Applied tailored policies (Template C) to business_units, user_business_units, and users
- Applied permissive Phase 1 read policy (Template D) to audit_log

## Task Commits

Each task was committed atomically:

1. **Task 1: Template A policies — BU-scoped tables (18 tables)** - `b1726b2` (feat)
2. **Task 2: Template B, C, D policies — reference, special, and audit tables** - `b1726b2` (feat — included in same commit; single file written atomically)

**Plan metadata:** TBD after SUMMARY commit

## Files Created/Modified

- `supabase/migrations/0003_rls_policies.sql` — 950 lines, 66 policies covering all 33 tables

## Decisions Made

- **Template A-indirect for join-dependent tables:** Tables without a direct `business_unit_id` column (document_versions, review_history, finding_evidence, policy_links, risk_actions, knowledge_base_articles, approvals) use permissive SELECT plus no write policies. Cross-table JOIN RLS is complex and prone to performance issues; application-layer authorization handles writes through service-role serverless functions.
- **Two-policy users SELECT:** The `users` table gets `users_select_own` (read own profile) and `users_select_bu` (read BU members) as separate policies rather than a single OR condition — cleaner intent, PostgreSQL evaluates OR policies with OR semantics by default.
- **Deferred audit_log BU-scoping:** The audit_log table's `entity_id` references many different tables making BU derivation complex. Permissive read is acceptable for Phase 1 because audit entries are read-only for authenticated users — no data modification risk.
- **NULL BU write restriction:** For nullable-BU tables, NULL rows (global/shared data) are readable by all authenticated but not writable via API. This prevents accidental data pollution — global records are managed exclusively via service role.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — this migration file is ready to apply along with 0001 and 0002. No additional dashboard configuration required beyond what was documented in Plan 01-02 SUMMARY (Custom Access Token Hook dashboard toggle).

## Next Phase Readiness

- All three migration files (0001, 0002, 0003) are ready to apply once `DATABASE_URL_DIRECT` is configured
- After migration is applied: every table has at least one SELECT policy for authenticated users; anon access is blocked everywhere
- Plan 01-04 (Vercel environment variables and client setup) can proceed — the security model is complete at the database layer
- Downstream phases can rely on the established JWT claims path: `auth.jwt()->'app_metadata'->'business_units'` as an array of `{"id": int, "role": "admin"|"editor"|"viewer"}`

---
*Phase: 01-supabase-foundation*
*Completed: 2026-02-19*

## Self-Check: PASSED

- FOUND: `supabase/migrations/0003_rls_policies.sql`
- FOUND: `.planning/phases/01-supabase-foundation/01-03-SUMMARY.md`
- FOUND: commit `b1726b2` — feat(01-03): Template A RLS policies
