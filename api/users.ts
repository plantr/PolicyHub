/**
 * Serverless function: /api/users
 * Handles CRUD for users.
 *
 * URL convention:
 *   GET    /api/users                              → list all
 *   GET    /api/users?id=N                         → get by id
 *   POST   /api/users                              → create
 *   PUT    /api/users?id=N                         → update
 *   PUT    /api/users?id=N&action=deactivate       → deactivate user
 *   DELETE /api/users?id=N                         → delete (not currently supported)
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
          const user = await storage.getUser(id);
          if (!user) return res.status(404).json({ message: "User not found" });
          return res.json(user);
        }
        return res.json(await storage.getUsers());
      }

      case "POST": {
        const input = api.users.create.input.parse(req.body);
        const user = await storage.createUser(input);
        await storage.createAuditLogEntry({
          entityType: "user", entityId: user.id,
          action: "created", actor: "System",
          details: `User "${user.firstName} ${user.lastName}" created`,
        });
        return res.status(201).json(user);
      }

      case "PUT": {
        const id = getIdParam(req);
        const action = req.query.action;

        if (action === "deactivate") {
          const existing = await storage.getUser(id);
          if (!existing) return res.status(404).json({ message: "User not found" });
          const deactivated = await storage.deactivateUser(id);
          await storage.createAuditLogEntry({
            entityType: "user", entityId: existing.id,
            action: "deactivated", actor: "System",
            details: `User "${existing.firstName} ${existing.lastName}" deactivated`,
          });
          return res.json(deactivated);
        }

        const input = api.users.update.input.parse(req.body);
        const user = await storage.updateUser(id, input);
        if (!user) return res.status(404).json({ message: "User not found" });
        await storage.createAuditLogEntry({
          entityType: "user", entityId: user.id,
          action: "updated", actor: "System",
          details: `User "${user.firstName} ${user.lastName}" updated`,
        });
        return res.json(user);
      }

      default:
        return res.status(405).json({ message: "Method not allowed" });
    }
  } catch (err) {
    sendError(res, err);
  }
}
