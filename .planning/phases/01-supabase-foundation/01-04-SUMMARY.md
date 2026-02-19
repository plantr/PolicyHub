---
phase: 01-supabase-foundation
plan: "04"
subsystem: auth
tags: [supabase, supabase-js, jwt, rls, rbac, smtp, auth-hook]

# Dependency graph
requires:
  - phase: 01-supabase-foundation/01-01
    provides: Drizzle schema and database migrations applied to Supabase
  - phase: 01-supabase-foundation/01-02
    provides: RLS enablement and custom_access_token_hook function
  - phase: 01-supabase-foundation/01-03
    provides: 66 RLS policies across all 33 tables
provides:
  - Supabase browser client singleton (client/src/lib/supabase.ts)
  - Supabase admin client for server-side use (server/lib/supabase-admin.ts)
  - Environment variable documentation (.env.example)
  - Verified Supabase project: 33 tables with RLS, auth configured, hook active
affects: [phase-02-auth-ui, phase-03-core-features, phase-04-audit-rbac]

# Tech tracking
tech-stack:
  added: ["@supabase/supabase-js"]
  patterns:
    - "Browser Supabase client via createClient with autoRefreshToken + persistSession"
    - "Server admin client via service role key — bypasses RLS, never exposed to browser"
    - "JWT custom claims injected at token creation via custom_access_token_hook"

key-files:
  created:
    - client/src/lib/supabase.ts
    - server/lib/supabase-admin.ts
    - .env.example
  modified: []

key-decisions:
  - "SMTP deferred — not blocking Phase 1 (invite/reset emails not required for foundation); will configure before Phase 2 auth UI"
  - "Auth settings confirmed: signup disabled, email confirm off, 7-day JWT, inactivity timeout off, min password 8"
  - "Custom Access Token Hook enabled in dashboard — JWT claims contain business_units array from user_business_units table"

patterns-established:
  - "Browser client pattern: import { supabase } from '@/lib/supabase' for all client-side DB access"
  - "Admin client pattern: import { supabaseAdmin } from 'server/lib/supabase-admin' for service role operations (invites, writes bypassing RLS)"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-06, INFRA-05]

# Metrics
duration: 20min
completed: 2026-02-19
---

# Phase 01 Plan 04: Supabase Client Setup and Auth Verification Summary

**Supabase JS client installed, browser and admin singletons created, and full project verification completed — 33 tables with RLS, auth hook active, JWT configured with 7-day expiry and per-BU role claims**

## Performance

- **Duration:** ~20 min (including human checkpoint verification)
- **Started:** 2026-02-19
- **Completed:** 2026-02-19
- **Tasks:** 2 (1 auto + 1 checkpoint)
- **Files modified:** 3

## Accomplishments

- Installed `@supabase/supabase-js` and created browser client singleton with auto-refresh session persistence
- Created server-side admin client using service role key (bypasses RLS, never exposed to browser)
- Documented all required environment variables in `.env.example`
- Verified Supabase project: 33 public tables deployed, RLS enabled on all (zero rows without RLS), 67 active RLS policies
- Confirmed Custom Access Token Hook (`public.custom_access_token_hook`) is deployed and enabled in dashboard
- Confirmed auth settings match spec: signup disabled, email confirm off, JWT 7-day expiry, no inactivity timeout, min password 8

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Supabase client, create client module, and document environment variables** - `98a0400` (feat)
2. **Task 2: Verify Supabase project setup, auth configuration, and SMTP** - N/A (human checkpoint — no code changes)

**Plan metadata:** (this commit) (docs: complete plan)

## Files Created/Modified

- `client/src/lib/supabase.ts` - Browser Supabase client singleton using VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY, with autoRefreshToken and persistSession enabled
- `server/lib/supabase-admin.ts` - Server-side admin client using SUPABASE_SERVICE_ROLE_KEY — bypasses RLS for invite/admin operations, never exposed to browser
- `.env.example` - Documents all required environment variables: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL, DATABASE_URL_DIRECT, AI_INTEGRATIONS_ANTHROPIC_API_KEY

## Decisions Made

- SMTP configuration deferred — not blocking Phase 1. The foundation (schema, RLS, hook, client) is fully operational. Custom SMTP will be configured before Phase 2 auth UI work begins, which requires invite and password-reset email delivery.
- `VITE_SUPABASE_PUBLISHABLE_KEY` used as the env var name (post-May 2025 Supabase projects use `sb_publishable_xxx` key format instead of the legacy `anon` key naming).

## Deviations from Plan

None — plan executed exactly as written. SMTP was documented in the plan as a required step; user confirmed it is deferred intentionally and not blocking.

## Issues Encountered

- **SMTP deferred:** Custom SMTP not configured during this plan. Supabase default rate limit (2/hour) is acceptable for Phase 1 since no auth email flows are tested yet. This is tracked as a pending todo — must be resolved before Phase 2.

## User Setup Required

The following dashboard configuration was verified as complete by the user:

| Setting | Value | Location |
|---------|-------|----------|
| Confirm email | OFF | Authentication > General |
| Allow new users to sign up | OFF | Authentication > General |
| JWT Expiry | 604800 (7 days) | Authentication > Sessions |
| Inactivity Timeout | 0 (disabled) | Authentication > Sessions |
| Minimum password length | 8 | Authentication > Passwords |
| Custom Access Token Hook | public.custom_access_token_hook | Authentication > Hooks |
| Custom SMTP | Deferred | Project Settings > Auth > SMTP |

**Pending (before Phase 2):** Configure custom SMTP in Supabase Dashboard > Project Settings > Auth > SMTP. Required for invite emails and password reset flows.

## Next Phase Readiness

Phase 1 (Supabase Foundation) is now complete:
- 33-table schema migrated and deployed
- RLS enabled on all tables with 67 policies
- Custom Access Token Hook active — JWT carries per-BU role claims
- Supabase JS client available for browser and server use

Ready for Phase 2 (Auth UI) — the login page, invite acceptance, and password-reset flows can be built against this foundation.

**One remaining action before auth email flows:** Configure custom SMTP (currently deferred, not blocking).

---
*Phase: 01-supabase-foundation*
*Completed: 2026-02-19*
