---
phase: 03-vercel-deployment
verified: 2026-02-19T00:00:00Z
status: human_needed
score: 8/10 must-haves verified
re_verification: false
human_verification:
  - test: "Visit https://policy-hub-lovat.vercel.app and navigate to a sub-route (e.g. /documents), then refresh the page"
    expected: "React SPA loads without a 404 — the SPA rewrite in vercel.json serves index.html for all non-/api/ paths"
    why_human: "Live Vercel deployment cannot be validated programmatically; only the deployment URL is confirmed in the summary"
  - test: "In the browser Network tab on the live Vercel URL, trigger any API call (e.g. load the dashboard which calls /api/business-units)"
    expected: "Response is JSON, not HTML. Status 200. Data comes from the Supabase database."
    why_human: "Confirms the Express serverless function is resolving correctly and the DATABASE_URL env var is configured with port 6543"
  - test: "Check Vercel dashboard at https://vercel.com/dashboard — open the Policy Hub project and look at Settings > Environment Variables"
    expected: "All 5 env vars present: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL (port 6543), AI_INTEGRATIONS_ANTHROPIC_API_KEY"
    why_human: "DEPL-03 (env vars set in Vercel) is a runtime configuration step that cannot be verified in the codebase"
  - test: "Create a test branch and push it to GitHub — check if Vercel auto-creates a preview deployment"
    expected: "Vercel creates a preview deployment URL for the branch within ~2 minutes"
    why_human: "Preview deployments (DEPL-05) are a Vercel platform feature triggered by Git integration; not verifiable in code"
---

# Phase 3: Vercel Deployment Verification Report

**Phase Goal:** The React SPA and serverless functions are deployed and running on Vercel with correct environment configuration, connection pooling, and AI timeout settings
**Verified:** 2026-02-19
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | vercel.json exists with SPA rewrites excluding /api/ paths and correct buildCommand/outputDirectory | VERIFIED | File exists; rewrites use negative lookahead `/((?!api/).*)` → `/index.html`; /api/(.*) → /api; buildCommand `npx vite build && node scripts/build-api.mjs`; outputDirectory `dist/public` |
| 2 | server/index.ts exports the Express app as default and registers routes synchronously (no IIFE) | VERIFIED | `export default app` on line 105; `registerRoutes(httpServer, app)` called at module top level line 64; no async IIFE pattern |
| 3 | Vite build succeeds on non-Replit environments (Replit plugins guarded behind REPL_ID check) | VERIFIED | vite.config.ts line 8: all Replit plugin imports inside `process.env.REPL_ID` conditional using dynamic `import()`; no static `runtimeErrorOverlay` import |
| 4 | package.json declares Node 22.x engine | VERIFIED | `node -e "require('./package.json').engines"` returns `{ node: '22.x' }` |
| 5 | .env.example documents all 5 required environment variables with source locations | VERIFIED | All 5 vars present: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL (with port 6543 note), AI_INTEGRATIONS_ANTHROPIC_API_KEY; source locations documented |
| 6 | AI analysis endpoints return a job ID immediately instead of blocking until Anthropic API responds | VERIFIED | All 3 endpoints (ai-match, ai-coverage, ai-map-controls) insert into aiJobs and fire-and-forget processor without await; return `{ jobId, status: 'pending' }` immediately |
| 7 | Client can poll GET /api/ai-jobs/:jobId to see job status, progress messages, and results | VERIFIED | Polling endpoint at routes.ts line 1170; `client/src/hooks/use-ai-job.ts` polls `/api/ai-jobs/${jobId}` every 2s, stops on terminal states |
| 8 | AI processing runs asynchronously via fire-and-forget within the same function invocation | VERIFIED | All 3 endpoints call `processAi*Job().catch(err => console.error(...))` without await |
| 9 | React SPA loads at the Vercel production URL with all client-side routes working (no 404 on refresh) | NEEDS HUMAN | 03-03-SUMMARY confirms deployment to https://policy-hub-lovat.vercel.app but live behavior requires browser verification |
| 10 | Environment variables are accessible in the correct context (VITE_ vars client-side, secrets server-side only) | NEEDS HUMAN | Code structure is correct (VITE_ prefix used for client vars, SUPABASE_SERVICE_ROLE_KEY server-only) but runtime env var configuration in Vercel dashboard cannot be verified from code |

**Score:** 8/10 truths verified (2 require human verification)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `vercel.json` | Vercel project config with SPA rewrites and build settings | VERIFIED | Valid JSON; 2 rewrite rules; buildCommand includes esbuild pre-bundle step added in 03-03 |
| `server/index.ts` | Vercel-compatible Express app with default export | VERIFIED | 105 lines; synchronous route registration; VERCEL env guard; `export default app` |
| `.env.example` | Environment variable documentation for all deployment contexts | VERIFIED | 41 lines; all 5 required vars with source locations, Vercel assignment notes, security warnings |
| `shared/schema.ts` | ai_jobs Drizzle table definition | VERIFIED | `aiJobs` table at line 493; uuid PK, jobType, entityId, status, progressMessage, result (jsonb), errorMessage, timestamps; `insertAiJobSchema` at line 540 |
| `supabase/migrations/0006_ai_jobs.sql` | DDL for ai_jobs table with RLS enabled | VERIFIED | CREATE TABLE with CHECK constraints; 2 indexes; RLS enabled; SELECT policy for authenticated role |
| `server/routes.ts` | Refactored AI endpoints using dispatch-and-fire pattern + polling endpoint | VERIFIED | GET /api/ai-jobs/:jobId at line 1170; 3 processor functions; fire-and-forget calls with .catch() |
| `client/src/hooks/use-ai-job.ts` | React hook for polling AI job status | VERIFIED | `useAiJob` exported; `refetchInterval` stops on completed/failed; polls every 2s |
| `api/_entry.ts` | Express app re-export entry point for esbuild (added in 03-03 deviation) | VERIFIED | 3-line file: `import app from "../server/index"; export default app;` |
| `scripts/build-api.mjs` | esbuild bundler script for the API function (added in 03-03 deviation) | VERIFIED | Bundles `api/_entry.ts` → `api/index.js`; excludes node_modules and local-only modules |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `vercel.json` | `dist/public` | outputDirectory | VERIFIED | `"outputDirectory": "dist/public"` matches vite.config.ts `build.outDir` |
| `vercel.json` | `api/index.js` | buildCommand esbuild step | VERIFIED | buildCommand: `npx vite build && node scripts/build-api.mjs` produces `api/index.js` |
| `server/index.ts` | `server/routes.ts` | synchronous registerRoutes call | VERIFIED | Line 64: `registerRoutes(httpServer, app)` — no await, top-level, no IIFE wrapping |
| `server/routes.ts` | `shared/schema.ts` | aiJobs table import for insert/update/select | VERIFIED | `aiJobs` in destructured import at line 36; used in insert/update/select throughout AI endpoints |
| `client/src/hooks/use-ai-job.ts` | `/api/ai-jobs/:jobId` | fetch polling with react-query refetchInterval | VERIFIED | `fetch(\`/api/ai-jobs/${jobId}\`)` in queryFn; refetchInterval returns 2000 or false |
| `server/routes.ts` (dispatch) | `server/routes.ts` (processors) | fire-and-forget processAi*Job call without await | VERIFIED | Lines 1210, 1244, 1293: `processAiMatchJob(...).catch(...)`, `processAiCoverageJob(...).catch(...)`, `processAiMapControlsJob(...).catch(...)` |
| `server/db.ts` | `DATABASE_URL` (port 6543) | postgres client with prepare:false | VERIFIED | `postgres(process.env.DATABASE_URL, { prepare: false })` — pooler-compatible; port 6543 enforced by documented env var value |
| `server/routes.ts` | `server/lib/supabase-admin.ts` | supabaseAdmin service role client | VERIFIED | `import { supabaseAdmin } from "./lib/supabase-admin"` at line 16; used for storage operations |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| DEPL-01 | 03-01, 03-03 | React SPA deployed to Vercel with production build | VERIFIED | 03-03-SUMMARY confirms deployment to https://policy-hub-lovat.vercel.app; `dist/public/` build output confirmed by local vite build |
| DEPL-02 | 03-01 | vercel.json configured with SPA rewrites for Wouter client-side routing | VERIFIED | vercel.json has `/((?!api/).*) → /index.html` rewrite |
| DEPL-03 | 03-03 | Environment variables set in Vercel dashboard | NEEDS HUMAN | .env.example documents all 5 vars; 03-03-SUMMARY states they were set; REQUIREMENTS.md marks as `[ ]` pending — cannot verify runtime dashboard config from code |
| DEPL-04 | 03-01 | Client-side env vars use VITE_ prefix for Vite build exposure | VERIFIED | VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.example and codebase; server vars have no VITE_ prefix |
| DEPL-05 | 03-03 | Preview deployments enabled per branch/PR | NEEDS HUMAN | Enabled by default on Git-connected Vercel projects per 03-RESEARCH.md; no code config needed; cannot verify platform behavior programmatically |
| DEPL-06 | 03-01 | Supabase Marketplace integration installed to auto-populate env vars | SUPERSEDED | Research doc explicitly overrides: "user decision overrides this requirement — manual env var config is locked decision." Requirement is marked `[x]` in REQUIREMENTS.md but represents a superseded implementation approach (manual config used instead). No implementation gap. |
| FUNC-01 | 03-01, 03-03 | AI analysis endpoints migrated to Vercel Serverless Functions (Node 22.x runtime) | VERIFIED | Express app deployed as single Vercel function via `api/index.js` pre-bundle; Node 22.x in package.json engines |
| FUNC-02 | 03-02 | maxDuration configured for long-running AI calls (Anthropic API) | SUPERSEDED | Research doc explicitly states: "NOT applicable with background job pattern — AI does not run synchronously; standard function duration is sufficient for the job-dispatch endpoint." Background job + polling eliminates the timeout risk; `maxDuration` deliberately absent from vercel.json. Requirement marked `[x]` in REQUIREMENTS.md represents the timeout problem being solved (not the specific config mechanism). |
| FUNC-03 | 03-02 | Serverless functions use Supabase service role client for database access | VERIFIED | `server/lib/supabase-admin.ts` creates client with `SUPABASE_SERVICE_ROLE_KEY`; imported in routes.ts and storage-supabase.ts |
| FUNC-04 | 03-01 | Serverless functions use pooled connection string (port 6543) for Drizzle queries | VERIFIED | `server/db.ts`: `postgres(process.env.DATABASE_URL, { prepare: false })`; .env.example documents port 6543 requirement |

**Note on DEPL-06 and FUNC-02:** Both requirements are marked `[x]` complete in REQUIREMENTS.md but their "implementation" is the deliberate absence of those approaches in favor of locked user decisions. DEPL-06 (Marketplace integration) was superseded by manual env var config. FUNC-02 (maxDuration) was superseded by the background job pattern. These are correct outcomes — the underlying problems are solved differently.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `server/routes.ts` | 719, 1030, 1034, 1088, 1091 | Pre-existing TypeScript errors (Map iteration, null type mismatch) | INFO | Pre-existing before Phase 3; documented in deferred-items.md; do not affect Vercel deployment path |
| `server/replit_integrations/` | multiple | Pre-existing TypeScript errors (missing exports, type mismatches) | INFO | Behind REPL_ID guard; not in Vercel deployment bundle; logged in deferred-items.md |
| `api/index.js` | — | Pre-bundled artifact in git-tracked location | INFO | Gitignored per .gitignore; not a code quality issue; required for Vercel deployment |

No blockers found. No stubs or placeholder implementations detected in Phase 3 deliverables.

---

### Human Verification Required

### 1. SPA Routing on Refresh

**Test:** Visit https://policy-hub-lovat.vercel.app, navigate to `/documents` (or any sub-route), then press refresh.
**Expected:** The React SPA loads correctly — no 404 error. The page content appears as if navigated normally.
**Why human:** The SPA rewrite in vercel.json can only be verified by making an actual HTTP request through the Vercel CDN layer.

### 2. API Endpoint Returns JSON

**Test:** Open https://policy-hub-lovat.vercel.app in a browser with the Network tab open. Log in (or observe any API call). Confirm `/api/business-units` (or any `/api/` call) returns JSON.
**Expected:** Network tab shows status 200, Content-Type: application/json, body contains database records (not an HTML 404 page).
**Why human:** Confirms the Express serverless function (`api/index.js`) is correctly wired and DATABASE_URL is configured with valid Supabase pooler credentials.

### 3. Environment Variables Configured in Vercel Dashboard (DEPL-03)

**Test:** Navigate to Vercel Dashboard > Policy Hub project > Settings > Environment Variables.
**Expected:** All 5 variables present for all environments: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` (with `pooler.supabase.com:6543` in the value), `AI_INTEGRATIONS_ANTHROPIC_API_KEY`.
**Why human:** Runtime configuration in the Vercel dashboard cannot be inspected from the codebase. REQUIREMENTS.md explicitly marks DEPL-03 as `[ ]` pending.

### 4. Preview Deployments Enabled (DEPL-05)

**Test:** Push a new branch to the connected GitHub repository. Wait 2 minutes and check the Vercel dashboard.
**Expected:** A new preview deployment appears automatically with a unique URL (e.g. `policy-hub-git-branchname-xxx.vercel.app`).
**Why human:** Preview deployments are a Vercel platform feature activated by the Git integration. No code configuration is needed, but the platform behavior must be observed directly.

---

### Deviations from Original Plan (Implemented in 03-03)

The following items were NOT in the original plan specifications but were required to achieve the deployment goal. They are implemented correctly and represent successful problem-solving, not gaps:

1. **esbuild pre-bundle step** — Plan 03-01 assumed Vercel would auto-detect the Express server via its framework preset. In practice, Vercel's nft (Node File Tracer) cannot resolve TypeScript path aliases (`@shared/*`). Solution: `api/_entry.ts` re-exports the Express app; `scripts/build-api.mjs` pre-bundles it to `api/index.js` with all server/shared code inlined. Vercel serves this pre-bundled file as the serverless function.

2. **Relative imports replacing @shared/* in server files** — `server/db.ts`, `server/routes.ts`, `server/storage.ts` now use relative paths (`../shared/schema`) instead of the `@shared/schema` alias. This was required for esbuild to resolve the imports correctly during the pre-bundle step.

3. **Dynamic import for serveStatic** — Converted static `import { serveStatic }` to dynamic `import("./static")` inside the `!process.env.VERCEL` guard. This prevents esbuild from bundling the Vite config chain into the API function bundle.

---

### Gaps Summary

No code-level gaps found. All Phase 3 deliverables exist, are substantive (not stubs), and are correctly wired. The two items flagged for human verification (SPA routing on refresh, API endpoint JSON response) require live environment testing — the code correctly supports both behaviors. DEPL-03 (environment variables set in Vercel dashboard) is a runtime configuration step that cannot be validated in code and is the only requirement still marked pending in REQUIREMENTS.md.

---

_Verified: 2026-02-19_
_Verifier: Claude (gsd-verifier)_
