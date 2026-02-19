---
phase: 03-vercel-deployment
plan: "02"
subsystem: api
tags: [anthropic, background-jobs, async, polling, react-query, supabase, drizzle]

# Dependency graph
requires:
  - phase: 03-01
    provides: Vercel deployment configuration and serverless function setup

provides:
  - ai_jobs Drizzle table definition (shared/schema.ts)
  - SQL migration 0006_ai_jobs.sql with RLS and indexes
  - Polling endpoint GET /api/ai-jobs/:jobId
  - Dispatch-and-fire AI endpoints returning job IDs immediately
  - processAiMatchJob, processAiCoverageJob, processAiMapControlsJob processor functions
  - useAiJob React hook for polling job status every 2s

affects:
  - phase-04-client-migration
  - any phase that touches AI endpoints or needs progress indicators

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dispatch-and-fire: route handler creates DB job record, fires processor without await, returns job ID"
    - "Fire-and-forget with .catch(): async processor errors logged but do not crash route handler"
    - "Polling hook: useQuery with refetchInterval returning false on terminal states"

key-files:
  created:
    - shared/schema.ts (aiJobs table definition added)
    - supabase/migrations/0006_ai_jobs.sql
    - client/src/hooks/use-ai-job.ts
  modified:
    - server/routes.ts

key-decisions:
  - "Processor functions defined as nested async functions inside registerRoutes — avoids module-level hoisting issues while keeping them co-located with the routes they serve"
  - "ai_jobs read policy is permissive (USING true) — jobs are short-lived operational records, not BU-scoped; only authenticated role can SELECT, all writes via service role"
  - "Sort document versions by createdAt timestamp instead of versionNumber (which does not exist in schema) — pre-existing code used non-existent field, fixed as part of this refactor"

patterns-established:
  - "Job dispatch pattern: validate inputs first, insert job record, fire-and-forget processor, return { jobId, status: 'pending' }"
  - "Processor pattern: update status to processing, run AI work, update to completed/failed with result/errorMessage"
  - "Per-batch progress: ai-map-controls writes progressMessage for each batch iteration"

requirements-completed: [FUNC-01, FUNC-02, FUNC-03]

# Metrics
duration: 4min
completed: 2026-02-19
---

# Phase 03 Plan 02: AI Background Job Queue Summary

**Supabase-backed async job queue for Anthropic AI endpoints using fire-and-forget dispatch pattern with per-batch progress tracking and React Query polling hook**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-19T16:23:05Z
- **Completed:** 2026-02-19T16:26:48Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- All 3 AI endpoints (`ai-match`, `ai-coverage`, `ai-map-controls`) now return a job ID immediately without blocking on Anthropic API calls
- Background processor functions update job status and per-batch progress in the `ai_jobs` Supabase table during processing
- Client-side `useAiJob` hook polls GET /api/ai-jobs/:jobId every 2s, stopping automatically when status reaches `completed` or `failed`

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ai_jobs table schema and SQL migration** - `477dbde` (feat)
2. **Task 2: Refactor AI endpoints to dispatch-and-fire pattern with polling endpoint** - `746b81d` (feat)

**Plan metadata:** (pending final commit)

## Files Created/Modified

- `shared/schema.ts` - Added `aiJobs` Drizzle table definition with uuid PK, `uuid` import, and `insertAiJobSchema`
- `supabase/migrations/0006_ai_jobs.sql` - DDL creating ai_jobs table with CHECK constraints, two indexes, RLS enabled, permissive SELECT policy for authenticated
- `server/routes.ts` - Added `aiJobs` import; added GET /api/ai-jobs/:jobId polling endpoint; refactored 3 AI endpoints to dispatch-and-fire; added 3 processor functions
- `client/src/hooks/use-ai-job.ts` - New React hook polling AI job status with 2s interval, stops on terminal states

## Decisions Made

- Processor functions are nested async functions inside `registerRoutes` to avoid module-level hoisting complexity while keeping them co-located with route handlers
- `ai_jobs` SELECT policy uses `USING (true)` — jobs are short-lived operational records, not business-unit-scoped data; all writes via service role (bypasses RLS)
- Sorted document versions by `createdAt` timestamp instead of the non-existent `versionNumber` field — this was a pre-existing bug silently returning `undefined` that surfaced during refactor

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed document version sort using non-existent versionNumber field**
- **Found during:** Task 2 (refactoring processAiMatchJob and processAiCoverageJob)
- **Issue:** Original code sorted versions by `versionNumber` which does not exist in the `documentVersions` schema (schema has `version: text`); the sort was silently returning `undefined` for all rows, making sort order undefined
- **Fix:** Replaced `(b.versionNumber ?? 0) - (a.versionNumber ?? 0)` with `new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()` in both processor functions (matches logical ordering by creation time)
- **Files modified:** server/routes.ts
- **Verification:** TypeScript no longer references non-existent field; sort produces deterministic ordering
- **Committed in:** 746b81d (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Bug fix was necessary for correct version selection. No scope creep.

## Issues Encountered

Pre-existing TypeScript errors in `server/replit_integrations/` (chat/batch modules) and unrelated routes.ts lines (719, 1030, 1034, 1088, 1091) were present before this plan and are not caused by these changes. These are out-of-scope per deviation rules and logged for awareness.

## User Setup Required

Run the SQL migration in Supabase:
1. Open Supabase Dashboard > SQL Editor
2. Paste and execute the contents of `supabase/migrations/0006_ai_jobs.sql`

This creates the `ai_jobs` table with indexes and RLS policies required for the polling endpoint to function.

## Next Phase Readiness

- AI job queue infrastructure is complete and ready for Phase 4 client migration
- Client components calling AI endpoints need to be updated to handle `{ jobId, status }` response shape and use `useAiJob` hook for progress display — this is explicitly Phase 4 work
- The `ai_jobs` table migration must be applied to the Supabase project before deployment

## Self-Check: PASSED

- FOUND: shared/schema.ts (aiJobs table + insertAiJobSchema)
- FOUND: supabase/migrations/0006_ai_jobs.sql
- FOUND: server/routes.ts (polling endpoint + 3 processor functions + dispatch pattern)
- FOUND: client/src/hooks/use-ai-job.ts (polling hook)
- FOUND: .planning/phases/03-vercel-deployment/03-02-SUMMARY.md
- FOUND commit: 477dbde (feat(03-02): add ai_jobs table schema and SQL migration)
- FOUND commit: 746b81d (feat(03-02): refactor AI endpoints to dispatch-and-fire + polling)
- FOUND commit: 275b2e0 (docs(03-02): complete AI background job queue plan)

---
*Phase: 03-vercel-deployment*
*Completed: 2026-02-19*
