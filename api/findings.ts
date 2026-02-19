/**
 * Serverless function: /api/findings
 * Handles CRUD for findings and finding evidence.
 *
 * URL convention:
 *   GET    /api/findings                              → list all findings
 *   GET    /api/findings?id=N                         → get finding by id
 *   GET    /api/findings?findingId=N&resource=evidence → list evidence for finding
 *   POST   /api/findings                              → create finding
 *   PUT    /api/findings?id=N                         → update finding
 *   DELETE /api/findings?id=N                         → delete finding
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
        const idRaw = req.query.id;
        const findingIdRaw = req.query.findingId;
        const resource = req.query.resource;

        // List evidence for a finding
        if (findingIdRaw && resource === "evidence") {
          const findingId = Number(Array.isArray(findingIdRaw) ? findingIdRaw[0] : findingIdRaw);
          return res.json(await storage.getFindingEvidence(findingId));
        }

        if (idRaw) {
          const id = getIdParam(req);
          const f = await storage.getFinding(id);
          if (!f) return res.status(404).json({ message: "Finding not found" });
          return res.json(f);
        }

        return res.json(await storage.getFindings());
      }

      case "POST": {
        const body = { ...req.body };
        if (body.dueDate && typeof body.dueDate === "string") {
          body.dueDate = new Date(body.dueDate);
        }
        const input = api.findings.create.input.parse(body);
        const f = await storage.createFinding(input);
        await storage.createAuditLogEntry({
          entityType: "finding", entityId: f.id,
          action: "created", actor: input.owner, details: `Finding "${f.title}" created`,
        });
        return res.status(201).json(f);
      }

      case "PUT": {
        const id = getIdParam(req);
        const body = { ...req.body };
        if (body.dueDate && typeof body.dueDate === "string") {
          body.dueDate = new Date(body.dueDate);
        }
        const input = api.findings.update.input.parse(body);
        const f = await storage.updateFinding(id, input);
        if (!f) return res.status(404).json({ message: "Finding not found" });
        return res.json(f);
      }

      case "DELETE": {
        const id = getIdParam(req);
        const existing = await storage.getFinding(id);
        if (!existing) return res.status(404).json({ message: "Finding not found" });
        await storage.deleteFinding(id);
        await storage.createAuditLogEntry({
          entityType: "finding", entityId: existing.id,
          action: "deleted", actor: "System", details: `Finding "${existing.title}" deleted`,
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
