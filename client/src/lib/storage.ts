import * as tus from "tus-js-client";
import { supabase } from "./supabase";

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
export const TUS_CHUNK_SIZE = 6 * 1024 * 1024; // 6 MB — required by Supabase

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
// HELPERS
// =============================================

/**
 * Extracts the Supabase project ref from VITE_SUPABASE_URL to build the storage endpoint.
 * Uses regex to safely handle URL formats: https://xyz.supabase.co, https://api.xyz.supabase.co, etc.
 */
function getStorageEndpoint(): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const match = /([a-z0-9]+)\.supabase\.co/.exec(supabaseUrl);
  if (!match) {
    throw new Error("Cannot extract project ref from VITE_SUPABASE_URL");
  }
  const projectRef = match[1];
  return `https://${projectRef}.storage.supabase.co/storage/v1/upload/resumable`;
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
// TUS UPLOAD
// =============================================

/**
 * Uploads a file to Supabase Storage using the TUS resumable upload protocol.
 * Call /api/document-versions/:id/upload-url first to get signedUrl, token, and bucketId.
 * After this resolves, call /api/document-versions/:id/upload-confirm to record the upload in the DB.
 */
export function uploadFileToStorage(options: UploadOptions): Promise<void> {
  return new Promise(async (resolve, reject) => {
    let accessToken: string;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("No active session — user must be signed in to upload files");
      }
      accessToken = session.access_token;
    } catch (err) {
      return reject(err instanceof Error ? err : new Error(String(err)));
    }

    let storageEndpoint: string;
    try {
      storageEndpoint = getStorageEndpoint();
    } catch (err) {
      return reject(err instanceof Error ? err : new Error(String(err)));
    }

    // tus-js-client UploadOptions does not declare `uploadSignature` in its types,
    // but Supabase Storage requires it to authenticate TUS resumable uploads.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uploadOptions: any = {
      endpoint: storageEndpoint,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${accessToken}`,
        "x-upsert": "false",
      },
      uploadSignature: options.token,
      metadata: {
        bucketName: options.bucketId,
        objectName: options.objectPath,
        contentType: options.file.type,
        cacheControl: "3600",
      },
      chunkSize: TUS_CHUNK_SIZE,
      onProgress(bytesUploaded: number, bytesTotal: number) {
        options.onProgress?.(Math.round((bytesUploaded / bytesTotal) * 100));
      },
      onSuccess() {
        resolve();
      },
      onError(err: Error) {
        options.onError?.(err);
        reject(err);
      },
    };
    const upload = new tus.Upload(options.file, uploadOptions);

    upload.start();
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
