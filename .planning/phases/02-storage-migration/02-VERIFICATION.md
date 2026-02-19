---
phase: 02-storage-migration
verified: 2026-02-19T16:00:00Z
status: passed
score: 13/13 must-haves verified
re_verification: false
---

# Phase 2: Storage Migration Verification Report

**Phase Goal:** PDFs can be uploaded to and downloaded from a private Supabase Storage bucket with business-unit-scoped access, replacing the existing S3 and local file storage
**Verified:** 2026-02-19T16:00:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A private storage bucket exists for each business unit in Supabase Storage | VERIFIED | `0004_storage_buckets.sql`: `INSERT INTO storage.buckets` with `public = false`, `SELECT FROM public.business_units`, `ON CONFLICT (id) DO NOTHING` |
| 2 | RLS policies on storage.objects restrict SELECT/INSERT/DELETE to users who are members of the BU that owns the bucket | VERIFIED | `0005_storage_rls.sql`: 3 `CREATE POLICY` statements using `auth.jwt()->'app_metadata'->'business_units'` EXISTS subquery matching `('bu-' || (elem->>'id')::text) = bucket_id` |
| 3 | Server-side functions can generate signed upload URLs for a given BU and file path | VERIFIED | `server/storage-supabase.ts` exports `createSignedUploadUrl(buId, filePath)` using `supabaseAdmin.storage.from(bucketName(buId)).createSignedUploadUrl(filePath)` |
| 4 | Server-side functions can generate signed download URLs (inline preview + forced download) for a given BU and file path | VERIFIED | `server/storage-supabase.ts` exports `createSignedDownloadUrl(buId, filePath, forDownload?)` — omitting `forDownload` gives inline, passing filename gives `Content-Disposition: attachment` |
| 5 | Server-side functions can delete storage objects from a BU's bucket | VERIFIED | `server/storage-supabase.ts` exports `deleteStorageObject(buId, filePath)` calling `.remove([filePath])` |
| 6 | Unsupported file types and files over 10 MB are rejected with a clear error message before signed URL generation | VERIFIED | `validateFileType` and `validateFileSize` are called at routes.ts:407-411 in `POST /api/document-versions/:id/upload-url` before `createSignedUploadUrl` is invoked; clear messages returned as 400 responses |
| 7 | Upload routes return signed upload URLs instead of buffering files through the server | VERIFIED | `POST /api/document-versions/:id/upload-url` (routes.ts:402) returns `{signedUrl, token, path, bucketId}` — no file buffering |
| 8 | Download route returns a signed URL instead of streaming the file from local disk | VERIFIED | `GET /api/document-versions/:id/pdf/download` (routes.ts:460) calls `createSignedDownloadUrl` and returns JSON `{url, expiresIn: 3600}` or 302 redirect |
| 9 | PDF-to-markdown route fetches the PDF from Supabase Storage via signed URL instead of local filesystem | VERIFIED | routes.ts:524-527: `createSignedDownloadUrl` → `fetch(signedUrl)` → `Buffer.from(await response.arrayBuffer())`; no `fs` import present |
| 10 | Delete route removes the file from Supabase Storage instead of local filesystem | VERIFIED | `DELETE /api/document-versions/:id/pdf` (routes.ts:488) calls `deleteStorageObject(buId, version.pdfS3Key)` |
| 11 | Creating a new business unit also provisions a Supabase Storage bucket for it | VERIFIED | routes.ts:56-60: `await createBucketForBusinessUnit(bu.id)` called after BU creation in try/catch (warn-on-fail, non-blocking) |
| 12 | Client-side TUS upload utility can upload files of any size using the resumable protocol | VERIFIED | `client/src/lib/storage.ts` imports `tus-js-client` (installed at v4.3.1), exports `uploadFileToStorage` using `tus.Upload` with `chunkSize: TUS_CHUNK_SIZE` (6 MB), `retryDelays`, and `uploadSignature` |
| 13 | A refreshSignedUrl function exists in client storage module enabling auto-refresh on signed URL expiry (Phase 4 wires into UI) | VERIFIED | `client/src/lib/storage.ts` exports `refreshSignedUrl(versionId, mode?)` calling `GET /api/document-versions/${versionId}/pdf/download` with `Accept: application/json` header |

**Score:** 13/13 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/0004_storage_buckets.sql` | Storage bucket creation for all existing business units | VERIFIED | 29 lines; `INSERT INTO storage.buckets` with `SELECT FROM public.business_units`; `public = false`; 10 MB limit; 6 MIME types; idempotent via `ON CONFLICT (id) DO NOTHING` |
| `supabase/migrations/0005_storage_rls.sql` | RLS policies on storage.objects for BU-scoped access | VERIFIED | 71 lines; exactly 3 `CREATE POLICY` statements (SELECT/INSERT/DELETE) on `storage.objects`; INSERT/DELETE check `elem->>'role' IN ('admin', 'editor')`; SELECT allows any BU member |
| `server/storage-supabase.ts` | Supabase Storage service module | VERIFIED | 208 lines; exports `bucketName`, `storagePath`, `createSignedUploadUrl`, `createSignedDownloadUrl`, `deleteStorageObject`, `resolveFilename`, `createBucketForBusinessUnit`, `validateFileType`, `validateFileSize`, `ALLOWED_MIME_TYPES`, `MAX_FILE_SIZE`; all substantive implementations |
| `server/routes.ts` | Updated routes using Supabase Storage signed URLs | VERIFIED | Imports from `./storage-supabase`; new `upload-url` and `upload-confirm` endpoints; download/delete/to-markdown routes all use signed URLs; BU creation provisions bucket; zero S3 function references |
| `server/s3.ts` | Deprecated — gutted with deprecation comment only | VERIFIED | 5 lines; deprecation comment only; no function exports; no imports |
| `client/src/lib/storage.ts` | Client-side TUS upload utility | VERIFIED | 199 lines; exports `uploadFileToStorage`, `validateFile`, `refreshSignedUrl`, `formatFileSize`, `ACCEPTED_FILE_EXTENSIONS`, `ACCEPTED_MIME_TYPES`, `MAX_FILE_SIZE_BYTES`; TUS upload with progress callback; full implementations |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `server/storage-supabase.ts` | `server/lib/supabase-admin.ts` | imports `supabaseAdmin` for service-role storage operations | WIRED | Line 2: `import { supabaseAdmin } from './lib/supabase-admin'`; used in all 5 async storage functions |
| `supabase/migrations/0005_storage_rls.sql` | `supabase/migrations/0002_auth_hook.sql` | RLS policies reference same JWT claims path as Phase 1 | WIRED | Both use `auth.jwt()->'app_metadata'->'business_units'`; auth hook builds `[{id: business_unit_id, role: role}]` array matching RLS `elem->>'id'` and `elem->>'role'` extraction pattern |
| `server/routes.ts` | `server/storage-supabase.ts` | imports storage functions for all file operations | WIRED | routes.ts:10-15: imports `bucketName`, `storagePath`, `resolveFilename`, `createSignedUploadUrl`, `createSignedDownloadUrl`, `deleteStorageObject`, `createBucketForBusinessUnit`, `validateFileType`, `validateFileSize`, `ALLOWED_MIME_TYPES` |
| `server/routes.ts` | `server/storage-supabase.ts` | `createBucketForBusinessUnit` called in BU creation route | WIRED | routes.ts:57: `await createBucketForBusinessUnit(bu.id)` in `POST /api/business-units/create` handler |
| `client/src/lib/storage.ts` | `tus-js-client` | TUS resumable upload protocol for all file sizes | WIRED | storage.ts:1: `import * as tus from "tus-js-client"`; used at line 151 in `uploadFileToStorage` as `new tus.Upload(options.file, uploadOptions)` |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| STOR-01 | 02-01 | Private Supabase Storage bucket created for PDF documents | SATISFIED | `0004_storage_buckets.sql` creates per-BU private buckets (`public = false`) via `INSERT INTO storage.buckets SELECT FROM business_units` |
| STOR-02 | 02-01 | Server-generated signed upload URLs allow client to upload PDFs directly to Supabase Storage | SATISFIED | `createSignedUploadUrl` in `storage-supabase.ts`; wired into `POST /api/document-versions/:id/upload-url` endpoint |
| STOR-03 | 02-01 | Signed download URLs generated for authenticated PDF access | SATISFIED | `createSignedDownloadUrl` in `storage-supabase.ts`; wired into `GET /api/document-versions/:id/pdf/download` and `to-markdown` routes |
| STOR-04 | 02-01 | RLS policies on `storage.objects` scope PDF access by business unit | SATISFIED | `0005_storage_rls.sql` creates 3 policies (SELECT/INSERT/DELETE) scoped to BU JWT membership claims |
| STOR-05 | 02-02 | Resumable uploads via TUS protocol enabled for PDFs over 6 MB | SATISFIED | `client/src/lib/storage.ts` implements TUS via `tus-js-client` with `chunkSize: 6 MB`, retry delays, and `uploadSignature` for Supabase auth |
| STOR-06 | 02-02 | Existing S3 upload/download code in `server/s3.ts` replaced with Supabase Storage equivalents | SATISFIED | `server/s3.ts` gutted to 5-line deprecation comment; zero references to `generateS3Key`, `uploadToS3`, `getLocalFilePath`, `deleteFromS3` in any active server code; all routes use `storage-supabase.ts` |

**Orphaned requirements:** None — all 6 STOR requirement IDs appear in plan frontmatter and are implemented.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | — | — | — | — |

No TODOs, placeholders, empty implementations, or console.log-only stubs found in the Phase 2 files (`storage-supabase.ts`, `client/src/lib/storage.ts`, `0004_storage_buckets.sql`, `0005_storage_rls.sql`).

**TypeScript compilation:** Pre-existing errors exist in `server/replit_integrations/` and unrelated `routes.ts` sections (documented in both SUMMARY files as out of scope). Zero TypeScript errors introduced by Phase 2 files.

---

### Human Verification Required

#### 1. Supabase Migration Deployment

**Test:** Run `supabase db push` or apply migrations `0004_storage_buckets.sql` and `0005_storage_rls.sql` against the target Supabase project.
**Expected:** Buckets created for all existing BUs; 3 RLS policies visible in Supabase dashboard under Storage > Policies.
**Why human:** Cannot verify SQL migration execution against live Supabase without running the migration pipeline.

#### 2. TUS Upload End-to-End Flow

**Test:** From a browser session as an authenticated editor, call `POST /api/document-versions/:id/upload-url` with a valid file metadata, then use the returned `signedUrl` and `token` to upload via `uploadFileToStorage()`, then call `POST /api/document-versions/:id/upload-confirm`.
**Expected:** File appears in Supabase Storage under `bu-{id}/{docId}/{versionId}/` prefix; database row updated with correct `pdfS3Key`.
**Why human:** TUS upload requires a live Supabase Storage endpoint and valid credentials; cannot simulate protocol handshake statically.

#### 3. RLS Access Control Enforcement

**Test:** As a viewer, attempt to upload (PUT/POST to signed URL). As a user with no BU membership, attempt to download a file.
**Expected:** Viewer upload rejected (403); non-member download rejected (403).
**Why human:** RLS policy enforcement requires a running Supabase instance with JWT tokens containing real BU membership claims.

#### 4. Signed URL Expiry and Refresh

**Test:** Obtain a signed download URL, wait for it to expire (or artificially expire it), then call `refreshSignedUrl(versionId)`.
**Expected:** A new valid signed URL returned; file accessible again without user action.
**Why human:** Requires time-based testing against a live Supabase Storage endpoint.

---

### Summary

All 13 observable truths verified. All 6 required artifacts are present, substantive, and wired. All 6 STOR requirements (STOR-01 through STOR-06) are covered by the two plans with no orphaned requirements. All 5 key links are confirmed WIRED in the actual code.

**Storage foundation (Plan 02-01):** SQL migrations and TypeScript service module are complete with full implementations — no stubs. Bucket naming (`bu-{id}`), RLS policy pattern, MIME type enforcement, and signed URL functions all match the plan specification exactly.

**Route migration (Plan 02-02):** All upload/download/delete/pdf-to-markdown routes are wired to `storage-supabase.ts`. The new `upload-url` + `upload-confirm` endpoint pair is in place. BU creation provisions a storage bucket. `server/s3.ts` is gutted. `client/src/lib/storage.ts` provides a full TUS upload implementation with progress tracking, validation, and the signed URL refresh stub for Phase 4.

The phase goal is achieved: PDFs can be uploaded to and downloaded from private, BU-scoped Supabase Storage buckets via signed URLs, replacing S3 and local file storage.

---

_Verified: 2026-02-19T16:00:00Z_
_Verifier: Claude (gsd-verifier)_
