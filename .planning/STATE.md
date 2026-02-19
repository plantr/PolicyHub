# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-19)

**Core value:** Get Policy Hub running on Supabase + Vercel with business-unit-scoped access control
**Current focus:** Phase 1 — Supabase Foundation

## Current Position

Phase: 1 of 4 (Supabase Foundation)
Plan: 3 of 4 in current phase
Status: In progress
Last activity: 2026-02-19 — Completed Plan 01-03 (66 RLS policies across all 33 tables)

Progress: [███░░░░░░░] 19%

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: 2.7 min
- Total execution time: 8 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-supabase-foundation | 3/4 | 8 min | 2.7 min |

**Recent Trend:**
- Last 5 plans: 3 min, 2 min, 3 min
- Trend: —

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Setup: Supabase for database + storage + auth (single platform, built-in RLS)
- Setup: Vercel for frontend + serverless (natural React/SPA fit)
- Setup: Direct Supabase client for reads (eliminates ~70% of Express GET routes)
- Setup: Serverless functions for complex writes and AI calls
- Setup: Email/password auth only for v1 (defers Google SSO)
- Setup: Business-unit-scoped RBAC via RLS — permissions at database level, not app level
- 01-01: postgres.js chosen over node-postgres — Supabase transaction-mode pooler requires prepare:false which postgres.js supports natively
- 01-01: drizzle.config.ts env guard removed from module-level — drizzle-kit generate reads schema only, no DB connection needed
- 01-01: userBusinessUnits.userId stored as text (not FK) — auth.users in Supabase's internal auth schema, cross-schema FK not enforceable via Drizzle
- 01-02: supabase_auth_admin needs both GRANT SELECT and CREATE POLICY to read user_business_units when RLS is enabled — GRANT alone is insufficient
- 01-02: Custom Access Token Hook declared STABLE (reads DB, does not write) — correct volatility for Postgres optimization
- 01-02: Hook uses COALESCE to empty array — users with no BU memberships get [] not NULL to prevent downstream null-pointer errors in RLS policies
- 01-03: Template A-indirect pattern for join-dependent tables (no direct BU column) — permissive reads + service role writes avoids cross-table JOIN complexity in RLS
- 01-03: audit_log uses permissive Phase 1 read policy — BU-scoping deferred to Phase 4 (entity_id references many tables)
- 01-03: NULL BU rows in nullable-BU tables readable by all authenticated but not writable via API — global/shared records managed via service role only

### Pending Todos

- Apply migrations to Supabase: set DATABASE_URL and DATABASE_URL_DIRECT, run `npx drizzle-kit migrate`, then apply supabase/migrations/0001_enable_rls.sql, 0002_auth_hook.sql, and 0003_rls_policies.sql
- Enable Custom Access Token Hook in Supabase Dashboard: Authentication > Hooks > Custom Access Token > select `public.custom_access_token_hook`

### Blockers/Concerns

- [Research]: Custom SMTP must be configured before auth emails are tested — Supabase default rate limit is 2/hour
- [Research]: Confirm actual Supabase API key format for post-May 2025 projects (sb_publishable_xxx vs anon key) — Vercel Marketplace integration handles this automatically if used
- [Research]: Batch AI auto-mapping endpoint timeout budget unknown — validate against real deployment before committing to streaming vs async job queue architecture
- [01-01]: Migration not yet applied — requires Supabase project + DATABASE_URL_DIRECT env var

## Session Continuity

Last session: 2026-02-19
Stopped at: Completed 01-03-PLAN.md (RLS policies migration for all 33 tables)
Resume file: .planning/phases/01-supabase-foundation/01-04-PLAN.md
