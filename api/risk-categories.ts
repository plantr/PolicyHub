/**
 * Serverless function: /api/risk-categories
 * Handles CRUD for risk categories (and impact/likelihood levels).
 *
 * URL convention:
 *   GET    /api/risk-categories                    → list categories
 *   GET    /api/risk-categories?resource=impact-levels     → list impact levels
 *   GET    /api/risk-categories?resource=likelihood-levels → list likelihood levels
 *   POST   /api/risk-categories                    → create category
 *   POST   /api/risk-categories?resource=impact-levels     → create impact level
 *   POST   /api/risk-categories?resource=likelihood-levels → create likelihood level
 *   PUT    /api/risk-categories?id=N               → update category
 *   PUT    /api/risk-categories?id=N&resource=impact-levels → update impact level
 *   PUT    /api/risk-categories?id=N&resource=likelihood-levels → update likelihood level
 *   DELETE /api/risk-categories?id=N               → delete category
 *   DELETE /api/risk-categories?id=N&resource=impact-levels → delete impact level
 *   DELETE /api/risk-categories?id=N&resource=likelihood-levels → delete likelihood level
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors } from "./_shared/cors";
import { sendError, getIdParam } from "./_shared/handler";
import { storage } from "../server/storage";
import { api } from "../shared/routes";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  try {
    const resourceRaw = req.query.resource;
    const resource = Array.isArray(resourceRaw) ? resourceRaw[0] : resourceRaw;

    switch (req.method) {
      case "GET": {
        if (resource === "impact-levels") return res.json(await storage.getImpactLevels());
        if (resource === "likelihood-levels") return res.json(await storage.getLikelihoodLevels());
        return res.json(await storage.getRiskCategories());
      }

      case "POST": {
        if (resource === "impact-levels") {
          const input = api.impactLevels.create.input.parse(req.body);
          return res.status(201).json(await storage.createImpactLevel(input));
        }
        if (resource === "likelihood-levels") {
          const input = api.likelihoodLevels.create.input.parse(req.body);
          return res.status(201).json(await storage.createLikelihoodLevel(input));
        }
        const input = api.riskCategories.create.input.parse(req.body);
        return res.status(201).json(await storage.createRiskCategory(input));
      }

      case "PUT": {
        const id = getIdParam(req);
        if (resource === "impact-levels") {
          const r = await storage.updateImpactLevel(id, req.body);
          if (!r) return res.status(404).json({ message: "Not found" });
          return res.json(r);
        }
        if (resource === "likelihood-levels") {
          const r = await storage.updateLikelihoodLevel(id, req.body);
          if (!r) return res.status(404).json({ message: "Not found" });
          return res.json(r);
        }
        const r = await storage.updateRiskCategory(id, req.body);
        if (!r) return res.status(404).json({ message: "Not found" });
        return res.json(r);
      }

      case "DELETE": {
        const id = getIdParam(req);
        if (resource === "impact-levels") {
          await storage.deleteImpactLevel(id);
          return res.status(204).end();
        }
        if (resource === "likelihood-levels") {
          await storage.deleteLikelihoodLevel(id);
          return res.status(204).end();
        }
        await storage.deleteRiskCategory(id);
        return res.status(204).end();
      }

      default:
        return res.status(405).json({ message: "Method not allowed" });
    }
  } catch (err) {
    sendError(res, err);
  }
}
