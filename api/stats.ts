/**
 * Serverless function: /api/stats
 * Aggregates dashboard statistics across multiple tables.
 *
 * URL convention:
 *   GET    /api/stats   → return aggregated stats
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors } from "./_shared/cors";
import { sendError } from "./_shared/handler";
import { storage } from "../server/storage";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  try {
    switch (req.method) {
      case "GET": {
        const allDocs = await storage.getDocuments();
        const allReqs = await storage.getRequirements();
        const allSources = await storage.getRegulatorySources();
        const allBUs = await storage.getBusinessUnits();
        const allMappings = await storage.getRequirementMappings();
        const allFindings = await storage.getFindings();
        const allApprovals = await storage.getApprovals();

        const coveredCount = allMappings.filter(m => m.coverageStatus === "Covered").length;
        const partiallyCoveredCount = allMappings.filter(m => m.coverageStatus === "Partially Covered").length;
        const notCoveredCount = allMappings.filter(m => m.coverageStatus === "Not Covered").length;
        const openFindings = allFindings.filter(f => f.status !== "Closed" && f.status !== "Verified").length;
        const overdueFindings = allFindings.filter(f =>
          f.status !== "Closed" && f.status !== "Verified" && f.dueDate && new Date(f.dueDate) < new Date()
        ).length;
        const pendingApprovals = allApprovals.filter(a => a.status === "Pending").length;
        const pendingReviews = allDocs.filter(d =>
          d.nextReviewDate && new Date(d.nextReviewDate) <= new Date()
        ).length;

        return res.json({
          totalDocuments: allDocs.length,
          totalRequirements: allReqs.length,
          totalSources: allSources.length,
          businessUnits: allBUs.length,
          coveredCount,
          partiallyCoveredCount,
          notCoveredCount,
          openFindings,
          overdueFindings,
          pendingApprovals,
          pendingReviews,
        });
      }

      default:
        return res.status(405).json({ message: "Method not allowed" });
    }
  } catch (err) {
    sendError(res, err);
  }
}
