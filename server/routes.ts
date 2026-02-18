import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { db } from "./db";
import { createHash } from "crypto";
import multer from "multer";
import { generateS3Key, uploadToS3, getLocalFilePath, deleteFromS3 } from "./s3";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});
import {
  businessUnits, regulatoryProfiles, regulatorySources, requirements,
  documents, documentVersions, addenda, effectivePolicies,
  approvals, auditLog, reviewHistory, requirementMappings,
  findings, findingEvidence, policyLinks, audits, users,
  entityTypes, roles, jurisdictions, documentCategories, findingSeverities,
} from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // === BUSINESS UNITS ===
  app.get(api.businessUnits.list.path, async (_req, res) => {
    res.json(await storage.getBusinessUnits());
  });
  app.get(api.businessUnits.get.path, async (req, res) => {
    const bu = await storage.getBusinessUnit(Number(req.params.id));
    if (!bu) return res.status(404).json({ message: "Business Unit not found" });
    res.json(bu);
  });
  app.post(api.businessUnits.create.path, async (req, res) => {
    try {
      const input = api.businessUnits.create.input.parse(req.body);
      const bu = await storage.createBusinessUnit(input);
      await storage.createAuditLogEntry({
        entityType: "business_unit", entityId: bu.id,
        action: "created", actor: "System", details: `Business Unit "${bu.name}" created`
      });
      res.status(201).json(bu);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });
  app.put(api.businessUnits.update.path, async (req, res) => {
    try {
      const input = api.businessUnits.update.input.parse(req.body);
      const bu = await storage.updateBusinessUnit(Number(req.params.id), input);
      if (!bu) return res.status(404).json({ message: "Business Unit not found" });
      res.json(bu);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });
  app.put("/api/business-units/:id/archive", async (req, res) => {
    const existing = await storage.getBusinessUnit(Number(req.params.id));
    if (!existing) return res.status(404).json({ message: "Business Unit not found" });
    const archived = await storage.archiveBusinessUnit(Number(req.params.id));
    await storage.createAuditLogEntry({
      entityType: "business_unit", entityId: existing.id,
      action: "archived", actor: "system", details: `Business unit "${existing.name}" archived`
    });
    res.json(archived);
  });

  // === REGULATORY SOURCES ===
  app.get(api.regulatorySources.list.path, async (_req, res) => {
    res.json(await storage.getRegulatorySources());
  });
  app.get(api.regulatorySources.get.path, async (req, res) => {
    const src = await storage.getRegulatorySource(Number(req.params.id));
    if (!src) return res.status(404).json({ message: "Source not found" });
    res.json(src);
  });
  app.post(api.regulatorySources.create.path, async (req, res) => {
    try {
      const input = api.regulatorySources.create.input.parse(req.body);
      const src = await storage.createRegulatorySource(input);
      await storage.createAuditLogEntry({
        entityType: "regulatory_source", entityId: src.id,
        action: "created", actor: "System", details: `Regulatory Source "${src.name}" created`
      });
      res.status(201).json(src);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });
  app.put(api.regulatorySources.update.path, async (req, res) => {
    try {
      const input = api.regulatorySources.update.input.parse(req.body);
      const src = await storage.updateRegulatorySource(Number(req.params.id), input);
      if (!src) return res.status(404).json({ message: "Source not found" });
      res.json(src);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });
  app.delete(api.regulatorySources.delete.path, async (req, res) => {
    const existing = await storage.getRegulatorySource(Number(req.params.id));
    if (!existing) return res.status(404).json({ message: "Source not found" });
    await storage.deleteRegulatorySource(Number(req.params.id));
    await storage.createAuditLogEntry({
      entityType: "regulatory_source", entityId: existing.id,
      action: "deleted", actor: "System", details: `Regulatory Source "${existing.name}" deleted`
    });
    res.status(204).send();
  });

  // === REGULATORY PROFILES ===
  app.get(api.regulatoryProfiles.list.path, async (_req, res) => {
    res.json(await storage.getRegulatoryProfiles());
  });

  // === REQUIREMENTS ===
  app.get(api.requirements.list.path, async (_req, res) => {
    res.json(await storage.getRequirements());
  });
  app.get(api.requirements.get.path, async (req, res) => {
    const r = await storage.getRequirement(Number(req.params.id));
    if (!r) return res.status(404).json({ message: "Requirement not found" });
    res.json(r);
  });
  app.post(api.requirements.create.path, async (req, res) => {
    try {
      const input = api.requirements.create.input.parse(req.body);
      const r = await storage.createRequirement(input);
      await storage.createAuditLogEntry({
        entityType: "requirement", entityId: r.id,
        action: "created", actor: "System", details: `Requirement "${r.code}" created`
      });
      res.status(201).json(r);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });
  app.put(api.requirements.update.path, async (req, res) => {
    try {
      const input = api.requirements.update.input.parse(req.body);
      const r = await storage.updateRequirement(Number(req.params.id), input);
      if (!r) return res.status(404).json({ message: "Requirement not found" });
      res.json(r);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });
  app.delete(api.requirements.delete.path, async (req, res) => {
    const existing = await storage.getRequirement(Number(req.params.id));
    if (!existing) return res.status(404).json({ message: "Requirement not found" });
    await storage.deleteRequirement(Number(req.params.id));
    await storage.createAuditLogEntry({
      entityType: "requirement", entityId: existing.id,
      action: "deleted", actor: "System", details: `Requirement "${existing.code}" deleted`
    });
    res.status(204).send();
  });

  // === DOCUMENTS ===
  app.get(api.documents.list.path, async (_req, res) => {
    res.json(await storage.getDocuments());
  });
  app.get(api.documents.get.path, async (req, res) => {
    const doc = await storage.getDocument(Number(req.params.id));
    if (!doc) return res.status(404).json({ message: "Document not found" });
    res.json(doc);
  });
  app.post(api.documents.create.path, upload.single("pdf"), async (req, res) => {
    try {
      const body = { ...req.body };
      if (typeof body.tags === "string") {
        try {
          const parsed = JSON.parse(body.tags);
          body.tags = Array.isArray(parsed) ? parsed : [];
        } catch { body.tags = []; }
      }
      if (!body.tags) body.tags = [];
      if (typeof body.businessUnitId === "string") {
        body.businessUnitId = (body.businessUnitId === "null" || body.businessUnitId === "") ? null : Number(body.businessUnitId);
      }
      if (!body.reviewFrequency || body.reviewFrequency === "") body.reviewFrequency = null;
      if (body.nextReviewDate && typeof body.nextReviewDate === "string") body.nextReviewDate = new Date(body.nextReviewDate);
      const input = api.documents.create.input.parse(body);
      const doc = await storage.createDocument(input);
      await storage.createAuditLogEntry({
        entityType: "document", entityId: doc.id,
        action: "created", actor: input.owner, details: `Document "${doc.title}" created`
      });

      if (req.file) {
        const content = `Uploaded from ${req.file.originalname}`;
        const contentHash = createHash('sha256').update(content).digest('hex');
        const version = await storage.createDocumentVersion({
          documentId: doc.id,
          version: "1.0",
          status: "Draft",
          content,
          contentHash,
          createdBy: input.owner,
        });
        const s3Key = generateS3Key(doc.id, version.id, req.file.originalname);
        await uploadToS3(s3Key, req.file.buffer, req.file.mimetype);
        await storage.updateDocumentVersionPdf(version.id, s3Key, req.file.originalname, req.file.size);
        await storage.createAuditLogEntry({
          entityType: "document_version", entityId: version.id,
          action: "pdf_uploaded", actor: input.owner,
          details: `PDF "${req.file.originalname}" uploaded with initial version 1.0`
        });
      }

      res.status(201).json(doc);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });
  app.put(api.documents.update.path, async (req, res) => {
    try {
      const body = { ...req.body };
      if (body.nextReviewDate && typeof body.nextReviewDate === "string") body.nextReviewDate = new Date(body.nextReviewDate);
      const input = api.documents.update.input.parse(body);
      const doc = await storage.updateDocument(Number(req.params.id), input);
      if (!doc) return res.status(404).json({ message: "Document not found" });
      res.json(doc);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });
  app.delete(api.documents.delete.path, async (req, res) => {
    const existing = await storage.getDocument(Number(req.params.id));
    if (!existing) return res.status(404).json({ message: "Document not found" });
    await storage.deleteDocument(Number(req.params.id));
    await storage.createAuditLogEntry({
      entityType: "document", entityId: existing.id,
      action: "deleted", actor: "System", details: `Document "${existing.title}" deleted`
    });
    res.status(204).send();
  });

  // === DOCUMENT VERSIONS ===
  app.get(api.documentVersions.list.path, async (req, res) => {
    res.json(await storage.getDocumentVersions(Number(req.params.documentId)));
  });
  app.post(api.documentVersions.create.path, upload.single("pdf"), async (req, res) => {
    try {
      const body = { ...req.body };
      if (typeof body.documentId === "string") body.documentId = Number(body.documentId);
      if (body.effectiveDate && typeof body.effectiveDate === "string") body.effectiveDate = new Date(body.effectiveDate);
      if (!body.content) body.content = req.file ? `Uploaded from ${req.file.originalname}` : "No content";
      const input = api.documentVersions.create.input.parse(body);
      const contentHash = createHash('sha256').update(input.content).digest('hex');
      const version = await storage.createDocumentVersion({ ...input, contentHash });
      await storage.createAuditLogEntry({
        entityType: "document_version", entityId: version.id,
        action: "created", actor: input.createdBy,
        details: `Version ${input.version} created (hash: ${contentHash.substring(0, 12)})`
      });

      if (req.file) {
        try {
          const s3Key = generateS3Key(version.documentId, version.id, req.file.originalname);
          await uploadToS3(s3Key, req.file.buffer, req.file.mimetype);
          await storage.updateDocumentVersionPdf(version.id, s3Key, req.file.originalname, req.file.size);
          await storage.createAuditLogEntry({
            entityType: "document_version", entityId: version.id,
            action: "pdf_uploaded", actor: input.createdBy,
            details: `PDF "${req.file.originalname}" uploaded with version ${input.version}`
          });
          const updated = await storage.getDocumentVersion(version.id);
          return res.status(201).json(updated);
        } catch (s3Err) {
          console.error("S3 upload failed during version creation:", s3Err);
          return res.status(201).json({ ...version, _pdfWarning: "Version created but PDF upload failed. You can attach the PDF separately." });
        }
      }

      res.status(201).json(version);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });
  app.put("/api/document-versions/:id", async (req, res) => {
    try {
      const versionId = Number(req.params.id);
      const existing = await storage.getDocumentVersion(versionId);
      if (!existing) return res.status(404).json({ message: "Version not found" });
      const { version, status, changeReason, createdBy, effectiveDate } = req.body;
      const updateData: any = {};
      if (version !== undefined) updateData.version = version;
      if (status !== undefined) updateData.status = status;
      if (changeReason !== undefined) updateData.changeReason = changeReason || null;
      if (createdBy !== undefined) updateData.createdBy = createdBy;
      if (effectiveDate !== undefined) updateData.effectiveDate = effectiveDate ? new Date(effectiveDate) : null;
      const updated = await storage.updateDocumentVersion(versionId, updateData);
      if (!updated) return res.status(404).json({ message: "Version not found" });
      await storage.createAuditLogEntry({
        entityType: "document_version", entityId: updated.id,
        action: "updated", actor: updated.createdBy,
        details: `Version ${updated.version} updated`
      });
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });
  app.put(api.documentVersions.updateStatus.path, async (req, res) => {
    const { status } = api.documentVersions.updateStatus.input.parse(req.body);
    const version = await storage.updateDocumentVersionStatus(Number(req.params.id), status);
    if (!version) return res.status(404).json({ message: "Version not found" });
    await storage.createAuditLogEntry({
      entityType: "document_version", entityId: version.id,
      action: "status_changed", actor: "System",
      details: `Status changed to ${status}`
    });
    res.json(version);
  });

  // === DOCUMENT VERSION PDF UPLOAD/DOWNLOAD ===
  app.post("/api/document-versions/:id/pdf", upload.single("pdf"), async (req, res) => {
    try {
      const versionId = Number(req.params.id);
      const version = await storage.getDocumentVersion(versionId);
      if (!version) return res.status(404).json({ message: "Version not found" });
      if (!req.file) return res.status(400).json({ message: "No PDF file provided" });

      if (version.pdfS3Key) {
        try { await deleteFromS3(version.pdfS3Key); } catch {}
      }

      const s3Key = generateS3Key(version.documentId, versionId, req.file.originalname);
      await uploadToS3(s3Key, req.file.buffer, req.file.mimetype);
      const updated = await storage.updateDocumentVersionPdf(versionId, s3Key, req.file.originalname, req.file.size);

      await storage.createAuditLogEntry({
        entityType: "document_version", entityId: versionId,
        action: "pdf_uploaded", actor: "System",
        details: `PDF "${req.file.originalname}" uploaded (${(req.file.size / 1024).toFixed(1)} KB)`
      });

      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Upload failed" });
    }
  });

  app.get("/api/document-versions/:id/pdf/download", async (req, res) => {
    try {
      const version = await storage.getDocumentVersion(Number(req.params.id));
      if (!version) return res.status(404).json({ message: "Version not found" });
      if (!version.pdfS3Key) return res.status(404).json({ message: "No PDF attached to this version" });

      const filePath = getLocalFilePath(version.pdfS3Key);
      const fileName = version.pdfFileName || "policy.pdf";
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      res.setHeader("Content-Type", "application/pdf");
      res.sendFile(filePath);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Download failed" });
    }
  });

  app.delete("/api/document-versions/:id/pdf", async (req, res) => {
    try {
      const versionId = Number(req.params.id);
      const version = await storage.getDocumentVersion(versionId);
      if (!version) return res.status(404).json({ message: "Version not found" });
      if (!version.pdfS3Key) return res.status(404).json({ message: "No PDF attached" });

      await deleteFromS3(version.pdfS3Key);
      const updated = await storage.updateDocumentVersionPdf(versionId, "", "", 0);

      await storage.createAuditLogEntry({
        entityType: "document_version", entityId: versionId,
        action: "pdf_deleted", actor: "System",
        details: `PDF "${version.pdfFileName}" removed`
      });

      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Delete failed" });
    }
  });

  app.get("/api/document-versions/:id/pdf/to-markdown", async (req, res) => {
    try {
      const version = await storage.getDocumentVersion(Number(req.params.id));
      if (!version) return res.status(404).json({ message: "Version not found" });
      if (!version.pdfS3Key) return res.status(404).json({ message: "No PDF attached to this version" });

      const filePath = getLocalFilePath(version.pdfS3Key);
      const fs = await import("fs/promises");
      const pdfParse = (await import("pdf-parse")).default;
      const buffer = await fs.readFile(filePath);
      const pdfData = await pdfParse(buffer);
      const text = pdfData.text || "";

      const lines = text.split("\n").map((l: string) => l.trimEnd());
      const markdown = lines.join("\n");

      res.json({ markdown });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "PDF conversion failed" });
    }
  });

  // === ADDENDA ===
  app.get(api.addenda.list.path, async (req, res) => {
    res.json(await storage.getAddenda(Number(req.params.documentId)));
  });
  app.post(api.addenda.create.path, async (req, res) => {
    try {
      const input = api.addenda.create.input.parse(req.body);
      const addendum = await storage.createAddendum(input);
      res.status(201).json(addendum);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  // === EFFECTIVE POLICIES ===
  app.get(api.effectivePolicies.get.path, async (req, res) => {
    const ep = await storage.getEffectivePolicy(
      Number(req.params.documentId), Number(req.params.businessUnitId)
    );
    if (!ep) return res.status(404).json({ message: "Effective policy not found" });
    res.json(ep);
  });
  app.post(api.effectivePolicies.generate.path, async (req, res) => {
    const input = api.effectivePolicies.generate.input.parse(req.body);
    const versions = await storage.getDocumentVersions(input.documentId);
    const version = versions.find(v => v.id === input.versionId);
    if (!version) return res.status(404).json({ message: "Version not found" });

    let composedContent = version.content;
    if (input.addendumId) {
      const addendaList = await storage.getAddenda(input.documentId);
      const addendum = addendaList.find(a => a.id === input.addendumId);
      if (addendum) {
        composedContent += "\n\n---\n\n## Local Addendum\n\n" + addendum.content;
      }
    }
    const compositionHash = createHash('sha256').update(composedContent).digest('hex');
    const ep = await storage.createEffectivePolicy({
      documentId: input.documentId,
      businessUnitId: input.businessUnitId,
      versionId: input.versionId,
      addendumId: input.addendumId || null,
      composedContent,
      compositionHash,
    });
    res.status(201).json(ep);
  });

  // === APPROVALS ===
  app.get(api.approvals.list.path, async (_req, res) => {
    res.json(await storage.getApprovals());
  });
  app.post(api.approvals.create.path, async (req, res) => {
    const input = api.approvals.create.input.parse(req.body);
    const approval = await storage.createApproval(input);
    await storage.createAuditLogEntry({
      entityType: input.entityType, entityId: input.entityId,
      action: "approval_" + input.action, actor: input.approver,
      details: input.comments || `Approval: ${input.action} - ${input.status}`
    });
    res.status(201).json(approval);
  });

  // === AUDIT LOG ===
  app.get(api.auditLog.list.path, async (_req, res) => {
    res.json(await storage.getAuditLog());
  });

  // === REVIEW HISTORY ===
  app.get(api.reviewHistory.list.path, async (req, res) => {
    res.json(await storage.getReviewHistory(Number(req.params.documentId)));
  });
  app.post(api.reviewHistory.create.path, async (req, res) => {
    const input = api.reviewHistory.create.input.parse(req.body);
    const review = await storage.createReviewHistory(input);
    res.status(201).json(review);
  });

  // === REQUIREMENT MAPPINGS ===
  app.get(api.requirementMappings.list.path, async (_req, res) => {
    res.json(await storage.getRequirementMappings());
  });
  app.post(api.requirementMappings.create.path, async (req, res) => {
    const input = api.requirementMappings.create.input.parse(req.body);
    const mapping = await storage.createRequirementMapping(input);
    res.status(201).json(mapping);
  });
  app.put(api.requirementMappings.update.path, async (req, res) => {
    const input = api.requirementMappings.update.input.parse(req.body);
    const mapping = await storage.updateRequirementMapping(Number(req.params.id), input);
    if (!mapping) return res.status(404).json({ message: "Mapping not found" });
    res.json(mapping);
  });
  app.delete(api.requirementMappings.delete.path, async (req, res) => {
    await storage.deleteRequirementMapping(Number(req.params.id));
    res.status(204).end();
  });

  // === GAP ANALYSIS (REFRESH) ===
  app.get("/api/gap-analysis/refresh", async (_req, res) => {
    const allRequirements = await storage.getRequirements();
    const allMappings = await storage.getRequirementMappings();
    const allDocuments = await storage.getDocuments();
    const allSources = await storage.getRegulatorySources();
    const allBusinessUnits = await storage.getBusinessUnits();
    const allProfiles = await storage.getRegulatoryProfiles();

    const sourceMap = new Map(allSources.map((s) => [s.id, s]));
    const docMap = new Map(allDocuments.map((d) => [d.id, d]));
    const reqMap = new Map(allRequirements.map((r) => [r.id, r]));
    const buMap = new Map(allBusinessUnits.map((b) => [b.id, b]));

    // Build per-BU enabled source sets from regulatory profiles
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

    // Determine applicable requirements: those from sources enabled in at least one BU profile
    const applicableRequirements = allRequirements.filter((r) => globalEnabledSourceIds.has(r.sourceId));

    // Find unmapped gaps: applicable requirements that have no mapping at all
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

    // Find per-BU gaps: for each BU, requirements from its enabled sources that lack a mapping for that BU
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

    // Over-strict: mappings where the requirement's source is NOT enabled for the mapping's BU
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
      } else {
        // Mapping has no BU context — check if source is enabled globally
        if (!globalEnabledSourceIds.has(req.sourceId)) {
          const doc = docMap.get(mapping.documentId);
          const src = sourceMap.get(req.sourceId);
          overStrictItems.push({
            documentId: mapping.documentId,
            documentTitle: doc?.title ?? `Doc #${mapping.documentId}`,
            requirementId: req.id,
            requirementCode: req.code,
            requirementTitle: req.title,
            sourceName: src?.shortName ?? `Source #${req.sourceId}`,
            businessUnitId: null,
            businessUnitName: "Group (no BU)",
            reason: `Source "${src?.shortName ?? req.sourceId}" is not enabled in any regulatory profile`,
          });
        }
      }
    }

    const summary = {
      totalRequirements: allRequirements.length,
      applicableRequirements: applicableRequirements.length,
      totalMapped: allMappings.length,
      unmappedCount: unmappedRequirements.length,
      perBuGapCount: perBuGaps.length,
      overStrictCount: overStrictItems.length,
      coveredCount: allMappings.filter((m) => m.coverageStatus === "Covered").length,
      partiallyCoveredCount: allMappings.filter((m) => m.coverageStatus === "Partially Covered").length,
      notCoveredCount: allMappings.filter((m) => m.coverageStatus === "Not Covered").length,
    };

    res.json({ summary, unmappedRequirements, perBuGaps, overStrictItems });
  });

  // === FINDINGS ===
  app.get(api.findings.list.path, async (_req, res) => {
    res.json(await storage.getFindings());
  });
  app.get(api.findings.get.path, async (req, res) => {
    const f = await storage.getFinding(Number(req.params.id));
    if (!f) return res.status(404).json({ message: "Finding not found" });
    res.json(f);
  });
  app.post(api.findings.create.path, async (req, res) => {
    try {
      const body = { ...req.body };
      if (body.dueDate && typeof body.dueDate === "string") body.dueDate = new Date(body.dueDate);
      const input = api.findings.create.input.parse(body);
      const f = await storage.createFinding(input);
      await storage.createAuditLogEntry({
        entityType: "finding", entityId: f.id,
        action: "created", actor: input.owner, details: `Finding "${f.title}" created`
      });
      res.status(201).json(f);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });
  app.put(api.findings.update.path, async (req, res) => {
    try {
      const body = { ...req.body };
      if (body.dueDate && typeof body.dueDate === "string") body.dueDate = new Date(body.dueDate);
      const input = api.findings.update.input.parse(body);
      const f = await storage.updateFinding(Number(req.params.id), input);
      if (!f) return res.status(404).json({ message: "Finding not found" });
      res.json(f);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });
  app.delete(api.findings.delete.path, async (req, res) => {
    const existing = await storage.getFinding(Number(req.params.id));
    if (!existing) return res.status(404).json({ message: "Finding not found" });
    await storage.deleteFinding(Number(req.params.id));
    await storage.createAuditLogEntry({
      entityType: "finding", entityId: existing.id,
      action: "deleted", actor: "System", details: `Finding "${existing.title}" deleted`
    });
    res.status(204).send();
  });

  // === FINDING EVIDENCE ===
  app.get(api.findingEvidence.list.path, async (req, res) => {
    res.json(await storage.getFindingEvidence(Number(req.params.findingId)));
  });

  // === POLICY LINKS ===
  app.get(api.policyLinks.list.path, async (_req, res) => {
    res.json(await storage.getPolicyLinks());
  });

  // === AUDITS ===
  app.get(api.audits.list.path, async (_req, res) => {
    res.json(await storage.getAudits());
  });
  app.get(api.audits.get.path, async (req, res) => {
    const audit = await storage.getAudit(Number(req.params.id));
    if (!audit) return res.status(404).json({ message: "Audit not found" });
    res.json(audit);
  });
  app.post(api.audits.create.path, async (req, res) => {
    try {
      const input = api.audits.create.input.parse(req.body);
      const audit = await storage.createAudit(input);
      await storage.createAuditLogEntry({ entityType: "audit", entityId: audit.id, action: "created", actor: input.leadAuditor, details: `Audit created: ${audit.title}` });
      res.status(201).json(audit);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });
  app.put(api.audits.update.path, async (req, res) => {
    try {
      const input = api.audits.update.input.parse(req.body);
      const audit = await storage.updateAudit(Number(req.params.id), input);
      if (!audit) return res.status(404).json({ message: "Audit not found" });
      await storage.createAuditLogEntry({ entityType: "audit", entityId: audit.id, action: "updated", actor: "System", details: `Audit updated: ${audit.title}` });
      res.json(audit);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });
  app.delete(api.audits.delete.path, async (req, res) => {
    const existing = await storage.getAudit(Number(req.params.id));
    if (!existing) return res.status(404).json({ message: "Audit not found" });
    await storage.deleteAudit(Number(req.params.id));
    await storage.createAuditLogEntry({ entityType: "audit", entityId: existing.id, action: "deleted", actor: "System", details: `Audit deleted: ${existing.title}` });
    res.status(204).send();
  });

  // === COMMITMENTS ===
  app.get(api.commitments.list.path, async (_req, res) => {
    res.json(await storage.getCommitments());
  });
  app.get(api.commitments.get.path, async (req, res) => {
    const c = await storage.getCommitment(Number(req.params.id));
    if (!c) return res.status(404).json({ message: "Commitment not found" });
    res.json(c);
  });
  app.post(api.commitments.create.path, async (req, res) => {
    try {
      const body = { ...req.body };
      if (body.dueDate && typeof body.dueDate === "string") body.dueDate = new Date(body.dueDate);
      const input = api.commitments.create.input.parse(body);
      const c = await storage.createCommitment(input);
      await storage.createAuditLogEntry({
        entityType: "commitment", entityId: c.id,
        action: "created", actor: input.owner,
        details: `Commitment "${c.title}" created`
      });
      res.status(201).json(c);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });
  app.put(api.commitments.update.path, async (req, res) => {
    try {
      const body = { ...req.body };
      if (body.dueDate && typeof body.dueDate === "string") body.dueDate = new Date(body.dueDate);
      if (body.completedDate && typeof body.completedDate === "string") body.completedDate = new Date(body.completedDate);
      const input = api.commitments.update.input.parse(body);
      const c = await storage.updateCommitment(Number(req.params.id), input);
      if (!c) return res.status(404).json({ message: "Commitment not found" });
      await storage.createAuditLogEntry({
        entityType: "commitment", entityId: c.id,
        action: "updated", actor: "System",
        details: `Commitment "${c.title}" updated`
      });
      res.json(c);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });
  app.delete(api.commitments.delete.path, async (req, res) => {
    const existing = await storage.getCommitment(Number(req.params.id));
    if (!existing) return res.status(404).json({ message: "Commitment not found" });
    await storage.deleteCommitment(Number(req.params.id));
    await storage.createAuditLogEntry({
      entityType: "commitment", entityId: existing.id,
      action: "deleted", actor: "System",
      details: `Commitment "${existing.title}" deleted`
    });
    res.status(204).send();
  });

  // === KNOWLEDGE BASE ===
  app.get(api.knowledgeBase.list.path, async (_req, res) => {
    res.json(await storage.getKnowledgeBaseArticles());
  });
  app.get(api.knowledgeBase.get.path, async (req, res) => {
    const a = await storage.getKnowledgeBaseArticle(Number(req.params.id));
    if (!a) return res.status(404).json({ message: "Article not found" });
    res.json(a);
  });
  app.post(api.knowledgeBase.create.path, async (req, res) => {
    try {
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
        details: `Article "${a.title}" created`
      });
      res.status(201).json(a);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });
  app.put(api.knowledgeBase.update.path, async (req, res) => {
    try {
      const body = { ...req.body };
      if (typeof body.tags === "string") {
        try { body.tags = JSON.parse(body.tags); } catch { body.tags = []; }
      }
      const input = api.knowledgeBase.update.input.parse(body);
      const a = await storage.updateKnowledgeBaseArticle(Number(req.params.id), input);
      if (!a) return res.status(404).json({ message: "Article not found" });
      await storage.createAuditLogEntry({
        entityType: "knowledge_base_article", entityId: a.id,
        action: "updated", actor: "System",
        details: `Article "${a.title}" updated`
      });
      res.json(a);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });
  app.delete(api.knowledgeBase.delete.path, async (req, res) => {
    const existing = await storage.getKnowledgeBaseArticle(Number(req.params.id));
    if (!existing) return res.status(404).json({ message: "Article not found" });
    await storage.deleteKnowledgeBaseArticle(Number(req.params.id));
    await storage.createAuditLogEntry({
      entityType: "knowledge_base_article", entityId: existing.id,
      action: "deleted", actor: "System",
      details: `Article "${existing.title}" deleted`
    });
    res.status(204).send();
  });

  // === USERS ===
  app.get(api.users.list.path, async (_req, res) => {
    res.json(await storage.getUsers());
  });
  app.get(api.users.get.path, async (req, res) => {
    const user = await storage.getUser(Number(req.params.id));
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  });
  app.post(api.users.create.path, async (req, res) => {
    try {
      const input = api.users.create.input.parse(req.body);
      const user = await storage.createUser(input);
      await storage.createAuditLogEntry({
        entityType: "user", entityId: user.id,
        action: "created", actor: "System",
        details: `User "${user.firstName} ${user.lastName}" created`
      });
      res.status(201).json(user);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });
  app.put(api.users.update.path, async (req, res) => {
    try {
      const input = api.users.update.input.parse(req.body);
      const user = await storage.updateUser(Number(req.params.id), input);
      if (!user) return res.status(404).json({ message: "User not found" });
      await storage.createAuditLogEntry({
        entityType: "user", entityId: user.id,
        action: "updated", actor: "System",
        details: `User "${user.firstName} ${user.lastName}" updated`
      });
      res.json(user);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });
  app.put("/api/users/:id/deactivate", async (req, res) => {
    const existing = await storage.getUser(Number(req.params.id));
    if (!existing) return res.status(404).json({ message: "User not found" });
    const deactivated = await storage.deactivateUser(Number(req.params.id));
    await storage.createAuditLogEntry({
      entityType: "user", entityId: existing.id,
      action: "deactivated", actor: "System",
      details: `User "${existing.firstName} ${existing.lastName}" deactivated`
    });
    res.json(deactivated);
  });

  // === ADMIN TABLES ===
  const VALID_ADMIN_TABLES = ["entity-types", "roles", "jurisdictions", "document-categories", "finding-severities", "document-statuses"];

  app.get("/api/admin/:table", async (req, res) => {
    if (!VALID_ADMIN_TABLES.includes(req.params.table)) return res.status(404).json({ message: "Unknown table" });
    res.json(await storage.getAdminRecords(req.params.table));
  });
  app.post("/api/admin/:table", async (req, res) => {
    if (!VALID_ADMIN_TABLES.includes(req.params.table)) return res.status(404).json({ message: "Unknown table" });
    try {
      const input = api.admin.create.input.parse(req.body);
      const record = await storage.createAdminRecord(req.params.table, input);
      res.status(201).json(record);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });
  app.put("/api/admin/:table/:id", async (req, res) => {
    if (!VALID_ADMIN_TABLES.includes(req.params.table)) return res.status(404).json({ message: "Unknown table" });
    try {
      const input = api.admin.update.input.parse(req.body);
      const record = await storage.updateAdminRecord(req.params.table, Number(req.params.id), input);
      if (!record) return res.status(404).json({ message: "Record not found" });
      res.json(record);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });
  app.delete("/api/admin/:table/:id", async (req, res) => {
    if (!VALID_ADMIN_TABLES.includes(req.params.table)) return res.status(404).json({ message: "Unknown table" });
    const existing = await storage.getAdminRecord(req.params.table, Number(req.params.id));
    if (!existing) return res.status(404).json({ message: "Record not found" });
    await storage.deleteAdminRecord(req.params.table, Number(req.params.id));
    res.status(204).send();
  });
  app.post("/api/admin/:table/reorder", async (req, res) => {
    if (!VALID_ADMIN_TABLES.includes(req.params.table)) return res.status(404).json({ message: "Unknown table" });
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds) || !orderedIds.every((id: any) => typeof id === "number")) {
      return res.status(400).json({ message: "orderedIds must be an array of numbers" });
    }
    const records = await storage.reorderAdminRecords(req.params.table, orderedIds);
    res.json(records);
  });

  // === RISKS ===
  app.get(api.risks.list.path, async (_req, res) => {
    res.json(await storage.getRisks());
  });
  app.get(api.risks.get.path, async (req, res) => {
    const r = await storage.getRisk(Number(req.params.id));
    if (!r) return res.status(404).json({ message: "Risk not found" });
    res.json(r);
  });
  app.post(api.risks.create.path, async (req, res) => {
    try {
      const body = { ...req.body };
      if (body.reviewDate && typeof body.reviewDate === "string") body.reviewDate = new Date(body.reviewDate);
      if (typeof body.businessUnitId === "string") body.businessUnitId = body.businessUnitId === "" || body.businessUnitId === "null" ? null : Number(body.businessUnitId);
      if (typeof body.requirementId === "string") body.requirementId = body.requirementId === "" || body.requirementId === "null" ? null : Number(body.requirementId);
      const score = (body.inherentLikelihood || 3) * (body.inherentImpact || 3);
      body.inherentScore = score;
      body.inherentRating = score >= 20 ? "Critical" : score >= 12 ? "High" : score >= 6 ? "Medium" : "Low";
      const resScore = (body.residualLikelihood || 3) * (body.residualImpact || 3);
      body.residualScore = resScore;
      body.residualRating = resScore >= 20 ? "Critical" : resScore >= 12 ? "High" : resScore >= 6 ? "Medium" : "Low";
      const input = api.risks.create.input.parse(body);
      const r = await storage.createRisk(input);
      await storage.createAuditLogEntry({
        entityType: "risk", entityId: r.id,
        action: "created", actor: input.owner, details: `Risk "${r.title}" created`
      });
      res.status(201).json(r);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });
  app.put(api.risks.update.path, async (req, res) => {
    try {
      const body = { ...req.body };
      if (body.reviewDate && typeof body.reviewDate === "string") body.reviewDate = new Date(body.reviewDate);
      if (typeof body.businessUnitId === "string") body.businessUnitId = body.businessUnitId === "" || body.businessUnitId === "null" ? null : Number(body.businessUnitId);
      if (typeof body.requirementId === "string") body.requirementId = body.requirementId === "" || body.requirementId === "null" ? null : Number(body.requirementId);
      if (body.inherentLikelihood !== undefined && body.inherentImpact !== undefined) {
        const score = body.inherentLikelihood * body.inherentImpact;
        body.inherentScore = score;
        body.inherentRating = score >= 20 ? "Critical" : score >= 12 ? "High" : score >= 6 ? "Medium" : "Low";
      }
      if (body.residualLikelihood !== undefined && body.residualImpact !== undefined) {
        const resScore = body.residualLikelihood * body.residualImpact;
        body.residualScore = resScore;
        body.residualRating = resScore >= 20 ? "Critical" : resScore >= 12 ? "High" : resScore >= 6 ? "Medium" : "Low";
      }
      const input = api.risks.update.input.parse(body);
      const r = await storage.updateRisk(Number(req.params.id), input);
      if (!r) return res.status(404).json({ message: "Risk not found" });
      res.json(r);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });
  app.delete(api.risks.delete.path, async (req, res) => {
    const existing = await storage.getRisk(Number(req.params.id));
    if (!existing) return res.status(404).json({ message: "Risk not found" });
    await storage.deleteRisk(Number(req.params.id));
    await storage.createAuditLogEntry({
      entityType: "risk", entityId: existing.id,
      action: "deleted", actor: "System", details: `Risk "${existing.title}" deleted`
    });
    res.status(204).send();
  });

  // === RISK LIBRARY ===
  app.get(api.riskLibrary.list.path, async (_req, res) => {
    res.json(await storage.getRiskLibraryItems());
  });
  app.get(api.riskLibrary.get.path, async (req, res) => {
    const r = await storage.getRiskLibraryItem(Number(req.params.id));
    if (!r) return res.status(404).json({ message: "Risk Library item not found" });
    res.json(r);
  });
  app.post(api.riskLibrary.create.path, async (req, res) => {
    try {
      const input = api.riskLibrary.create.input.parse(req.body);
      const r = await storage.createRiskLibraryItem(input);
      res.status(201).json(r);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });
  app.put(api.riskLibrary.update.path, async (req, res) => {
    try {
      const input = api.riskLibrary.update.input.parse(req.body);
      const r = await storage.updateRiskLibraryItem(Number(req.params.id), input);
      if (!r) return res.status(404).json({ message: "Risk Library item not found" });
      res.json(r);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });
  app.delete(api.riskLibrary.delete.path, async (req, res) => {
    const existing = await storage.getRiskLibraryItem(Number(req.params.id));
    if (!existing) return res.status(404).json({ message: "Risk Library item not found" });
    await storage.deleteRiskLibraryItem(Number(req.params.id));
    res.status(204).send();
  });

  // === RISK ACTIONS ===
  app.get(api.riskActions.list.path, async (_req, res) => {
    res.json(await storage.getRiskActions());
  });
  app.get(api.riskActions.get.path, async (req, res) => {
    const a = await storage.getRiskAction(Number(req.params.id));
    if (!a) return res.status(404).json({ message: "Risk Action not found" });
    res.json(a);
  });
  app.post(api.riskActions.create.path, async (req, res) => {
    try {
      const body = { ...req.body };
      if (body.dueDate && typeof body.dueDate === "string") body.dueDate = new Date(body.dueDate);
      if (typeof body.riskId === "string") body.riskId = Number(body.riskId);
      const input = api.riskActions.create.input.parse(body);
      const a = await storage.createRiskAction(input);
      await storage.createAuditLogEntry({
        entityType: "risk_action", entityId: a.id,
        action: "created", actor: input.assignee, details: `Risk action "${a.title}" created`
      });
      res.status(201).json(a);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });
  app.put(api.riskActions.update.path, async (req, res) => {
    try {
      const body = { ...req.body };
      if (body.dueDate && typeof body.dueDate === "string") body.dueDate = new Date(body.dueDate);
      if (body.completedDate && typeof body.completedDate === "string") body.completedDate = new Date(body.completedDate);
      if (typeof body.riskId === "string") body.riskId = Number(body.riskId);
      const input = api.riskActions.update.input.parse(body);
      const a = await storage.updateRiskAction(Number(req.params.id), input);
      if (!a) return res.status(404).json({ message: "Risk Action not found" });
      res.json(a);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });
  app.delete(api.riskActions.delete.path, async (req, res) => {
    const existing = await storage.getRiskAction(Number(req.params.id));
    if (!existing) return res.status(404).json({ message: "Risk Action not found" });
    await storage.deleteRiskAction(Number(req.params.id));
    res.status(204).send();
  });

  // === RISK SNAPSHOTS ===
  app.get(api.riskSnapshots.list.path, async (_req, res) => {
    res.json(await storage.getRiskSnapshots());
  });
  app.post(api.riskSnapshots.create.path, async (req, res) => {
    try {
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
        name: body.name || `Snapshot ${new Date().toISOString().split('T')[0]}`,
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
      res.status(201).json(s);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });
  app.delete(api.riskSnapshots.delete.path, async (req, res) => {
    await storage.deleteRiskSnapshot(Number(req.params.id));
    res.status(204).send();
  });

  // === RISK SETTINGS ===
  app.get(api.riskCategories.list.path, async (_req, res) => {
    res.json(await storage.getRiskCategories());
  });
  app.post(api.riskCategories.create.path, async (req, res) => {
    try {
      const input = api.riskCategories.create.input.parse(req.body);
      res.status(201).json(await storage.createRiskCategory(input));
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });
  app.put(api.riskCategories.update.path, async (req, res) => {
    const r = await storage.updateRiskCategory(Number(req.params.id), req.body);
    if (!r) return res.status(404).json({ message: "Not found" });
    res.json(r);
  });
  app.delete(api.riskCategories.delete.path, async (req, res) => {
    await storage.deleteRiskCategory(Number(req.params.id));
    res.status(204).send();
  });

  app.get(api.impactLevels.list.path, async (_req, res) => {
    res.json(await storage.getImpactLevels());
  });
  app.post(api.impactLevels.create.path, async (req, res) => {
    try {
      const input = api.impactLevels.create.input.parse(req.body);
      res.status(201).json(await storage.createImpactLevel(input));
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });
  app.put(api.impactLevels.update.path, async (req, res) => {
    const r = await storage.updateImpactLevel(Number(req.params.id), req.body);
    if (!r) return res.status(404).json({ message: "Not found" });
    res.json(r);
  });
  app.delete(api.impactLevels.delete.path, async (req, res) => {
    await storage.deleteImpactLevel(Number(req.params.id));
    res.status(204).send();
  });

  app.get(api.likelihoodLevels.list.path, async (_req, res) => {
    res.json(await storage.getLikelihoodLevels());
  });
  app.post(api.likelihoodLevels.create.path, async (req, res) => {
    try {
      const input = api.likelihoodLevels.create.input.parse(req.body);
      res.status(201).json(await storage.createLikelihoodLevel(input));
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });
  app.put(api.likelihoodLevels.update.path, async (req, res) => {
    const r = await storage.updateLikelihoodLevel(Number(req.params.id), req.body);
    if (!r) return res.status(404).json({ message: "Not found" });
    res.json(r);
  });
  app.delete(api.likelihoodLevels.delete.path, async (req, res) => {
    await storage.deleteLikelihoodLevel(Number(req.params.id));
    res.status(204).send();
  });

  // === STATS ===
  app.get(api.stats.get.path, async (_req, res) => {
    const allDocs = await storage.getDocuments();
    const allReqs = await storage.getRequirements();
    const allSources = await storage.getRegulatorySources();
    const allBUs = await storage.getBusinessUnits();
    const allMappings = await storage.getRequirementMappings();
    const allFindings = await storage.getFindings();
    const allApprovals = await storage.getApprovals();

    const coveredCount = allMappings.filter(m => m.coverageStatus === 'Covered').length;
    const partiallyCoveredCount = allMappings.filter(m => m.coverageStatus === 'Partially Covered').length;
    const notCoveredCount = allMappings.filter(m => m.coverageStatus === 'Not Covered').length;
    const openFindings = allFindings.filter(f => f.status !== 'Closed' && f.status !== 'Verified').length;
    const overdueFindings = allFindings.filter(f =>
      f.status !== 'Closed' && f.status !== 'Verified' && f.dueDate && new Date(f.dueDate) < new Date()
    ).length;
    const pendingApprovals = allApprovals.filter(a => a.status === 'Pending').length;
    const pendingReviews = allDocs.filter(d =>
      d.nextReviewDate && new Date(d.nextReviewDate) <= new Date()
    ).length;

    res.json({
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
  });

  return httpServer;
}

