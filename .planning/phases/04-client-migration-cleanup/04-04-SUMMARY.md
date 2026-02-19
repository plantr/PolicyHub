---
phase: 04-client-migration-cleanup
plan: 04
subsystem: infra
tags: [cleanup, vercel, supabase, tus, storage, vite, typescript]

# Dependency graph
requires:
  - phase: 04-03
    provides: Serverless functions with TUS upload-url and upload-confirm actions for document versions
  - phase: 04-02
    provides: Direct Supabase reads in all pages; apiRequest helper for JSON mutations
  - phase: 02-01
    provides: uploadFileToStorage function in client/src/lib/storage.ts
provides:
  - Clean codebase with zero Replit, Passport, S3, or multer references
  - Document upload UI using TUS signed-URL flow in Documents.tsx, DocumentDetail.tsx, VersionDetail.tsx
  - Updated README documenting Supabase + Vercel architecture and setup
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "All document API calls use query-param routing: /api/resource?id=N&action=verb (no path-based IDs)"
    - "TUS upload flow: POST upload-url → uploadFileToStorage() → POST upload-confirm"
    - "npm run dev = vercel dev (not Express server)"

key-files:
  created:
    - README.md
  modified:
    - package.json
    - vite.config.ts
    - .gitignore
    - client/src/pages/Documents.tsx
    - client/src/pages/DocumentDetail.tsx
    - client/src/pages/VersionDetail.tsx
  deleted:
    - server/index.ts
    - server/routes.ts
    - server/s3.ts
    - server/vite.ts
    - server/static.ts
    - server/replit_integrations/ (entire directory)
    - script/build.ts
    - .replit

key-decisions:
  - "server/index.ts and server/routes.ts deleted — all routes migrated to api/*.ts serverless functions, no Express server needed"
  - "Document creation in Documents.tsx uses two-step TUS flow: create document (JSON) + optionally create initial version + TUS upload"
  - "All API URL calls standardized to query-param convention (?id=N&action=verb) to match serverless routing"

patterns-established:
  - "Query-param API convention: all mutations use /api/resource?id=N&action=verb not /api/resource/${id}/subresource"

requirements-completed: [CLNP-01, CLNP-02, CLNP-03, CLNP-05, CLNP-06]

# Metrics
duration: 7min
completed: 2026-02-19
---

# Phase 4 Plan 4: Legacy Cleanup and TUS Upload Migration Summary

**Zero legacy references: Replit, Passport, S3, multer removed; all document uploads migrated to TUS signed-URL flow; README documents Supabase + Vercel architecture**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-19T20:15:58Z
- **Completed:** 2026-02-19T20:22:48Z
- **Tasks:** 2
- **Files modified:** 7 (+ 8 deleted, 1 created)

## Accomplishments

- Uninstalled 15 legacy packages (passport, express-session, connect-pg-simple, memorystore, @aws-sdk/client-s3, @aws-sdk/s3-request-presigner, multer, @types/multer, @replit/vite-plugin-cartographer, @replit/vite-plugin-dev-banner, @replit/vite-plugin-runtime-error-modal, @types/connect-pg-simple, @types/express-session, @types/passport, @types/passport-local)
- Deleted 8 legacy files/directories: server/index.ts, server/routes.ts, server/s3.ts, server/vite.ts, server/static.ts, server/replit_integrations/, script/build.ts, .replit
- Cleaned vite.config.ts of REPL_ID conditional and server.fs block
- Updated package.json: dev=vercel dev, build=vite+api build, removed start script
- Migrated Documents.tsx, DocumentDetail.tsx, and VersionDetail.tsx from FormData/multer to TUS signed-URL flow
- Fixed all path-based API calls to query-param convention (?id=N&action=verb)
- Created README.md with Supabase + Vercel setup instructions

## Task Commits

1. **Task 1: Remove legacy packages, files, and Replit code** - `c6034a2` (chore)
2. **Task 2: Migrate document upload UI to TUS flow and update README** - `3c4f05a` (feat)

**Plan metadata:** (pending docs commit)

## Files Created/Modified

- `package.json` - Removed legacy dependencies; dev=vercel dev, build=vite+api build
- `vite.config.ts` - Removed REPL_ID conditional block and server.fs block
- `.gitignore` - Added .replit and replit.nix entries
- `client/src/pages/Documents.tsx` - TUS upload flow for new document creation
- `client/src/pages/DocumentDetail.tsx` - TUS upload flow for version creation and PDF attachment; fixed API URL conventions
- `client/src/pages/VersionDetail.tsx` - TUS upload flow for PDF attachment; fixed API URL conventions
- `README.md` - Created with Supabase + Vercel setup instructions

## Decisions Made

- server/index.ts and server/routes.ts deleted — api/*.ts serverless functions are the sole routing layer; no Express server is needed outside of the app object (which was only needed for the deleted `_entry.ts`)
- Two-step TUS flow for Documents.tsx: create document record, then create initial draft version, then TUS upload — document creation is now always separate from file attachment
- All API URL patterns standardized to query-param convention throughout client pages

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed path-based API calls that would 404 on Vercel**
- **Found during:** Task 2 (document upload migration)
- **Issue:** DocumentDetail.tsx and VersionDetail.tsx used old Express path-based URLs (`/api/document-versions/${id}/pdf/download`, `/api/requirement-mappings/${id}`) that don't route correctly on Vercel serverless (no path-based ID extraction in vercel.json)
- **Fix:** Updated all URL patterns to query-param convention: `/api/document-versions?id=N&action=download`, `/api/requirement-mappings?id=N`, etc.
- **Files modified:** client/src/pages/DocumentDetail.tsx, client/src/pages/VersionDetail.tsx
- **Verification:** TypeScript passes; URLs match serverless function handler patterns
- **Committed in:** 3c4f05a (Task 2 commit)

**2. [Rule 1 - Bug] Fixed aiAutoMapMutation calling non-existent Express route**
- **Found during:** Task 2
- **Issue:** `/api/documents/${id}/ai-map-controls` was the old Express route — the serverless function uses `/api/ai-jobs?action=map-controls&documentId=N`
- **Fix:** Updated aiAutoMapMutation to call correct serverless endpoint
- **Files modified:** client/src/pages/DocumentDetail.tsx
- **Verification:** TypeScript passes; endpoint matches api/ai-jobs.ts handler
- **Committed in:** 3c4f05a (Task 2 commit)

**3. [Rule 1 - Bug] Fixed removeMappingMutation using path-based delete URL**
- **Found during:** Task 2
- **Issue:** `DELETE /api/requirement-mappings/${mappingId}` would 404 — Vercel routes to file not path segment; endpoint uses `?id=N`
- **Fix:** Changed to `apiRequest("DELETE", "/api/requirement-mappings?id=N")`
- **Files modified:** client/src/pages/DocumentDetail.tsx
- **Verification:** TypeScript passes; matches api/requirement-mappings.ts DELETE handler
- **Committed in:** 3c4f05a (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (all Rule 1 - Bug)
**Impact on plan:** All fixes necessary for correctness. No scope creep. The path-based URL bugs were pre-existing from Phase 4-02/4-03 migration work that hadn't yet been caught.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. The README documents setup steps for Vercel and Supabase projects.

## Next Phase Readiness

Phase 4 is complete. The codebase is a clean Supabase + Vercel application:
- Zero Replit, Passport, S3, or multer references in source
- All routes handled by Vercel serverless functions (api/*.ts)
- All document uploads use TUS signed-URL flow
- Direct Supabase reads for all list/get operations (RLS enforced)
- README documents the architecture for new developers

## Self-Check: PASSED

- README.md: FOUND
- package.json: FOUND
- vite.config.ts: FOUND
- .gitignore: FOUND
- server/s3.ts: CONFIRMED DELETED
- server/routes.ts: CONFIRMED DELETED
- server/index.ts: CONFIRMED DELETED
- Commit c6034a2: FOUND
- Commit 3c4f05a: FOUND

---
*Phase: 04-client-migration-cleanup*
*Completed: 2026-02-19*
