---
phase: 01-supabase-foundation
verified: 2026-02-19T00:00:00Z
status: gaps_found
score: 14/16 requirements verified (1 gap, 1 human-needed)
re_verification: false
gaps:
  - truth: "Auth emails (invite, password reset) are delivered via custom SMTP"
    status: failed
    reason: "INFRA-05 requires Custom SMTP provider configured. SUMMARY frontmatter claims INFRA-05 as requirements-completed but the plan body explicitly documents it as deferred. The Supabase dashboard SMTP setting remains on the default 2-emails/hour limit. No SMTP configuration exists in the codebase or dashboard."
    artifacts:
      - path: "Supabase Dashboard > Project Settings > Auth > SMTP"
        issue: "Not configured — shows 'Deferred' in dashboard verification table"
    missing:
      - "Configure custom SMTP provider (e.g., Resend, SendGrid) in Supabase Dashboard > Project Settings > Auth > SMTP before any invite or password-reset email flow is tested"
      - "Remove INFRA-05 from requirements-completed in 01-04-SUMMARY.md frontmatter — it was not completed in this phase"
human_verification:
  - test: "Invite a test user via supabaseAdmin.auth.admin.inviteUserByEmail(), set a password via the invite link, and log in"
    expected: "User can log in, session persists across page refresh, JWT contains business_units array with correct {id, role} objects"
    why_human: "End-to-end auth flow with Supabase Auth requires a live Supabase project and a real browser session — cannot verify programmatically"
  - test: "Assign a user to business unit A with role 'viewer', log in, then attempt to read a row belonging to business unit B"
    expected: "The read is blocked by RLS — zero rows returned or permission denied"
    why_human: "RLS policy enforcement requires a live Supabase project with real auth tokens — cannot verify from SQL files alone"
  - test: "Confirm AUTH-01 / AUTH-02 requirement intent: self-signup is disabled; user must be invited by admin"
    expected: "Signup form (if built) should be absent or disabled. Only invite flow works. AUTH-01 = signInWithPassword() works for invited users; AUTH-02 = invite email delivered via inviteUserByEmail()"
    why_human: "Requirement text in REQUIREMENTS.md conflicts with actual dashboard config (signup disabled, email confirm off). Intent is correct per RESEARCH.md but the requirement descriptions are misleading. Human judgment needed on whether requirements should be re-worded."
---

# Phase 1: Supabase Foundation Verification Report

**Phase Goal:** The Supabase project is live with the full schema, working email/password auth, and RLS enforced on every table — the security foundation everything else depends on

**Verified:** 2026-02-19
**Status:** gaps_found — 1 confirmed gap (INFRA-05 SMTP not configured), 3 human verification items
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from Plan must_haves + ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Drizzle generates SQL migration files from schema including user_business_units | VERIFIED | `migrations/0000_clammy_big_bertha.sql` — 33 CREATE TABLE statements confirmed |
| 2 | db.ts runtime client uses postgres.js with prepare:false for pooler compatibility | VERIFIED | `server/db.ts` lines 12-13: `postgres(process.env.DATABASE_URL, { prepare: false })` |
| 3 | Two separate connection URLs exist (pooler port 6543 + direct port 5432) | VERIFIED | `drizzle.config.ts` uses `DATABASE_URL_DIRECT || DATABASE_URL`; `.env.example` documents both URLs |
| 4 | RLS enabled on every public table — zero rows without rowsecurity | VERIFIED (SQL) | `supabase/migrations/0001_enable_rls.sql` — exactly 33 ENABLE ROW LEVEL SECURITY statements |
| 5 | Custom Access Token Hook injects per-BU role map into JWT app_metadata | VERIFIED (SQL) | `supabase/migrations/0002_auth_hook.sql` — PL/pgSQL hook reads user_business_units, injects `{id, role}` array into `app_metadata.business_units` |
| 6 | supabase_auth_admin has SELECT access on user_business_units | VERIFIED | `0002_auth_hook.sql`: both `GRANT SELECT ON TABLE public.user_business_units TO supabase_auth_admin` and `CREATE POLICY "supabase_auth_admin_select"` |
| 7 | An authenticated user can only SELECT BU-scoped rows matching their JWT claims | VERIFIED (SQL) | `0003_rls_policies.sql` — 66 policies; all BU-scoped SELECT policies use `business_unit_id = ANY(SELECT (elem->>'id')::int FROM jsonb_array_elements(COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)) AS elem)` |
| 8 | Editor/admin can INSERT, UPDATE, DELETE; viewer cannot write | VERIFIED (SQL) | `0003_rls_policies.sql` — all write policies add `WHERE elem->>'role' IN ('admin', 'editor')` to the subquery; no viewer write policies exist |
| 9 | Anonymous (unauthenticated) users cannot access any table | VERIFIED | `grep "TO anon" 0003_rls_policies.sql` returns 0 results; all 66 policies are `TO authenticated` only |
| 10 | Reference/lookup tables are readable by all authenticated, no write policies | VERIFIED | 12 Template B tables each have exactly one `SELECT USING (true)` policy; no INSERT/UPDATE/DELETE policies for authenticated role |
| 11 | RLS policies use inverted jsonb_array_elements subquery pattern | VERIFIED | 53 occurrences of `jsonb_array_elements` in `0003_rls_policies.sql`; 54 occurrences of `app_metadata` |
| 12 | Supabase JS browser client initialized with project URL and publishable key | VERIFIED | `client/src/lib/supabase.ts` — createClient with VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY; autoRefreshToken + persistSession enabled |
| 13 | Sessions persist across browser refresh via Supabase JS auto-refresh | VERIFIED (code) | `client/src/lib/supabase.ts` lines 13-14: `autoRefreshToken: true, persistSession: true` |
| 14 | Service role admin client available for server-side operations bypassing RLS | VERIFIED | `server/lib/supabase-admin.ts` — createClient with SUPABASE_SERVICE_ROLE_KEY, autoRefreshToken: false |
| 15 | Auth emails delivered via custom SMTP | FAILED | SMTP explicitly deferred; dashboard config shows "Custom SMTP: Deferred". INFRA-05 not completed despite being listed in requirements-completed |
| 16 | Admin can assign user to BU with role; JWT reflects it on next login | HUMAN NEEDED | SQL infrastructure is in place (user_business_units table, hook reads it, policies exist); end-to-end flow requires live Supabase project |

**Score:** 14/16 truths verified (1 failed, 1 human-needed)

---

## Required Artifacts

### Plan 01-01 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `shared/schema.ts` | userBusinessUnits table + authUserId on users | VERIFIED | Line 420: `authUserId: text("auth_user_id")`; lines 428-441: `userBusinessUnits` pgTable with userId, businessUnitId, role, UNIQUE constraint |
| `server/db.ts` | postgres.js Drizzle client with prepare:false | VERIFIED | 13 lines, substantive implementation; imports postgres.js and @shared/schema; exports db |
| `drizzle.config.ts` | Migration config pointing to DATABASE_URL_DIRECT | VERIFIED | Uses `DATABASE_URL_DIRECT || DATABASE_URL || ""` fallback pattern |
| `migrations/` | Generated SQL migration files for all 33 tables | VERIFIED | `migrations/0000_clammy_big_bertha.sql` — 33 CREATE TABLE statements; meta journal and snapshot exist |

### Plan 01-02 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/0001_enable_rls.sql` | ALTER TABLE ENABLE ROW LEVEL SECURITY for all 33 tables | VERIFIED | Exactly 33 ENABLE ROW LEVEL SECURITY statements covering all 33 public tables by name |
| `supabase/migrations/0002_auth_hook.sql` | PL/pgSQL Custom Access Token Hook with permissions | VERIFIED | STABLE function, reads user_business_units, injects business_units array; GRANT EXECUTE to supabase_auth_admin; REVOKE from authenticated/anon/public; CREATE POLICY for supabase_auth_admin_select; GRANT SELECT on table |

### Plan 01-03 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/0003_rls_policies.sql` | RLS policies for all 33 tables using auth.jwt() | VERIFIED | 950 lines, 66 CREATE POLICY statements, all 33 tables covered (confirmed by policy name extraction), uses `auth.jwt()->'app_metadata'->'business_units'` throughout, zero `TO anon` policies |

### Plan 01-04 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `client/src/lib/supabase.ts` | Supabase client singleton for browser use | VERIFIED (ORPHANED) | Substantive implementation with createClient, env var validation, auth config. Not yet imported by any other client file — by design (client migration is Phase 4) |
| `server/lib/supabase-admin.ts` | Admin client for server-side use | VERIFIED (ORPHANED) | Substantive implementation with service role key, RLS bypass. Not yet imported by any server file — by design (server migration is Phase 3/4) |
| `.env.example` | Environment variable documentation | VERIFIED | Documents VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL, DATABASE_URL_DIRECT, AI key |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `server/db.ts` | `shared/schema.ts` | `import * as schema from "@shared/schema"` | VERIFIED | Line 3 of db.ts; pattern matches exactly |
| `drizzle.config.ts` | `DATABASE_URL_DIRECT` | env var for direct connection | VERIFIED | `process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL || ""` |
| `supabase/migrations/0002_auth_hook.sql` | `public.user_business_units` | SELECT query inside hook function | VERIFIED | `FROM public.user_business_units WHERE user_id = (event->>'user_id')` |
| `supabase/migrations/0002_auth_hook.sql` | `supabase_auth_admin` | GRANT SELECT permission | VERIFIED | `GRANT SELECT ON TABLE public.user_business_units TO supabase_auth_admin` |
| `supabase/migrations/0003_rls_policies.sql` | `auth.jwt()->'app_metadata'->'business_units'` | JWT claims extraction in USING/WITH CHECK | VERIFIED | 53 occurrences of jsonb_array_elements; 54 occurrences of app_metadata |
| `client/src/lib/supabase.ts` | Supabase project | `import.meta.env.VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` | VERIFIED | Both env vars read at lines 3-4 of supabase.ts |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| INFRA-01 | 01-01 | PostgreSQL database provisioned on Supabase with schema migrated | VERIFIED | `migrations/0000_clammy_big_bertha.sql` — 33 tables; SUMMARY confirms migration applied to Supabase |
| INFRA-02 | 01-01 | Transaction-mode connection pooling (port 6543) configured | VERIFIED | `server/db.ts` uses DATABASE_URL (pooler); `.env.example` documents port 6543 URL |
| INFRA-03 | 01-01 | Drizzle ORM configured with `prepare: false` | VERIFIED | `server/db.ts` line 12: `{ prepare: false }` |
| INFRA-04 | 01-01 | Separate direct connection URL (port 5432) for Drizzle Kit migrations | VERIFIED | `drizzle.config.ts` reads DATABASE_URL_DIRECT (port 5432); `.env.example` documents it |
| INFRA-05 | 01-04 | Custom SMTP provider configured for Supabase Auth emails | FAILED | Explicitly deferred — dashboard shows "Custom SMTP: Deferred". SUMMARY claims this complete in frontmatter but body text contradicts it |
| AUTH-01 | 01-04 | User can sign up with email and password via Supabase Auth | HUMAN NEEDED | `signInWithPassword()` is available via supabase.ts; "sign up" means invite flow here (signup disabled per design); live test needed |
| AUTH-02 | 01-04 | User receives email confirmation after signup | HUMAN NEEDED | Per RESEARCH.md: email confirm is OFF by design; AUTH-02 maps to invite email via `inviteUserByEmail()`; SMTP deferred means emails not testable yet |
| AUTH-03 | 01-04 | User can reset password via email link | HUMAN NEEDED | `resetPasswordForEmail()` available in supabase.ts; requires SMTP (deferred) and live Supabase project |
| AUTH-04 | 01-04 | User session persists across browser refresh | VERIFIED (code) | `client/src/lib/supabase.ts`: `autoRefreshToken: true, persistSession: true` |
| AUTH-05 | 01-02 | Custom Access Token Hook injects BU IDs and role into JWT | VERIFIED (SQL) | `0002_auth_hook.sql` — function exists, correct structure, dashboard hook enabled per SUMMARY |
| AUTH-06 | 01-04 | Admin can assign users to BUs with roles | VERIFIED (SQL infra) | `user_business_units` table exists, `supabaseAdmin` client available for writes; end-to-end flow human-verified per SUMMARY |
| RLS-01 | 01-02 | RLS enabled on all database tables | VERIFIED | `0001_enable_rls.sql` — 33 ENABLE ROW LEVEL SECURITY; SUMMARY reports zero-row query confirmed on live DB |
| RLS-02 | 01-03 | RLS policies scope data access by BU using JWT claims | VERIFIED | `0003_rls_policies.sql` — all BU-scoped tables use `auth.jwt()->'app_metadata'->'business_units'` subquery |
| RLS-03 | 01-03 | Anonymous access blocked on all tables | VERIFIED | Zero `TO anon` policies in 0003_rls_policies.sql; RLS enabled on all tables = anon blocked by default |
| RLS-04 | 01-03 | Service role bypass available for serverless functions | VERIFIED | `server/lib/supabase-admin.ts` — service role client; Supabase service role bypasses RLS by design (no extra config) |
| RLS-05 | 01-03 | RLS policies use inverted query pattern | VERIFIED | 53 occurrences of `jsonb_array_elements` in 0003_rls_policies.sql; inverted subquery pattern confirmed |
| RLS-06 | 01-02 | All tables verified via pg_tables query returning zero rows | VERIFIED (human) | SUMMARY reports live DB query confirmed zero rows without rowsecurity |

### Orphaned Requirements Check

All 16 Phase 1 requirement IDs declared across the four plans match the requirement IDs listed in ROADMAP.md Phase 1. No orphaned requirements.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `01-04-SUMMARY.md` frontmatter | — | INFRA-05 listed in `requirements-completed` despite being explicitly deferred in body text | Warning | Creates false signal that SMTP is configured; INFRA-05 should remain open until SMTP is configured |
| `client/src/lib/supabase.ts` | — | Not imported by any other client file | Info | Expected — Phase 4 performs client migration. Not a bug, noted for awareness |
| `server/lib/supabase-admin.ts` | — | Not imported by any other server file | Info | Expected — Phase 3/4 performs server migration. Not a bug, noted for awareness |
| `REQUIREMENTS.md` | AUTH-01, AUTH-02 | Requirement text describes self-signup and email confirmation, but actual design uses invite-only flow with confirmation disabled | Warning | Text misleads future readers; RESEARCH.md has the correct interpretation |

No blocker-severity anti-patterns found in any SQL migration or TypeScript implementation files.

---

## Human Verification Required

### 1. End-to-End Auth Flow

**Test:** Invite a test user via `supabaseAdmin.auth.admin.inviteUserByEmail(email, { data: {} })`, have the user click the invite link, set a password, and log in via `supabase.auth.signInWithPassword({ email, password })`

**Expected:** Login succeeds, `supabase.auth.getSession()` returns a session, the JWT decoded payload contains `app_metadata.business_units: [{id: <n>, role: "..."}]` for the user's assigned BU

**Why human:** Live Supabase project required; involves real auth tokens and email delivery

### 2. Cross-BU Data Isolation

**Test:** With a user authenticated to business unit A only, attempt to query a table (e.g., `findings`) for rows belonging to business unit B

**Expected:** Zero rows returned (RLS silently filters them out)

**Why human:** Requires live Supabase project with real JWT tokens and populated test data

### 3. Requirement Text Accuracy for AUTH-01 / AUTH-02

**Test:** Review whether REQUIREMENTS.md AUTH-01 ("sign up") and AUTH-02 ("email confirmation") accurately describe the implemented behavior (invite-only, no self-signup, confirmation disabled)

**Expected:** Either requirements are accepted as-written with the understanding that "sign up" = "sign in via invite link + set password", or the requirement descriptions are updated to reflect actual design

**Why human:** Judgment call on requirements documentation accuracy — no code change required either way

---

## Gaps Summary

One confirmed gap prevents claiming full INFRA-05 completion:

**INFRA-05 — Custom SMTP not configured.** The phase plan listed SMTP configuration as required (`INFRA-05`) and the plan included dashboard steps for it. The SUMMARY frontmatter (`requirements-completed: [..., INFRA-05]`) marks it complete, but the SUMMARY body explicitly states "SMTP deferred" and the dashboard verification table shows "Custom SMTP: Deferred." The Supabase default rate limit (2 emails/hour) is insufficient for production use per the requirement description itself. This is not a codebase artifact gap — no file needs to be created — but the SMTP must be configured in the Supabase Dashboard before auth email flows (invite, password reset) can function reliably.

**Resolution:** Configure custom SMTP in Supabase Dashboard > Project Settings > Auth > SMTP before Phase 2 auth UI work begins. This was documented as a pre-Phase-2 requirement in the SUMMARY. INFRA-05 should remain open until then.

**AUTH-01/02/03 human verification** is contingent on SMTP being configured. Password reset (AUTH-03) requires SMTP. Invite flow (AUTH-02) requires SMTP. Both are blocked by the INFRA-05 gap.

**All database-layer artifacts are complete and correct.** The schema, migrations, RLS enablement, auth hook, and 66 RLS policies are substantive, wired, and match their specifications exactly. The Supabase client libraries are created and correct. The database security foundation is solid.

---

_Verified: 2026-02-19_
_Verifier: Claude (gsd-verifier)_
