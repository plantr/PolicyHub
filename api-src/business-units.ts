/**
 * Serverless function: /api/business-units
 * Handles CRUD for business units.
 *
 * URL convention for Vercel serverless functions:
 *   GET    /api/business-units          → list all
 *   GET    /api/business-units?id=N     → get by id
 *   POST   /api/business-units          → create
 *   PUT    /api/business-units?id=N     → update by id
 *   PUT    /api/business-units?id=N&action=archive → archive
 *   DELETE /api/business-units?id=N     → delete
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors } from "./_shared/cors";
import { sendError, getIdParam } from "./_shared/handler";
import { storage } from "../server/storage";
import { api } from "../shared/routes";
import { createBucketForBusinessUnit } from "../server/storage-supabase";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  try {
    switch (req.method) {
      case "GET": {
        const raw = req.query.id;
        if (raw) {
          const id = getIdParam(req);
          const bu = await storage.getBusinessUnit(id);
          if (!bu) return res.status(404).json({ message: "Business Unit not found" });
          return res.json(bu);
        }
        return res.json(await storage.getBusinessUnits());
      }

      case "POST": {
        const input = api.businessUnits.create.input.parse(req.body);
        const bu = await storage.createBusinessUnit(input);
        try {
          await createBucketForBusinessUnit(bu.id);
        } catch (bucketErr) {
          console.warn(`Failed to provision storage bucket for BU ${bu.id}:`, bucketErr);
        }
        await storage.createAuditLogEntry({
          entityType: "business_unit", entityId: bu.id,
          action: "created", actor: "System", details: `Business Unit "${bu.name}" created`,
        });
        return res.status(201).json(bu);
      }

      case "PUT": {
        const id = getIdParam(req);
        const action = req.query.action;

        if (action === "archive") {
          const existing = await storage.getBusinessUnit(id);
          if (!existing) return res.status(404).json({ message: "Business Unit not found" });
          const archived = await storage.archiveBusinessUnit(id);
          await storage.createAuditLogEntry({
            entityType: "business_unit", entityId: existing.id,
            action: "archived", actor: "system", details: `Business unit "${existing.name}" archived`,
          });
          return res.json(archived);
        }

        const input = api.businessUnits.update.input.parse(req.body);
        const bu = await storage.updateBusinessUnit(id, input);
        if (!bu) return res.status(404).json({ message: "Business Unit not found" });
        return res.json(bu);
      }

      case "DELETE": {
        // Business units use archive instead of delete — see PUT?action=archive
        return res.status(405).json({ message: "Business units cannot be deleted. Use PUT?action=archive instead." });
      }

      default:
        return res.status(405).json({ message: "Method not allowed" });
    }
  } catch (err) {
    sendError(res, err);
  }
}
