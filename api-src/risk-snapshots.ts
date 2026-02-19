/**
 * Serverless function: /api/risk-snapshots
 * Handles risk snapshot creation and deletion.
 * Snapshot generation aggregates current risk data at point-in-time.
 *
 * URL convention:
 *   GET    /api/risk-snapshots          → list all snapshots
 *   POST   /api/risk-snapshots          → create new snapshot (auto-aggregates risk data)
 *   DELETE /api/risk-snapshots?id=N     → delete snapshot
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
        return res.json(await storage.getRiskSnapshots());
      }

      case "POST": {
        // Auto-aggregate current risk data for the snapshot
        const allRisks = await storage.getRisks();
        const allActions = await storage.getRiskActions();
        const openActions = allActions.filter(a => a.status !== "Completed" && a.status !== "Closed").length;

        const snapshotData = {
          risksByStatus: {
            Identified: allRisks.filter(r => r.status === "Identified").length,
            Assessing: allRisks.filter(r => r.status === "Assessing").length,
            Mitigating: allRisks.filter(r => r.status === "Mitigating").length,
            Accepted: allRisks.filter(r => r.status === "Accepted").length,
            Closed: allRisks.filter(r => r.status === "Closed").length,
          },
          risksByCategory: allRisks.reduce((acc: Record<string, number>, r) => {
            acc[r.category] = (acc[r.category] || 0) + 1;
            return acc;
          }, {}),
          heatmap: allRisks.map(r => ({
            id: r.id, title: r.title,
            inherentLikelihood: r.inherentLikelihood, inherentImpact: r.inherentImpact,
            residualLikelihood: r.residualLikelihood, residualImpact: r.residualImpact,
          })),
        };

        const body = { ...req.body };
        const input = api.riskSnapshots.create.input.parse({
          name: body.name || `Snapshot ${new Date().toISOString().split("T")[0]}`,
          businessUnitId: body.businessUnitId || null,
          totalRisks: allRisks.length,
          criticalCount: allRisks.filter(r => r.residualRating === "Critical").length,
          highCount: allRisks.filter(r => r.residualRating === "High").length,
          mediumCount: allRisks.filter(r => r.residualRating === "Medium").length,
          lowCount: allRisks.filter(r => r.residualRating === "Low").length,
          openActions,
          snapshotData,
          createdBy: body.createdBy || "System",
        });

        const s = await storage.createRiskSnapshot(input);
        return res.status(201).json(s);
      }

      case "DELETE": {
        const id = getIdParam(req);
        await storage.deleteRiskSnapshot(id);
        return res.status(204).end();
      }

      default:
        return res.status(405).json({ message: "Method not allowed" });
    }
  } catch (err) {
    sendError(res, err);
  }
}
