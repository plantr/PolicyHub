/**
 * Serverless function: /api/commitments
 * Handles CRUD for commitments.
 *
 * URL convention:
 *   GET    /api/commitments          → list all
 *   GET    /api/commitments?id=N     → get by id
 *   POST   /api/commitments          → create
 *   PUT    /api/commitments?id=N     → update
 *   DELETE /api/commitments?id=N     → delete
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
          const c = await storage.getCommitment(id);
          if (!c) return res.status(404).json({ message: "Commitment not found" });
          return res.json(c);
        }
        return res.json(await storage.getCommitments());
      }

      case "POST": {
        const body = { ...req.body };
        if (body.dueDate && typeof body.dueDate === "string") body.dueDate = new Date(body.dueDate);
        const input = api.commitments.create.input.parse(body);
        const c = await storage.createCommitment(input);
        await storage.createAuditLogEntry({
          entityType: "commitment", entityId: c.id,
          action: "created", actor: input.owner,
          details: `Commitment "${c.title}" created`,
        });
        return res.status(201).json(c);
      }

      case "PUT": {
        const id = getIdParam(req);
        const body = { ...req.body };
        if (body.dueDate && typeof body.dueDate === "string") body.dueDate = new Date(body.dueDate);
        if (body.completedDate && typeof body.completedDate === "string") body.completedDate = new Date(body.completedDate);
        const input = api.commitments.update.input.parse(body);
        const c = await storage.updateCommitment(id, input);
        if (!c) return res.status(404).json({ message: "Commitment not found" });
        await storage.createAuditLogEntry({
          entityType: "commitment", entityId: c.id,
          action: "updated", actor: "System",
          details: `Commitment "${c.title}" updated`,
        });
        return res.json(c);
      }

      case "DELETE": {
        const id = getIdParam(req);
        const existing = await storage.getCommitment(id);
        if (!existing) return res.status(404).json({ message: "Commitment not found" });
        await storage.deleteCommitment(id);
        await storage.createAuditLogEntry({
          entityType: "commitment", entityId: existing.id,
          action: "deleted", actor: "System",
          details: `Commitment "${existing.title}" deleted`,
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
