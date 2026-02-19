---
phase: 03-vercel-deployment
plan: 01
subsystem: infra
tags: [vercel, express, vite, serverless, env-vars]

# Dependency graph
requires: []
provides:
  - vercel.json with SPA rewrites and build configuration
  - Express app exported as default for Vercel function auto-detection
  - server/index.ts refactored to synchronous top-level route registration
  - vite.config.ts with Replit plugins guarded behind REPL_ID
  - .env.example documenting all 5 required deployment variables
affects: [03-02, 03-03, all future deployment phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "VERCEL env guard: if (!process.env.VERCEL) for local-only code paths"
    - "REPL_ID env guard: dynamic imports for all Replit-specific Vite plugins"
    - "Default export pattern: export default app for Vercel serverless function detection"
    - "Synchronous route registration: registerRoutes() called at module top level, Promise ignored"

key-files:
  created:
    - vercel.json
  modified:
    - server/index.ts
    - vite.config.ts
    - package.json
    - .env.example

key-decisions:
  - "buildCommand uses 'npx vite build' not 'tsx script/build.ts' — bypasses Replit-specific esbuild server bundling"
  - "outputDirectory is 'dist/public' — matches vite.config.ts build.outDir"
  - "SPA rewrite uses negative lookahead /((?!api/).*) — excludes /api/* from catch-all"
  - "registerRoutes Promise ignored — async declaration is vestigial, registration is synchronous"
  - "reusePort: true retained in listen() options for non-Vercel local dev compatibility"

patterns-established:
  - "Vercel/local branching: if (!process.env.VERCEL) wraps all local-only server behavior"
  - "Replit plugin isolation: all @replit/* imports are dynamic and guarded behind REPL_ID"

requirements-completed: [DEPL-01, DEPL-02, DEPL-04, DEPL-05, DEPL-06, FUNC-01, FUNC-04]

# Metrics
duration: 2min
completed: 2026-02-19
---

# Phase 3 Plan 01: Vercel Project Configuration and Server Refactor Summary

**vercel.json with SPA rewrites + Express default export via synchronous top-level route registration, Replit plugins isolated behind REPL_ID**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-19T16:22:56Z
- **Completed:** 2026-02-19T16:24:52Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Created vercel.json with SPA rewrite pattern excluding /api/ paths, correct buildCommand and outputDirectory
- Refactored server/index.ts: removed async IIFE, synchronous top-level registerRoutes call, VERCEL env guards on static serving and listen(), added export default app
- Guarded all Replit Vite plugins (runtimeErrorOverlay, cartographer, devBanner) behind REPL_ID check using dynamic imports — Vite build succeeds outside Replit
- Added engines.node 22.x to package.json
- Replaced .env.example with comprehensive deployment docs covering all 5 required vars with source locations, Vercel environment assignments, and security warnings

## Task Commits

Each task was committed atomically:

1. **Task 1: Create vercel.json, update package.json and vite.config.ts** - `119983a` (chore)
2. **Task 2: Refactor server/index.ts for Vercel-compatible Express export** - `19da386` (feat)
3. **Task 3: Update .env.example with comprehensive Vercel deployment documentation** - `4ce9056` (docs)

**Plan metadata:** (docs: complete plan — to be committed)

## Files Created/Modified
- `vercel.json` - Vercel project config: SPA rewrites, buildCommand, outputDirectory
- `server/index.ts` - Vercel-compatible Express: default export, sync route registration, VERCEL guard
- `vite.config.ts` - Replit plugins guarded behind REPL_ID with dynamic imports
- `package.json` - Added engines.node 22.x constraint
- `.env.example` - Comprehensive env var documentation with source locations and Vercel guidance

## Decisions Made
- buildCommand uses `npx vite build` not `tsx script/build.ts` — bypasses Replit-specific esbuild server bundling not needed for Vercel
- SPA rewrite uses negative lookahead `/((?!api/).*)/` so Vercel's Express integration handles /api/* routes
- registerRoutes() Promise intentionally ignored — the async declaration is vestigial; route registration (app.get/post/etc.) is synchronous
- reusePort: true retained inside VERCEL guard for Replit compatibility during transition

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript errors in server/replit_integrations/ and server/routes.ts (unrelated to this plan's changes). These were not introduced by any files modified in this plan — verified by confirming no errors reference index.ts, vite.config.ts, package.json, vercel.json, or .env.example.

## User Setup Required

None at this stage — environment variables are documented in .env.example but must be configured in the Vercel dashboard before deployment (covered in a subsequent plan).

## Next Phase Readiness
- Project structure is ready for `vercel build` — the two foundational blockers (IIFE and Replit-only plugins) are resolved
- Next plan (03-02) can proceed with Vercel project creation and Git integration
- No blockers introduced

---
*Phase: 03-vercel-deployment*
*Completed: 2026-02-19*
