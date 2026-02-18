import path from "path";
import fs from "fs/promises";

const UPLOAD_DIR = path.resolve("data", "uploads", "policies");

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export function generateS3Key(documentId: number, versionId: number, fileName: string): string {
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `policies/${documentId}/versions/${versionId}/${Date.now()}_${sanitized}`;
}

export async function uploadToS3(key: string, buffer: Buffer, _contentType: string): Promise<void> {
  const filePath = path.resolve("data", "uploads", key);
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, buffer);
}

export function getLocalFilePath(key: string): string {
  return path.resolve("data", "uploads", key);
}

export async function deleteFromS3(key: string): Promise<void> {
  const filePath = path.resolve("data", "uploads", key);
  try {
    await fs.unlink(filePath);
  } catch {}
}
