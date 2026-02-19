# Phase 2: Storage Migration - Context

**Gathered:** 2026-02-19
**Status:** Ready for planning

<domain>
## Phase Boundary

PDFs and supporting documents can be uploaded to and downloaded from private Supabase Storage buckets with business-unit-scoped access, replacing the existing S3 and local file storage. This phase covers bucket setup, RLS policies on storage.objects, signed URL generation, and upload/download flows. It does NOT include UI changes to the React client (Phase 4) or migration of existing files from S3/local storage.

</domain>

<decisions>
## Implementation Decisions

### Bucket structure
- One private bucket per business unit (not a single shared bucket)
- BU isolation at bucket level — each BU's files are physically separated

### Claude's Discretion: Bucket naming & internal folder structure
- Claude decides bucket naming convention (BU slug vs BU ID vs other)
- Claude decides internal folder organization within each BU bucket (flat, by document type, etc.)
- Claude decides file naming convention in storage (original name, UUID-prefixed, etc.)

### Signed URL behavior
- Default to inline preview (PDF opens in browser) with a separate download button available
- Auto-refresh on expiry — app detects expired URL and silently fetches a new signed URL without user action
- Claude decides URL expiry duration and whether URLs are shareable within BU or user-locked

### Upload constraints
- Maximum file size: 10 MB
- Accepted file types: PDF, Office documents (.docx, .xlsx, .pptx), and images (.png, .jpg)
- File type validation on upload with clear rejection messages for unsupported types
- Duplicate filenames handled via version suffix (report_v1.pdf, report_v2.pdf) — preserves history
- Progress bar during upload showing percentage/bytes uploaded

</decisions>

<specifics>
## Specific Ideas

- Success criteria requires TUS resumable protocol for files > 6 MB — progress bar aligns well with this
- Inline preview + download button mirrors typical document management UX (Google Drive, SharePoint)
- Version suffix on duplicates means the DB metadata layer needs to track version lineage

</specifics>

<deferred>
## Deferred Ideas

- Existing file migration from S3/local storage — user chose not to discuss; may need a migration plan or separate phase
- Bulk migration tooling — not discussed, consider when existing files need to move over

</deferred>

---

*Phase: 02-storage-migration*
*Context gathered: 2026-02-19*
