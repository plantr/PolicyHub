/**
 * Serverless function: /api/control-mappings
 * Handles CRUD for control mappings.
 *
 * URL convention:
 *   GET    /api/control-mappings          → list all
 *   POST   /api/control-mappings          → create
 *   PUT    /api/control-mappings?id=N     → update
 *   DELETE /api/control-mappings?id=N     → delete
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
        return res.json(await storage.getControlMappings());
      }

      case "POST": {
        const input = api.controlMappings.create.input.parse(req.body);
        const mapping = await storage.createControlMapping(input);
        return res.status(201).json(mapping);
      }

      case "PUT": {
        const id = getIdParam(req);
        const input = api.controlMappings.update.input.parse(req.body);
        const mapping = await storage.updateControlMapping(id, input);
        if (!mapping) return res.status(404).json({ message: "Mapping not found" });
        return res.json(mapping);
      }

      case "DELETE": {
        const id = getIdParam(req);
        await storage.deleteControlMapping(id);
        return res.status(204).end();
      }

      default:
        return res.status(405).json({ message: "Method not allowed" });
    }
  } catch (err) {
    sendError(res, err);
  }
}
