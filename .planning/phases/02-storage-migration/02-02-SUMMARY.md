---
phase: 02-storage-migration
plan: 02
subsystem: storage
tags: [supabase-storage, signed-urls, tus-upload, file-upload, routes, typescript, client-side]

# Dependency graph
requires:
  - phase: 02-storage-migration
    plan: 01
    provides: storage-supabase.ts service module with signed URL generation, validation, and file management functions

provides:
  - routes.ts wired to Supabase Storage for all upload/download/delete/pdf-to-markdown operations
  - POST /api/document-versions/:id/upload-url endpoint — file validation + signed upload URL generation for Phase 4 TUS client
  - POST /api/document-versions/:id/upload-confirm endpoint — records completed TUS upload in DB
  - GET /api/document-versions/:id/pdf/download returns signed URL as JSON or 302 redirect (backward compat)
  - BU creation route now provisions a Supabase Storage bucket via createBucketForBusinessUnit
  - client/src/lib/storage.ts — TUS upload utility with progress callback, file validation, and signed URL refresh stub

affects:
  - 02-03 (any additional route work building on this storage foundation)
  - 04-ui (Phase 4 UI components consume uploadFileToStorage, validateFile, refreshSignedUrl from client/src/lib/storage.ts)

# Tech tracking
tech-stack:
  added:
    - tus-js-client@4.3.1 (TUS resumable upload protocol for client-side uploads of any size)
  patterns:
    - Signed URL upload flow: server generates upload URL → client uploads directly to Supabase via TUS → client calls confirm endpoint to record in DB
    - Backward-compat download: Accept header detection — application/json returns { url, expiresIn }; other clients get 302 redirect
    - Server-side buffer upload: supabaseAdmin.storage.from(bucket).upload() for legacy inline multer routes
    - TUS endpoint extraction: regex /([a-z0-9]+)\.supabase\.co/ on VITE_SUPABASE_URL — handles all URL formats safely
    - uploadSignature cast to any: tus-js-client types don't declare Supabase's uploadSignature extension; cast avoids TS error while maintaining runtime correctness

key-files:
  created:
    - client/src/lib/storage.ts
  modified:
    - server/routes.ts
    - server/s3.ts

key-decisions:
  - "Legacy inline multer upload routes retained during Phase 2/3 transition — Phase 4 switches clients to signed URL TUS flow"
  - "Download route uses Accept header for backward compatibility: JSON clients get { url, expiresIn }; legacy clients get 302 redirect"
  - "Server-side buffer uploads (multer routes) use supabaseAdmin.storage.upload() directly — no TUS needed for in-memory buffers"
  - "uploadSignature cast to any in client storage.ts — Supabase-specific TUS extension not in tus-js-client types, runtime behavior correct"
  - "BU creation wraps bucket provisioning in try/catch with warn-on-fail — BU record creation not blocked by storage failures"

patterns-established:
  - "All file operations in routes.ts flow through storage-supabase.ts — no direct S3/filesystem access in route handlers"
  - "uploadFileToStorage() is the Phase 4 client upload entry point — calls upload-url, TUS uploads, then upload-confirm"
  - "refreshSignedUrl() is the Phase 4 auto-refresh hook — called by UI on 400/403 to silently get fresh signed URL"

requirements-completed: [STOR-05, STOR-06]

# Metrics
duration: 4min
completed: 2026-02-19
---

# Phase 2 Plan 02: Route Migration Summary

**Supabase Storage wired into all upload/download/delete routes via signed URLs, with new TUS upload endpoints and a client-side resumable upload utility for Phase 4 consumption**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-19T15:39:12Z
- **Completed:** 2026-02-19T15:43:27Z
- **Tasks:** 2
- **Files modified:** 4 (routes.ts, s3.ts, package.json, package-lock.json) + 1 created (client/src/lib/storage.ts)

## Accomplishments

- All 5 upload locations, 1 download route, 1 delete route, and 1 pdf-to-markdown route in routes.ts now use Supabase Storage via storage-supabase.ts — zero references to old S3 functions remain in active code
- New signed-URL upload flow (POST upload-url + POST upload-confirm) ready for Phase 4 TUS client; includes file type and size validation before URL generation
- BU creation route now provisions a Supabase Storage bucket via createBucketForBusinessUnit (warn-on-fail, non-blocking)
- client/src/lib/storage.ts provides TUS upload with progress callback, validateFile with clear error messages, refreshSignedUrl auto-refresh stub, and formatFileSize utility

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace S3 routes with Supabase Storage signed URL routes** - `fda3e71` (feat)
2. **Task 2: Install tus-js-client and create client-side storage utility** - `978c834` (feat)

**Plan metadata:** _(docs commit — see below)_

## Files Created/Modified

- `server/routes.ts` — Updated imports (storage-supabase replacing s3), multer updated to all ALLOWED_MIME_TYPES at 10 MB, BU create adds bucket provisioning, inline upload routes updated to use supabaseAdmin.storage.upload(), new upload-url and upload-confirm endpoints added, download/delete/to-markdown routes updated to use Supabase signed URLs
- `server/s3.ts` — Gutted to deprecation comment only (5 lines); Phase 4 CLNP-03 will delete it
- `client/src/lib/storage.ts` — Client-side TUS upload utility: validateFile, uploadFileToStorage, formatFileSize, refreshSignedUrl, all relevant constants
- `package.json` / `package-lock.json` — tus-js-client@4.3.1 added

## Decisions Made

- Legacy inline multer upload routes kept working during transition — Phase 4 will switch UI to signed URL flow; plan notes these will be phased out in Phase 4 CLNP-03
- Download route uses `Accept: application/json` header detection for backward compatibility — existing `<a>` links and `window.open()` calls still work via 302 redirect
- `uploadSignature` cast to `any` in TUS upload config — Supabase-specific extension not declared in tus-js-client types; runtime behavior is correct per Supabase documentation
- BU creation bucket provisioning is warn-on-fail — a bucket creation failure at BU creation time logs a warning but doesn't fail the BU record insert

## Deviations from Plan

None - plan executed exactly as written. One TypeScript issue was encountered with `uploadSignature` not being in tus-js-client types (this is a Supabase extension), resolved with a targeted `any` cast per Rule 1.

## Issues Encountered

- `uploadSignature` is not in tus-js-client's TypeScript type definitions (it's a Supabase Storage-specific extension to the TUS protocol). Resolved by casting the upload options object to `any` with an explanatory comment. This is the documented Supabase approach — the `uploadSignature` property works at runtime even though the types don't declare it.
- Pre-existing TypeScript errors in `server/replit_integrations/` and other routes.ts sections remain out of scope (documented in 02-01-SUMMARY.md).

## User Setup Required

None - no external service configuration required for this plan. Route changes take effect on next server restart. Storage bucket provisioning for existing BUs requires running the SQL migrations from 02-01.

## Next Phase Readiness

- Phase 4 UI can now call `/api/document-versions/:id/upload-url` → TUS upload → `/api/document-versions/:id/upload-confirm` for all file uploads
- `client/src/lib/storage.ts` is ready for import by Phase 4 upload UI components
- `refreshSignedUrl()` stub in place for Phase 4 auto-refresh wiring
- All existing routes continue to work for legacy clients during transition
- No blockers for Phase 4 or remaining Phase 2 plans

---
*Phase: 02-storage-migration*
*Completed: 2026-02-19*
