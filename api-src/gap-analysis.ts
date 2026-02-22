/**
 * Serverless function: /api/gap-analysis
 * AI-powered matching of controls to documents.
 *
 * URL convention:
 *   POST   /api/gap-analysis?action=ai-match&mappingId=N → AI match for single mapping (dispatch-and-fire)
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors } from "./_shared/cors";
import { sendError } from "./_shared/handler";
import { storage } from "../server/storage";
import { db } from "../server/db";
import { eq } from "drizzle-orm";
import * as schema from "../shared/schema";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  try {
    const actionRaw = req.query.action;
    const action = Array.isArray(actionRaw) ? actionRaw[0] : actionRaw;

    // === AI MATCH FOR SINGLE MAPPING (dispatch-and-fire) ===
    if (req.method === "POST" && action === "ai-match") {
      const mappingIdRaw = req.query.mappingId;
      const mappingId = Number(Array.isArray(mappingIdRaw) ? mappingIdRaw[0] : mappingIdRaw);
      if (!mappingId || isNaN(mappingId)) {
        return res.status(400).json({ message: "Missing mappingId query parameter" });
      }

      const mapping = await db.select().from(schema.controlMappings)
        .where(eq(schema.controlMappings.id, mappingId)).then(r => r[0]);
      if (!mapping) return res.status(404).json({ message: "Mapping not found" });
      if (!mapping.documentId) return res.status(400).json({ message: "Mapping has no linked document" });

      const control = await storage.getControl(mapping.controlId);
      if (!control) return res.status(404).json({ message: "Control not found" });
      const document = await storage.getDocument(mapping.documentId);
      if (!document) return res.status(404).json({ message: "Document not found" });

      const versions = await db.select().from(schema.documentVersions)
        .where(eq(schema.documentVersions.documentId, mapping.documentId));
      const latestVersion = versions.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())[0];
      const docContent = latestVersion?.content || "";
      if (!docContent || docContent.length < 20) {
        return res.status(400).json({ message: "Document has no content to analyse" });
      }

      const [job] = await db.insert(schema.aiJobs).values({
        jobType: "ai-match",
        entityId: mappingId,
        status: "pending",
        progressMessage: "Queued for analysis...",
      }).returning();

      // Fire-and-forget — do NOT await
      processAiMatchJob(job.id, mappingId).catch(err => {
        console.error("AI match job processing error:", err);
      });

      return res.json({ jobId: job.id, status: "pending" });
    }

    return res.status(405).json({ message: "Method not allowed" });
  } catch (err) {
    sendError(res, err);
  }
}

async function isJobCancelled(jobId: string): Promise<boolean> {
  const [job] = await db.select({ status: schema.aiJobs.status })
    .from(schema.aiJobs).where(eq(schema.aiJobs.id, jobId));
  return job?.status === "cancelled";
}

// ============================================================
// AI PROCESSOR: match single mapping (fire-and-forget)
// ============================================================
async function processAiMatchJob(jobId: string, mappingId: number) {
  try {
    await db.update(schema.aiJobs).set({
      status: "processing",
      progressMessage: "Analyzing control-document match...",
      updatedAt: new Date(),
    }).where(eq(schema.aiJobs.id, jobId));

    const mapping = await db.select().from(schema.controlMappings)
      .where(eq(schema.controlMappings.id, mappingId)).then(r => r[0]);
    if (!mapping || !mapping.documentId) throw new Error("Mapping not found or has no document");

    const control = await storage.getControl(mapping.controlId);
    if (!control) throw new Error("Control not found");
    const document = await storage.getDocument(mapping.documentId);
    if (!document) throw new Error("Document not found");

    const versions = await db.select().from(schema.documentVersions)
      .where(eq(schema.documentVersions.documentId, mapping.documentId));
    const latestVersion = versions.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())[0];
    const docContent = latestVersion?.content || "";
    const truncatedContent = docContent.slice(0, 8000);

    if (await isJobCancelled(jobId)) return;

    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const anthropic = new Anthropic({
      apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
    });

    const prompt = `You are a compliance analyst reviewing whether a policy document adequately covers a regulatory control.

REGULATORY CONTROL:
- Code: ${control.code}
- Title: ${control.title}
- Description: ${control.description || "N/A"}
- Suggested Evidence: ${control.evidence || "N/A"}

POLICY DOCUMENT:
- Title: ${document.title}
- Type: ${document.docType}
- Content (may be truncated):
${truncatedContent}

TASK: Analyse how well this document covers the regulatory control. Provide:
1. A match percentage (0-100) representing how comprehensively the document addresses the control
2. A brief rationale (2-3 sentences) explaining what the document DOES cover well
3. Specific recommendations for what would need to be added or improved to reach 100% coverage. If already at 100%, say "No further action needed."

Guidelines for scoring:
- 80-100%: Document directly and comprehensively addresses the control with specific provisions
- 60-79%: Document substantially covers the control but may lack some specifics
- 40-59%: Document partially addresses the control; important gaps exist
- 20-39%: Document touches on related topics but does not meaningfully address the control
- 0-19%: Document has little to no relevance to the control

Respond in exactly this JSON format:
{"score": <number>, "rationale": "<string>", "recommendations": "<string>"}`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });

    const responseText = message.content[0].type === "text" ? message.content[0].text : "";
    let aiScore = 0;
    let aiRationale = "Unable to parse AI response";
    let aiRecommendations = "";

    try {
      const parsed = JSON.parse(responseText);
      aiScore = Math.min(100, Math.max(0, Math.round(parsed.score)));
      aiRationale = parsed.rationale || "No rationale provided";
      aiRecommendations = parsed.recommendations || "";
    } catch {
      const scoreMatch = responseText.match(/"score"\s*:\s*(\d+)/);
      const rationaleMatch = responseText.match(/"rationale"\s*:\s*"([^"]+)"/);
      const recsMatch = responseText.match(/"recommendations"\s*:\s*"([^"]+)"/);
      if (scoreMatch) aiScore = Math.min(100, Math.max(0, parseInt(scoreMatch[1])));
      if (rationaleMatch) aiRationale = rationaleMatch[1];
      if (recsMatch) aiRecommendations = recsMatch[1];
    }

    await db.update(schema.controlMappings)
      .set({ aiMatchScore: aiScore, aiMatchRationale: aiRationale, aiMatchRecommendations: aiRecommendations })
      .where(eq(schema.controlMappings.id, mappingId));

    if (mapping.documentId) {
      await db.update(schema.documents)
        .set({ aiReviewedAt: new Date() })
        .where(eq(schema.documents.id, mapping.documentId));
    }

    await db.update(schema.aiJobs).set({
      status: "completed",
      result: { aiMatchScore: aiScore, aiMatchRationale: aiRationale, aiMatchRecommendations: aiRecommendations },
      progressMessage: "Analysis complete",
      updatedAt: new Date(),
    }).where(eq(schema.aiJobs.id, jobId));
  } catch (err: any) {
    await db.update(schema.aiJobs).set({
      status: "failed",
      errorMessage: err.message || "AI match analysis failed",
      updatedAt: new Date(),
    }).where(eq(schema.aiJobs.id, jobId));
  }
}
