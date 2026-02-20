/**
 * Serverless function: /api/risks
 * Handles CRUD for risks.
 *
 * URL convention:
 *   GET    /api/risks          → list all
 *   GET    /api/risks?id=N     → get by id
 *   POST   /api/risks          → create
 *   PUT    /api/risks?id=N     → update
 *   DELETE /api/risks?id=N     → delete
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors } from "./_shared/cors";
import { sendError, getIdParam } from "./_shared/handler";
import { storage } from "../server/storage";
import { api } from "../shared/routes";

function calcRiskRating(score: number): string {
  if (score >= 20) return "Critical";
  if (score >= 12) return "High";
  if (score >= 6) return "Medium";
  return "Low";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  try {
    switch (req.method) {
      case "GET": {
        const raw = req.query.id;
        if (raw) {
          const id = getIdParam(req);
          const r = await storage.getRisk(id);
          if (!r) return res.status(404).json({ message: "Risk not found" });
          return res.json(r);
        }
        return res.json(await storage.getRisks());
      }

      case "POST": {
        const body = { ...req.body };
        if (body.reviewDate && typeof body.reviewDate === "string") body.reviewDate = new Date(body.reviewDate);
        if (typeof body.businessUnitId === "string") {
          body.businessUnitId = body.businessUnitId === "" || body.businessUnitId === "null" ? null : Number(body.businessUnitId);
        }
        if (typeof body.controlId === "string") {
          body.controlId = body.controlId === "" || body.controlId === "null" ? null : Number(body.controlId);
        }
        const score = (body.inherentLikelihood || 3) * (body.inherentImpact || 3);
        body.inherentScore = score;
        body.inherentRating = calcRiskRating(score);
        const resScore = (body.residualLikelihood || 3) * (body.residualImpact || 3);
        body.residualScore = resScore;
        body.residualRating = calcRiskRating(resScore);
        const input = api.risks.create.input.parse(body);
        const r = await storage.createRisk(input);
        await storage.createAuditLogEntry({
          entityType: "risk", entityId: r.id,
          action: "created", actor: input.owner, details: `Risk "${r.title}" created`,
        });
        return res.status(201).json(r);
      }

      case "PUT": {
        const id = getIdParam(req);
        const body = { ...req.body };
        if (body.reviewDate && typeof body.reviewDate === "string") body.reviewDate = new Date(body.reviewDate);
        if (typeof body.businessUnitId === "string") {
          body.businessUnitId = body.businessUnitId === "" || body.businessUnitId === "null" ? null : Number(body.businessUnitId);
        }
        if (typeof body.controlId === "string") {
          body.controlId = body.controlId === "" || body.controlId === "null" ? null : Number(body.controlId);
        }
        if (body.inherentLikelihood !== undefined && body.inherentImpact !== undefined) {
          const score = body.inherentLikelihood * body.inherentImpact;
          body.inherentScore = score;
          body.inherentRating = calcRiskRating(score);
        }
        if (body.residualLikelihood !== undefined && body.residualImpact !== undefined) {
          const resScore = body.residualLikelihood * body.residualImpact;
          body.residualScore = resScore;
          body.residualRating = calcRiskRating(resScore);
        }
        const input = api.risks.update.input.parse(body);
        const r = await storage.updateRisk(id, input);
        if (!r) return res.status(404).json({ message: "Risk not found" });
        return res.json(r);
      }

      case "DELETE": {
        const id = getIdParam(req);
        const existing = await storage.getRisk(id);
        if (!existing) return res.status(404).json({ message: "Risk not found" });
        await storage.deleteRisk(id);
        await storage.createAuditLogEntry({
          entityType: "risk", entityId: existing.id,
          action: "deleted", actor: "System", details: `Risk "${existing.title}" deleted`,
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
