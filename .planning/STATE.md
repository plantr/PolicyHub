# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-19)

**Core value:** Get Policy Hub running on Supabase + Vercel with business-unit-scoped access control
**Current focus:** Phase 4 — Client Migration + Cleanup

## Current Position

Phase: 4 of 4 (Client Migration + Cleanup)
Plan: Not yet planned
Status: Phase 3 complete, Phase 4 not started
Last activity: 2026-02-19 — Phase 3 verified and approved (SPA live at policy-hub-lovat.vercel.app, API returning JSON, env vars configured)

Progress: [█████████░] 75%

## Performance Metrics

**Velocity:**
- Total plans completed: 9
- Average duration: 7 min
- Total execution time: 56 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-supabase-foundation | 4/4 | 20 min | 5 min |
| 02-storage-migration | 2/4 | 5 min | 3 min |
| 03-vercel-deployment | 3/3 | 31 min | 10 min |

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
- 02-02: Legacy inline multer upload routes retained during Phase 2/3 transition — Phase 4 switches clients to signed URL TUS flow
- 02-02: Download route uses Accept header for backward compatibility — JSON clients get { url, expiresIn }; legacy clients get 302 redirect
- 02-02: BU creation wraps bucket provisioning in try/catch with warn-on-fail — BU record creation not blocked by storage failures
- 03-01: buildCommand uses 'npx vite build' not 'tsx script/build.ts' — bypasses Replit-specific esbuild server bundling not needed for Vercel
- 03-01: SPA rewrite uses negative lookahead /((?!api/).*) — excludes /api/* from catch-all so Vercel Express handles API routes
- 03-01: registerRoutes() Promise intentionally ignored — async declaration is vestigial, registration is synchronous
- 03-01: All Replit Vite plugins isolated behind REPL_ID guard with dynamic imports — prevents build failures outside Replit
- 03-02: AI processor functions defined as nested async functions inside registerRoutes — co-located with routes, avoids hoisting issues
- 03-02: ai_jobs SELECT policy uses USING (true) — short-lived operational records, not BU-scoped; all writes via service role
- 03-02: Document versions sorted by createdAt instead of versionNumber (non-existent field) — pre-existing silent bug fixed during refactor

### Pending Todos

- Configure custom SMTP before Phase 2: Supabase Dashboard > Project Settings > Auth > SMTP > Enable Custom SMTP (required for invite and password-reset email delivery)
- Connect GitHub repo to Vercel for automatic preview deployments (DEPL-05 — platform config, not code gap)

### Blockers/Concerns

None

## Session Continuity

Last session: 2026-02-19
Stopped at: Phase 4 context gathered
Resume file: .planning/phases/04-client-migration-cleanup/04-CONTEXT.md
