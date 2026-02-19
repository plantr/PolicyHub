/**
 * Serverless function: /api/documents
 * Handles CRUD for documents.
 *
 * URL convention:
 *   GET    /api/documents          → list all
 *   GET    /api/documents?id=N     → get by id
 *   POST   /api/documents          → create (without file upload — TUS flow handles file upload)
 *   PUT    /api/documents?id=N     → update by id
 *   DELETE /api/documents?id=N     → delete by id
 *
 * Note: Legacy multer file upload was removed. The TUS signed URL flow (Phase 2)
 * handles file attachment. Document creation via this endpoint accepts metadata only.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors } from "./_shared/cors";
import { sendError, getIdParam } from "./_shared/handler";
import { storage } from "../server/storage";
import { api } from "../shared/routes";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  try {
    switch (req.method) {
      case "GET": {
        const raw = req.query.id;
        if (raw) {
          const id = getIdParam(req);
          const doc = await storage.getDocument(id);
          if (!doc) return res.status(404).json({ message: "Document not found" });
          return res.json(doc);
        }
        return res.json(await storage.getDocuments());
      }

      case "POST": {
        const body = { ...req.body };
        if (typeof body.tags === "string") {
          try {
            const parsed = JSON.parse(body.tags);
            body.tags = Array.isArray(parsed) ? parsed : [];
          } catch { body.tags = []; }
        }
        if (!body.tags) body.tags = [];
        if (typeof body.businessUnitId === "string") {
          body.businessUnitId = (body.businessUnitId === "null" || body.businessUnitId === "")
            ? null
            : Number(body.businessUnitId);
        }
        if (!body.reviewFrequency || body.reviewFrequency === "") body.reviewFrequency = null;
        if (body.nextReviewDate && typeof body.nextReviewDate === "string") {
          body.nextReviewDate = new Date(body.nextReviewDate);
        }
        const input = api.documents.create.input.parse(body);
        const doc = await storage.createDocument(input);
        await storage.createAuditLogEntry({
          entityType: "document", entityId: doc.id,
          action: "created", actor: input.owner, details: `Document "${doc.title}" created`,
        });
        return res.status(201).json(doc);
      }

      case "PUT": {
        const id = getIdParam(req);
        const body = { ...req.body };
        if (body.nextReviewDate && typeof body.nextReviewDate === "string") {
          body.nextReviewDate = new Date(body.nextReviewDate);
        }
        const input = api.documents.update.input.parse(body);
        const doc = await storage.updateDocument(id, input);
        if (!doc) return res.status(404).json({ message: "Document not found" });
        return res.json(doc);
      }

      case "DELETE": {
        const id = getIdParam(req);
        const existing = await storage.getDocument(id);
        if (!existing) return res.status(404).json({ message: "Document not found" });
        await storage.deleteDocument(id);
        await storage.createAuditLogEntry({
          entityType: "document", entityId: existing.id,
          action: "deleted", actor: "System", details: `Document "${existing.title}" deleted`,
        });
        return res.status(204).end();
      }

      default:
        return res.status(405).json({ message: "Method not allowed" });
    }
  } catch (err) {
    sendError(res, err);
  }
}
