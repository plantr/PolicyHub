/**
 * Serverless function: /api/requirements
 * Handles CRUD for requirements.
 *
 * URL convention:
 *   GET    /api/requirements          → list all
 *   GET    /api/requirements?id=N     → get by id
 *   POST   /api/requirements          → create
 *   PUT    /api/requirements?id=N     → update
 *   DELETE /api/requirements?id=N     → delete
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
          const r = await storage.getRequirement(id);
          if (!r) return res.status(404).json({ message: "Requirement not found" });
          return res.json(r);
        }
        return res.json(await storage.getRequirements());
      }

      case "POST": {
        const input = api.requirements.create.input.parse(req.body);
        const r = await storage.createRequirement(input);
        await storage.createAuditLogEntry({
          entityType: "requirement", entityId: r.id,
          action: "created", actor: "System", details: `Requirement "${r.code}" created`,
        });
        return res.status(201).json(r);
      }

      case "PUT": {
        const id = getIdParam(req);
        const input = api.requirements.update.input.parse(req.body);
        const r = await storage.updateRequirement(id, input);
        if (!r) return res.status(404).json({ message: "Requirement not found" });
        return res.json(r);
      }

      case "DELETE": {
        const id = getIdParam(req);
        const existing = await storage.getRequirement(id);
        if (!existing) return res.status(404).json({ message: "Requirement not found" });
        await storage.deleteRequirement(id);
        await storage.createAuditLogEntry({
          entityType: "requirement", entityId: existing.id,
          action: "deleted", actor: "System", details: `Requirement "${existing.code}" deleted`,
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
