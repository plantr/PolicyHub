/**
 * Serverless function: /api/regulatory-sources
 * Handles CRUD for regulatory sources (frameworks).
 *
 * URL convention:
 *   GET    /api/regulatory-sources         → list all
 *   GET    /api/regulatory-sources?id=N    → get by id
 *   POST   /api/regulatory-sources         → create
 *   PUT    /api/regulatory-sources?id=N    → update
 *   DELETE /api/regulatory-sources?id=N    → delete
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
          const source = await storage.getRegulatorySource(id);
          if (!source) return res.status(404).json({ message: "Regulatory source not found" });
          return res.json(source);
        }
        return res.json(await storage.getRegulatorySources());
      }

      case "POST": {
        const input = api.regulatorySources.create.input.parse(req.body);
        const source = await storage.createRegulatorySource(input);
        await storage.createAuditLogEntry({
          entityType: "regulatory_source", entityId: source.id,
          action: "created", actor: "System",
          details: `Regulatory source "${source.name}" created`,
        });
        return res.status(201).json(source);
      }

      case "PUT": {
        const id = getIdParam(req);
        const input = api.regulatorySources.update.input.parse(req.body);
        const source = await storage.updateRegulatorySource(id, input);
        if (!source) return res.status(404).json({ message: "Regulatory source not found" });
        await storage.createAuditLogEntry({
          entityType: "regulatory_source", entityId: source.id,
          action: "updated", actor: "System",
          details: `Regulatory source "${source.name}" updated`,
        });
        return res.json(source);
      }

      case "DELETE": {
        const id = getIdParam(req);
        const existing = await storage.getRegulatorySource(id);
        if (!existing) return res.status(404).json({ message: "Regulatory source not found" });
        await storage.deleteRegulatorySource(id);
        await storage.createAuditLogEntry({
          entityType: "regulatory_source", entityId: existing.id,
          action: "deleted", actor: "System",
          details: `Regulatory source "${existing.name}" deleted`,
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
