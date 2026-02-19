/**
 * Serverless function: /api/approvals
 * Handles CRUD for approval records.
 *
 * URL convention:
 *   GET    /api/approvals          → list all
 *   POST   /api/approvals          → create
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors } from "./_shared/cors";
import { sendError } from "./_shared/handler";
import { storage } from "../server/storage";
import { api } from "../shared/routes";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  try {
    switch (req.method) {
      case "GET": {
        return res.json(await storage.getApprovals());
      }

      case "POST": {
        const input = api.approvals.create.input.parse(req.body);
        const approval = await storage.createApproval(input);
        await storage.createAuditLogEntry({
          entityType: input.entityType, entityId: input.entityId,
          action: "approval_" + input.action, actor: input.approver,
          details: input.comments || `Approval: ${input.action} - ${input.status}`,
        });
        return res.status(201).json(approval);
      }

      default:
        return res.status(405).json({ message: "Method not allowed" });
    }
  } catch (err) {
    sendError(res, err);
  }
}
