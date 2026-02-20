/**
 * Serverless function: /api/ai-jobs
 * AI job status polling and dispatch endpoints.
 *
 * URL convention:
 *   GET    /api/ai-jobs?jobId=JOBID          → get job status
 *   POST   /api/ai-jobs?action=coverage&controlId=N → AI combined coverage (dispatch-and-fire)
 *   POST   /api/ai-jobs?action=map-controls&documentId=N → AI auto-map document to controls (dispatch-and-fire)
 *
 * All POST endpoints return { jobId, status: 'pending' } immediately
 * and process in the background via fire-and-forget.
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

    // === JOB STATUS POLLING ===
    if (req.method === "GET") {
      const jobIdRaw = req.query.jobId;
      const jobId = Array.isArray(jobIdRaw) ? jobIdRaw[0] : jobIdRaw;
      if (!jobId) return res.status(400).json({ message: "Missing jobId query parameter" });

      const job = await db.select().from(schema.aiJobs)
        .where(eq(schema.aiJobs.id, jobId)).then(r => r[0]);
      if (!job) return res.status(404).json({ message: "Job not found" });
      return res.json(job);
    }

    // === AI COMBINED COVERAGE ANALYSIS (dispatch-and-fire) ===
    if (req.method === "POST" && action === "coverage") {
      const controlIdRaw = req.query.controlId;
      const controlId = Number(Array.isArray(controlIdRaw) ? controlIdRaw[0] : controlIdRaw);
      if (!controlId || isNaN(controlId)) {
        return res.status(400).json({ message: "Missing controlId query parameter" });
      }

      const control = await storage.getControl(controlId);
      if (!control) return res.status(404).json({ message: "Control not found" });

      const allMappings = await storage.getControlMappings();
      const linkedMappings = allMappings.filter((m) => m.controlId === controlId && m.documentId);
      if (linkedMappings.length === 0) {
        return res.status(400).json({ message: "No documents linked to this control" });
      }

      const [job] = await db.insert(schema.aiJobs).values({
        jobType: "ai-coverage",
        entityId: controlId,
        status: "pending",
        progressMessage: "Queued for analysis...",
      }).returning();

      // Fire-and-forget
      processAiCoverageJob(job.id, controlId).catch(err => {
        console.error("AI coverage job processing error:", err);
      });

      return res.json({ jobId: job.id, status: "pending" });
    }

    // === AI AUTO-MAP DOCUMENT TO CONTROLS (dispatch-and-fire) ===
    if (req.method === "POST" && action === "map-controls") {
      const documentIdRaw = req.query.documentId;
      const docId = Number(Array.isArray(documentIdRaw) ? documentIdRaw[0] : documentIdRaw);
      if (!docId || isNaN(docId)) {
        return res.status(400).json({ message: "Missing documentId query parameter" });
      }

      const document = await storage.getDocument(docId);
      if (!document) return res.status(404).json({ message: "Document not found" });

      const allVersions = await db.select().from(schema.documentVersions)
        .where(eq(schema.documentVersions.documentId, docId));
      const publishedVersion = allVersions.find((v) => v.status === "Published");
      if (!publishedVersion) return res.status(400).json({ message: "No published version found" });

      const docContent = publishedVersion.markDown || "";
      if (!docContent || docContent.length < 20) {
        return res.status(400).json({ message: "Published version has no content to analyse" });
      }

      const allControls = await storage.getControls();
      const existingMappings = await storage.getControlMappings();
      const existingDocMappings = existingMappings.filter((m) => m.documentId === docId);
      const aiVerifiedIds = new Set(
        existingDocMappings
          .filter((m) => m.aiMatchScore != null && m.aiMatchScore >= 60)
          .map((m) => m.controlId)
      );
      const unmappedControls = allControls.filter((r) => !aiVerifiedIds.has(r.id));

      if (unmappedControls.length === 0) {
        return res.json({ message: "All controls are already mapped", matched: 0, total: 0, mappings: [] });
      }

      const [job] = await db.insert(schema.aiJobs).values({
        jobType: "ai-map-controls",
        entityId: docId,
        status: "pending",
        progressMessage: "Queued for analysis...",
      }).returning();

      // Fire-and-forget
      processAiMapControlsJob(job.id, docId).catch(err => {
        console.error("AI map-controls job processing error:", err);
      });

      return res.json({ jobId: job.id, status: "pending" });
    }

    return res.status(405).json({ message: "Method not allowed" });
  } catch (err) {
    sendError(res, err);
  }
}

// ============================================================
// AI PROCESSOR: combined coverage for a control
// ============================================================
async function processAiCoverageJob(jobId: string, controlId: number) {
  try {
    await db.update(schema.aiJobs).set({
      status: "processing",
      progressMessage: "Gathering linked documents...",
      updatedAt: new Date(),
    }).where(eq(schema.aiJobs.id, jobId));

    const control = await storage.getControl(controlId);
    if (!control) throw new Error("Control not found");

    const allMappings = await storage.getControlMappings();
    const linkedMappings = allMappings.filter((m) => m.controlId === controlId && m.documentId);
    if (linkedMappings.length === 0) throw new Error("No documents linked to this control");

    await db.update(schema.aiJobs).set({
      progressMessage: "Analyzing coverage across all linked documents...",
      updatedAt: new Date(),
    }).where(eq(schema.aiJobs.id, jobId));

    const docSummaries: string[] = [];
    let maxIndividualScore = 0;
    for (const mapping of linkedMappings) {
      const document = await storage.getDocument(mapping.documentId!);
      if (!document) continue;

      if (mapping.aiMatchScore !== null && mapping.aiMatchScore !== undefined && mapping.aiMatchScore > maxIndividualScore) {
        maxIndividualScore = mapping.aiMatchScore;
      }

      const versions = await db.select().from(schema.documentVersions)
        .where(eq(schema.documentVersions.documentId, mapping.documentId!));
      const latestVersion = versions.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())[0];
      const docContent = latestVersion?.markDown || "";
      const truncated = docContent.slice(0, 4000);

      const scoreNote = mapping.aiMatchScore !== null && mapping.aiMatchScore !== undefined
        ? ` [Individual AI score: ${mapping.aiMatchScore}%]` : "";
      docSummaries.push(`--- DOCUMENT: ${document.title} (${document.docType})${scoreNote} ---\n${truncated || "(No content available)"}`);
    }

    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const anthropic = new Anthropic({
      apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
    });

    const floorNote = maxIndividualScore > 0
      ? `\n\nCRITICAL SCORING RULE: The highest individual document score is ${maxIndividualScore}%. Your combined score MUST be at least ${maxIndividualScore}%. The combined score can only be EQUAL TO or HIGHER than the best individual document score — never lower. Additional documents can only ADD coverage on top of the best document, they cannot reduce it.`
      : "";

    const prompt = `You are a compliance analyst assessing the COMBINED coverage of a regulatory control across multiple policy documents.

REGULATORY CONTROL:
- Code: ${control.code}
- Title: ${control.title}
- Description: ${control.description || "N/A"}
- Suggested Evidence: ${control.evidence || "N/A"}

LINKED POLICY DOCUMENTS (${linkedMappings.length} total):
${docSummaries.join("\n\n")}

TASK: Assess how well ALL these documents TOGETHER cover the regulatory control. The combined score should reflect the ADDITIVE coverage — each document may cover different aspects of the control. Start from the best individual document's coverage and determine if other documents fill any remaining gaps.${floorNote}

Provide:
1. A combined match percentage (0-100) representing how comprehensively ALL documents together address the control
2. A brief rationale (2-3 sentences) explaining what aspects are well covered across the documents
3. Specific recommendations for what gaps remain. If fully covered, say "No further action needed."

Guidelines for scoring:
- 80-100%: The documents together directly and comprehensively address all aspects of the control
- 60-79%: The documents substantially cover the control but some specifics are missing
- 40-59%: The documents partially address the control; important gaps exist across all documents
- 20-39%: The documents touch on related topics but do not meaningfully address the control
- 0-19%: The documents have little to no relevance to the control

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

    if (maxIndividualScore > 0 && aiScore < maxIndividualScore) {
      aiScore = maxIndividualScore;
    }

    await db.update(schema.controls)
      .set({ combinedAiScore: aiScore, combinedAiRationale: aiRationale, combinedAiRecommendations: aiRecommendations })
      .where(eq(schema.controls.id, controlId));

    await db.update(schema.aiJobs).set({
      status: "completed",
      result: { controlId, combinedAiScore: aiScore, combinedAiRationale: aiRationale, combinedAiRecommendations: aiRecommendations },
      progressMessage: "Analysis complete",
      updatedAt: new Date(),
    }).where(eq(schema.aiJobs.id, jobId));
  } catch (err: any) {
    await db.update(schema.aiJobs).set({
      status: "failed",
      errorMessage: err.message || "AI coverage analysis failed",
      updatedAt: new Date(),
    }).where(eq(schema.aiJobs.id, jobId));
  }
}

// ============================================================
// AI PROCESSOR: map controls to document
// ============================================================
async function processAiMapControlsJob(jobId: string, docId: number) {
  try {
    await db.update(schema.aiJobs).set({
      status: "processing",
      progressMessage: "Loading document and controls...",
      updatedAt: new Date(),
    }).where(eq(schema.aiJobs.id, jobId));

    const document = await storage.getDocument(docId);
    if (!document) throw new Error("Document not found");

    const allVersions = await db.select().from(schema.documentVersions)
      .where(eq(schema.documentVersions.documentId, docId));
    const publishedVersion = allVersions.find((v) => v.status === "Published");
    if (!publishedVersion) throw new Error("No published version found");

    const docContent = publishedVersion.markDown || "";
    if (!docContent || docContent.length < 20) throw new Error("Published version has no content to analyse");

    const allControls = await storage.getControls();
    const existingMappings = await storage.getControlMappings();
    const existingDocMappings = existingMappings.filter((m) => m.documentId === docId);
    const aiVerifiedIds = new Set(
      existingDocMappings.filter((m) => m.aiMatchScore != null && m.aiMatchScore >= 60).map((m) => m.controlId)
    );
    const unmappedControls = allControls.filter((r) => !aiVerifiedIds.has(r.id));

    if (unmappedControls.length === 0) {
      await db.update(schema.aiJobs).set({
        status: "completed",
        result: { message: "All controls are already mapped", matched: 0, total: 0, mappings: [] },
        progressMessage: "All controls already mapped",
        updatedAt: new Date(),
      }).where(eq(schema.aiJobs.id, jobId));
      return;
    }

    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const anthropic = new Anthropic({
      apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
    });

    const truncatedContent = docContent.slice(0, 10000);
    const BATCH_SIZE = 25;
    const batches: typeof unmappedControls[] = [];
    for (let i = 0; i < unmappedControls.length; i += BATCH_SIZE) {
      batches.push(unmappedControls.slice(i, i + BATCH_SIZE));
    }

    const newMappings: Array<{ controlId: number; score: number; rationale: string; recommendations: string }> = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      await db.update(schema.aiJobs).set({
        progressMessage: `Analyzing batch ${i + 1} of ${batches.length}...`,
        updatedAt: new Date(),
      }).where(eq(schema.aiJobs.id, jobId));

      const controlList = batch.map((r) =>
        `ID:${r.id} | Code:${r.code} | Title:${r.title} | Description:${(r.description || "N/A").slice(0, 200)}`
      ).join("\n");

      const prompt = `You are a compliance analyst. Evaluate whether a policy document satisfies each of the following regulatory controls.

POLICY DOCUMENT:
- Title: ${document.title}
- Type: ${document.docType}
- Content (may be truncated):
${truncatedContent}

CONTROLS TO EVALUATE:
${controlList}

TASK: For EACH control above, assess how well the document addresses it. Return ONLY controls that score 60% or higher (meaningful coverage).

For each match, provide:
- id: the control ID number
- score: match percentage (60-100)
- rationale: 1-2 sentences on what the document covers
- recommendations: what would be needed to reach 100%

Respond in exactly this JSON format (array of matches only, omit controls below 60%):
[{"id": <number>, "score": <number>, "rationale": "<string>", "recommendations": "<string>"}]

If no controls match at 60% or above, return an empty array: []`;

      try {
        const message = await anthropic.messages.create({
          model: "claude-sonnet-4-5",
          max_tokens: 4000,
          messages: [{ role: "user", content: prompt }],
        });

        const responseText = message.content[0].type === "text" ? message.content[0].text : "";
        let parsed: any[] = [];
        try {
          const direct = JSON.parse(responseText);
          if (Array.isArray(direct)) parsed = direct;
        } catch {
          const jsonMatch = responseText.match(/\[[\s\S]*?\]/);
          if (jsonMatch) {
            try { parsed = JSON.parse(jsonMatch[0]); } catch { /* skip malformed batch */ }
          }
        }

        const batchIds = new Set(batch.map((r) => r.id));
        for (const item of parsed) {
          if (!item || typeof item !== "object") continue;
          const ctrlId = Number(item.id);
          const score = Math.min(100, Math.max(0, Math.round(Number(item.score) || 0)));
          if (score >= 60 && batchIds.has(ctrlId)) {
            newMappings.push({
              controlId: ctrlId,
              score,
              rationale: String(item.rationale || ""),
              recommendations: String(item.recommendations || ""),
            });
          }
        }
      } catch (batchErr: any) {
        console.error(`AI batch error:`, batchErr.message);
      }
    }

    const resultMappings: any[] = [];
    const existingByControl = new Map(existingDocMappings.map((m) => [m.controlId, m]));

    for (const match of newMappings) {
      const coverageStatus = match.score >= 80 ? "Covered" : "Partially Covered";
      const existing = existingByControl.get(match.controlId);

      if (existing) {
        await db.update(schema.controlMappings)
          .set({
            coverageStatus,
            rationale: match.rationale,
            aiMatchScore: match.score,
            aiMatchRationale: match.rationale,
            aiMatchRecommendations: match.recommendations,
          })
          .where(eq(schema.controlMappings.id, existing.id));
        resultMappings.push({ ...existing, coverageStatus, aiMatchScore: match.score });
      } else {
        const created = await storage.createControlMapping({
          controlId: match.controlId,
          documentId: docId,
          coverageStatus,
          rationale: match.rationale,
        });
        await db.update(schema.controlMappings)
          .set({
            aiMatchScore: match.score,
            aiMatchRationale: match.rationale,
            aiMatchRecommendations: match.recommendations,
          })
          .where(eq(schema.controlMappings.id, created.id));
        resultMappings.push({ ...created, aiMatchScore: match.score });
      }
    }

    const matchedControlIds = new Set(newMappings.map((m) => m.controlId));
    let removedCount = 0;
    for (const existing of existingDocMappings) {
      if (!matchedControlIds.has(existing.controlId) && existing.aiMatchScore == null && existing.rationale?.startsWith("Auto-mapped")) {
        await storage.deleteControlMapping(existing.id);
        removedCount++;
      }
    }

    await db.update(schema.aiJobs).set({
      status: "completed",
      result: {
        matched: resultMappings.length,
        total: unmappedControls.length,
        removed: removedCount,
        mappings: resultMappings,
      },
      progressMessage: `Mapped ${resultMappings.length} controls`,
      updatedAt: new Date(),
    }).where(eq(schema.aiJobs.id, jobId));
  } catch (err: any) {
    await db.update(schema.aiJobs).set({
      status: "failed",
      errorMessage: err.message || "AI auto-map failed",
      updatedAt: new Date(),
    }).where(eq(schema.aiJobs.id, jobId));
  }
}
