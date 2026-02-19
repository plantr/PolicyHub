# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-19)

**Core value:** Get Policy Hub running on Supabase + Vercel with business-unit-scoped access control
**Current focus:** Phase 2 — Storage Migration

## Current Position

Phase: 2 of 4 (Storage Migration)
Plan: 1 of 4 in current phase — COMPLETE
Status: Phase 2 in progress (1/4 plans complete)
Last activity: 2026-02-19 — Completed Plan 02-01 (Storage buckets SQL migrations + TypeScript service module)

Progress: [███████░░░] 31%

## Performance Metrics

**Velocity:**
- Total plans completed: 5
- Average duration: 4 min
- Total execution time: 21 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-supabase-foundation | 4/4 | 20 min | 5 min |
| 02-storage-migration | 1/4 | 1 min | 1 min |

**Recent Trend:**
- Last 5 plans: 3 min, 2 min, 3 min, 20 min (with human checkpoint), 1 min
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
- 01-04: SMTP deferred — not blocking Phase 1; must configure before Phase 2 auth email flows (invite, password reset)
- 01-04: VITE_SUPABASE_PUBLISHABLE_KEY used as env var name — post-May 2025 Supabase projects use sb_publishable_xxx key format
- 02-01: Bucket naming bu-{id} enables direct mapping from JWT claim elem->>'id' to bucket_id in RLS EXISTS subquery
- 02-01: No UPDATE policy on storage.objects — files are immutable; version suffix pattern handles updates as new uploads
- 02-01: SIGNED_URL_EXPIRY = 3600s (1 hour) — sufficient for a reading/review session
- 02-01: resolveFilename uses prefix listing rather than error-based retry for conflict detection

### Pending Todos

- Configure custom SMTP before Phase 2: Supabase Dashboard > Project Settings > Auth > SMTP > Enable Custom SMTP (required for invite and password-reset email delivery)

### Blockers/Concerns

- [Research]: Batch AI auto-mapping endpoint timeout budget unknown — validate against real deployment before committing to streaming vs async job queue architecture

## Session Continuity

Last session: 2026-02-19
Stopped at: Completed 02-01-PLAN.md — Storage foundation (buckets + RLS migrations + TypeScript service module)
Resume file: .planning/phases/02-storage-migration/02-02-PLAN.md
