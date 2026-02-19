/**
 * Serverless function: /api/requirement-mappings
 * Handles CRUD for requirement mappings.
 *
 * URL convention:
 *   GET    /api/requirement-mappings          → list all
 *   POST   /api/requirement-mappings          → create
 *   PUT    /api/requirement-mappings?id=N     → update
 *   DELETE /api/requirement-mappings?id=N     → delete
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
        return res.json(await storage.getRequirementMappings());
      }

      case "POST": {
        const input = api.requirementMappings.create.input.parse(req.body);
        const mapping = await storage.createRequirementMapping(input);
        return res.status(201).json(mapping);
      }

      case "PUT": {
        const id = getIdParam(req);
        const input = api.requirementMappings.update.input.parse(req.body);
        const mapping = await storage.updateRequirementMapping(id, input);
        if (!mapping) return res.status(404).json({ message: "Mapping not found" });
        return res.json(mapping);
      }

      case "DELETE": {
        const id = getIdParam(req);
        await storage.deleteRequirementMapping(id);
        return res.status(204).end();
      }

      default:
        return res.status(405).json({ message: "Method not allowed" });
    }
  } catch (err) {
    sendError(res, err);
  }
}
