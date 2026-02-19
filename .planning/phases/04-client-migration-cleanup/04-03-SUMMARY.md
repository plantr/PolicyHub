---
phase: 04-client-migration-cleanup
plan: 03
subsystem: serverless-api
tags: [vercel, serverless, express-migration, api]
dependency_graph:
  requires: [04-01, server/storage.ts, server/storage-supabase.ts, shared/routes.ts, shared/schema.ts]
  provides: [api/*.ts individual serverless functions, api/_shared/cors.ts, api/_shared/handler.ts]
  affects: [vercel.json, scripts/build-api.mjs, server/routes.ts]
tech_stack:
  added: [Vercel serverless functions, esbuild multi-entry bundling]
  patterns:
    - Individual serverless function per route group (api/*.ts)
    - Query param routing for sub-actions (id, action, resource, documentId, etc.)
    - Shared CORS and error handling utilities in api/_shared/
    - Fire-and-forget AI job dispatch with job status polling
    - Multi-entry esbuild producing individual .js bundles per function
key_files:
  created:
    - api/_shared/cors.ts
    - api/_shared/handler.ts
    - api/business-units.ts
    - api/documents.ts
    - api/document-versions.ts
    - api/requirements.ts
    - api/requirement-mappings.ts
    - api/findings.ts
    - api/audits.ts
    - api/audit-log.ts
    - api/approvals.ts
    - api/users.ts
    - api/stats.ts
    - api/admin.ts
    - api/risks.ts
    - api/risk-library.ts
    - api/risk-actions.ts
    - api/risk-snapshots.ts
    - api/risk-categories.ts
    - api/commitments.ts
    - api/knowledge-base.ts
    - api/gap-analysis.ts
    - api/ai-jobs.ts
  modified:
    - scripts/build-api.mjs
    - vercel.json
  deleted:
    - api/_entry.ts
    - api/index.js
    - api/index.js.map
decisions:
  - Query param routing used instead of path segments — Vercel serverless functions receive path segments via req.query, making ?id=N and ?action=X natural for sub-operations on a single function file
  - Legacy multer file upload removed from documents.ts and document-versions.ts — TUS signed URL flow (Phase 2) replaces direct upload; upload-url and upload-confirm actions handle file attachment
  - api/business-units.ts DELETE returns 405 — business units use archive (PUT?action=archive), not hard delete, matching existing server/routes.ts behavior
  - api/document-versions.ts DELETE (version record) returns 405 — deleteDocumentVersion not in storage interface; use DELETE?action=pdf for PDF removal
  - AI processor functions co-located in respective api files — processAiMatchJob in gap-analysis.ts, processAiCoverageJob and processAiMapControlsJob in ai-jobs.ts
  - risk-categories.ts handles three sub-resources — categories, impact-levels, likelihood-levels via ?resource= query param to avoid needing three separate files
metrics:
  duration: 9 min
  completed: 2026-02-19
  tasks_completed: 2
  files_created: 23
  files_modified: 2
  files_deleted: 3
---

# Phase 4 Plan 03: Express Monolith to Individual Serverless Functions — Summary

**One-liner:** 21 individual Vercel serverless function files replacing the Express monolith, with multi-entry esbuild bundling and vercel.json API catch-all removed.

## What Was Built

Broke the Express monolith (`server/index.ts` + `server/routes.ts`) into 21 individual Vercel serverless function files in `/api/`. Each route group has its own `.ts` file handling all HTTP methods for that resource.

### Shared Utilities (`api/_shared/`)

**`api/_shared/cors.ts`** — CORS handling for all serverless functions. `setCorsHeaders()` sets Access-Control headers; `handleCors()` handles OPTIONS preflight and returns true if handled.

**`api/_shared/handler.ts`** — Request utilities: `parseBody<T>()` for Zod validation with 400 on failure, `sendError()` for consistent error responses (400 for ZodError, uses `.status` if present, 500 otherwise), `getIdParam()` for extracting numeric `?id=` query params.

### Route Mapping Convention

Vercel serverless functions receive path segments in `req.query`. The convention used:
- `GET /api/documents` → list (no id param)
- `GET /api/documents?id=N` → get by id
- `POST /api/documents` → create
- `PUT /api/documents?id=N` → update
- `PUT /api/documents?id=N&action=archive` → special action
- `DELETE /api/documents?id=N` → delete

### First Batch (Task 1) — Core Entity Functions

| File | Methods | Notes |
|------|---------|-------|
| `api/business-units.ts` | GET, POST, PUT | Archive via PUT?action=archive; DELETE returns 405 (use archive) |
| `api/documents.ts` | GET, POST, PUT, DELETE | No multer — TUS flow replaces file upload |
| `api/document-versions.ts` | GET, POST, PUT, DELETE | Complex: signed upload (upload-url, upload-confirm), download, to-markdown, PDF deletion |
| `api/requirements.ts` | GET, POST, PUT, DELETE | With audit logging |
| `api/requirement-mappings.ts` | GET, POST, PUT, DELETE | Mapping CRUD |
| `api/findings.ts` | GET, POST, PUT, DELETE | Includes `?findingId=N&resource=evidence` for evidence |
| `api/audits.ts` | GET, POST, PUT, DELETE | With audit logging |
| `api/audit-log.ts` | GET | Read-only |
| `api/approvals.ts` | GET, POST | Create triggers audit log entry |
| `api/users.ts` | GET, POST, PUT | Deactivate via PUT?action=deactivate |
| `api/stats.ts` | GET | Multi-table aggregation: docs, reqs, mappings, findings, approvals |
| `api/admin.ts` | GET, POST, PUT, DELETE | Lookup tables via ?table=; reorder via POST?action=reorder |

### Second Batch (Task 2) — Risk, AI, and Remaining Functions

| File | Methods | Notes |
|------|---------|-------|
| `api/risks.ts` | GET, POST, PUT, DELETE | Auto-computes inherent/residual score and rating |
| `api/risk-library.ts` | GET, POST, PUT, DELETE | Risk library items |
| `api/risk-actions.ts` | GET, POST, PUT, DELETE | With date coercion |
| `api/risk-snapshots.ts` | GET, POST, DELETE | POST auto-aggregates current risk data into snapshot |
| `api/risk-categories.ts` | GET, POST, PUT, DELETE | Handles categories + impact-levels + likelihood-levels via ?resource= |
| `api/commitments.ts` | GET, POST, PUT, DELETE | With audit logging |
| `api/knowledge-base.ts` | GET, POST, PUT, DELETE | Tags normalization, audit logging |
| `api/gap-analysis.ts` | GET (refresh), POST (auto-map, ai-match) | Full gap analysis + keyword auto-map + AI match dispatch |
| `api/ai-jobs.ts` | GET (status), POST (coverage, map-controls) | Job polling + AI coverage + AI map-controls dispatch |

### Build Configuration

**`scripts/build-api.mjs`** updated from single-entry to multi-entry:
```javascript
const entries = readdirSync("api")
  .filter(f => f.endsWith(".ts") && !f.startsWith("_"))
  .map(f => `api/${f}`);

await build({
  entryPoints: entries,
  outdir: "api",          // produces api/foo.js for each api/foo.ts
  outExtension: { ".js": ".js" },
  ...
});
```

Produces 21 individual `.js` bundles (60-73KB each), Vercel auto-discovers them.

**`vercel.json`** simplified — removed `/api/(.*)` catch-all rewrite:
```json
{
  "buildCommand": "npx vite build && node scripts/build-api.mjs",
  "outputDirectory": "dist/public",
  "rewrites": [
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

## Decisions Made

**Query param routing** — Vercel serverless functions use `req.query` for all parameters (including path segment equivalents like `id`, `action`, `resource`). This is consistent with how Vercel routes to function files — the function file is selected by path, not query params.

**multer removed** — `api/documents.ts` and `api/document-versions.ts` no longer accept file uploads via multipart form. The TUS signed URL flow from Phase 2 (`upload-url` + `upload-confirm` actions) handles file attachment. Legacy `POST?action=pdf` returns 400 with a clear message.

**AI processors co-located** — `processAiMatchJob` lives in `api/gap-analysis.ts` (since it's triggered by gap-analysis endpoints), while `processAiCoverageJob` and `processAiMapControlsJob` live in `api/ai-jobs.ts` (dispatch endpoints there). Fire-and-forget pattern preserved: validate → insert ai_job → fire processor → return `{ jobId, status: 'pending' }`.

**Risk categories consolidation** — `impact-levels` and `likelihood-levels` are handled in `api/risk-categories.ts` via `?resource=` query param rather than separate files, keeping the function count manageable.

## Deviations from Plan

**1. [Rule 1 - Bug] Business unit DELETE behavior corrected**
- **Found during:** Task 1 - business-units.ts
- **Issue:** Plan mentioned DELETE but `storage` has no `deleteBusinessUnit` method — the Express routes also never had a DELETE for BUs, only archive
- **Fix:** DELETE returns 405 with message directing user to PUT?action=archive
- **Files modified:** api/business-units.ts

**2. [Rule 1 - Bug] Document version DELETE (record) corrected**
- **Found during:** Task 1 - document-versions.ts
- **Issue:** `deleteDocumentVersion` doesn't exist in the storage interface
- **Fix:** DELETE without `?action=pdf` returns 405; DELETE?action=pdf for PDF removal still works
- **Files modified:** api/document-versions.ts

**3. [Rule 2 - Missing functionality] Legacy PDF upload returns helpful error**
- **Found during:** Task 1 - document-versions.ts
- **Issue:** Multer-based upload cannot work in Vercel serverless (streaming body parsing differs); instead of silently failing, a clear error is returned
- **Fix:** POST?action=pdf returns 400 with message directing to upload-url/upload-confirm flow
- **Files modified:** api/document-versions.ts

## Self-Check: PASSED

All key files verified present. All commits verified:
- `e08e9f8` - Task 1: shared utilities + first 14 function files
- `f967375` - Task 2: remaining 7 function files + build + vercel.json
