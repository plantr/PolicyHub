/**
 * Serverless function: /api/document-versions
 * Handles CRUD and file operations for document versions.
 *
 * URL convention (all routing via query params):
 *   GET    /api/document-versions                        → list all versions
 *   GET    /api/document-versions?documentId=N           → list versions for a document
 *   GET    /api/document-versions?id=N                   → get single version
 *   GET    /api/document-versions?id=N&action=download   → get signed download URL
 *   GET    /api/document-versions?id=N&action=to-markdown → convert PDF to markdown
 *   POST   /api/document-versions                        → create new version (metadata only)
 *   POST   /api/document-versions?id=N&action=upload-url  → get signed upload URL
 *   POST   /api/document-versions?id=N&action=upload-confirm → confirm TUS upload
 *   PUT    /api/document-versions?id=N                   → update version metadata
 *   PUT    /api/document-versions?id=N&action=status     → update version status only
 *   DELETE /api/document-versions?id=N                   → delete version
 *   DELETE /api/document-versions?id=N&action=pdf        → remove PDF attachment
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHash } from "crypto";
import { handleCors } from "./_shared/cors";
import { sendError, getIdParam } from "./_shared/handler";
import { convertToMarkdown } from "./_shared/markitdown";
import { storage } from "../server/storage";
import { api } from "../shared/routes";
import {
  storagePath, resolveFilename, createSignedUploadUrl,
  createSignedDownloadUrl, deleteStorageObject, bucketName,
  validateFileType, validateFileSize,
} from "../server/storage-supabase";
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  try {
    const action = Array.isArray(req.query.action) ? req.query.action[0] : req.query.action;

    switch (req.method) {
      case "GET": {
        const idRaw = req.query.id;
        const documentIdRaw = req.query.documentId;

        // GET all versions for a document
        if (documentIdRaw && !idRaw) {
          const documentId = Number(Array.isArray(documentIdRaw) ? documentIdRaw[0] : documentIdRaw);
          return res.json(await storage.getDocumentVersions(documentId));
        }

        // GET all versions (no filter)
        if (!idRaw) {
          return res.json(await storage.getAllDocumentVersions());
        }

        const id = getIdParam(req);

        if (action === "download") {
          const version = await storage.getDocumentVersion(id);
          if (!version) return res.status(404).json({ message: "Version not found" });
          if (!version.pdfS3Key) return res.status(404).json({ message: "No PDF attached to this version" });

          const doc = await storage.getDocument(version.documentId);
          const buId = doc?.businessUnitId ?? null;

          const isDownload = req.query.mode === "download";
          const fileName = version.pdfFileName || "policy.pdf";
          const signedUrl = isDownload
            ? await createSignedDownloadUrl(buId, version.pdfS3Key, fileName)
            : await createSignedDownloadUrl(buId, version.pdfS3Key);

          // Backward compatibility: JSON accept header returns URL; otherwise redirect
          const acceptHeader = req.headers.accept || "";
          if (acceptHeader.includes("application/json")) {
            return res.json({ url: signedUrl, expiresIn: 3600 });
          }
          return res.redirect(302, signedUrl);
        }

        if (action === "to-markdown") {
          const version = await storage.getDocumentVersion(id);
          if (!version) return res.status(404).json({ message: "Version not found" });
          if (!version.pdfS3Key) return res.status(404).json({ message: "No PDF attached to this version" });

          const doc = await storage.getDocument(version.documentId);
          const buId = doc?.businessUnitId ?? null;

          const signedUrl = await createSignedDownloadUrl(buId, version.pdfS3Key);
          const markdown = await convertToMarkdown(signedUrl, version.pdfFileName || "document.pdf");
          return res.json({ markdown });
        }

        // GET single version by id
        const version = await storage.getDocumentVersion(id);
        if (!version) return res.status(404).json({ message: "Version not found" });
        return res.json(version);
      }

      case "POST": {
        const idRaw = req.query.id;

        if (!idRaw) {
          // Create new document version (metadata only — no file upload)
          const body = { ...req.body };
          if (typeof body.documentId === "string") body.documentId = Number(body.documentId);
          if (body.effectiveDate && typeof body.effectiveDate === "string") {
            body.effectiveDate = new Date(body.effectiveDate);
          }
          if (!body.content) body.content = "No content";
          const input = api.documentVersions.create.input.parse(body);
          const contentHash = createHash("sha256").update(input.content).digest("hex");
          const version = await storage.createDocumentVersion({ ...input, contentHash });
          await storage.createAuditLogEntry({
            entityType: "document_version", entityId: version.id,
            action: "created", actor: input.createdBy,
            details: `Version ${input.version} created (hash: ${contentHash.substring(0, 12)})`,
          });
          return res.status(201).json(version);
        }

        const id = getIdParam(req);

        if (action === "upload-url") {
          const { fileName, mimeType, fileSize } = req.body as { fileName: string; mimeType: string; fileSize: number };

          const typeCheck = validateFileType(mimeType);
          if (!typeCheck.valid) return res.status(400).json({ message: typeCheck.message });

          const sizeCheck = validateFileSize(fileSize);
          if (!sizeCheck.valid) return res.status(400).json({ message: sizeCheck.message });

          const version = await storage.getDocumentVersion(id);
          if (!version) return res.status(404).json({ message: "Version not found" });

          const doc = await storage.getDocument(version.documentId);
          const buId = doc?.businessUnitId ?? null;

          const resolvedName = await resolveFilename(buId, version.documentId, id, fileName);
          const objectPath = storagePath(version.documentId, id, resolvedName);
          const { signedUrl, token, path } = await createSignedUploadUrl(buId, objectPath);

          return res.json({ signedUrl, token, path, bucketId: bucketName(buId) });
        }

        if (action === "upload-confirm") {
          const { storagePath: filePath, fileName, fileSize } = req.body as {
            storagePath: string; fileName: string; fileSize: number;
          };

          const version = await storage.getDocumentVersion(id);
          if (!version) return res.status(404).json({ message: "Version not found" });

          const doc = await storage.getDocument(version.documentId);
          const buId = doc?.businessUnitId ?? null;

          if (version.pdfS3Key) {
            try { await deleteStorageObject(buId, version.pdfS3Key); } catch { /* ignore */ }
          }

          const updated = await storage.updateDocumentVersionPdf(id, filePath, fileName, fileSize);
          await storage.createAuditLogEntry({
            entityType: "document_version", entityId: id,
            action: "pdf_uploaded", actor: "System",
            details: `File "${fileName}" uploaded via signed URL`,
          });

          return res.json(updated);
        }

        // Legacy inline PDF upload (POST /api/document-versions?id=N&action=pdf)
        if (action === "pdf") {
          return res.status(400).json({ message: "Direct file upload not supported in serverless mode. Use upload-url and upload-confirm instead." });
        }

        return res.status(400).json({ message: "Unknown action" });
      }

      case "PUT": {
        const id = getIdParam(req);

        if (action === "status") {
          const { status } = api.documentVersions.updateStatus.input.parse(req.body);
          const version = await storage.updateDocumentVersionStatus(id, status);
          if (!version) return res.status(404).json({ message: "Version not found" });
          await storage.createAuditLogEntry({
            entityType: "document_version", entityId: version.id,
            action: "status_changed", actor: "System",
            details: `Status changed to ${status}`,
          });
          return res.json(version);
        }

        // Update version metadata
        const existing = await storage.getDocumentVersion(id);
        if (!existing) return res.status(404).json({ message: "Version not found" });

        const { version, status, changeReason, createdBy, effectiveDate, content } = req.body;
        const updateData: Record<string, unknown> = {};
        if (version !== undefined) updateData.version = version;
        if (status !== undefined) updateData.status = status;
        if (changeReason !== undefined) updateData.changeReason = changeReason || null;
        if (createdBy !== undefined) updateData.createdBy = createdBy;
        if (effectiveDate !== undefined) updateData.effectiveDate = effectiveDate ? new Date(effectiveDate) : null;
        if (content !== undefined) updateData.content = content;

        const updated = await storage.updateDocumentVersion(id, updateData);
        if (!updated) return res.status(404).json({ message: "Version not found" });

        await storage.createAuditLogEntry({
          entityType: "document_version", entityId: updated.id,
          action: "updated", actor: updated.createdBy,
          details: `Version ${updated.version} updated`,
        });
        return res.json(updated);
      }

      case "DELETE": {
        const id = getIdParam(req);

        if (action === "pdf") {
          const version = await storage.getDocumentVersion(id);
          if (!version) return res.status(404).json({ message: "Version not found" });
          if (!version.pdfS3Key) return res.status(404).json({ message: "No PDF attached" });

          const doc = await storage.getDocument(version.documentId);
          const buId = doc?.businessUnitId ?? null;

          await deleteStorageObject(buId, version.pdfS3Key);
          const updated = await storage.updateDocumentVersionPdf(id, "", "", 0);

          await storage.createAuditLogEntry({
            entityType: "document_version", entityId: id,
            action: "pdf_deleted", actor: "System",
            details: `PDF "${version.pdfFileName}" removed`,
          });

          return res.json(updated);
        }

        // Document version deletion not supported (use PDF removal or archive instead)
        return res.status(405).json({ message: "Document versions cannot be deleted. Use DELETE?action=pdf to remove the PDF attachment." });
      }

      default:
        return res.status(405).json({ message: "Method not allowed" });
    }
  } catch (err) {
    sendError(res, err);
  }
}
