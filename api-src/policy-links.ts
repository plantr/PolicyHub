/**
 * Serverless function: /api/policy-links
 * Handles CRUD for policy links (document-to-document relationships).
 *
 * URL convention:
 *   GET    /api/policy-links          → list all
 *   POST   /api/policy-links          → create
 *   DELETE /api/policy-links?id=N     → delete
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
        return res.json(await storage.getPolicyLinks());
      }

      case "POST": {
        const input = api.policyLinks.create.input.parse(req.body);
        const link = await storage.createPolicyLink(input);
        return res.status(201).json(link);
      }

      case "DELETE": {
        const id = getIdParam(req);
        await storage.deletePolicyLink(id);
        return res.status(204).end();
      }

      default:
        return res.status(405).json({ message: "Method not allowed" });
    }
  } catch (err) {
    sendError(res, err);
  }
}
