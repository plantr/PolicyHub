/**
 * Serverless function: /api/risk-library
 * Handles CRUD for risk library items.
 *
 * URL convention:
 *   GET    /api/risk-library          → list all
 *   GET    /api/risk-library?id=N     → get by id
 *   POST   /api/risk-library          → create
 *   PUT    /api/risk-library?id=N     → update
 *   DELETE /api/risk-library?id=N     → delete
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
          const r = await storage.getRiskLibraryItem(id);
          if (!r) return res.status(404).json({ message: "Risk Library item not found" });
          return res.json(r);
        }
        return res.json(await storage.getRiskLibraryItems());
      }

      case "POST": {
        const input = api.riskLibrary.create.input.parse(req.body);
        const r = await storage.createRiskLibraryItem(input);
        return res.status(201).json(r);
      }

      case "PUT": {
        const id = getIdParam(req);
        const input = api.riskLibrary.update.input.parse(req.body);
        const r = await storage.updateRiskLibraryItem(id, input);
        if (!r) return res.status(404).json({ message: "Risk Library item not found" });
        return res.json(r);
      }

      case "DELETE": {
        const id = getIdParam(req);
        const existing = await storage.getRiskLibraryItem(id);
        if (!existing) return res.status(404).json({ message: "Risk Library item not found" });
        await storage.deleteRiskLibraryItem(id);
        return res.status(204).end();
      }

      default:
        return res.status(405).json({ message: "Method not allowed" });
    }
  } catch (err) {
    sendError(res, err);
  }
}
