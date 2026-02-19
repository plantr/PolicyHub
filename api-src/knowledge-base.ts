/**
 * Serverless function: /api/knowledge-base
 * Handles CRUD for knowledge base articles.
 *
 * URL convention:
 *   GET    /api/knowledge-base          → list all
 *   GET    /api/knowledge-base?id=N     → get by id
 *   POST   /api/knowledge-base          → create
 *   PUT    /api/knowledge-base?id=N     → update
 *   DELETE /api/knowledge-base?id=N     → delete
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
          const a = await storage.getKnowledgeBaseArticle(id);
          if (!a) return res.status(404).json({ message: "Article not found" });
          return res.json(a);
        }
        return res.json(await storage.getKnowledgeBaseArticles());
      }

      case "POST": {
        const body = { ...req.body };
        if (typeof body.tags === "string") {
          try { body.tags = JSON.parse(body.tags); } catch { body.tags = []; }
        }
        if (!body.tags) body.tags = [];
        const input = api.knowledgeBase.create.input.parse(body);
        const a = await storage.createKnowledgeBaseArticle(input);
        await storage.createAuditLogEntry({
          entityType: "knowledge_base_article", entityId: a.id,
          action: "created", actor: input.author,
          details: `Article "${a.title}" created`,
        });
        return res.status(201).json(a);
      }

      case "PUT": {
        const id = getIdParam(req);
        const body = { ...req.body };
        if (typeof body.tags === "string") {
          try { body.tags = JSON.parse(body.tags); } catch { body.tags = []; }
        }
        const input = api.knowledgeBase.update.input.parse(body);
        const a = await storage.updateKnowledgeBaseArticle(id, input);
        if (!a) return res.status(404).json({ message: "Article not found" });
        await storage.createAuditLogEntry({
          entityType: "knowledge_base_article", entityId: a.id,
          action: "updated", actor: "System",
          details: `Article "${a.title}" updated`,
        });
        return res.json(a);
      }

      case "DELETE": {
        const id = getIdParam(req);
        const existing = await storage.getKnowledgeBaseArticle(id);
        if (!existing) return res.status(404).json({ message: "Article not found" });
        await storage.deleteKnowledgeBaseArticle(id);
        await storage.createAuditLogEntry({
          entityType: "knowledge_base_article", entityId: existing.id,
          action: "deleted", actor: "System",
          details: `Article "${existing.title}" deleted`,
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
