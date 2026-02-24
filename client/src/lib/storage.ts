// =============================================
// CONSTANTS
// =============================================

export const ACCEPTED_FILE_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".xlsx",
  ".pptx",
  ".png",
  ".jpg",
  ".jpeg",
] as const;

export const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
] as const;

export const MAX_FILE_SIZE_BYTES = 10485760; // 10 MB
export const MAX_FILE_SIZE_DISPLAY = "10 MB";

// =============================================
// TYPES
// =============================================

export interface UploadOptions {
  file: File;
  signedUrl: string;       // from /api/document-versions/:id/upload-url
  token: string;           // from createSignedUploadUrl
  bucketId: string;        // e.g. "bu-42"
  objectPath: string;      // e.g. "101/202/abc12345_report.pdf"
  onProgress?: (percent: number) => void;  // 0-100
  onError?: (error: Error) => void;
}

export interface FileValidationResult {
  valid: boolean;
  errors: string[];  // empty if valid, descriptive messages if not
}

// =============================================
// FILE VALIDATION
// =============================================

/**
 * Validates a file's type and size before upload.
 * Returns { valid: true, errors: [] } or { valid: false, errors: [...] }.
 */
export function validateFile(file: File): FileValidationResult {
  const errors: string[] = [];

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    errors.push(`File too large: ${sizeInMB} MB. Maximum: 10 MB`);
  }

  if (!ACCEPTED_MIME_TYPES.includes(file.type as typeof ACCEPTED_MIME_TYPES[number])) {
    errors.push(
      `Unsupported file type: ${file.type}. Accepted: PDF, Word (.docx), Excel (.xlsx), PowerPoint (.pptx), PNG, JPEG`
    );
  }

  return { valid: errors.length === 0, errors };
}

// =============================================
// SIGNED URL UPLOAD
// =============================================

/**
 * Uploads a file to Supabase Storage using the signed upload URL.
 * The signed URL was created server-side with the service-role client, so it
 * bypasses RLS — no JWT business_units claims required.
 *
 * Uses XMLHttpRequest for upload progress tracking.
 */
export function uploadFileToStorage(options: UploadOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        options.onProgress?.(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        const err = new Error(
          `Upload failed: ${xhr.status} ${xhr.statusText} — ${xhr.responseText}`
        );
        options.onError?.(err);
        reject(err);
      }
    });

    xhr.addEventListener("error", () => {
      const err = new Error("Upload failed: network error");
      options.onError?.(err);
      reject(err);
    });

    xhr.addEventListener("abort", () => {
      const err = new Error("Upload aborted");
      options.onError?.(err);
      reject(err);
    });

    xhr.open("PUT", options.signedUrl);
    xhr.setRequestHeader("Content-Type", options.file.type);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.send(options.file);
  });
}

// =============================================
// UTILITIES
// =============================================

/**
 * Returns a human-readable file size string.
 * Uses KB for < 1 MB, MB for >= 1 MB.
 */
export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / 1024).toFixed(0)} KB`;
}

// =============================================
// SIGNED URL REFRESH
// =============================================

/**
 * Fetches a fresh signed download URL for a document version.
 * Phase 4 UI components call this when a signed URL returns 400/403 to silently obtain
 * a new URL without user action (auto-refresh on expiry — locked decision).
 *
 * @param versionId - The document version ID
 * @param mode - 'download' forces Content-Disposition: attachment; omit for inline preview
 */
export async function refreshSignedUrl(
  versionId: number,
  mode?: "download"
): Promise<{ url: string; expiresIn: number }> {
  const query = mode === "download" ? "?mode=download" : "";
  const response = await fetch(
    `/api/document-versions/${versionId}/pdf/download${query}`,
    { headers: { Accept: "application/json" } }
  );

  if (!response.ok) {
    throw new Error(`Failed to refresh signed URL: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<{ url: string; expiresIn: number }>;
}
