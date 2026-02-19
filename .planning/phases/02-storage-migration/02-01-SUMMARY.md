---
phase: 02-storage-migration
plan: 01
subsystem: storage
tags: [supabase-storage, rls, sql-migration, signed-urls, file-upload, typescript]

# Dependency graph
requires:
  - phase: 01-supabase-foundation
    provides: supabaseAdmin service-role client and JWT RLS policy pattern (auth.jwt()->'app_metadata'->'business_units')

provides:
  - Per-BU private storage buckets (bu-{id}) created via SQL migration with 10 MB limit and 6 MIME type restrictions
  - RLS policies on storage.objects (SELECT/INSERT/DELETE) gated on BU JWT membership claims
  - TypeScript storage service (server/storage-supabase.ts) with signed URL generation, file management, and validation

affects:
  - 02-02 (route replacements that import storage-supabase.ts functions)
  - 02-03 (any new upload/download routes using signed URL service)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Supabase Storage bucket naming: bu-{id} (lowercase, hyphens, satisfies 3-63 char constraint)
    - Signed URL pattern: createSignedUploadUrl for client-direct upload; createSignedDownloadUrl with optional download disposition
    - Filename uniqueness: uuid prefix (8 chars) + sanitized name + _v2/_v3 suffix for conflicts
    - File validation: pre-upload guard rejects unsupported MIME types and files over 10 MB before signed URL creation

key-files:
  created:
    - supabase/migrations/0004_storage_buckets.sql
    - supabase/migrations/0005_storage_rls.sql
    - server/storage-supabase.ts
  modified: []

key-decisions:
  - "Bucket naming bu-{id} enables direct mapping from JWT claim elem->>'id' to bucket_id in RLS EXISTS subquery"
  - "No UPDATE policy on storage.objects — files are immutable; version suffix pattern handles 'updates' as new uploads"
  - "SIGNED_URL_EXPIRY set to 3600s (1 hour) — sufficient for a reading session per research recommendation"
  - "resolveFilename lists existing objects in prefix to detect conflicts rather than relying on error-based retry"

patterns-established:
  - "Storage RLS EXISTS pattern: ('bu-' || (elem->>'id')::text) = bucket_id — mirrors Phase 1 BU-scoped table RLS"
  - "validateFileType/validateFileSize called server-side before signed URL generation — client never touches storage directly"
  - "supabaseAdmin (service-role) used for all storage operations — bypasses RLS, never exposed to browser"

requirements-completed: [STOR-01, STOR-02, STOR-03, STOR-04]

# Metrics
duration: 1min
completed: 2026-02-19
---

# Phase 2 Plan 01: Storage Foundation Summary

**Per-BU private Supabase Storage buckets with RLS policies and a TypeScript service module for signed URL generation, validation, and file management**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-19T15:34:21Z
- **Completed:** 2026-02-19T15:35:40Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Two idempotent SQL migrations: 0004 creates private per-BU storage buckets dynamically from `public.business_units`; 0005 creates 3 RLS policies scoped to BU JWT claims
- TypeScript service module exports 11 functions/constants covering all storage operations needed by Phase 2 routes
- File validation guards (MIME type and size) integrated before any signed URL generation
- Filename conflict resolution via `_v2`/`_v3` suffix pattern using object listing in prefix

## Task Commits

Each task was committed atomically:

1. **Task 1: Create storage bucket and RLS migrations** - `da4e9ec` (feat)
2. **Task 2: Create Supabase Storage service module** - `01b62ad` (feat)

**Plan metadata:** _(docs commit — see below)_

## Files Created/Modified

- `supabase/migrations/0004_storage_buckets.sql` — Creates per-BU private buckets via SELECT FROM business_units; idempotent via ON CONFLICT DO NOTHING
- `supabase/migrations/0005_storage_rls.sql` — 3 RLS policies on storage.objects (SELECT/INSERT/DELETE) using same JWT claims path as Phase 1; no UPDATE (files immutable)
- `server/storage-supabase.ts` — Storage service: bucketName, storagePath, createSignedUploadUrl, createSignedDownloadUrl, deleteStorageObject, resolveFilename, createBucketForBusinessUnit, validateFileType, validateFileSize, ALLOWED_MIME_TYPES, MAX_FILE_SIZE

## Decisions Made

- No UPDATE policy on `storage.objects` — files are immutable by design; version "updates" create new storage objects via the `_v2`/`_v3` suffix pattern
- SIGNED_URL_EXPIRY = 3600s (1 hour) — appropriate for a reading/review session
- `resolveFilename` uses prefix listing rather than error-based retry — more predictable and avoids retry races
- `validateFileType` and `validateFileSize` exported as standalone functions — routes can call them independently before requesting a signed URL

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript errors in `server/replit_integrations/` and `server/routes.ts` were present before this plan. No errors in `server/storage-supabase.ts`. Pre-existing errors are out of scope for this plan.

## User Setup Required

None - no external service configuration required for this plan.
Bucket creation requires running migrations against Supabase (handled in deployment step, not this plan).

## Next Phase Readiness

- `server/storage-supabase.ts` is ready for import by Phase 2 route replacement plans (02-02, 02-03)
- SQL migrations ready for `supabase db push` or CI migration pipeline
- No blockers for Plan 02-02

---
*Phase: 02-storage-migration*
*Completed: 2026-02-19*
