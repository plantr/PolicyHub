/**
 * Serverless function: /api/risk-actions
 * Handles CRUD for risk actions.
 *
 * URL convention:
 *   GET    /api/risk-actions          → list all
 *   GET    /api/risk-actions?id=N     → get by id
 *   POST   /api/risk-actions          → create
 *   PUT    /api/risk-actions?id=N     → update
 *   DELETE /api/risk-actions?id=N     → delete
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
          const a = await storage.getRiskAction(id);
          if (!a) return res.status(404).json({ message: "Risk Action not found" });
          return res.json(a);
        }
        return res.json(await storage.getRiskActions());
      }

      case "POST": {
        const body = { ...req.body };
        if (body.dueDate && typeof body.dueDate === "string") body.dueDate = new Date(body.dueDate);
        if (typeof body.riskId === "string") body.riskId = Number(body.riskId);
        const input = api.riskActions.create.input.parse(body);
        const a = await storage.createRiskAction(input);
        await storage.createAuditLogEntry({
          entityType: "risk_action", entityId: a.id,
          action: "created", actor: input.assignee, details: `Risk action "${a.title}" created`,
        });
        return res.status(201).json(a);
      }

      case "PUT": {
        const id = getIdParam(req);
        const body = { ...req.body };
        if (body.dueDate && typeof body.dueDate === "string") body.dueDate = new Date(body.dueDate);
        if (body.completedDate && typeof body.completedDate === "string") body.completedDate = new Date(body.completedDate);
        if (typeof body.riskId === "string") body.riskId = Number(body.riskId);
        const input = api.riskActions.update.input.parse(body);
        const a = await storage.updateRiskAction(id, input);
        if (!a) return res.status(404).json({ message: "Risk Action not found" });
        return res.json(a);
      }

      case "DELETE": {
        const id = getIdParam(req);
        const existing = await storage.getRiskAction(id);
        if (!existing) return res.status(404).json({ message: "Risk Action not found" });
        await storage.deleteRiskAction(id);
        return res.status(204).end();
      }

      default:
        return res.status(405).json({ message: "Method not allowed" });
    }
  } catch (err) {
    sendError(res, err);
  }
}
