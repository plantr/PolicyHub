import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { db } from "./db";
import { createHash } from "crypto";
import multer from "multer";
import { generateS3Key, uploadToS3, getPresignedDownloadUrl, deleteFromS3 } from "./s3";

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
      }

      res.status(201).json(version);
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

      const url = await getPresignedDownloadUrl(version.pdfS3Key, version.pdfFileName || "policy.pdf");
      res.json({ url });
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
  const VALID_ADMIN_TABLES = ["entity-types", "roles", "jurisdictions", "document-categories", "finding-severities"];

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

