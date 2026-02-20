/**
 * Serverless function: /api/controls
 * Handles CRUD for controls.
 *
 * URL convention:
 *   GET    /api/controls          → list all
 *   GET    /api/controls?id=N     → get by id
 *   POST   /api/controls          → create
 *   PUT    /api/controls?id=N     → update
 *   DELETE /api/controls?id=N     → delete
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
          const r = await storage.getControl(id);
          if (!r) return res.status(404).json({ message: "Control not found" });
          return res.json(r);
        }
        return res.json(await storage.getControls());
      }

      case "POST": {
        const input = api.controls.create.input.parse(req.body);
        const r = await storage.createControl(input);
        await storage.createAuditLogEntry({
          entityType: "control", entityId: r.id,
          action: "created", actor: "System", details: `Control "${r.code}" created`,
        });
        return res.status(201).json(r);
      }

      case "PUT": {
        const id = getIdParam(req);
        const input = api.controls.update.input.parse(req.body);
        const r = await storage.updateControl(id, input);
        if (!r) return res.status(404).json({ message: "Control not found" });
        return res.json(r);
      }

      case "DELETE": {
        const id = getIdParam(req);
        const existing = await storage.getControl(id);
        if (!existing) return res.status(404).json({ message: "Control not found" });
        await storage.deleteControl(id);
        await storage.createAuditLogEntry({
          entityType: "control", entityId: existing.id,
          action: "deleted", actor: "System", details: `Control "${existing.code}" deleted`,
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
