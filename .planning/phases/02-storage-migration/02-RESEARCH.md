# Phase 2: Storage Migration - Research

**Researched:** 2026-02-19
**Domain:** Supabase Storage — bucket provisioning, RLS on storage.objects, signed URL upload/download flows, TUS resumable uploads, server/s3.ts replacement
**Confidence:** HIGH — all core findings verified against Supabase official docs; TUS implementation verified against official resumable uploads guide

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Bucket structure:**
- One private bucket per business unit (not a single shared bucket)
- BU isolation at bucket level — each BU's files are physically separated

**Signed URL behavior:**
- Default to inline preview (PDF opens in browser) with a separate download button available
- Auto-refresh on expiry — app detects expired URL and silently fetches a new signed URL without user action
- Claude decides URL expiry duration and whether URLs are shareable within BU or user-locked

**Upload constraints:**
- Maximum file size: 10 MB
- Accepted file types: PDF, Office documents (.docx, .xlsx, .pptx), and images (.png, .jpg)
- File type validation on upload with clear rejection messages for unsupported types
- Duplicate filenames handled via version suffix (report_v1.pdf, report_v2.pdf) — preserves history
- Progress bar during upload showing percentage/bytes uploaded

### Claude's Discretion

- Bucket naming convention (BU slug vs BU ID vs other)
- Internal folder organization within each BU bucket (flat, by document type, etc.)
- File naming convention in storage (original name, UUID-prefixed, etc.)
- URL expiry duration
- Whether URLs are shareable within BU or user-locked

### Deferred Ideas (OUT OF SCOPE)

- Existing file migration from S3/local storage — user chose not to discuss; may need a migration plan or separate phase
- Bulk migration tooling — not discussed, consider when existing files need to move over
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| STOR-01 | Private Supabase Storage bucket created for PDF documents | SQL INSERT into storage.buckets with public=false, file_size_limit, allowed_mime_types. One bucket per BU, created via SQL migration (0004_storage_buckets.sql) |
| STOR-02 | Server-generated signed upload URLs allow client to upload PDFs directly to Supabase Storage | `supabase.storage.from(bucket).createSignedUploadUrl(path)` — server-side only (service role). Client receives {signedUrl, token, path} and calls uploadToSignedUrl(). Upload URL valid for 2 hours. |
| STOR-03 | Signed download URLs generated for authenticated PDF access | `supabase.storage.from(bucket).createSignedUrl(path, expiresIn)` — server-side only. Returns signed URL. For inline preview, omit download option; for download button, pass `{download: filename}`. |
| STOR-04 | RLS policies on storage.objects scope PDF access by business unit | Policies on storage.objects using bucket_id = BU-specific bucket name + JWT claims check via `auth.jwt()->'app_metadata'->'business_units'`. INSERT policy for upload; SELECT policy for download. |
| STOR-05 | Resumable uploads via TUS protocol enabled for PDFs over 6 MB | tus-js-client v4.3.1. Endpoint: `https://{project}.storage.supabase.co/storage/v1/upload/resumable`. 6 MB chunk size. x-signature header for signed upload token. onProgress callback for progress bar. |
| STOR-06 | Existing S3 upload/download code in server/s3.ts replaced with Supabase Storage equivalents | Replace generateS3Key/uploadToS3/getLocalFilePath/deleteFromS3 with Supabase Storage service-role client calls. Update all callers in routes.ts (5 upload locations, 1 download, 1 delete, 1 pdf-to-markdown). |
</phase_requirements>

---

## Summary

Phase 2 replaces the existing local-filesystem "S3" stub (`server/s3.ts`) with real Supabase Storage. The existing code writes files to `data/uploads/` on disk using Node `fs` — this is the entire surface being replaced. There are no real S3 credentials to migrate; only the interface changes.

The architecture follows Supabase's recommended signed URL pattern: the server generates a time-limited signed upload URL using the service-role client, returns it to the client, and the client uploads directly to Supabase Storage. This sidesteps Vercel's 5 MB serverless body limit and is the canonical approach for large file uploads. For downloads, the server generates signed download URLs which the client uses directly.

One private bucket per BU is the locked decision. Bucket names must be globally unique within the project and follow strict naming rules (lowercase, alphanumeric, hyphens only, 3-63 chars). Since `business_units.code` is nullable, the safest bucket naming strategy is `bu-{id}` (e.g., `bu-1`, `bu-42`) — always available, never ambiguous, no normalization edge cases. RLS on `storage.objects` uses the same JWT claims pattern established in Phase 1 (`auth.jwt()->'app_metadata'->'business_units'`) to confirm the user is a member of the BU that owns the bucket.

**Primary recommendation:** Use the signed-URL upload flow (server generates URL, client uploads directly) for all files, with tus-js-client handling the TUS resumable protocol for files over 6 MB. This gives progress tracking at all sizes and requires only one code path.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | 2.97.0 (already installed) | Storage client — signed URLs, bucket management | Already in project; includes storage API |
| `tus-js-client` | 4.3.1 (latest) | TUS resumable upload protocol on client | Official library referenced in Supabase docs; native onProgress events |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `multer` | 2.0.2 (already installed) | Multipart file parsing | Still needed for small-file direct-to-server flows, but sign-URL pattern is preferred |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `tus-js-client` | `Uppy` (React UI) | Uppy wraps tus-js-client and provides UI components, but adds significant bundle weight and is a Phase 4 concern (UI excluded from this phase) |
| Signed URL upload | Direct server-side upload via service role | Server-side upload works but hits Vercel's 5 MB serverless request body limit and forfeits client-side progress tracking |
| `bu-{id}` bucket naming | `bu-{code}` (BU code slug) | `code` is nullable in schema — some BUs may not have a code; using `id` is always safe |

**Installation:**
```bash
npm install tus-js-client
```

---

## Architecture Patterns

### Recommended Project Structure

```
server/
├── s3.ts                    # REPLACE — delete all functions, re-export Supabase storage helpers
├── storage-supabase.ts      # NEW — Supabase Storage service: bucket name, signed URLs, delete
├── routes.ts                # MODIFY — replace s3 import with storage-supabase, update 5 upload + 1 download + 1 delete + 1 pdf-to-markdown route
supabase/
└── migrations/
    ├── 0004_storage_buckets.sql   # NEW — INSERT one bucket per BU into storage.buckets
    └── 0005_storage_rls.sql       # NEW — RLS policies on storage.objects (INSERT + SELECT + DELETE)
```

### Pattern 1: Signed Upload URL Flow (Preferred — all file sizes)

**What:** Server generates a short-lived upload token; client uploads directly to Supabase Storage using that token with the TUS protocol. Progress events fire natively.

**When to use:** All uploads. TUS protocol handles both small (<6 MB, single request) and large (>6 MB, chunked) files transparently.

**Server endpoint — generate signed upload URL:**
```typescript
// server/storage-supabase.ts
import { createClient } from '@supabase/supabase-js';

// Service-role client — bypasses RLS for server operations
const storageAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export function bucketName(buId: number): string {
  // Bucket naming: bu-{id}
  // Constraints: 3-63 chars, lowercase, alphanumeric + hyphens only
  return `bu-${buId}`;
}

export function storagePath(documentId: number, versionId: number, fileName: string): string {
  // Internal folder structure: {documentId}/{versionId}/{uuid-prefix}_{sanitized-filename}
  // uuid prefix ensures uniqueness; sanitized name remains human-readable
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const uuid = crypto.randomUUID().slice(0, 8);
  return `${documentId}/${versionId}/${uuid}_${sanitized}`;
}

export async function createSignedUploadUrl(buId: number, path: string) {
  const { data, error } = await storageAdmin.storage
    .from(bucketName(buId))
    .createSignedUploadUrl(path);
  if (error) throw error;
  return data; // { signedUrl, token, path }
}

export async function createSignedDownloadUrl(buId: number, path: string, forDownload?: string) {
  // 1 hour for inline preview; enough for a reading session
  const { data, error } = await storageAdmin.storage
    .from(bucketName(buId))
    .createSignedUrl(path, 3600, {
      download: forDownload, // omit for inline; pass filename for download button
    });
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteStorageObject(buId: number, path: string) {
  const { error } = await storageAdmin.storage
    .from(bucketName(buId))
    .remove([path]);
  if (error) throw error;
}
```

**Client upload using tus-js-client:**
```typescript
// client-side (Phase 4 scope for UI, but server route must return signedUploadUrl)
import * as tus from 'tus-js-client';

async function uploadFile(file: File, signedUploadToken: string, objectPath: string, bucketId: string, projectId: string, onProgress: (pct: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(file, {
      // Always use direct storage hostname, not the api.supabase.co subdomain
      endpoint: `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${accessToken}`,
        'x-upsert': 'false',          // version suffix handles uniqueness
      },
      uploadSignature: signedUploadToken, // maps to x-signature header
      metadata: {
        bucketName: bucketId,
        objectName: objectPath,
        contentType: file.type,
        cacheControl: '3600',
      },
      chunkSize: 6 * 1024 * 1024,    // Fixed 6 MB — required by Supabase
      onProgress(bytesUploaded, bytesTotal) {
        onProgress(Math.round((bytesUploaded / bytesTotal) * 100));
      },
      onSuccess: () => resolve(),
      onError: (err) => reject(err),
    });
    upload.start();
  });
}
```

### Pattern 2: Bucket Creation via SQL Migration

**What:** Buckets are rows in `storage.buckets`. Create them in a SQL migration so they exist before RLS policies reference them.

**When to use:** Each new BU needs a bucket. Create buckets for existing BUs in migration 0004; new BU creation (server route) also creates bucket programmatically via service-role client.

```sql
-- supabase/migrations/0004_storage_buckets.sql
-- Source: Supabase Storage bucket schema — storage.buckets columns verified
-- One private bucket per BU, named bu-{id}
-- file_size_limit: 10 MB in bytes
-- allowed_mime_types: PDF, Office docs, images

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
SELECT
  'bu-' || id,
  'bu-' || id,
  false,
  10485760,  -- 10 MB in bytes
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',  -- .docx
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',        -- .xlsx
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', -- .pptx
    'image/png',
    'image/jpeg'
  ]
FROM public.business_units;
```

**CRITICAL:** Bucket names 3-63 chars, lowercase letters/numbers/hyphens only (no underscores — rejected as of recent Supabase update). `bu-{id}` satisfies all constraints.

### Pattern 3: RLS Policies on storage.objects

**What:** Mirror the Phase 1 BU-scoped pattern onto storage.objects. Policy checks that `bucket_id` matches the expected bucket for the BU the user belongs to.

**Key insight:** With one-bucket-per-BU, the RLS check simplifies: user must be a member of a BU whose bucket name is `bucket_id`. Extract BU id from bucket name by splitting on `-`.

```sql
-- supabase/migrations/0005_storage_rls.sql
-- Source: Supabase Storage Access Control docs + Phase 1 JWT claims pattern

-- Helper: extract BU id from bucket_id (e.g. 'bu-42' → 42)
-- Used in policies to avoid string manipulation in every policy expression

-- SELECT (download): user must be a member of the BU that owns this bucket
CREATE POLICY "storage_objects_select"
ON storage.objects FOR SELECT TO authenticated
USING (
  -- bucket_id format: 'bu-{business_unit_id}'
  -- User must have a membership in that BU (any role = viewer/editor/admin)
  ('bu-' || (elem->>'id')::text) = bucket_id
  FROM jsonb_array_elements(
    COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)
  ) AS elem
  LIMIT 1
);

-- INSERT (upload): user must be editor or admin in the BU
CREATE POLICY "storage_objects_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM jsonb_array_elements(
      COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)
    ) AS elem
    WHERE ('bu-' || (elem->>'id')::text) = bucket_id
      AND elem->>'role' IN ('admin', 'editor')
  )
);

-- DELETE: editor or admin in the BU
CREATE POLICY "storage_objects_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM jsonb_array_elements(
      COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)
    ) AS elem
    WHERE ('bu-' || (elem->>'id')::text) = bucket_id
      AND elem->>'role' IN ('admin', 'editor')
  )
);
```

**Note on service role:** Routes that call server-side storage operations using the service-role client bypass RLS entirely — this is the intended pattern for server code, identical to how Phase 1 database writes work.

### Pattern 4: Duplicate Filename Handling (Version Suffix)

**What:** Before generating the storage path, check existing objects with the same base name in the document version. Append `_v2`, `_v3` suffix if conflict detected.

**When to use:** On every upload. The check happens server-side before calling `createSignedUploadUrl`.

```typescript
// Pseudocode — implementation detail for Plan tasks
async function resolveFilename(buId: number, docId: number, versionId: number, originalName: string): Promise<string> {
  const ext = path.extname(originalName);
  const base = path.basename(originalName, ext);
  const prefix = `${docId}/${versionId}/`;

  const { data } = await storageAdmin.storage
    .from(bucketName(buId))
    .list(prefix);

  const existing = (data ?? []).map(f => f.name);
  if (!existing.some(name => name.includes(base))) return originalName;

  let v = 2;
  while (existing.some(name => name.includes(`${base}_v${v}`))) v++;
  return `${base}_v${v}${ext}`;
}
```

### Anti-Patterns to Avoid

- **Direct upload through serverless function body:** Hits Vercel's 5 MB limit. Always use signed URL pattern.
- **Public buckets:** Require no RLS for downloads. Using private buckets with signed URLs is the locked decision.
- **Using `owner_id` for BU access control:** `owner_id` reflects the individual uploader's auth.uid, not the BU. BU access uses the bucket_id + JWT claims pattern.
- **Underscores in bucket names:** Currently rejected by Supabase validation. Use hyphens only.
- **Using `storage.from(bucket).upload()` from the server with user JWT:** Server code must use the service-role client for storage operations, not the user-scoped client.
- **Uploading through both TUS and standard upload paths:** Use TUS for all uploads — it handles small files via single-request and large files via chunking. One code path is simpler.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TUS resumable protocol | Custom chunked upload with retry logic | `tus-js-client` | TUS handles pause/resume, chunk tracking, network interruption recovery, server-side state — months of work to replicate |
| Signed URL generation | Custom HMAC signature on URLs | `supabase.storage.createSignedUploadUrl()` / `createSignedUrl()` | Supabase handles token generation, expiry, and validation server-side |
| File type validation | MIME type inspection from file content | Bucket-level `allowed_mime_types` + explicit MIME check in route | Browser-reported MIME types can be spoofed; bucket-level enforcement is at storage layer |
| Bucket-level access control | App-layer BU ownership checks | RLS policies on storage.objects | RLS is enforced at database level — even direct storage API calls are blocked |

**Key insight:** Supabase Storage's bucket-level `allowed_mime_types` and `file_size_limit` act as a second enforcement layer. Even if the server route fails to validate, the storage layer rejects the file.

---

## Common Pitfalls

### Pitfall 1: Supabase URL vs Storage Hostname for TUS Uploads

**What goes wrong:** Using `https://{project}.supabase.co/storage/v1/upload/resumable` instead of the direct storage URL gives degraded performance on large files.

**Why it happens:** The `supabase.co` URL routes through an API gateway. For large uploads, always use `https://{project}.storage.supabase.co/storage/v1/upload/resumable`.

**How to avoid:** Store `SUPABASE_STORAGE_URL` as a separate env var (or derive from `SUPABASE_URL` by replacing `api.supabase.co` with `{project-ref}.storage.supabase.co`).

**Warning signs:** Upload progress stalls on large files; 413 errors on files between 5-6 MB.

### Pitfall 2: Bucket Naming Constraint Violations

**What goes wrong:** Using underscores in bucket names (e.g., `bu_42`) causes bucket creation to fail with "Invalid bucket name" error.

**Why it happens:** Supabase recently tightened naming enforcement. Lowercase alphanumeric + hyphens only (3-63 chars).

**How to avoid:** Use `bu-{id}` format. Never derive bucket name from BU `name` or `code` fields directly — normalize via whitelist character set.

**Warning signs:** `storage.createBucket` or SQL INSERT fails with validation error.

### Pitfall 3: RLS on storage.objects Blocks Service Role When Using User Client

**What goes wrong:** Server routes that call storage using a user-scoped Supabase client (with the user's JWT) are subject to RLS policies. If the user's JWT lacks the necessary claims (e.g., right after signup before hook fires), uploads fail.

**Why it happens:** Service-role client bypasses RLS; user-scoped client does not. Same pattern as database access in Phase 1.

**How to avoid:** Server routes ALWAYS use the service-role client for storage operations. Only return signed URLs to the client — the client never has direct storage credentials.

**Warning signs:** "new row violates row-level security policy" on storage.objects INSERT.

### Pitfall 4: Expired Signed URL on Download (Auto-Refresh Required)

**What goes wrong:** Client caches a signed download URL. After expiry (1 hour), attempts to open/download return 400.

**Why it happens:** Signed URLs are time-bound — by design for private storage. The user decision requires auto-refresh: app detects expiry and silently fetches a new URL.

**How to avoid:** On the client, catch 400/403 on signed URL requests. Re-call the download URL endpoint server-side to get a fresh signed URL, then retry. Alternatively, generate URLs on demand per request (not cached).

**Warning signs:** "Invalid Signature" or 400 errors on download after an hour of inactivity.

### Pitfall 5: storage.buckets Not Populated for New BUs Created After Migration

**What goes wrong:** Migration 0004 seeds buckets for existing BUs. A new BU created after deploy won't automatically get a storage bucket, causing uploads to fail with "bucket not found".

**Why it happens:** The SQL migration only runs once. New BU creation is a server route that only inserts into `public.business_units`.

**How to avoid:** Update the `createBusinessUnit` server route (or a database trigger) to also call `supabase.storage.createBucket()` via the service-role client whenever a new BU is created.

**Warning signs:** Upload to a newly created BU fails with storage "bucket not found" error.

### Pitfall 6: Multer vs Signed URL Architecture Conflict

**What goes wrong:** Current routes use `multer` to buffer the entire file in server memory before writing to disk. With signed URL flow, the file goes directly from client to Supabase — multer is not involved.

**Why it happens:** The existing pattern buffers `req.file.buffer`. With signed URL flow, the server only issues the URL; the client uploads independently.

**How to avoid:** The new upload route is a two-step API:
1. `POST /api/documents/:id/versions/:vid/upload-url` — server returns `{signedUrl, token, path}` (no file in body)
2. Client uploads directly to Supabase using tus-js-client with the token
3. `POST /api/documents/:id/versions/:vid/pdf-confirm` — client confirms upload success; server records storage path in DB

This requires route restructuring — not a drop-in replacement.

---

## Code Examples

Verified patterns from official sources:

### Bucket creation (SQL migration)

```sql
-- Source: Supabase Storage Creating Buckets guide + schema column names verified
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bu-1',
  'bu-1',
  false,
  10485760,  -- 10 MB in bytes (bigint column)
  ARRAY['application/pdf', 'image/png', 'image/jpeg',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation']
);
```

### Server: Create signed upload URL

```typescript
// Source: Supabase JS reference — storage-from-createsigneduploadurl
// Called by server route using service-role client
const { data, error } = await storageAdmin.storage
  .from('bu-42')
  .createSignedUploadUrl('101/202/abc12345_report.pdf');
// data: { signedUrl, token, path }
// Valid for 2 hours
```

### Server: Create signed download URL (inline preview)

```typescript
// Source: Supabase JS reference — storage-from-createsignedurl
// Omit download option → Content-Disposition: inline (opens in browser)
const { data, error } = await storageAdmin.storage
  .from('bu-42')
  .createSignedUrl('101/202/abc12345_report.pdf', 3600);
// data.signedUrl — use directly in <iframe src="..."> or window.open()
```

### Server: Create signed download URL (force download)

```typescript
// Pass download option → Content-Disposition: attachment
const { data, error } = await storageAdmin.storage
  .from('bu-42')
  .createSignedUrl('101/202/abc12345_report.pdf', 3600, {
    download: 'report.pdf',  // sets Content-Disposition: attachment; filename="report.pdf"
  });
```

### Server: Delete object

```typescript
// Source: Supabase JS reference — storage-from-remove
const { error } = await storageAdmin.storage
  .from('bu-42')
  .remove(['101/202/abc12345_report.pdf']);
```

### Client: TUS resumable upload (all file sizes)

```typescript
// Source: Supabase resumable uploads guide (official docs)
import * as tus from 'tus-js-client';

const upload = new tus.Upload(file, {
  endpoint: `https://${SUPABASE_PROJECT_ID}.storage.supabase.co/storage/v1/upload/resumable`,
  retryDelays: [0, 3000, 5000, 10000, 20000],
  headers: {
    authorization: `Bearer ${session.access_token}`,
    'x-upsert': 'false',
  },
  uploadSignature: signedUploadToken,   // token from createSignedUploadUrl
  metadata: {
    bucketName: 'bu-42',
    objectName: '101/202/abc12345_report.pdf',
    contentType: 'application/pdf',
    cacheControl: '3600',
  },
  chunkSize: 6 * 1024 * 1024,  // 6 MB — fixed by Supabase
  onProgress(bytesUploaded, bytesTotal) {
    const pct = Math.round((bytesUploaded / bytesTotal) * 100);
    // update progress bar
  },
  onSuccess() { /* confirm upload, update DB */ },
  onError(err) { /* handle error */ },
});
upload.start();
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `owner` column on storage.objects | `owner_id` column (deprecated `owner`) | Supabase Storage v3 | Use `owner_id` in RLS policies; `owner` will be removed |
| Standard upload (PUT full file) | TUS resumable upload (chunked) | Supabase Storage v3 (2023) | All large file uploads must use TUS endpoint; standard upload still available for <6 MB |
| Bucket underscores allowed | Hyphens only enforced | Late 2024/early 2025 | `bu_42` fails; `bu-42` works |
| Per-object RLS only | Bucket-level `allowed_mime_types` + `file_size_limit` | Storage v3 | MIME and size enforcement now at bucket creation time, not just in RLS policies |

**Deprecated/outdated:**
- `storage.objects.owner`: Use `owner_id` instead — `owner` is deprecated and being removed
- Direct server upload buffering large files: Vercel 5 MB limit makes this untenable; use signed URL flow

---

## Open Questions

1. **URL expiry and shareability within BU**
   - What we know: `createSignedUrl(path, expiresIn)` with no user-locking mechanism built in — signed URL is usable by anyone who has it
   - What's unclear: User decision required on whether signed URLs should be locked to the requesting user's session (not a native Supabase feature — would require a redirect proxy)
   - Recommendation: Use 1-hour expiry (3600 seconds); keep URLs BU-shareable (no user lock) — signed URLs are already private (not guessable). Document this behavior. User-locked URLs would require a server-side proxy, which is over-engineering for v1.

2. **New BU bucket creation trigger**
   - What we know: SQL migration only creates buckets for BUs existing at migration time
   - What's unclear: Should bucket creation happen in the server route, a DB trigger, or a Supabase Edge Function?
   - Recommendation: Update the `createBusinessUnit` server route in `routes.ts` to call `storageAdmin.storage.createBucket()` immediately after inserting the BU. Simplest, no additional infrastructure.

3. **PDF-to-Markdown route after storage migration**
   - What we know: `GET /api/document-versions/:id/pdf/to-markdown` reads the file from local filesystem using `getLocalFilePath()`, then passes it to pdfjs-dist
   - What's unclear: After migration, the file is in Supabase Storage, not on disk. The route must download the file via signed URL or stream it before passing to pdfjs
   - Recommendation: Create a temporary signed URL, fetch the file buffer via `fetch(signedUrl)`, then pass the `ArrayBuffer` to pdfjs-dist. This is a route-level change in STOR-06 scope.

4. **Migration numbering**
   - What we know: Phase 1 used 0001, 0002, 0003. Phase 2 starts at 0004.
   - Recommendation: Use `0004_storage_buckets.sql` and `0005_storage_rls.sql`.

---

## Sources

### Primary (HIGH confidence)

- Supabase Storage Buckets guide — https://supabase.com/docs/guides/storage/buckets/creating-buckets — bucket creation via SQL + JS client, column names verified
- Supabase Storage Access Control — https://supabase.com/docs/guides/storage/security/access-control — RLS policies on storage.objects, bucket_id, foldername helper
- Supabase Storage Helper Functions — https://supabase.com/docs/guides/storage/schema/helper-functions — foldername(), filename(), extension() verified
- Supabase Resumable Uploads guide — https://supabase.com/docs/guides/storage/uploads/resumable-uploads — TUS endpoint, chunk size, metadata structure, x-signature
- Supabase JS Reference: createSignedUploadUrl — https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl — 2-hour validity, RLS insert required
- Supabase JS Reference: createSignedUrl — https://supabase.com/docs/reference/javascript/storage-from-createsignedurl — expiresIn, download option
- Supabase JS Reference: uploadToSignedUrl — https://supabase.com/docs/reference/javascript/storage-from-uploadtosignedurl — token parameter, upsert via createSignedUploadUrl
- Supabase File Limits guide — https://supabase.com/docs/guides/storage/uploads/file-limits — per-plan limits, file_size_limit as bigint
- Supabase Storage Ownership — https://supabase.com/docs/guides/storage/security/ownership — owner_id vs deprecated owner, service_key sets no owner
- Supabase Storage Scaling — https://supabase.com/docs/guides/storage/production/scaling — list() performance, indexing recommendation
- Phase 1 migration files (this codebase) — `supabase/migrations/0002_auth_hook.sql` and `0003_rls_policies.sql` — JWT claims structure: `auth.jwt()->'app_metadata'->'business_units'` as `[{id, role}]`

### Secondary (MEDIUM confidence)

- Bucket naming constraints (hyphens only, no underscores) — verified by Supabase community discussion #34881 and #35980 corroborating recent enforcement change
- storage.buckets column schema (`file_size_limit` bigint, `allowed_mime_types` text[]) — verified via Supabase community discussions citing schema; consistent with JavaScript SDK options
- tus-js-client v4.3.1 — npm show confirms current version; Supabase docs consistently reference tus-js-client as the library

### Tertiary (LOW confidence)

- Signed URL content-disposition inline vs attachment: Official JS reference page was truncated; `download` option for attachment behavior confirmed via multiple community sources but options object details were not fully loaded from official docs. Flag for verification when implementing.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — @supabase/supabase-js already installed; tus-js-client npm version verified
- Architecture (signed URL flow): HIGH — verified against official Supabase resumable uploads guide and createSignedUploadUrl reference
- RLS on storage.objects: HIGH — verified against access control docs; JWT claims path matches Phase 1 established pattern
- Bucket naming constraints: MEDIUM — recent enforcement change confirmed by multiple community discussions but not from a single authoritative release note
- download option on createSignedUrl: MEDIUM — behavior confirmed by community but official reference page was truncated during fetch

**Research date:** 2026-02-19
**Valid until:** 2026-03-21 (30 days — Supabase Storage API is stable)
