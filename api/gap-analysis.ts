/**
 * Serverless function: /api/gap-analysis
 * Gap analysis refresh and AI-powered auto-mapping.
 *
 * URL convention:
 *   GET    /api/gap-analysis?action=refresh     → run gap analysis refresh
 *   POST   /api/gap-analysis?action=auto-map    → keyword-based auto-mapping
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

    // === GAP ANALYSIS REFRESH ===
    if (req.method === "GET" && action === "refresh") {
      const allRequirements = await storage.getRequirements();
      const allMappings = await storage.getRequirementMappings();
      const allDocuments = await storage.getDocuments();
      const allSources = await storage.getRegulatorySources();
      const allBusinessUnits = await storage.getBusinessUnits();
      const allProfiles = await storage.getRegulatoryProfiles();
      const allVersions = await db.select().from(schema.documentVersions);

      const latestVersionMarkdown = new Map<number, string>();
      for (const v of allVersions) {
        if (!v.markDown) continue;
        latestVersionMarkdown.set(v.documentId, v.markDown);
      }

      const sourceMap = new Map(allSources.map((s) => [s.id, s]));
      const docMap = new Map(allDocuments.map((d) => [d.id, d]));
      const reqMap = new Map(allRequirements.map((r) => [r.id, r]));
      const buMap = new Map(allBusinessUnits.map((b) => [b.id, b]));

      const buEnabledSources = new Map<number, Set<number>>();
      const globalEnabledSourceIds = new Set<number>();
      for (const profile of allProfiles) {
        if (!profile.enabled) continue;
        globalEnabledSourceIds.add(profile.sourceId);
        if (!buEnabledSources.has(profile.businessUnitId)) {
          buEnabledSources.set(profile.businessUnitId, new Set());
        }
        buEnabledSources.get(profile.businessUnitId)!.add(profile.sourceId);
      }

      const applicableRequirements = allRequirements.filter((r) => globalEnabledSourceIds.has(r.sourceId));
      const mappedReqIds = new Set(allMappings.map((m) => m.requirementId));
      const unmappedRequirements = applicableRequirements
        .filter((r) => !mappedReqIds.has(r.id))
        .map((r) => ({
          requirementId: r.id,
          code: r.code,
          title: r.title,
          category: r.category,
          sourceId: r.sourceId,
          sourceName: sourceMap.get(r.sourceId)?.shortName ?? `Source #${r.sourceId}`,
          article: r.article,
        }));

      const perBuGaps: Array<{
        businessUnitId: number;
        businessUnitName: string;
        requirementId: number;
        code: string;
        title: string;
        sourceName: string;
      }> = [];

      for (const [buId, enabledSources] of Array.from(buEnabledSources.entries())) {
        const buName = buMap.get(buId)?.name ?? `BU #${buId}`;
        const buApplicableReqs = allRequirements.filter((r) => enabledSources.has(r.sourceId));
        const buMappedReqIds = new Set(
          allMappings
            .filter((m) => m.businessUnitId === buId || m.businessUnitId === null)
            .map((m) => m.requirementId)
        );
        for (const req of buApplicableReqs) {
          if (!buMappedReqIds.has(req.id)) {
            perBuGaps.push({
              businessUnitId: buId,
              businessUnitName: buName,
              requirementId: req.id,
              code: req.code,
              title: req.title,
              sourceName: sourceMap.get(req.sourceId)?.shortName ?? `Source #${req.sourceId}`,
            });
          }
        }
      }

      const overStrictItems: Array<{
        documentId: number;
        documentTitle: string;
        requirementId: number;
        requirementCode: string;
        requirementTitle: string;
        sourceName: string;
        businessUnitId: number | null;
        businessUnitName: string;
        reason: string;
      }> = [];

      for (const mapping of allMappings) {
        const req = reqMap.get(mapping.requirementId);
        if (!req) continue;
        const mappingBuId = mapping.businessUnitId;
        if (mappingBuId) {
          const buSources = buEnabledSources.get(mappingBuId);
          if (!buSources || !buSources.has(req.sourceId)) {
            const doc = docMap.get(mapping.documentId);
            const src = sourceMap.get(req.sourceId);
            const bu = buMap.get(mappingBuId);
            overStrictItems.push({
              documentId: mapping.documentId,
              documentTitle: doc?.title ?? `Doc #${mapping.documentId}`,
              requirementId: req.id,
              requirementCode: req.code,
              requirementTitle: req.title,
              sourceName: src?.shortName ?? `Source #${req.sourceId}`,
              businessUnitId: mappingBuId,
              businessUnitName: bu?.name ?? `BU #${mappingBuId}`,
              reason: `Source "${src?.shortName ?? req.sourceId}" is not enabled in ${bu?.name ?? "this business unit"}'s regulatory profile`,
            });
          }
        }
      }

      function extractKeyPhrases(text: string): string[] {
        const stopWords = new Set(["the", "a", "an", "and", "or", "of", "to", "in", "for", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "shall", "should", "may", "might", "can", "could", "would", "must", "that", "this", "these", "those", "it", "its", "with", "by", "from", "as", "at", "on", "not", "no", "but", "if", "all", "any", "each", "every", "such", "than", "too", "very", "so", "up", "out", "about", "into", "through", "during", "before", "after", "above", "below", "between", "under", "over", "other", "which", "who", "whom", "where", "when", "how", "what", "why", "their", "there", "they", "them", "we", "our", "you", "your"]);
        const words = text.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !stopWords.has(w));
        const phrases: string[] = [];
        const seen = new Set<string>();
        for (const w of words) {
          if (!seen.has(w)) { seen.add(w); phrases.push(w); }
        }
        return phrases;
      }

      function scoreContentMatch(docMarkdown: string, requirement: { title: string; description: string; evidence?: string | null }): { score: number; matchedTerms: string[]; totalTerms: number } {
        const md = docMarkdown.toLowerCase();
        const allText = [requirement.title, requirement.description, requirement.evidence || ""].join(" ");
        const phrases = extractKeyPhrases(allText);
        if (phrases.length === 0) return { score: 0, matchedTerms: [], totalTerms: 0 };
        const matched = phrases.filter((p) => md.includes(p));
        return { score: matched.length / phrases.length, matchedTerms: matched, totalTerms: phrases.length };
      }

      const contentAnalysis: Array<{
        mappingId: number;
        requirementId: number;
        requirementCode: string;
        requirementTitle: string;
        documentId: number;
        documentTitle: string;
        previousStatus: string;
        newStatus: string;
        matchScore: number;
        matchedTerms: string[];
        totalTerms: number;
        hasMarkdown: boolean;
      }> = [];

      const mappingsToUpdate: Array<{ id: number; coverageStatus: string }> = [];

      for (const mapping of allMappings) {
        const req = reqMap.get(mapping.requirementId);
        if (!req) continue;
        const doc = docMap.get(mapping.documentId);
        if (!doc) continue;

        const docMarkdown = latestVersionMarkdown.get(mapping.documentId);
        if (!docMarkdown) {
          contentAnalysis.push({
            mappingId: mapping.id,
            requirementId: req.id,
            requirementCode: req.code,
            requirementTitle: req.title,
            documentId: doc.id,
            documentTitle: doc.title,
            previousStatus: mapping.coverageStatus,
            newStatus: mapping.coverageStatus,
            matchScore: 0,
            matchedTerms: [],
            totalTerms: 0,
            hasMarkdown: false,
          });
          continue;
        }

        const result = scoreContentMatch(docMarkdown, req);
        let newStatus = mapping.coverageStatus;
        if (result.score >= 0.6) newStatus = "Covered";
        else if (result.score >= 0.3) newStatus = "Partially Covered";
        else newStatus = "Not Covered";

        contentAnalysis.push({
          mappingId: mapping.id,
          requirementId: req.id,
          requirementCode: req.code,
          requirementTitle: req.title,
          documentId: doc.id,
          documentTitle: doc.title,
          previousStatus: mapping.coverageStatus,
          newStatus,
          matchScore: Math.round(result.score * 100),
          matchedTerms: result.matchedTerms.slice(0, 20),
          totalTerms: result.totalTerms,
          hasMarkdown: true,
        });

        if (newStatus !== mapping.coverageStatus) {
          mappingsToUpdate.push({ id: mapping.id, coverageStatus: newStatus });
        }
      }

      for (const upd of mappingsToUpdate) {
        await db.update(schema.requirementMappings)
          .set({ coverageStatus: upd.coverageStatus })
          .where(eq(schema.requirementMappings.id, upd.id));
      }

      const updatedMappings = mappingsToUpdate.length > 0
        ? await storage.getRequirementMappings()
        : allMappings;

      const docLinkedMappings = updatedMappings.filter((m) => m.documentId != null);
      const summary = {
        totalRequirements: allRequirements.length,
        applicableRequirements: applicableRequirements.length,
        totalMapped: docLinkedMappings.length,
        unmappedCount: unmappedRequirements.length,
        perBuGapCount: perBuGaps.length,
        overStrictCount: overStrictItems.length,
        coveredCount: docLinkedMappings.filter((m) => m.coverageStatus === "Covered").length,
        partiallyCoveredCount: docLinkedMappings.filter((m) => m.coverageStatus === "Partially Covered").length,
        notCoveredCount: docLinkedMappings.filter((m) => m.coverageStatus === "Not Covered").length,
        contentAnalysisCount: contentAnalysis.length,
        contentUpdatedCount: mappingsToUpdate.length,
      };

      return res.json({ summary, unmappedRequirements, perBuGaps, overStrictItems, contentAnalysis });
    }

    // === AUTO-MAP CONTROLS TO DOCUMENTS (keyword-based) ===
    if (req.method === "POST" && action === "auto-map") {
      const { sourceId, dryRun } = req.body as { sourceId?: number; dryRun?: boolean };

      const allRequirements = await storage.getRequirements();
      const allDocuments = await storage.getDocuments();
      const allMappings = await storage.getRequirementMappings();
      const allVersions = await db.select().from(schema.documentVersions);

      const latestVersionMarkdown = new Map<number, string>();
      for (const v of allVersions) {
        if (!v.markDown) continue;
        latestVersionMarkdown.set(v.documentId, v.markDown);
      }

      const docsWithContent = allDocuments.filter((d) => {
        const md = latestVersionMarkdown.get(d.id);
        return md && md.length > 100;
      });

      if (docsWithContent.length === 0) {
        return res.json({ message: "No documents with markdown content found", created: 0, results: [] });
      }

      const targetReqs = sourceId
        ? allRequirements.filter((r) => r.sourceId === sourceId)
        : allRequirements;

      const existingMappingKeys = new Set(
        allMappings.map((m) => `${m.requirementId}-${m.documentId}`)
      );

      function tokenize(text: string): string[] {
        return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2);
      }

      const stopWords = new Set(["the", "a", "an", "and", "or", "of", "to", "in", "for", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "shall", "should", "may", "might", "can", "could", "would", "must", "that", "this", "these", "those", "it", "its", "with", "by", "from", "as", "at", "on", "not", "no", "but", "if", "all", "any", "each", "every", "such", "than", "too", "very", "so", "up", "out", "about", "into", "through", "during", "before", "after", "above", "below", "between", "under", "over", "other", "which", "who", "whom", "where", "when", "how", "what", "why", "their", "there", "they", "them", "we", "our", "you", "your", "company", "also", "based", "ensure", "required", "includes", "including", "use", "used", "using", "within", "upon", "per", "least", "place"]);
      const lowValueTerms = new Set(["risk", "risks", "control", "controls", "policy", "policies", "procedure", "procedures", "management", "process", "processes", "assessment", "assessments", "review", "reviews", "performed", "established", "documented", "defined", "approved", "maintained", "implemented", "identified", "evaluated", "monitored", "reported", "communicated", "annually", "periodic", "regular", "appropriate", "relevant", "applicable", "organization", "personnel", "employees", "objectives", "activities", "information", "system", "systems", "service", "services", "changes", "security", "requirements", "standards", "compliance", "internal", "external"]);

      function extractMeaningfulTerms(text: string): string[] {
        return tokenize(text).filter((w) => !stopWords.has(w));
      }

      function buildNGrams(terms: string[], n: number): string[] {
        const grams: string[] = [];
        for (let i = 0; i <= terms.length - n; i++) {
          grams.push(terms.slice(i, i + n).join(" "));
        }
        return grams;
      }

      const docTokenSets = new Map<number, { tokens: Set<string>; text: string; titleTokens: Set<string> }>();
      for (const doc of docsWithContent) {
        const md = latestVersionMarkdown.get(doc.id)!;
        const lowerMd = md.toLowerCase();
        const tokens = new Set(extractMeaningfulTerms(md));
        const titleTokens = new Set(extractMeaningfulTerms(doc.title));
        docTokenSets.set(doc.id, { tokens, text: lowerMd, titleTokens });
      }

      const termDocFreq = new Map<string, number>();
      for (const [, data] of docTokenSets) {
        for (const t of data.tokens) {
          termDocFreq.set(t, (termDocFreq.get(t) ?? 0) + 1);
        }
      }
      const totalDocs = docsWithContent.length;

      function scoreMatch(req: typeof targetReqs[0], docId: number): { score: number; matchedTerms: string[] } {
        const docData = docTokenSets.get(docId);
        if (!docData) return { score: 0, matchedTerms: [] };

        const titleTerms = Array.from(new Set(extractMeaningfulTerms(req.title)));
        const descTerms = Array.from(new Set(extractMeaningfulTerms(req.description)));
        const allUniqueTerms = Array.from(new Set([...titleTerms, ...descTerms]));
        if (allUniqueTerms.length === 0) return { score: 0, matchedTerms: [] };

        function termWeight(term: string): number {
          if (lowValueTerms.has(term)) return 0.3;
          const df = termDocFreq.get(term) ?? 0;
          if (totalDocs > 1 && df >= totalDocs) return 0.3;
          if (totalDocs > 2 && df >= totalDocs - 1) return 0.5;
          return 1.0;
        }

        let titleWeightedMatch = 0;
        let titleTotalWeight = 0;
        const matchedTitle: string[] = [];
        for (const t of titleTerms) {
          const w = termWeight(t);
          titleTotalWeight += w;
          if (docData.tokens.has(t)) { titleWeightedMatch += w; matchedTitle.push(t); }
        }

        let descWeightedMatch = 0;
        let descTotalWeight = 0;
        const matchedDesc: string[] = [];
        for (const t of descTerms) {
          const w = termWeight(t);
          descTotalWeight += w;
          if (docData.tokens.has(t) && !matchedTitle.includes(t)) { descWeightedMatch += w; matchedDesc.push(t); }
        }

        const titleBigrams = Array.from(new Set(buildNGrams(extractMeaningfulTerms(req.title), 2)));
        const descBigrams = Array.from(new Set(buildNGrams(extractMeaningfulTerms(req.description), 2)));
        const titleTrigrams = Array.from(new Set(buildNGrams(extractMeaningfulTerms(req.title), 3)));
        const descTrigrams = Array.from(new Set(buildNGrams(extractMeaningfulTerms(req.description), 3)));
        const matchedBigrams: string[] = [];
        for (const bg of [...titleBigrams, ...descBigrams]) {
          if (docData.text.includes(bg) && !matchedBigrams.includes(bg)) matchedBigrams.push(bg);
        }
        const matchedTrigrams: string[] = [];
        for (const tg of [...titleTrigrams, ...descTrigrams]) {
          if (docData.text.includes(tg) && !matchedTrigrams.includes(tg)) matchedTrigrams.push(tg);
        }

        const titleScore = titleTotalWeight > 0 ? titleWeightedMatch / titleTotalWeight : 0;
        const descScore = descTotalWeight > 0 ? descWeightedMatch / descTotalWeight : 0;
        const bigramCount = titleBigrams.length + descBigrams.length;
        const bigramScore = bigramCount > 0 ? matchedBigrams.length / bigramCount : 0;
        const trigramCount = titleTrigrams.length + descTrigrams.length;
        const trigramScore = trigramCount > 0 ? matchedTrigrams.length / trigramCount : 0;

        let docTitleBonus = 0;
        const reqTitleHighValue = titleTerms.filter((t) => !lowValueTerms.has(t));
        if (reqTitleHighValue.length > 0) {
          const titleMatches = reqTitleHighValue.filter((t) => docData.titleTokens.has(t));
          docTitleBonus = titleMatches.length / reqTitleHighValue.length;
        }

        const combinedScore =
          (titleScore * 0.30) + (descScore * 0.15) + (bigramScore * 0.20) +
          (trigramScore * 0.20) + (docTitleBonus * 0.15);

        return {
          score: combinedScore,
          matchedTerms: [...matchedTrigrams, ...matchedBigrams, ...matchedTitle, ...matchedDesc].filter((t, i, a) => a.indexOf(t) === i),
        };
      }

      const results: Array<{
        requirementId: number;
        requirementCode: string;
        requirementTitle: string;
        documentId: number;
        documentTitle: string;
        score: number;
        coverageStatus: string;
        matchedTerms: string[];
        created: boolean;
      }> = [];

      let created = 0;
      let skippedExisting = 0;

      for (const req of targetReqs) {
        let bestDoc: { docId: number; score: number; matchedTerms: string[] } | null = null;
        for (const doc of docsWithContent) {
          const { score, matchedTerms } = scoreMatch(req, doc.id);
          if (score > 0.25 && (!bestDoc || score > bestDoc.score)) {
            bestDoc = { docId: doc.id, score, matchedTerms };
          }
        }

        if (bestDoc) {
          const doc = allDocuments.find((d) => d.id === bestDoc!.docId)!;
          const key = `${req.id}-${bestDoc.docId}`;
          const alreadyExists = existingMappingKeys.has(key);

          let coverageStatus = "Not Covered";
          if (bestDoc.score >= 0.45) coverageStatus = "Covered";
          else if (bestDoc.score >= 0.30) coverageStatus = "Partially Covered";

          const newRationale = `Auto-mapped (${Math.round(bestDoc.score * 100)}%): ${bestDoc.matchedTerms.slice(0, 8).join(", ")}`;

          if (!alreadyExists && !dryRun) {
            await storage.createRequirementMapping({
              requirementId: req.id,
              documentId: bestDoc.docId,
              coverageStatus,
              rationale: newRationale,
            });
            created++;
            existingMappingKeys.add(key);
          }

          if (alreadyExists && !dryRun) {
            const existing = allMappings.find((em) => em.requirementId === req.id && em.documentId === bestDoc!.docId);
            if (existing && existing.rationale?.startsWith("Auto-mapped")) {
              await storage.updateRequirementMapping(existing.id, { rationale: newRationale, coverageStatus });
            }
            skippedExisting++;
          }

          results.push({
            requirementId: req.id,
            requirementCode: req.code,
            requirementTitle: req.title,
            documentId: bestDoc.docId,
            documentTitle: doc.title,
            score: Math.round(bestDoc.score * 100),
            coverageStatus,
            matchedTerms: bestDoc.matchedTerms.slice(0, 10),
            created: !alreadyExists && !dryRun,
          });
        }
      }

      if (!dryRun) {
        for (const mapping of allMappings) {
          if (!mapping.rationale?.startsWith("Auto-mapped")) continue;
          if (!mapping.documentId) continue;
          const reqForMapping = targetReqs.find((r) => r.id === mapping.requirementId);
          if (!reqForMapping) continue;
          const alreadyHandled = results.some((r) => r.requirementId === mapping.requirementId && r.documentId === mapping.documentId);
          if (alreadyHandled) continue;
          const { score, matchedTerms } = scoreMatch(reqForMapping, mapping.documentId);
          let newStatus = "Not Covered";
          if (score >= 0.45) newStatus = "Covered";
          else if (score >= 0.30) newStatus = "Partially Covered";
          const updatedRationale = `Auto-mapped (${Math.round(score * 100)}%): ${matchedTerms.slice(0, 8).join(", ")}`;
          await storage.updateRequirementMapping(mapping.id, { rationale: updatedRationale, coverageStatus: newStatus });
        }
      }

      return res.json({
        message: dryRun ? "Dry run complete" : "Auto-mapping complete",
        totalControls: targetReqs.length,
        docsAnalysed: docsWithContent.length,
        created,
        skippedExisting,
        matched: results.length,
        unmatched: targetReqs.length - results.length,
        results: results.sort((a, b) => b.score - a.score),
      });
    }

    // === AI MATCH FOR SINGLE MAPPING (dispatch-and-fire) ===
    if (req.method === "POST" && action === "ai-match") {
      const mappingIdRaw = req.query.mappingId;
      const mappingId = Number(Array.isArray(mappingIdRaw) ? mappingIdRaw[0] : mappingIdRaw);
      if (!mappingId || isNaN(mappingId)) {
        return res.status(400).json({ message: "Missing mappingId query parameter" });
      }

      const mapping = await db.select().from(schema.requirementMappings)
        .where(eq(schema.requirementMappings.id, mappingId)).then(r => r[0]);
      if (!mapping) return res.status(404).json({ message: "Mapping not found" });
      if (!mapping.documentId) return res.status(400).json({ message: "Mapping has no linked document" });

      const requirement = await storage.getRequirement(mapping.requirementId);
      if (!requirement) return res.status(404).json({ message: "Requirement not found" });
      const document = await storage.getDocument(mapping.documentId);
      if (!document) return res.status(404).json({ message: "Document not found" });

      const versions = await db.select().from(schema.documentVersions)
        .where(eq(schema.documentVersions.documentId, mapping.documentId));
      const latestVersion = versions.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())[0];
      const docContent = latestVersion?.markDown || "";
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

// ============================================================
// AI PROCESSOR: match single mapping (fire-and-forget)
// ============================================================
async function processAiMatchJob(jobId: string, mappingId: number) {
  try {
    await db.update(schema.aiJobs).set({
      status: "processing",
      progressMessage: "Analyzing requirement-document match...",
      updatedAt: new Date(),
    }).where(eq(schema.aiJobs.id, jobId));

    const mapping = await db.select().from(schema.requirementMappings)
      .where(eq(schema.requirementMappings.id, mappingId)).then(r => r[0]);
    if (!mapping || !mapping.documentId) throw new Error("Mapping not found or has no document");

    const requirement = await storage.getRequirement(mapping.requirementId);
    if (!requirement) throw new Error("Requirement not found");
    const document = await storage.getDocument(mapping.documentId);
    if (!document) throw new Error("Document not found");

    const versions = await db.select().from(schema.documentVersions)
      .where(eq(schema.documentVersions.documentId, mapping.documentId));
    const latestVersion = versions.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())[0];
    const docContent = latestVersion?.markDown || "";
    const truncatedContent = docContent.slice(0, 8000);

    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const anthropic = new Anthropic({
      apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
    });

    const prompt = `You are a compliance analyst reviewing whether a policy document adequately covers a regulatory requirement.

REGULATORY REQUIREMENT:
- Code: ${requirement.code}
- Title: ${requirement.title}
- Description: ${requirement.description || "N/A"}
- Suggested Evidence: ${requirement.evidence || "N/A"}

POLICY DOCUMENT:
- Title: ${document.title}
- Type: ${document.docType}
- Content (may be truncated):
${truncatedContent}

TASK: Analyse how well this document covers the regulatory requirement. Provide:
1. A match percentage (0-100) representing how comprehensively the document addresses the requirement
2. A brief rationale (2-3 sentences) explaining what the document DOES cover well
3. Specific recommendations for what would need to be added or improved to reach 100% coverage. If already at 100%, say "No further action needed."

Guidelines for scoring:
- 80-100%: Document directly and comprehensively addresses the requirement with specific provisions
- 60-79%: Document substantially covers the requirement but may lack some specifics
- 40-59%: Document partially addresses the requirement; important gaps exist
- 20-39%: Document touches on related topics but does not meaningfully address the requirement
- 0-19%: Document has little to no relevance to the requirement

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

    await db.update(schema.requirementMappings)
      .set({ aiMatchScore: aiScore, aiMatchRationale: aiRationale, aiMatchRecommendations: aiRecommendations })
      .where(eq(schema.requirementMappings.id, mappingId));

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
