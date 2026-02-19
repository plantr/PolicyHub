/**
 * Serverless function: /api/audits
 * Handles CRUD for audits.
 *
 * URL convention:
 *   GET    /api/audits          → list all
 *   GET    /api/audits?id=N     → get by id
 *   POST   /api/audits          → create
 *   PUT    /api/audits?id=N     → update
 *   DELETE /api/audits?id=N     → delete
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
          const audit = await storage.getAudit(id);
          if (!audit) return res.status(404).json({ message: "Audit not found" });
          return res.json(audit);
        }
        return res.json(await storage.getAudits());
      }

      case "POST": {
        const input = api.audits.create.input.parse(req.body);
        const audit = await storage.createAudit(input);
        await storage.createAuditLogEntry({
          entityType: "audit", entityId: audit.id,
          action: "created", actor: input.leadAuditor, details: `Audit created: ${audit.title}`,
        });
        return res.status(201).json(audit);
      }

      case "PUT": {
        const id = getIdParam(req);
        const input = api.audits.update.input.parse(req.body);
        const audit = await storage.updateAudit(id, input);
        if (!audit) return res.status(404).json({ message: "Audit not found" });
        await storage.createAuditLogEntry({
          entityType: "audit", entityId: audit.id,
          action: "updated", actor: "System", details: `Audit updated: ${audit.title}`,
        });
        return res.json(audit);
      }

      case "DELETE": {
        const id = getIdParam(req);
        const existing = await storage.getAudit(id);
        if (!existing) return res.status(404).json({ message: "Audit not found" });
        await storage.deleteAudit(id);
        await storage.createAuditLogEntry({
          entityType: "audit", entityId: existing.id,
          action: "deleted", actor: "System", details: `Audit deleted: ${existing.title}`,
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
