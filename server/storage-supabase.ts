import path from 'path';
import { supabaseAdmin } from './lib/supabase-admin';

// =============================================
// CONSTANTS
// =============================================

export const ALLOWED_MIME_TYPES: string[] = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/png',
  'image/jpeg',
];

export const MAX_FILE_SIZE = 10485760; // 10 MB in bytes

export const SIGNED_URL_EXPIRY = 3600; // 1 hour in seconds

// =============================================
// BUCKET + PATH HELPERS
// =============================================

/**
 * Returns the Supabase Storage bucket name for a given business unit ID.
 * Pattern: bu-{buId} (e.g., bu-42)
 */
export function bucketName(buId: number): string {
  return `bu-${buId}`;
}

/**
 * Generates a unique storage path for a file.
 * Pattern: {documentId}/{versionId}/{8-char-uuid-prefix}_{sanitized-filename}
 * Filename sanitization: non-alphanumeric chars (except `.`, `_`, `-`) replaced with `_`
 */
export function storagePath(
  documentId: number,
  versionId: number,
  fileName: string
): string {
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const uuidPrefix = crypto.randomUUID().slice(0, 8);
  return `${documentId}/${versionId}/${uuidPrefix}_${sanitizedName}`;
}

// =============================================
// VALIDATION
// =============================================

/**
 * Validates that a MIME type is in the allowed list.
 * Returns { valid: true } or { valid: false, message: string }.
 */
export function validateFileType(mimeType: string): { valid: boolean; message?: string } {
  if (ALLOWED_MIME_TYPES.includes(mimeType)) {
    return { valid: true };
  }
  return {
    valid: false,
    message: `Unsupported file type: ${mimeType}. Accepted: PDF, Word, Excel, PowerPoint, PNG, JPEG`,
  };
}

/**
 * Validates that a file size is within the allowed limit.
 * Returns { valid: true } or { valid: false, message: string }.
 */
export function validateFileSize(sizeBytes: number): { valid: boolean; message?: string } {
  if (sizeBytes <= MAX_FILE_SIZE) {
    return { valid: true };
  }
  const sizeInMB = (sizeBytes / (1024 * 1024)).toFixed(2);
  return {
    valid: false,
    message: `File too large: ${sizeInMB} MB. Maximum: 10 MB`,
  };
}

// =============================================
// FILENAME RESOLUTION
// =============================================

/**
 * Resolves a unique filename within a document/version prefix.
 * If the original filename conflicts with an existing object, appends _v2, _v3, etc.
 * Uses the bucket for the given business unit.
 */
export async function resolveFilename(
  buId: number,
  docId: number,
  versionId: number,
  originalName: string
): Promise<string> {
  const bucket = bucketName(buId);
  const prefix = `${docId}/${versionId}/`;

  const { data, error } = await supabaseAdmin.storage.from(bucket).list(prefix);
  if (error) {
    // If listing fails (e.g., bucket empty), return original name
    return originalName;
  }

  const existingNames = (data ?? []).map((obj) => {
    // Strip the uuid prefix (first 9 chars: 8 hex + underscore) to get the base filename
    const objName = obj.name;
    const underscoreIdx = objName.indexOf('_');
    return underscoreIdx >= 0 ? objName.slice(underscoreIdx + 1) : objName;
  });

  const ext = path.extname(originalName);
  const base = path.basename(originalName, ext);

  if (!existingNames.includes(originalName)) {
    return originalName;
  }

  let counter = 2;
  while (true) {
    const candidate = `${base}_v${counter}${ext}`;
    if (!existingNames.includes(candidate)) {
      return candidate;
    }
    counter++;
  }
}

// =============================================
// SIGNED URL OPERATIONS
// =============================================

/**
 * Creates a signed upload URL for a file path within a business unit's bucket.
 * Uses the service-role client (bypasses RLS).
 */
export async function createSignedUploadUrl(
  buId: number,
  filePath: string
): Promise<{ signedUrl: string; token: string; path: string }> {
  const { data, error } = await supabaseAdmin.storage
    .from(bucketName(buId))
    .createSignedUploadUrl(filePath);

  if (error || !data) {
    throw new Error(`Failed to create signed upload URL: ${error?.message ?? 'Unknown error'}`);
  }

  return data;
}

/**
 * Creates a signed download URL for a file in a business unit's bucket.
 * @param forDownload - If provided, sets Content-Disposition: attachment with this filename.
 *                      If omitted, Content-Disposition: inline (preview in browser).
 */
export async function createSignedDownloadUrl(
  buId: number,
  filePath: string,
  forDownload?: string
): Promise<string> {
  const options = forDownload ? { download: forDownload } : undefined;

  const { data, error } = await supabaseAdmin.storage
    .from(bucketName(buId))
    .createSignedUrl(filePath, SIGNED_URL_EXPIRY, options);

  if (error || !data) {
    throw new Error(`Failed to create signed download URL: ${error?.message ?? 'Unknown error'}`);
  }

  return data.signedUrl;
}

// =============================================
// OBJECT MANAGEMENT
// =============================================

/**
 * Deletes a storage object from a business unit's bucket.
 * Uses the service-role client (bypasses RLS).
 */
export async function deleteStorageObject(buId: number, filePath: string): Promise<void> {
  const { error } = await supabaseAdmin.storage
    .from(bucketName(buId))
    .remove([filePath]);

  if (error) {
    throw new Error(`Failed to delete storage object: ${error.message}`);
  }
}

/**
 * Creates a new private Supabase Storage bucket for a business unit.
 * Caller should handle "bucket already exists" errors gracefully if needed.
 */
export async function createBucketForBusinessUnit(buId: number): Promise<void> {
  const { error } = await supabaseAdmin.storage.createBucket(bucketName(buId), {
    public: false,
    fileSizeLimit: MAX_FILE_SIZE,
    allowedMimeTypes: ALLOWED_MIME_TYPES,
  });

  if (error) {
    throw new Error(`Failed to create bucket for BU ${buId}: ${error.message}`);
  }
}
