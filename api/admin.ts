/**
 * Serverless function: /api/admin
 * Handles CRUD for admin lookup tables.
 *
 * Supported tables (via ?table=): entity-types, roles, jurisdictions,
 * document-categories, finding-severities, document-statuses
 *
 * URL convention:
 *   GET    /api/admin?table=T         → list all records in table
 *   POST   /api/admin?table=T         → create record
 *   PUT    /api/admin?table=T&id=N    → update record
 *   DELETE /api/admin?table=T&id=N    → delete record
 *   POST   /api/admin?table=T&action=reorder → reorder records
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors } from "./_shared/cors";
import { sendError, getIdParam } from "./_shared/handler";
import { storage } from "../server/storage";
import { api } from "../shared/routes";

const VALID_ADMIN_TABLES = [
  "entity-types", "roles", "jurisdictions",
  "document-categories", "finding-severities", "document-statuses",
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  try {
    const tableRaw = req.query.table;
    const table = Array.isArray(tableRaw) ? tableRaw[0] : tableRaw;

    if (!table || !VALID_ADMIN_TABLES.includes(table)) {
      return res.status(404).json({ message: "Unknown or missing table parameter" });
    }

    const action = Array.isArray(req.query.action) ? req.query.action[0] : req.query.action;

    switch (req.method) {
      case "GET": {
        return res.json(await storage.getAdminRecords(table));
      }

      case "POST": {
        if (action === "reorder") {
          const { orderedIds } = req.body;
          if (!Array.isArray(orderedIds) || !orderedIds.every((id: unknown) => typeof id === "number")) {
            return res.status(400).json({ message: "orderedIds must be an array of numbers" });
          }
          const records = await storage.reorderAdminRecords(table, orderedIds);
          return res.json(records);
        }

        const input = api.admin.create.input.parse(req.body);
        const record = await storage.createAdminRecord(table, input);
        return res.status(201).json(record);
      }

      case "PUT": {
        const id = getIdParam(req);
        const input = api.admin.update.input.parse(req.body);
        const record = await storage.updateAdminRecord(table, id, input);
        if (!record) return res.status(404).json({ message: "Record not found" });
        return res.json(record);
      }

      case "DELETE": {
        const id = getIdParam(req);
        const existing = await storage.getAdminRecord(table, id);
        if (!existing) return res.status(404).json({ message: "Record not found" });
        await storage.deleteAdminRecord(table, id);
        return res.status(204).end();
      }

      default:
        return res.status(405).json({ message: "Method not allowed" });
    }
  } catch (err) {
    sendError(res, err);
  }
}
