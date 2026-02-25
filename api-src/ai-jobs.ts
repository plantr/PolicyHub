/**
 * Serverless function: /api/ai-jobs
 * AI job status polling and dispatch endpoints.
 *
 * URL convention:
 *   GET    /api/ai-jobs?jobId=JOBID          → get job status
 *   POST   /api/ai-jobs?action=coverage&controlId=N → AI combined coverage (dispatch-and-fire)
 *   POST   /api/ai-jobs?action=map-controls&documentId=N → AI auto-map document to controls (dispatch-and-fire)
 *   POST   /api/ai-jobs?action=map-all-documents[&sourceId=N] → AI auto-map all documents to controls (dispatch-and-fire)
 *   POST   /api/ai-jobs?action=bulk-coverage&mode=all|gaps → AI coverage for all controls (dispatch-and-fire)
 *   POST   /api/ai-jobs?action=pdf-to-markdown&versionId=N → Convert PDF attachment to markdown (dispatch-and-fire)
 *   POST   /api/ai-jobs?action=bulk-pdf-to-markdown → Convert all published PDFs to markdown (dispatch-and-fire)
 *
 * All POST endpoints return { jobId, status: 'pending' } immediately
 * and process in the background via fire-and-forget.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { waitUntil } from "@vercel/functions";
import { handleCors } from "./_shared/cors";
import { sendError } from "./_shared/handler";
import { storage } from "../server/storage";
import { db } from "../server/db";
import { eq, and, ne, inArray, desc } from "drizzle-orm";
import * as schema from "../shared/schema";
import { createSignedDownloadUrl, bucketName } from "../server/storage-supabase";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  try {
    const actionRaw = req.query.action;
    const action = Array.isArray(actionRaw) ? actionRaw[0] : actionRaw;

    // === JOB STATUS POLLING ===
    if (req.method === "GET" && action !== "active") {
      const jobIdRaw = req.query.jobId;
      const jobId = Array.isArray(jobIdRaw) ? jobIdRaw[0] : jobIdRaw;
      if (!jobId) return res.status(400).json({ message: "Missing jobId query parameter" });

      const job = await db.select().from(schema.aiJobs)
        .where(eq(schema.aiJobs.id, jobId)).then(r => r[0]);
      if (!job) return res.status(404).json({ message: "Job not found" });
      return res.json(job);
    }

    // === GET ACTIVE JOB (for restore-on-refresh) ===
    if (req.method === "GET" && action === "active") {
      const jobTypeRaw = req.query.jobType;
      const jobType = Array.isArray(jobTypeRaw) ? jobTypeRaw[0] : jobTypeRaw;
      if (!jobType) return res.status(400).json({ message: "Missing jobType query parameter" });

      const [activeJob] = await db.select().from(schema.aiJobs)
        .where(and(
          eq(schema.aiJobs.jobType, jobType),
          inArray(schema.aiJobs.status, ["pending", "processing"]),
        ))
        .orderBy(desc(schema.aiJobs.createdAt))
        .limit(1);

      return res.json(activeJob ?? null);
    }

    // === CANCEL JOB ===
    if (req.method === "POST" && action === "cancel") {
      const jobIdRaw = req.query.jobId;
      const jobId = Array.isArray(jobIdRaw) ? jobIdRaw[0] : jobIdRaw;
      if (!jobId) return res.status(400).json({ message: "Missing jobId query parameter" });

      await db.update(schema.aiJobs).set({
        status: "cancelled",
        progressMessage: "Cancelled by user",
        updatedAt: new Date(),
      }).where(and(
        eq(schema.aiJobs.id, jobId),
        inArray(schema.aiJobs.status, ["pending", "processing"]),
      ));

      return res.json({ success: true });
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

      // Fire-and-forget (waitUntil keeps the function alive after response)
      waitUntil(processAiCoverageJob(job.id, controlId).catch(err => {
        console.error("AI coverage job processing error:", err);
      }));

      return res.json({ jobId: job.id, status: "pending" });
    }

    // === AI AUTO-MAP DOCUMENT TO CONTROLS (dispatch-and-fire) ===
    if (req.method === "POST" && action === "map-controls") {
      const documentIdRaw = req.query.documentId;
      const docId = Number(Array.isArray(documentIdRaw) ? documentIdRaw[0] : documentIdRaw);
      if (!docId || isNaN(docId)) {
        return res.status(400).json({ message: "Missing documentId query parameter" });
      }

      // Optional framework filter: comma-separated source IDs
      const sourceIdsRaw = req.query.sourceIds;
      const sourceIdsStr = Array.isArray(sourceIdsRaw) ? sourceIdsRaw[0] : sourceIdsRaw;
      const sourceIds = sourceIdsStr
        ? sourceIdsStr.split(",").map(Number).filter((n) => !isNaN(n) && n > 0)
        : undefined;

      const document = await storage.getDocument(docId);
      if (!document) return res.status(404).json({ message: "Document not found" });

      const allVersions = await db.select().from(schema.documentVersions)
        .where(eq(schema.documentVersions.documentId, docId));
      // Prefer published version, fall back to latest version with content
      const targetVersion = allVersions.find((v) => v.status === "Published")
        || [...allVersions].sort((a, b) => b.versionNumber.localeCompare(a.versionNumber)).find((v) => (v.content || "").length >= 20);
      if (!targetVersion) return res.status(400).json({ message: "No version with content found" });

      const docContent = targetVersion.content || "";
      if (!docContent || docContent.length < 20) {
        return res.status(400).json({ message: "Version has no content to analyse" });
      }

      const allControls = (await storage.getControls()).filter((c) => c.applicable !== false);
      const sourceIdSet = sourceIds ? new Set(sourceIds) : undefined;
      const targetControls = sourceIdSet
        ? allControls.filter((c) => sourceIdSet.has(c.sourceId))
        : allControls;
      const existingMappings = await storage.getControlMappings();
      const existingDocMappings = existingMappings.filter((m) => m.documentId === docId);
      const aiVerifiedIds = new Set(
        existingDocMappings
          .filter((m) => m.aiMatchScore != null && m.aiMatchScore >= 60)
          .map((m) => m.controlId)
      );
      const unmappedControls = targetControls.filter((r) => !aiVerifiedIds.has(r.id));

      if (unmappedControls.length === 0) {
        await db.update(schema.documents)
          .set({ aiReviewedAt: new Date() })
          .where(eq(schema.documents.id, docId));
        return res.json({ message: "All controls are already mapped", matched: 0, total: 0, mappings: [] });
      }

      const [job] = await db.insert(schema.aiJobs).values({
        jobType: "ai-map-controls",
        entityId: docId,
        status: "pending",
        progressMessage: "Queued for analysis...",
      }).returning();

      // Fire-and-forget (waitUntil keeps the function alive after response)
      waitUntil(processAiMapControlsJob(job.id, docId, sourceIds).catch(err => {
        console.error("AI map-controls job processing error:", err);
      }));

      return res.json({ jobId: job.id, status: "pending" });
    }

    // === AI BULK COVERAGE FOR ALL CONTROLS (dispatch-and-fire) ===
    if (req.method === "POST" && action === "bulk-coverage") {
      const modeRaw = req.query.mode;
      const mode = Array.isArray(modeRaw) ? modeRaw[0] : modeRaw; // "all" or "gaps"

      const allControls = (await storage.getControls()).filter((c) => c.applicable !== false);
      const allMappings = await storage.getControlMappings();

      // Build lookup: controlId → has linked documents
      const controlsWithDocs = new Set<number>();
      for (const m of allMappings) {
        if (m.documentId) controlsWithDocs.add(m.controlId);
      }

      let targetControls = allControls.filter((c) => controlsWithDocs.has(c.id));
      if (mode === "gaps") {
        targetControls = targetControls.filter((c) => c.combinedAiScore == null || c.combinedAiScore < 100);
      }

      if (targetControls.length === 0) {
        return res.json({ message: "No eligible controls to analyse", total: 0 });
      }

      const [job] = await db.insert(schema.aiJobs).values({
        jobType: "ai-bulk-coverage",
        entityId: 0,
        status: "pending",
        progressMessage: `Queued: ${targetControls.length} controls to analyse...`,
      }).returning();

      // Fire-and-forget (waitUntil keeps the function alive after response)
      waitUntil(processAiBulkCoverageJob(job.id, targetControls.map((c) => c.id)).catch(err => {
        console.error("AI bulk-coverage job processing error:", err);
      }));

      return res.json({ jobId: job.id, status: "pending", total: targetControls.length });
    }

    // === AI AUTO-MAP ALL DOCUMENTS TO CONTROLS (dispatch-and-fire) ===
    if (req.method === "POST" && action === "map-all-documents") {
      const sourceIdRaw = req.query.sourceId;
      const sourceId = sourceIdRaw ? Number(Array.isArray(sourceIdRaw) ? sourceIdRaw[0] : sourceIdRaw) : undefined;
      const modeRaw = req.query.mode;
      const mode = Array.isArray(modeRaw) ? modeRaw[0] : modeRaw; // "unmapped" or undefined (full refresh)

      const requestedIds: number[] | undefined = req.body?.documentIds;

      const allDocuments = await storage.getDocuments();
      const allVersions = await db.select().from(schema.documentVersions);
      // For each document, prefer published version, fall back to latest version with content
      const bestByDoc = new Map<number, typeof allVersions[0]>();
      const versionsByDoc = new Map<number, typeof allVersions>();
      for (const v of allVersions) {
        if (!versionsByDoc.has(v.documentId)) versionsByDoc.set(v.documentId, []);
        versionsByDoc.get(v.documentId)!.push(v);
      }
      for (const [docId, versions] of versionsByDoc) {
        const published = versions.find((v) => v.status === "Published" && (v.content || "").length >= 20);
        const latest = [...versions].sort((a, b) => b.versionNumber.localeCompare(a.versionNumber)).find((v) => (v.content || "").length >= 20);
        const best = published || latest;
        if (best) bestByDoc.set(docId, best);
      }

      // Scope to requested document IDs if provided (from grid filters)
      const candidateDocs = requestedIds?.length
        ? allDocuments.filter((d) => requestedIds.includes(d.id))
        : allDocuments;
      let docsWithContent = candidateDocs.filter((d) => bestByDoc.has(d.id));
      if (mode === "unmapped") {
        docsWithContent = docsWithContent.filter((d) => !d.aiReviewedAt);
      }
      if (docsWithContent.length === 0) {
        return res.json({ message: "No documents with content found", matched: 0 });
      }

      const [job] = await db.insert(schema.aiJobs).values({
        jobType: "ai-map-all-documents",
        entityId: sourceId ?? 0,
        status: "pending",
        progressMessage: `Queued: ${docsWithContent.length} documents to process...`,
      }).returning();

      // Fire-and-forget (waitUntil keeps the function alive after response)
      waitUntil(processAiMapAllDocumentsJob(job.id, docsWithContent.map((d) => d.id), sourceId).catch(err => {
        console.error("AI map-all-documents job processing error:", err);
      }));

      return res.json({ jobId: job.id, status: "pending" });
    }

    // === AI PDF-TO-MARKDOWN (dispatch-and-fire) ===
    if (req.method === "POST" && action === "pdf-to-markdown") {
      const versionIdRaw = req.query.versionId;
      const versionId = Number(Array.isArray(versionIdRaw) ? versionIdRaw[0] : versionIdRaw);
      if (!versionId || isNaN(versionId)) {
        return res.status(400).json({ message: "Missing versionId query parameter" });
      }

      const version = await storage.getDocumentVersion(versionId);
      if (!version) return res.status(404).json({ message: "Version not found" });
      if (!version.pdfS3Key) return res.status(400).json({ message: "No PDF attached to this version" });

      const [job] = await db.insert(schema.aiJobs).values({
        jobType: "ai-pdf-to-markdown",
        entityId: versionId,
        status: "pending",
        progressMessage: "Queued for conversion...",
      }).returning();

      // Fire-and-forget (waitUntil keeps the function alive after response)
      waitUntil(processAiPdfToMarkdownJob(job.id, versionId).catch(err => {
        console.error("AI pdf-to-markdown job processing error:", err);
      }));

      return res.json({ jobId: job.id, status: "pending" });
    }

    // === AI BULK PDF-TO-MARKDOWN (dispatch-and-fire) ===
    if (req.method === "POST" && action === "bulk-pdf-to-markdown") {
      const allVersions = await db.select().from(schema.documentVersions);
      const eligibleVersions = allVersions.filter(
        (v) => v.status === "Published" && v.pdfS3Key && v.pdfS3Key.length > 0,
      );

      if (eligibleVersions.length === 0) {
        return res.json({ message: "No published versions with PDFs found", total: 0 });
      }

      const [job] = await db.insert(schema.aiJobs).values({
        jobType: "ai-bulk-pdf-to-markdown",
        entityId: 0,
        status: "pending",
        progressMessage: `Queued: ${eligibleVersions.length} documents to convert...`,
      }).returning();

      // Fire-and-forget (waitUntil keeps the function alive after response)
      waitUntil(processAiBulkPdfToMarkdownJob(job.id, eligibleVersions.map((v) => v.id)).catch(err => {
        console.error("AI bulk-pdf-to-markdown job processing error:", err);
      }));

      return res.json({ jobId: job.id, status: "pending", total: eligibleVersions.length });
    }

    return res.status(405).json({ message: "Method not allowed" });
  } catch (err) {
    sendError(res, err);
  }
}

// ============================================================
// Helper: check if job was cancelled
// ============================================================
async function isJobCancelled(jobId: string): Promise<boolean> {
  const [job] = await db.select({ status: schema.aiJobs.status })
    .from(schema.aiJobs).where(eq(schema.aiJobs.id, jobId));
  return job?.status === "cancelled";
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
      const docContent = latestVersion?.content || "";
      const truncated = docContent.slice(0, 4000);

      const scoreNote = mapping.aiMatchScore !== null && mapping.aiMatchScore !== undefined
        ? ` [Individual AI score: ${mapping.aiMatchScore}%]` : "";
      docSummaries.push(`--- DOCUMENT: ${document.title} (${document.docType})${scoreNote} ---\n${truncated || "(No content available)"}`);
    }

    if (await isJobCancelled(jobId)) return;

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
    }).where(and(eq(schema.aiJobs.id, jobId), ne(schema.aiJobs.status, "cancelled")));
  } catch (err: any) {
    await db.update(schema.aiJobs).set({
      status: "failed",
      errorMessage: err.message || "AI coverage analysis failed",
      updatedAt: new Date(),
    }).where(and(eq(schema.aiJobs.id, jobId), ne(schema.aiJobs.status, "cancelled")));
  }
}

// ============================================================
// AI PROCESSOR: map controls to document
// ============================================================
async function processAiMapControlsJob(jobId: string, docId: number, sourceIds?: number[]) {
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
    // Prefer published version, fall back to latest version with content
    const targetVersion = allVersions.find((v) => v.status === "Published")
      || [...allVersions].sort((a, b) => b.versionNumber.localeCompare(a.versionNumber)).find((v) => (v.content || "").length >= 20);
    if (!targetVersion) throw new Error("No version with content found");

    const docContent = targetVersion.content || "";
    if (!docContent || docContent.length < 20) throw new Error("Version has no content to analyse");

    const allControls = (await storage.getControls()).filter((c) => c.applicable !== false);
    const sourceIdSet = sourceIds ? new Set(sourceIds) : undefined;
    const targetControls = sourceIdSet
      ? allControls.filter((c) => sourceIdSet.has(c.sourceId))
      : allControls;
    const existingMappings = await storage.getControlMappings();
    const existingDocMappings = existingMappings.filter((m) => m.documentId === docId);
    const aiVerifiedIds = new Set(
      existingDocMappings.filter((m) => m.aiMatchScore != null && m.aiMatchScore >= 60).map((m) => m.controlId)
    );
    const unmappedControls = targetControls.filter((r) => !aiVerifiedIds.has(r.id));

    if (unmappedControls.length === 0) {
      await db.update(schema.documents)
        .set({ aiReviewedAt: new Date() })
        .where(eq(schema.documents.id, docId));
      await db.update(schema.aiJobs).set({
        status: "completed",
        result: { message: "All controls are already mapped", matched: 0, total: 0, mappings: [] },
        progressMessage: "All controls already mapped",
        updatedAt: new Date(),
      }).where(and(eq(schema.aiJobs.id, jobId), ne(schema.aiJobs.status, "cancelled")));
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
      if (await isJobCancelled(jobId)) return;
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

    await db.update(schema.aiJobs).set({
      progressMessage: `Saving ${newMappings.length} mappings...`,
      updatedAt: new Date(),
    }).where(eq(schema.aiJobs.id, jobId));

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
      if (!matchedControlIds.has(existing.controlId) && existing.aiMatchScore == null) {
        await storage.deleteControlMapping(existing.id);
        removedCount++;
      }
    }

    await db.update(schema.documents)
      .set({ aiReviewedAt: new Date() })
      .where(eq(schema.documents.id, docId));

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
    }).where(and(eq(schema.aiJobs.id, jobId), ne(schema.aiJobs.status, "cancelled")));
  } catch (err: any) {
    await db.update(schema.aiJobs).set({
      status: "failed",
      errorMessage: err.message || "AI auto-map failed",
      updatedAt: new Date(),
    }).where(and(eq(schema.aiJobs.id, jobId), ne(schema.aiJobs.status, "cancelled")));
  }
}

// ============================================================
// AI PROCESSOR: map ALL documents to controls (bulk)
// ============================================================
async function processAiMapAllDocumentsJob(jobId: string, docIds: number[], sourceId?: number) {
  try {
    await db.update(schema.aiJobs).set({
      status: "processing",
      progressMessage: `Processing 0 of ${docIds.length} documents...`,
      updatedAt: new Date(),
    }).where(eq(schema.aiJobs.id, jobId));

    const allControls = (await storage.getControls()).filter((c) => c.applicable !== false);
    const targetControls = sourceId
      ? allControls.filter((c) => c.sourceId === sourceId)
      : allControls;

    if (targetControls.length === 0) {
      await db.update(schema.aiJobs).set({
        status: "completed",
        result: { message: "No controls found", documentsProcessed: 0, totalMapped: 0 },
        progressMessage: "No controls found to map",
        updatedAt: new Date(),
      }).where(and(eq(schema.aiJobs.id, jobId), ne(schema.aiJobs.status, "cancelled")));
      return;
    }

    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const anthropic = new Anthropic({
      apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
    });

    let totalMapped = 0;

    for (let di = 0; di < docIds.length; di++) {
      if (await isJobCancelled(jobId)) return;
      const docId = docIds[di];

      await db.update(schema.aiJobs).set({
        progressMessage: `Processing document ${di + 1} of ${docIds.length}...`,
        updatedAt: new Date(),
      }).where(eq(schema.aiJobs.id, jobId));

      const document = await storage.getDocument(docId);
      if (!document) continue;

      const allVersions = await db.select().from(schema.documentVersions)
        .where(eq(schema.documentVersions.documentId, docId));
      // Prefer published version, fall back to latest version with content
      const targetVersion = allVersions.find((v) => v.status === "Published")
        || [...allVersions].sort((a, b) => b.versionNumber.localeCompare(a.versionNumber)).find((v) => (v.content || "").length >= 20);
      if (!targetVersion) continue;

      const docContent = targetVersion.content || "";
      if (!docContent || docContent.length < 20) continue;

      const existingMappings = await storage.getControlMappings();
      const existingDocMappings = existingMappings.filter((m) => m.documentId === docId);
      const aiVerifiedIds = new Set(
        existingDocMappings.filter((m) => m.aiMatchScore != null && m.aiMatchScore >= 60).map((m) => m.controlId)
      );
      const unmappedControls = targetControls.filter((c) => !aiVerifiedIds.has(c.id));
      if (unmappedControls.length === 0) {
        await db.update(schema.documents)
          .set({ aiReviewedAt: new Date() })
          .where(eq(schema.documents.id, docId));
        continue;
      }

      const truncatedContent = docContent.slice(0, 10000);
      const BATCH_SIZE = 25;
      const batches: typeof unmappedControls[] = [];
      for (let i = 0; i < unmappedControls.length; i += BATCH_SIZE) {
        batches.push(unmappedControls.slice(i, i + BATCH_SIZE));
      }

      const newMappings: Array<{ controlId: number; score: number; rationale: string; recommendations: string }> = [];

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];

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
          console.error(`AI batch error (doc ${docId}):`, batchErr.message);
        }
      }

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
        }
        totalMapped++;
      }

      await db.update(schema.documents)
        .set({ aiReviewedAt: new Date() })
        .where(eq(schema.documents.id, docId));
    }

    await db.update(schema.aiJobs).set({
      status: "completed",
      result: {
        documentsProcessed: docIds.length,
        totalMapped,
      },
      progressMessage: `Mapped ${totalMapped} control-document pairs across ${docIds.length} documents`,
      updatedAt: new Date(),
    }).where(and(eq(schema.aiJobs.id, jobId), ne(schema.aiJobs.status, "cancelled")));
  } catch (err: any) {
    await db.update(schema.aiJobs).set({
      status: "failed",
      errorMessage: err.message || "AI map-all-documents failed",
      updatedAt: new Date(),
    }).where(and(eq(schema.aiJobs.id, jobId), ne(schema.aiJobs.status, "cancelled")));
  }
}

// ============================================================
// AI PROCESSOR: bulk coverage for multiple controls
// ============================================================
async function processAiBulkCoverageJob(jobId: string, controlIds: number[]) {
  try {
    await db.update(schema.aiJobs).set({
      status: "processing",
      progressMessage: `Analysing control 1 of ${controlIds.length}...`,
      updatedAt: new Date(),
    }).where(eq(schema.aiJobs.id, jobId));

    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const anthropic = new Anthropic({
      apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
    });

    let completed = 0;
    let failed = 0;

    for (let i = 0; i < controlIds.length; i++) {
      if (await isJobCancelled(jobId)) return;
      const controlId = controlIds[i];

      await db.update(schema.aiJobs).set({
        progressMessage: `Analysing control ${i + 1} of ${controlIds.length}...`,
        updatedAt: new Date(),
      }).where(eq(schema.aiJobs.id, jobId));

      try {
        const control = await storage.getControl(controlId);
        if (!control) { failed++; continue; }

        const allMappings = await storage.getControlMappings();
        const linkedMappings = allMappings.filter((m) => m.controlId === controlId && m.documentId);
        if (linkedMappings.length === 0) { failed++; continue; }

        const docSummaries: string[] = [];
        let maxIndividualScore = 0;
        for (const mapping of linkedMappings) {
          const document = await storage.getDocument(mapping.documentId!);
          if (!document) continue;

          if (mapping.aiMatchScore != null && mapping.aiMatchScore > maxIndividualScore) {
            maxIndividualScore = mapping.aiMatchScore;
          }

          const versions = await db.select().from(schema.documentVersions)
            .where(eq(schema.documentVersions.documentId, mapping.documentId!));
          const latestVersion = versions.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())[0];
          const docContent = latestVersion?.content || "";
          const truncated = docContent.slice(0, 4000);

          const scoreNote = mapping.aiMatchScore != null
            ? ` [Individual AI score: ${mapping.aiMatchScore}%]` : "";
          docSummaries.push(`--- DOCUMENT: ${document.title} (${document.docType})${scoreNote} ---\n${truncated || "(No content available)"}`);
        }

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

        completed++;
      } catch (err: any) {
        console.error(`Bulk coverage error for control ${controlId}:`, err.message);
        failed++;
      }
    }

    await db.update(schema.aiJobs).set({
      status: "completed",
      result: { totalControls: controlIds.length, completed, failed },
      progressMessage: `Completed: ${completed} analysed, ${failed} skipped`,
      updatedAt: new Date(),
    }).where(and(eq(schema.aiJobs.id, jobId), ne(schema.aiJobs.status, "cancelled")));
  } catch (err: any) {
    await db.update(schema.aiJobs).set({
      status: "failed",
      errorMessage: err.message || "AI bulk coverage failed",
      updatedAt: new Date(),
    }).where(and(eq(schema.aiJobs.id, jobId), ne(schema.aiJobs.status, "cancelled")));
  }
}

// ============================================================
// AI PROCESSOR: PDF-to-markdown conversion
// ============================================================
async function processAiPdfToMarkdownJob(jobId: string, versionId: number) {
  try {
    // Step 1 (20%): Fetch PDF from Supabase Storage
    await db.update(schema.aiJobs).set({
      status: "processing",
      progressMessage: "Fetching PDF from storage...",
      result: { progress: 20 },
      updatedAt: new Date(),
    }).where(eq(schema.aiJobs.id, jobId));

    const version = await storage.getDocumentVersion(versionId);
    if (!version) throw new Error("Version not found");
    if (!version.pdfS3Key) throw new Error("No PDF attached to this version");

    const doc = await storage.getDocument(version.documentId);
    const buId = doc?.businessUnitId ?? null;

    const signedUrl = await createSignedDownloadUrl(buId, version.pdfS3Key);
    const response = await fetch(signedUrl);
    if (!response.ok) throw new Error(`Failed to fetch PDF from storage: ${response.status}`);
    const pdfBuffer = Buffer.from(await response.arrayBuffer());
    const pdfBase64 = pdfBuffer.toString("base64");

    if (await isJobCancelled(jobId)) return;

    // Step 2 (50%): Send to Claude API for markdown conversion
    await db.update(schema.aiJobs).set({
      progressMessage: "Converting PDF with AI...",
      result: { progress: 50 },
      updatedAt: new Date(),
    }).where(eq(schema.aiJobs.id, jobId));

    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const anthropic = new Anthropic({
      apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
    });

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 16000,
      messages: [{
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
          },
          {
            type: "text",
            text: `Convert this PDF document into clean, well-structured markdown. Follow these rules exactly:

1. Document title as a single # heading (ALL CAPS as it appears)
2. Use --- horizontal rules to separate major sections
3. Document metadata (version history, distribution, properties) must be formatted as markdown tables
4. Include a Table of Contents section with numbered entries and sub-entries using indentation
5. Main sections use ## headings (e.g. ## 1. Introduction)
6. Sub-sections use ### headings (e.g. ### 1.1 Document Definition)
7. Sub-sub-sections use #### headings (e.g. #### 1.3.1 Applicability to Personnel)
8. Keep the original section numbering in the headings
9. Bullet lists use - prefix with proper spacing
10. Any tabular data (compliance criteria, glossary, etc.) must be formatted as markdown tables
11. Paragraphs should be separated by blank lines
12. Preserve all content faithfully — do not summarise or omit anything
13. Use --- horizontal rules between top-level sections

Return ONLY the markdown content, no code fences or explanation.`,
          },
        ],
      }],
    });

    const markdown = message.content[0].type === "text" ? message.content[0].text : "";

    if (await isJobCancelled(jobId)) return;

    // Step 3 (90%): Save result
    await db.update(schema.aiJobs).set({
      progressMessage: "Finalising...",
      result: { progress: 90, markdown },
      updatedAt: new Date(),
    }).where(eq(schema.aiJobs.id, jobId));

    // Step 4 (100%): Complete
    await db.update(schema.aiJobs).set({
      status: "completed",
      result: { progress: 100, markdown },
      progressMessage: "Conversion complete",
      updatedAt: new Date(),
    }).where(and(eq(schema.aiJobs.id, jobId), ne(schema.aiJobs.status, "cancelled")));
  } catch (err: any) {
    await db.update(schema.aiJobs).set({
      status: "failed",
      errorMessage: err.message || "PDF-to-markdown conversion failed",
      updatedAt: new Date(),
    }).where(and(eq(schema.aiJobs.id, jobId), ne(schema.aiJobs.status, "cancelled")));
  }
}

// ============================================================
// AI PROCESSOR: bulk PDF-to-markdown conversion
// ============================================================
async function processAiBulkPdfToMarkdownJob(jobId: string, versionIds: number[]) {
  try {
    await db.update(schema.aiJobs).set({
      status: "processing",
      progressMessage: `Converting document 1 of ${versionIds.length}...`,
      updatedAt: new Date(),
    }).where(eq(schema.aiJobs.id, jobId));

    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const anthropic = new Anthropic({
      apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
    });

    let converted = 0;
    let skipped = 0;

    for (let i = 0; i < versionIds.length; i++) {
      if (await isJobCancelled(jobId)) return;
      const versionId = versionIds[i];

      await db.update(schema.aiJobs).set({
        progressMessage: `Converting document ${i + 1} of ${versionIds.length}...`,
        updatedAt: new Date(),
      }).where(eq(schema.aiJobs.id, jobId));

      try {
        const version = await storage.getDocumentVersion(versionId);
        if (!version || !version.pdfS3Key) { skipped++; continue; }

        const doc = await storage.getDocument(version.documentId);
        const buId = doc?.businessUnitId ?? null;

        const signedUrl = await createSignedDownloadUrl(buId, version.pdfS3Key);
        const response = await fetch(signedUrl);
        if (!response.ok) { skipped++; continue; }
        const pdfBuffer = Buffer.from(await response.arrayBuffer());
        const pdfBase64 = pdfBuffer.toString("base64");

        if (await isJobCancelled(jobId)) return;

        const message = await anthropic.messages.create({
          model: "claude-sonnet-4-5",
          max_tokens: 16000,
          messages: [{
            role: "user",
            content: [
              {
                type: "document",
                source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
              },
              {
                type: "text",
                text: `Convert this PDF document into clean, well-structured markdown. Follow these rules exactly:

1. Document title as a single # heading (ALL CAPS as it appears)
2. Use --- horizontal rules to separate major sections
3. Document metadata (version history, distribution, properties) must be formatted as markdown tables
4. Include a Table of Contents section with numbered entries and sub-entries using indentation
5. Main sections use ## headings (e.g. ## 1. Introduction)
6. Sub-sections use ### headings (e.g. ### 1.1 Document Definition)
7. Sub-sub-sections use #### headings (e.g. #### 1.3.1 Applicability to Personnel)
8. Keep the original section numbering in the headings
9. Bullet lists use - prefix with proper spacing
10. Any tabular data (compliance criteria, glossary, etc.) must be formatted as markdown tables
11. Paragraphs should be separated by blank lines
12. Preserve all content faithfully — do not summarise or omit anything
13. Use --- horizontal rules between top-level sections

Return ONLY the markdown content, no code fences or explanation.`,
              },
            ],
          }],
        });

        const markdown = message.content[0].type === "text" ? message.content[0].text : "";

        if (markdown && markdown.length > 0) {
          await db.update(schema.documentVersions)
            .set({ content: markdown })
            .where(eq(schema.documentVersions.id, versionId));
          converted++;
        } else {
          skipped++;
        }
      } catch (err: any) {
        console.error(`Bulk PDF-to-markdown error for version ${versionId}:`, err.message);
        skipped++;
      }
    }

    await db.update(schema.aiJobs).set({
      status: "completed",
      result: { total: versionIds.length, converted, skipped },
      progressMessage: `Converted ${converted} of ${versionIds.length} documents`,
      updatedAt: new Date(),
    }).where(and(eq(schema.aiJobs.id, jobId), ne(schema.aiJobs.status, "cancelled")));
  } catch (err: any) {
    await db.update(schema.aiJobs).set({
      status: "failed",
      errorMessage: err.message || "Bulk PDF-to-markdown conversion failed",
      updatedAt: new Date(),
    }).where(and(eq(schema.aiJobs.id, jobId), ne(schema.aiJobs.status, "cancelled")));
  }
}
