import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { db } from "./db";
import { createHash } from "crypto";
import {
  businessUnits, regulatoryProfiles, regulatorySources, requirements,
  documents, documentVersions, addenda, effectivePolicies,
  approvals, auditLog, reviewHistory, requirementMappings,
  findings, findingEvidence, policyLinks, lookups
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
  app.post(api.documents.create.path, async (req, res) => {
    try {
      const body = { ...req.body };
      if (body.nextReviewDate && typeof body.nextReviewDate === "string") body.nextReviewDate = new Date(body.nextReviewDate);
      const input = api.documents.create.input.parse(body);
      const doc = await storage.createDocument(input);
      await storage.createAuditLogEntry({
        entityType: "document", entityId: doc.id,
        action: "created", actor: input.owner, details: `Document "${doc.title}" created`
      });
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
  app.post(api.documentVersions.create.path, async (req, res) => {
    try {
      const input = api.documentVersions.create.input.parse(req.body);
      const contentHash = createHash('sha256').update(input.content).digest('hex');
      const version = await storage.createDocumentVersion({ ...input, contentHash });
      await storage.createAuditLogEntry({
        entityType: "document_version", entityId: version.id,
        action: "created", actor: input.createdBy,
        details: `Version ${input.version} created (hash: ${contentHash.substring(0, 12)})`
      });
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

  // === LOOKUPS ===
  app.get(api.lookups.list.path, async (_req, res) => {
    res.json(await storage.getLookups());
  });
  app.get(api.lookups.byCategory.path, async (req, res) => {
    res.json(await storage.getLookupsByCategory(req.params.category));
  });
  app.post(api.lookups.create.path, async (req, res) => {
    try {
      const input = api.lookups.create.input.parse(req.body);
      const lookup = await storage.createLookup(input);
      res.status(201).json(lookup);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });
  app.put(api.lookups.update.path, async (req, res) => {
    try {
      const input = api.lookups.update.input.parse(req.body);
      const lookup = await storage.updateLookup(Number(req.params.id), input);
      if (!lookup) return res.status(404).json({ message: "Lookup not found" });
      res.json(lookup);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });
  app.delete(api.lookups.delete.path, async (req, res) => {
    const existing = await storage.getLookup(Number(req.params.id));
    if (!existing) return res.status(404).json({ message: "Lookup not found" });
    await storage.deleteLookup(Number(req.params.id));
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

  // Seed
  await seedDatabase();

  return httpServer;
}


// =============================================
// COMPREHENSIVE SEED DATA
// =============================================
async function seedDatabase() {
  const existingBUs = await storage.getBusinessUnits();
  if (existingBUs.length > 0) return;

  // ---- BUSINESS UNITS ----
  const [buUK] = await db.insert(businessUnits).values({
    name: "UK EMI",
    jurisdiction: "United Kingdom",
    type: "EMI",
    activities: ["Electronic money issuance", "Payment services", "Safeguarding"],
    description: "UK-authorised Electronic Money Institution for fiat payment services"
  }).returning();

  const [buGibEMI] = await db.insert(businessUnits).values({
    name: "Gibraltar EMI",
    jurisdiction: "Gibraltar",
    type: "EMI",
    activities: ["Electronic money issuance", "Payment services"],
    description: "Gibraltar-licensed EMI for electronic money and payment services"
  }).returning();

  const [buGibVASP] = await db.insert(businessUnits).values({
    name: "Gibraltar DLT/VASP",
    jurisdiction: "Gibraltar",
    type: "VASP",
    activities: ["DLT provider", "Virtual asset services", "Crypto custody"],
    description: "Gibraltar DLT-licensed provider for crypto-asset and virtual asset services"
  }).returning();

  const [buEstonia] = await db.insert(businessUnits).values({
    name: "Estonia CASP",
    jurisdiction: "Estonia / EU",
    type: "CASP",
    activities: ["Crypto-asset services", "Custody", "Exchange", "Transfer"],
    description: "Estonia-authorised Crypto-Asset Service Provider under MiCA"
  }).returning();

  // ---- REGULATORY SOURCES (full seed from brief) ----

  // UK Sources
  const [srcEMR] = await db.insert(regulatorySources).values({
    name: "Electronic Money Regulations 2011",
    shortName: "EMR 2011",
    jurisdiction: "United Kingdom",
    url: "https://www.legislation.gov.uk/id/uksi/2011/99",
    category: "E-Money",
    description: "Primary UK legislation governing electronic money institutions"
  }).returning();

  const [srcPSR] = await db.insert(regulatorySources).values({
    name: "Payment Services Regulations 2017",
    shortName: "PSR 2017",
    jurisdiction: "United Kingdom",
    url: "https://www.legislation.gov.uk/uksi/2017/752/contents",
    category: "Payments",
    description: "UK implementation of PSD2 for payment service providers"
  }).returning();

  const [srcMLR] = await db.insert(regulatorySources).values({
    name: "Money Laundering Regulations 2017",
    shortName: "MLR 2017",
    jurisdiction: "United Kingdom",
    url: "https://www.legislation.gov.uk/id/uksi/2017/692",
    category: "AML",
    description: "UK AML/CTF obligations for regulated firms"
  }).returning();

  const [srcFCA] = await db.insert(regulatorySources).values({
    name: "FCA Payments & E-Money Overview",
    shortName: "FCA Guidance",
    jurisdiction: "United Kingdom",
    url: "https://www.fca.org.uk/firms/payment-services-regulations-e-money-regulations",
    category: "Guidance",
    description: "FCA regulatory guidance for payments and e-money firms"
  }).returning();

  const [srcSYSC] = await db.insert(regulatorySources).values({
    name: "FCA SYSC (Systems and Controls)",
    shortName: "FCA SYSC",
    jurisdiction: "United Kingdom",
    url: "https://handbook.fca.org.uk/handbook/SYSC/3/1.html",
    category: "Governance",
    description: "FCA handbook requirements for systems and controls"
  }).returning();

  const [srcPS25] = await db.insert(regulatorySources).values({
    name: "FCA Safeguarding Policy Statement (PS25/12)",
    shortName: "PS25/12",
    jurisdiction: "United Kingdom",
    url: "https://www.fca.org.uk/publications/policy-statements/ps25-12-changes-safeguarding-regime-payments-and-e-money-firms",
    category: "Safeguarding",
    description: "FCA changes to safeguarding regime for payments and e-money firms"
  }).returning();

  const [srcUKGDPR] = await db.insert(regulatorySources).values({
    name: "UK GDPR + Data Protection Act 2018",
    shortName: "UK GDPR",
    jurisdiction: "United Kingdom",
    url: "https://www.gov.uk/data-protection",
    category: "Data Protection",
    description: "UK data protection regime including UK GDPR"
  }).returning();

  const [srcICO] = await db.insert(regulatorySources).values({
    name: "ICO UK GDPR Guidance",
    shortName: "ICO Guidance",
    jurisdiction: "United Kingdom",
    url: "https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/",
    category: "Data Protection",
    description: "Information Commissioner's Office guidance on UK GDPR compliance"
  }).returning();

  const [srcJMLSG] = await db.insert(regulatorySources).values({
    name: "JMLSG AML/CTF Guidance",
    shortName: "JMLSG",
    jurisdiction: "United Kingdom",
    url: "https://www.jmlsg.org.uk/guidance/current-guidance/",
    category: "AML",
    description: "Joint Money Laundering Steering Group guidance for the UK financial sector"
  }).returning();

  // Gibraltar Sources
  const [srcGibEMR] = await db.insert(regulatorySources).values({
    name: "Financial Services (Electronic Money) Regulations 2020",
    shortName: "Gib EMR 2020",
    jurisdiction: "Gibraltar",
    url: "https://www.gibraltarlaws.gov.gi/legislations/financial-services-electronic-money-regulations-2020-4783",
    category: "E-Money",
    description: "Gibraltar electronic money regulations"
  }).returning();

  const [srcGibPSR] = await db.insert(regulatorySources).values({
    name: "Financial Services (Payment Services) Regulations 2020",
    shortName: "Gib PSR 2020",
    jurisdiction: "Gibraltar",
    url: "https://www.gibraltarlaws.gov.gi/legislations/financial-services-payment-services-regulations-2020-4793",
    category: "Payments",
    description: "Gibraltar payment services regulations"
  }).returning();

  const [srcGibDLT] = await db.insert(regulatorySources).values({
    name: "GFSC DLT Framework",
    shortName: "DLT Framework",
    jurisdiction: "Gibraltar",
    url: "https://www.fsc.gi/news/distributed-ledger-technology-dlt-regulatory-framework-270",
    category: "Crypto/DLT",
    description: "Gibraltar Financial Services Commission DLT regulatory framework"
  }).returning();

  const [srcGibVAML] = await db.insert(regulatorySources).values({
    name: "Gibraltar Virtual Asset Market Integrity",
    shortName: "VA Market Integrity",
    jurisdiction: "Gibraltar",
    url: "https://www.gibraltarfinance.gi/news/gibraltar-introduces-new-virtual-asset-legislation-defining-standards-for-market-integrity-150",
    category: "Market Integrity",
    description: "Gibraltar virtual asset market integrity legislation"
  }).returning();

  const [srcGibAML] = await db.insert(regulatorySources).values({
    name: "GFSC AML Supervisory Approach",
    shortName: "GFSC AML",
    jurisdiction: "Gibraltar",
    url: "https://www.fsc.gi/aml",
    category: "AML",
    description: "Gibraltar Financial Services Commission AML supervisory approach"
  }).returning();

  const [srcPOCA] = await db.insert(regulatorySources).values({
    name: "Proceeds of Crime Act 2015 (Gibraltar)",
    shortName: "POCA 2015",
    jurisdiction: "Gibraltar",
    url: "https://www.gibraltarlaws.gov.gi/legislations/proceeds-of-crime-act-2015-2348",
    category: "AML",
    description: "Gibraltar proceeds of crime legislation"
  }).returning();

  // Estonia / EU Sources
  const [srcMiCA] = await db.insert(regulatorySources).values({
    name: "Markets in Crypto-Assets Regulation (MiCA)",
    shortName: "MiCA",
    jurisdiction: "Estonia / EU",
    url: "https://eur-lex.europa.eu/eli/reg/2023/1114/oj/eng",
    category: "Crypto/DLT",
    description: "EU Regulation 2023/1114 on markets in crypto-assets"
  }).returning();

  const [srcEstMCA] = await db.insert(regulatorySources).values({
    name: "Estonia Market in Crypto-Assets Act",
    shortName: "Estonia MCA",
    jurisdiction: "Estonia / EU",
    url: "https://www.riigiteataja.ee/en/eli/ee/519092024001/consolide",
    category: "Crypto/DLT",
    description: "Estonian national implementation of MiCA with transitional provisions"
  }).returning();

  const [srcDORA] = await db.insert(regulatorySources).values({
    name: "Digital Operational Resilience Act (DORA)",
    shortName: "DORA",
    jurisdiction: "Estonia / EU",
    url: "https://eur-lex.europa.eu/eli/reg/2022/2554/oj/eng",
    category: "ICT/Resilience",
    description: "EU Regulation 2022/2554 on digital operational resilience for the financial sector"
  }).returning();

  const [srcTFR] = await db.insert(regulatorySources).values({
    name: "Transfer of Funds Regulation / Travel Rule",
    shortName: "TFR / Travel Rule",
    jurisdiction: "Estonia / EU",
    url: "https://eur-lex.europa.eu/eli/reg/2023/1113/oj/eng",
    category: "AML",
    description: "EU Regulation 2023/1113 on information accompanying transfers of funds and crypto-assets"
  }).returning();

  const [srcEUAML] = await db.insert(regulatorySources).values({
    name: "EU AML Regulation",
    shortName: "EU AMLR",
    jurisdiction: "Estonia / EU",
    url: "https://eur-lex.europa.eu/eli/reg/2024/1624/oj/eng",
    category: "AML",
    description: "EU Regulation 2024/1624 on prevention of money laundering and terrorist financing"
  }).returning();

  const [srcFATF] = await db.insert(regulatorySources).values({
    name: "FATF RBA Guidance for VAs/VASPs",
    shortName: "FATF VA/VASP",
    jurisdiction: "International",
    url: "https://www.fatf-gafi.org/en/publications/Fatfrecommendations/Guidance-rba-virtual-assets-2021.html",
    category: "AML",
    description: "FATF risk-based approach guidance for virtual assets and virtual asset service providers"
  }).returning();

  // ---- REGULATORY PROFILES (which sources apply to which BU) ----
  // UK EMI profiles
  for (const src of [srcEMR, srcPSR, srcMLR, srcFCA, srcSYSC, srcPS25, srcUKGDPR, srcICO, srcJMLSG]) {
    await db.insert(regulatoryProfiles).values({
      businessUnitId: buUK.id, sourceId: src.id, enabled: true
    });
  }
  // Gibraltar EMI profiles
  for (const src of [srcGibEMR, srcGibPSR, srcGibAML, srcPOCA]) {
    await db.insert(regulatoryProfiles).values({
      businessUnitId: buGibEMI.id, sourceId: src.id, enabled: true
    });
  }
  // Gibraltar VASP profiles
  for (const src of [srcGibDLT, srcGibVAML, srcGibAML, srcPOCA]) {
    await db.insert(regulatoryProfiles).values({
      businessUnitId: buGibVASP.id, sourceId: src.id, enabled: true
    });
  }
  // Estonia CASP profiles
  for (const src of [srcMiCA, srcEstMCA, srcDORA, srcTFR, srcEUAML, srcFATF]) {
    await db.insert(regulatoryProfiles).values({
      businessUnitId: buEstonia.id, sourceId: src.id, enabled: true
    });
  }

  // ---- REQUIREMENTS (sample obligations from each source) ----
  const reqData = [
    // EMR 2011
    { sourceId: srcEMR.id, code: "EMR-20", title: "Safeguarding of Funds", description: "An authorised electronic money institution must safeguard funds that have been received in exchange for electronic money that has been issued", category: "Safeguarding", article: "Regulation 20" },
    { sourceId: srcEMR.id, code: "EMR-21", title: "Organisational Arrangements", description: "An authorised EMI must have robust governance arrangements including a clear organisational structure with well defined, transparent and consistent lines of responsibility", category: "Governance", article: "Regulation 21" },
    { sourceId: srcEMR.id, code: "EMR-22", title: "Record Keeping", description: "EMI must maintain relevant records for at least 5 years", category: "Governance", article: "Regulation 22" },
    // PSR 2017
    { sourceId: srcPSR.id, code: "PSR-19", title: "Safeguarding (Payment Institutions)", description: "Authorised payment institutions must safeguard relevant funds received from payment service users", category: "Safeguarding", article: "Regulation 19" },
    { sourceId: srcPSR.id, code: "PSR-106", title: "Strong Customer Authentication", description: "Payment service providers must apply strong customer authentication where the payer initiates an electronic payment transaction", category: "Security", article: "Regulation 100" },
    { sourceId: srcPSR.id, code: "PSR-72", title: "Information Requirements", description: "Payment service providers must provide specified information to payment service users", category: "Consumer Protection", article: "Regulation 72" },
    // MLR 2017
    { sourceId: srcMLR.id, code: "MLR-18", title: "Risk Assessment by Firm", description: "A relevant person must take appropriate steps to identify and assess the risks of money laundering and terrorist financing", category: "AML", article: "Regulation 18" },
    { sourceId: srcMLR.id, code: "MLR-19", title: "Policies, Controls and Procedures", description: "A relevant person must establish and maintain policies, controls and procedures to mitigate and manage effectively the risks of ML/TF", category: "AML", article: "Regulation 19" },
    { sourceId: srcMLR.id, code: "MLR-27", title: "Customer Due Diligence", description: "A relevant person must apply CDD measures when establishing a business relationship or carrying out an occasional transaction", category: "AML", article: "Regulation 27" },
    { sourceId: srcMLR.id, code: "MLR-28", title: "Enhanced Due Diligence", description: "A relevant person must apply EDD measures and enhanced ongoing monitoring in high-risk situations", category: "AML", article: "Regulation 28" },
    // UK GDPR
    { sourceId: srcUKGDPR.id, code: "GDPR-5", title: "Principles of Data Processing", description: "Personal data shall be processed lawfully, fairly and in a transparent manner in relation to the data subject", category: "Data Protection", article: "Article 5" },
    { sourceId: srcUKGDPR.id, code: "GDPR-32", title: "Security of Processing", description: "Controller and processor shall implement appropriate technical and organisational measures to ensure a level of security appropriate to the risk", category: "Data Protection", article: "Article 32" },
    // FCA SYSC
    { sourceId: srcSYSC.id, code: "SYSC-3.1", title: "Systems and Controls", description: "A firm must take reasonable care to establish and maintain such systems and controls as are appropriate to its business", category: "Governance", article: "SYSC 3.1.1R" },
    { sourceId: srcSYSC.id, code: "SYSC-6.1", title: "Compliance Function", description: "A firm must establish, implement and maintain adequate policies and procedures to detect risk of failure to comply with regulatory obligations", category: "Compliance", article: "SYSC 6.1.1R" },
    // Gibraltar EMR/PSR
    { sourceId: srcGibEMR.id, code: "GIB-EMR-SF", title: "Safeguarding (Gibraltar EMI)", description: "Gibraltar-authorised EMI must safeguard funds received in exchange for electronic money", category: "Safeguarding", article: "Part 4" },
    { sourceId: srcGibPSR.id, code: "GIB-PSR-SF", title: "Safeguarding (Gibraltar PI)", description: "Gibraltar payment institutions must safeguard relevant funds", category: "Safeguarding", article: "Part 4" },
    // Gibraltar DLT
    { sourceId: srcGibDLT.id, code: "DLT-P1", title: "Honesty and Integrity", description: "A DLT provider must conduct its business with honesty and integrity", category: "Governance", article: "Principle 1" },
    { sourceId: srcGibDLT.id, code: "DLT-P2", title: "Customer Care", description: "A DLT provider must pay due regard to the interests and needs of each and all of its customers", category: "Consumer Protection", article: "Principle 2" },
    { sourceId: srcGibDLT.id, code: "DLT-P6", title: "Customer Assets", description: "A DLT provider must ensure that all customer assets are adequately protected", category: "Safeguarding", article: "Principle 6" },
    { sourceId: srcGibDLT.id, code: "DLT-P9", title: "Financial Crime Prevention", description: "A DLT provider must have systems in place to prevent, detect and disclose financial crime risks", category: "AML", article: "Principle 9" },
    // POCA
    { sourceId: srcPOCA.id, code: "POCA-CDD", title: "Customer Due Diligence (Gibraltar)", description: "Relevant financial businesses must apply customer due diligence measures", category: "AML", article: "Part 3" },
    // MiCA
    { sourceId: srcMiCA.id, code: "MiCA-59", title: "Authorisation of CASPs", description: "No person shall provide crypto-asset services in the Union unless that person is a legal person or other undertaking authorised as a CASP", category: "Authorisation", article: "Article 59" },
    { sourceId: srcMiCA.id, code: "MiCA-67", title: "Organisational Requirements", description: "CASPs shall have adequate internal control mechanisms and effective procedures for risk assessment", category: "Governance", article: "Article 67" },
    { sourceId: srcMiCA.id, code: "MiCA-68", title: "Prudential Safeguards", description: "CASPs shall have prudential safeguards equal to at least the higher of the minimum capital requirement or one quarter of fixed overheads", category: "Capital", article: "Article 68" },
    { sourceId: srcMiCA.id, code: "MiCA-70", title: "Safekeeping of Crypto-Assets", description: "CASPs providing custody shall establish a custody policy with adequate arrangements to safekeep crypto-assets", category: "Safeguarding", article: "Article 70" },
    { sourceId: srcMiCA.id, code: "MiCA-79", title: "Transfer Services", description: "CASPs providing transfer services for crypto-assets on behalf of clients shall conclude an agreement", category: "Operations", article: "Article 79" },
    // DORA
    { sourceId: srcDORA.id, code: "DORA-5", title: "ICT Risk Management Framework", description: "Financial entities shall have a sound, comprehensive and well-documented ICT risk management framework", category: "ICT/Resilience", article: "Article 5" },
    { sourceId: srcDORA.id, code: "DORA-6", title: "ICT Systems and Protocols", description: "Financial entities shall use and maintain updated ICT systems, protocols and tools that are appropriate to support all ICT functions", category: "ICT/Resilience", article: "Article 6" },
    { sourceId: srcDORA.id, code: "DORA-9", title: "Detection", description: "Financial entities shall have mechanisms to promptly detect anomalous activities", category: "ICT/Resilience", article: "Article 9" },
    { sourceId: srcDORA.id, code: "DORA-11", title: "ICT Business Continuity", description: "Financial entities shall put in place a comprehensive ICT business continuity policy", category: "ICT/Resilience", article: "Article 11" },
    { sourceId: srcDORA.id, code: "DORA-28", title: "Third-Party ICT Risk", description: "Financial entities shall manage ICT third-party risk as an integral component of ICT risk within their ICT risk management framework", category: "Outsourcing", article: "Article 28" },
    // TFR / Travel Rule
    { sourceId: srcTFR.id, code: "TFR-4", title: "Information on Payer/Originator", description: "CASPs of the originator shall ensure that transfers of crypto-assets are accompanied by information on the originator", category: "AML", article: "Article 14" },
    { sourceId: srcTFR.id, code: "TFR-5", title: "Information on Beneficiary", description: "CASPs shall ensure that transfers include the name of the beneficiary and beneficiary account number", category: "AML", article: "Article 14" },
    // EU AMLR
    { sourceId: srcEUAML.id, code: "AMLR-CDD", title: "Customer Due Diligence (EU)", description: "Obliged entities shall apply customer due diligence measures when establishing a business relationship", category: "AML", article: "Chapter III" },
    { sourceId: srcEUAML.id, code: "AMLR-BO", title: "Beneficial Ownership", description: "Obliged entities shall identify the beneficial owner and take reasonable measures to verify that person's identity", category: "AML", article: "Chapter III" },
    { sourceId: srcEUAML.id, code: "AMLR-SAR", title: "Suspicious Activity Reporting", description: "Obliged entities shall report suspicious transactions and activities to the relevant FIU", category: "AML", article: "Chapter V" },
  ];

  const insertedReqs: any[] = [];
  for (const r of reqData) {
    const [req] = await db.insert(requirements).values(r).returning();
    insertedReqs.push(req);
  }

  // ---- DOCUMENTS (Group-level + BU-specific) ----
  const [docAML] = await db.insert(documents).values({
    title: "Group AML/CTF Policy",
    docType: "Policy",
    taxonomy: "AML",
    owner: "Group Head of Compliance",
    delegates: ["UK MLRO", "Gibraltar MLRO"],
    reviewers: ["Group Risk Committee", "External AML Advisor"],
    approvers: ["Chief Compliance Officer", "Board Risk Committee"],
    tags: ["AML", "CTF", "KYC", "CDD", "EDD", "Sanctions"],
    reviewFrequency: "Annual",
    nextReviewDate: new Date("2025-06-30"),
    businessUnitId: null,
  }).returning();

  const [docSafeguarding] = await db.insert(documents).values({
    title: "Group Safeguarding Policy",
    docType: "Policy",
    taxonomy: "Safeguarding",
    owner: "Group CFO",
    delegates: ["UK Finance Director"],
    reviewers: ["External Auditor", "Group Compliance"],
    approvers: ["Group CFO", "Board Audit Committee"],
    tags: ["Safeguarding", "Client Funds", "Segregation", "Trust Accounts"],
    reviewFrequency: "Annual",
    nextReviewDate: new Date("2025-03-31"),
    businessUnitId: null,
  }).returning();

  const [docInfoSec] = await db.insert(documents).values({
    title: "Information Security Policy",
    docType: "Policy",
    taxonomy: "Information Security",
    owner: "CISO",
    reviewers: ["IT Director", "DPO"],
    approvers: ["CTO", "Board Risk Committee"],
    tags: ["InfoSec", "Cybersecurity", "Access Control", "Encryption"],
    reviewFrequency: "Annual",
    nextReviewDate: new Date("2025-09-30"),
    businessUnitId: null,
  }).returning();

  const [docDataProtection] = await db.insert(documents).values({
    title: "Data Protection Policy",
    docType: "Policy",
    taxonomy: "Compliance",
    owner: "Data Protection Officer",
    reviewers: ["Legal Counsel", "IT Security"],
    approvers: ["General Counsel", "Board"],
    tags: ["GDPR", "Data Protection", "Privacy", "DPIA"],
    reviewFrequency: "Annual",
    nextReviewDate: new Date("2025-07-15"),
    businessUnitId: null,
  }).returning();

  const [docICT] = await db.insert(documents).values({
    title: "ICT Risk Management Framework",
    docType: "Standard",
    taxonomy: "Information Security",
    owner: "CTO",
    reviewers: ["CISO", "Head of IT Operations"],
    approvers: ["CTO", "Board Risk Committee"],
    tags: ["DORA", "ICT", "Resilience", "BCP", "Third-Party Risk"],
    reviewFrequency: "Annual",
    nextReviewDate: new Date("2025-12-31"),
    businessUnitId: null,
  }).returning();

  const [docCDD] = await db.insert(documents).values({
    title: "CDD Procedures Manual",
    docType: "Procedure",
    taxonomy: "AML",
    owner: "Group Head of Compliance",
    reviewers: ["Operations Manager", "UK MLRO"],
    approvers: ["Chief Compliance Officer"],
    tags: ["CDD", "KYC", "Onboarding", "Verification"],
    reviewFrequency: "Semi-Annual",
    nextReviewDate: new Date("2025-04-30"),
    businessUnitId: null,
  }).returning();

  const [docGibSafeguarding] = await db.insert(documents).values({
    title: "Safeguarding Policy (Gibraltar Addendum)",
    docType: "Policy",
    taxonomy: "Safeguarding",
    owner: "Gibraltar Finance Director",
    reviewers: ["GFSC Liaison"],
    approvers: ["Gibraltar Managing Director"],
    tags: ["Safeguarding", "Gibraltar", "Local"],
    reviewFrequency: "Annual",
    nextReviewDate: new Date("2025-06-30"),
    businessUnitId: buGibEMI.id,
    parentDocumentId: docSafeguarding.id,
  }).returning();

  const [docTravelRule] = await db.insert(documents).values({
    title: "Travel Rule Compliance Procedure",
    docType: "Procedure",
    taxonomy: "AML",
    owner: "Estonia Compliance Manager",
    reviewers: ["Group Head of Compliance"],
    approvers: ["Estonia Managing Director"],
    tags: ["Travel Rule", "TFR", "Wire Transfer", "Crypto Transfer"],
    reviewFrequency: "Annual",
    nextReviewDate: new Date("2025-08-31"),
    businessUnitId: buEstonia.id,
  }).returning();

  const [docOutsourcing] = await db.insert(documents).values({
    title: "Outsourcing and Third-Party Risk Policy",
    docType: "Policy",
    taxonomy: "Operations",
    owner: "COO",
    reviewers: ["Legal", "IT Security", "Compliance"],
    approvers: ["Board"],
    tags: ["Outsourcing", "Third-Party", "Vendor Risk", "DORA"],
    reviewFrequency: "Annual",
    nextReviewDate: new Date("2025-11-30"),
    businessUnitId: null,
  }).returning();

  const [docCompliance] = await db.insert(documents).values({
    title: "Compliance Monitoring Programme",
    docType: "Standard",
    taxonomy: "Compliance",
    owner: "Group Head of Compliance",
    reviewers: ["Internal Audit"],
    approvers: ["Board Audit Committee"],
    tags: ["Compliance", "Monitoring", "Testing", "Assurance"],
    reviewFrequency: "Annual",
    nextReviewDate: new Date("2025-05-31"),
    businessUnitId: null,
  }).returning();

  // ---- DOCUMENT VERSIONS (Immutable) ----
  const amlContent = `# Group AML/CTF Policy\n\n## 1. Purpose\nThis policy establishes the Group's framework for preventing money laundering and terrorist financing across all business units and jurisdictions.\n\n## 2. Scope\nApplies to all Group entities including UK EMI, Gibraltar EMI, Gibraltar DLT/VASP, and Estonia CASP operations.\n\n## 3. Risk Assessment\nThe Group shall conduct an enterprise-wide ML/TF risk assessment at least annually, considering products, customers, delivery channels, and geographic risk.\n\n## 4. Customer Due Diligence\n### 4.1 Standard CDD\nAll customers must undergo identity verification before establishing a business relationship.\n### 4.2 Enhanced Due Diligence\nEDD must be applied to PEPs, high-risk jurisdictions, complex ownership structures, and unusual transaction patterns.\n### 4.3 Simplified Due Diligence\nSDD may be applied only where risk assessment demonstrates lower risk, subject to regulatory approval.\n\n## 5. Transaction Monitoring\nAutomated and manual monitoring of transactions for suspicious activity, with calibrated rules per jurisdiction.\n\n## 6. Suspicious Activity Reporting\nAll staff must report internal suspicions. The MLRO decides on external SAR/STR filings to the relevant FIU.\n\n## 7. Record Keeping\nAll CDD and transaction records retained for minimum 5 years after end of business relationship.\n\n## 8. Training\nAll staff complete AML training upon joining and annually thereafter. Enhanced training for front-line and compliance staff.`;

  const amlHash = createHash('sha256').update(amlContent).digest('hex');
  const [verAML] = await db.insert(documentVersions).values({
    documentId: docAML.id, version: "v2.1", status: "Published",
    content: amlContent, contentHash: amlHash,
    changeReason: "Annual review incorporating updated sanctions guidance",
    changeSummary: "Updated EDD thresholds, added crypto-specific CDD requirements, refreshed jurisdiction risk ratings",
    riskImpact: "Medium - operational procedures updated",
    createdBy: "Group Head of Compliance",
    effectiveDate: new Date("2025-01-15"),
  }).returning();

  const safeguardingContent = `# Group Safeguarding Policy\n\n## 1. Purpose\nTo ensure all client funds held by Group entities are adequately safeguarded in compliance with applicable regulations.\n\n## 2. Safeguarding Methods\n### 2.1 Segregation Method\nClient funds are held in designated safeguarding accounts separate from the firm's own funds.\n### 2.2 Insurance Method\nWhere permitted, an insurance policy or comparable guarantee from an authorised institution may be used.\n\n## 3. Safeguarding Accounts\nAccounts must be held with EEA-authorised credit institutions or the Bank of England.\n\n## 4. Reconciliation\nDaily reconciliation of client funds against internal records. Any discrepancies investigated within 24 hours.\n\n## 5. Wind-Down\nSafeguarding arrangements must ensure orderly wind-down and return of client funds.\n\n## 6. Reporting\nQuarterly safeguarding reports to the Board and relevant regulator.`;

  const sfHash = createHash('sha256').update(safeguardingContent).digest('hex');
  const [verSF] = await db.insert(documentVersions).values({
    documentId: docSafeguarding.id, version: "v1.3", status: "Published",
    content: safeguardingContent, contentHash: sfHash,
    changeReason: "Update to reflect FCA PS25/12 safeguarding changes",
    changeSummary: "Added wind-down provisions, updated reconciliation frequency from weekly to daily",
    riskImpact: "High - impacts client fund handling",
    createdBy: "Group CFO",
    effectiveDate: new Date("2025-02-01"),
  }).returning();

  // Draft version for InfoSec
  const infoSecContent = `# Information Security Policy\n\n## 1. Purpose\nTo protect the confidentiality, integrity and availability of information assets across the Group.\n\n## 2. Access Control\nLeast-privilege access, role-based permissions, multi-factor authentication for all systems.\n\n## 3. Encryption\nAll data encrypted at rest (AES-256) and in transit (TLS 1.3).\n\n## 4. Incident Response\nDefined incident response procedures with escalation to CISO within 4 hours of detection.\n\n## 5. Third-Party Security\nAll third parties with access to systems or data must meet minimum security requirements.`;

  const isHash = createHash('sha256').update(infoSecContent).digest('hex');
  await db.insert(documentVersions).values({
    documentId: docInfoSec.id, version: "v3.0", status: "In Review",
    content: infoSecContent, contentHash: isHash,
    changeReason: "Major revision to incorporate DORA requirements",
    changeSummary: "Added ICT incident classification, updated BCP testing requirements, added third-party ICT concentration risk section",
    riskImpact: "High - comprehensive ICT risk management update",
    createdBy: "CISO",
  });

  // ---- ADDENDA (Model A) ----
  const gibAddendumContent = `## Gibraltar-Specific Safeguarding Requirements\n\n### Local Regulatory Requirements\nIn addition to the Group Safeguarding Policy, the Gibraltar EMI entity must comply with:\n- Financial Services (Electronic Money) Regulations 2020, Part 4\n- GFSC supervisory expectations on client fund safeguarding\n\n### Local Safeguarding Accounts\nClient funds for Gibraltar operations are held with [Gibraltar Credit Institution Name] in designated safeguarding accounts.\n\n### Local Reconciliation\nReconciliation performed in accordance with Group policy (daily), with additional monthly reconciliation report to GFSC.\n\n### Local Wind-Down Planning\nGibraltar-specific wind-down plan maintained separately and reviewed annually by Gibraltar Board.`;

  const [addGib] = await db.insert(addenda).values({
    documentId: docSafeguarding.id,
    businessUnitId: buGibEMI.id,
    versionId: verSF.id,
    content: gibAddendumContent,
    status: "Approved",
    approvedBy: "Gibraltar Managing Director",
    approvedAt: new Date("2025-02-15"),
  }).returning();

  // ---- EFFECTIVE POLICIES ----
  const composedContent = safeguardingContent + "\n\n---\n\n## Local Addendum\n\n" + gibAddendumContent;
  const compositionHash = createHash('sha256').update(composedContent).digest('hex');
  await db.insert(effectivePolicies).values({
    documentId: docSafeguarding.id,
    businessUnitId: buGibEMI.id,
    versionId: verSF.id,
    addendumId: addGib.id,
    composedContent,
    compositionHash,
  });

  // ---- APPROVALS ----
  await db.insert(approvals).values([
    { entityType: "document_version", entityId: verAML.id, action: "approve", status: "Approved", approver: "Chief Compliance Officer", artefactHash: amlHash, comments: "Approved following Board Risk Committee review" },
    { entityType: "document_version", entityId: verSF.id, action: "approve", status: "Approved", approver: "Group CFO", artefactHash: sfHash, comments: "Approved. Satisfies PS25/12 requirements." },
    { entityType: "addendum", entityId: addGib.id, action: "approve", status: "Approved", approver: "Gibraltar Managing Director", comments: "Local addendum approved for Gibraltar EMI" },
    { entityType: "document_version", entityId: verAML.id, action: "review", status: "Pending", approver: "External AML Advisor", comments: "Pending annual external review" },
  ]);

  // ---- REVIEW HISTORY ----
  await db.insert(reviewHistory).values([
    { documentId: docAML.id, reviewer: "Group Head of Compliance", outcome: "Approved with changes", comments: "Updated EDD thresholds and crypto CDD requirements", actionsRaised: "Update staff training materials" },
    { documentId: docSafeguarding.id, reviewer: "External Auditor", outcome: "Satisfactory", comments: "Safeguarding arrangements adequate. Recommend daily reconciliation.", actionsRaised: "Implement daily reconciliation (completed)" },
    { documentId: docAML.id, reviewer: "Board Risk Committee", outcome: "Approved", comments: "Board satisfied with updated AML framework", actionsRaised: "None" },
  ]);

  // ---- REQUIREMENT MAPPINGS ----
  // Map requirements to documents with coverage status
  const mappingData = [
    // AML Policy mappings
    { requirementId: insertedReqs.find((r: any) => r.code === "MLR-18")!.id, documentId: docAML.id, coverageStatus: "Covered", rationale: "Section 3 (Risk Assessment) fully addresses MLR Reg 18" },
    { requirementId: insertedReqs.find((r: any) => r.code === "MLR-19")!.id, documentId: docAML.id, coverageStatus: "Covered", rationale: "Sections 4-7 establish required policies, controls and procedures" },
    { requirementId: insertedReqs.find((r: any) => r.code === "MLR-27")!.id, documentId: docCDD.id, coverageStatus: "Covered", rationale: "CDD Procedures Manual fully addresses standard CDD requirements" },
    { requirementId: insertedReqs.find((r: any) => r.code === "MLR-28")!.id, documentId: docCDD.id, coverageStatus: "Partially Covered", rationale: "EDD procedures exist but need updating for crypto-specific scenarios" },
    // Safeguarding mappings
    { requirementId: insertedReqs.find((r: any) => r.code === "EMR-20")!.id, documentId: docSafeguarding.id, coverageStatus: "Covered", rationale: "Safeguarding Policy sections 2-4 comprehensively address EMR Reg 20" },
    { requirementId: insertedReqs.find((r: any) => r.code === "PSR-19")!.id, documentId: docSafeguarding.id, coverageStatus: "Covered", rationale: "Same safeguarding framework applies to payment institution activities" },
    // Not Covered examples
    { requirementId: insertedReqs.find((r: any) => r.code === "PSR-106")!.id, documentId: docInfoSec.id, coverageStatus: "Partially Covered", rationale: "InfoSec Policy references MFA but lacks specific SCA implementation details" },
    { requirementId: insertedReqs.find((r: any) => r.code === "DORA-5")!.id, documentId: docICT.id, coverageStatus: "Partially Covered", rationale: "ICT framework draft addresses core requirements but pending Board approval" },
    { requirementId: insertedReqs.find((r: any) => r.code === "DORA-28")!.id, documentId: docOutsourcing.id, coverageStatus: "Not Covered", rationale: "Outsourcing policy needs significant update to meet DORA third-party ICT risk requirements" },
    { requirementId: insertedReqs.find((r: any) => r.code === "MiCA-70")!.id, documentId: docSafeguarding.id, coverageStatus: "Not Covered", rationale: "Current safeguarding policy covers fiat only; crypto custody safekeeping not yet addressed" },
    { requirementId: insertedReqs.find((r: any) => r.code === "TFR-4")!.id, documentId: docTravelRule.id, coverageStatus: "Covered", rationale: "Travel Rule procedure fully addresses originator information requirements" },
    { requirementId: insertedReqs.find((r: any) => r.code === "TFR-5")!.id, documentId: docTravelRule.id, coverageStatus: "Covered", rationale: "Travel Rule procedure fully addresses beneficiary information requirements" },
    { requirementId: insertedReqs.find((r: any) => r.code === "GDPR-5")!.id, documentId: docDataProtection.id, coverageStatus: "Covered", rationale: "Data Protection Policy section 2 addresses all GDPR principles" },
    { requirementId: insertedReqs.find((r: any) => r.code === "GDPR-32")!.id, documentId: docInfoSec.id, coverageStatus: "Covered", rationale: "InfoSec Policy sections 2-3 address technical and organisational security measures" },
    { requirementId: insertedReqs.find((r: any) => r.code === "SYSC-6.1")!.id, documentId: docCompliance.id, coverageStatus: "Covered", rationale: "Compliance Monitoring Programme directly implements SYSC 6.1 requirements" },
    // Gibraltar-specific
    { requirementId: insertedReqs.find((r: any) => r.code === "GIB-EMR-SF")!.id, documentId: docSafeguarding.id, businessUnitId: buGibEMI.id, coverageStatus: "Covered", rationale: "Covered by Group Policy + Gibraltar Addendum" },
    { requirementId: insertedReqs.find((r: any) => r.code === "DLT-P9")!.id, documentId: docAML.id, businessUnitId: buGibVASP.id, coverageStatus: "Partially Covered", rationale: "Group AML policy covers general provisions but DLT-specific financial crime controls need enhancement" },
    // EU AML
    { requirementId: insertedReqs.find((r: any) => r.code === "AMLR-CDD")!.id, documentId: docCDD.id, businessUnitId: buEstonia.id, coverageStatus: "Partially Covered", rationale: "Existing CDD procedures partially cover EU AMLR; needs updates for new regulation specifics" },
    { requirementId: insertedReqs.find((r: any) => r.code === "AMLR-SAR")!.id, documentId: docAML.id, businessUnitId: buEstonia.id, coverageStatus: "Covered", rationale: "SAR reporting framework in Section 6 covers EU FIU reporting" },
  ];

  for (const m of mappingData) {
    await db.insert(requirementMappings).values({
      requirementId: m.requirementId,
      documentId: m.documentId,
      businessUnitId: (m as any).businessUnitId || null,
      coverageStatus: m.coverageStatus,
      rationale: m.rationale,
    });
  }

  // ---- FINDINGS ----
  await db.insert(findings).values([
    {
      title: "Incomplete EDD procedures for crypto customers",
      source: "Internal Audit",
      severity: "High",
      status: "In Remediation",
      businessUnitId: buGibVASP.id,
      requirementId: insertedReqs.find((r: any) => r.code === "MLR-28")!.id,
      documentId: docCDD.id,
      description: "Internal audit identified that EDD procedures do not adequately address crypto-specific risk factors including wallet analysis, chain analytics integration, and travel rule compliance for high-risk crypto transactions.",
      rootCause: "CDD procedures were developed for fiat operations and not updated when crypto services launched",
      remediationPlan: "1. Update CDD procedures to include crypto-specific EDD triggers\n2. Integrate blockchain analytics tool\n3. Develop crypto-specific risk scoring model\n4. Train compliance team on crypto EDD",
      owner: "Gibraltar MLRO",
      approver: "Group Head of Compliance",
      dueDate: new Date("2025-04-30"),
    },
    {
      title: "DORA ICT third-party risk register incomplete",
      source: "Regulator Feedback",
      severity: "High",
      status: "New",
      businessUnitId: buEstonia.id,
      requirementId: insertedReqs.find((r: any) => r.code === "DORA-28")!.id,
      documentId: docOutsourcing.id,
      description: "Estonian FI noted that the ICT third-party risk register does not cover all critical ICT service providers and lacks concentration risk analysis as required by DORA Article 28.",
      rootCause: "Outsourcing policy predates DORA; ICT-specific third-party risk requirements not yet incorporated",
      remediationPlan: "1. Conduct full inventory of ICT third-party providers\n2. Assess concentration risk\n3. Update outsourcing policy for DORA compliance\n4. Establish ongoing monitoring framework",
      owner: "CTO",
      approver: "Board Risk Committee",
      dueDate: new Date("2025-06-30"),
    },
    {
      title: "Safeguarding reconciliation gaps identified",
      source: "External Audit",
      severity: "Medium",
      status: "Evidence Submitted",
      businessUnitId: buUK.id,
      requirementId: insertedReqs.find((r: any) => r.code === "EMR-20")!.id,
      documentId: docSafeguarding.id,
      description: "External auditor identified instances where daily safeguarding reconciliation was not completed on 3 occasions in Q4 2024.",
      rootCause: "Manual reconciliation process; staff absence without adequate backup",
      remediationPlan: "1. Implement automated reconciliation system\n2. Cross-train additional staff\n3. Implement automated alerts for missed reconciliations",
      owner: "UK Finance Director",
      approver: "Group CFO",
      dueDate: new Date("2025-03-31"),
    },
    {
      title: "MiCA crypto custody policy not yet drafted",
      source: "Internal Audit",
      severity: "High",
      status: "Triage",
      businessUnitId: buEstonia.id,
      requirementId: insertedReqs.find((r: any) => r.code === "MiCA-70")!.id,
      description: "No policy exists specifically addressing MiCA Article 70 requirements for safekeeping of clients' crypto-assets and funds.",
      rootCause: "New requirement under MiCA; not yet addressed in policy estate",
      remediationPlan: "Draft new crypto custody safekeeping policy aligned with MiCA Article 70",
      owner: "Estonia Compliance Manager",
      approver: "Group Head of Compliance",
      dueDate: new Date("2025-05-31"),
    },
    {
      title: "Staff AML training records incomplete",
      source: "Control Testing",
      severity: "Low",
      status: "Verified",
      businessUnitId: buUK.id,
      requirementId: insertedReqs.find((r: any) => r.code === "MLR-19")!.id,
      documentId: docAML.id,
      description: "3 staff members in UK operations did not complete annual AML refresher training within the required timeframe.",
      rootCause: "Training tracking system did not flag overdue completions",
      remediationPlan: "1. All staff completed training\n2. Implemented automated training reminders\n3. Monthly compliance report now includes training completion status",
      owner: "UK MLRO",
      approver: "Group Head of Compliance",
      dueDate: new Date("2025-01-31"),
      closedAt: new Date("2025-02-10"),
    },
  ]);

  // ---- POLICY LINKS ----
  await db.insert(policyLinks).values([
    { fromDocumentId: docAML.id, toDocumentId: docCDD.id, linkType: "Depends on" },
    { fromDocumentId: docCDD.id, toDocumentId: docAML.id, linkType: "Implements" },
    { fromDocumentId: docInfoSec.id, toDocumentId: docICT.id, linkType: "Relates to" },
    { fromDocumentId: docICT.id, toDocumentId: docOutsourcing.id, linkType: "Depends on" },
    { fromDocumentId: docDataProtection.id, toDocumentId: docInfoSec.id, linkType: "Relates to" },
    { fromDocumentId: docTravelRule.id, toDocumentId: docAML.id, linkType: "Implements" },
    { fromDocumentId: docCompliance.id, toDocumentId: docAML.id, linkType: "Relates to" },
    { fromDocumentId: docGibSafeguarding.id, toDocumentId: docSafeguarding.id, linkType: "Implements" },
  ]);

  // ---- AUDIT LOG ----
  await db.insert(auditLog).values([
    { entityType: "document", entityId: docAML.id, action: "created", actor: "Group Head of Compliance", details: "Group AML/CTF Policy created" },
    { entityType: "document_version", entityId: verAML.id, action: "published", actor: "Chief Compliance Officer", details: "v2.1 published after Board approval" },
    { entityType: "document", entityId: docSafeguarding.id, action: "created", actor: "Group CFO", details: "Group Safeguarding Policy created" },
    { entityType: "document_version", entityId: verSF.id, action: "published", actor: "Group CFO", details: "v1.3 published incorporating PS25/12 changes" },
    { entityType: "addendum", entityId: addGib.id, action: "approved", actor: "Gibraltar Managing Director", details: "Gibraltar safeguarding addendum approved" },
    { entityType: "mapping", entityId: 1, action: "created", actor: "Compliance Analyst", details: "Initial requirement mapping batch created" },
    { entityType: "finding", entityId: 1, action: "created", actor: "Internal Audit", details: "Finding raised: Incomplete EDD procedures for crypto customers" },
    { entityType: "effective_policy", entityId: 1, action: "generated", actor: "System", details: "Effective policy generated for Gibraltar EMI Safeguarding" },
  ]);

  // ---- DEFAULT LOOKUPS ----
  const existingLookups = await storage.getLookups();
  if (existingLookups.length === 0) {
    await db.insert(lookups).values([
      { category: "entity_type", value: "EMI", label: "Electronic Money Institution", sortOrder: 1, active: true },
      { category: "entity_type", value: "PI", label: "Payment Institution", sortOrder: 2, active: true },
      { category: "entity_type", value: "VASP", label: "Virtual Asset Service Provider", sortOrder: 3, active: true },
      { category: "entity_type", value: "CASP", label: "Crypto-Asset Service Provider", sortOrder: 4, active: true },
      { category: "entity_type", value: "DLT", label: "DLT Provider", sortOrder: 5, active: true },
      { category: "entity_type", value: "Bank", label: "Banking Entity", sortOrder: 6, active: true },
      { category: "role", value: "cco", label: "Chief Compliance Officer", sortOrder: 1, active: true },
      { category: "role", value: "cfo", label: "Chief Financial Officer", sortOrder: 2, active: true },
      { category: "role", value: "mlro", label: "Money Laundering Reporting Officer", sortOrder: 3, active: true },
      { category: "role", value: "cro", label: "Chief Risk Officer", sortOrder: 4, active: true },
      { category: "role", value: "dpo", label: "Data Protection Officer", sortOrder: 5, active: true },
      { category: "role", value: "ciso", label: "Chief Information Security Officer", sortOrder: 6, active: true },
      { category: "role", value: "internal_audit", label: "Internal Audit", sortOrder: 7, active: true },
      { category: "role", value: "board", label: "Board of Directors", sortOrder: 8, active: true },
      { category: "role", value: "compliance_analyst", label: "Compliance Analyst", sortOrder: 9, active: true },
      { category: "jurisdiction", value: "UK", label: "United Kingdom", sortOrder: 1, active: true },
      { category: "jurisdiction", value: "GI", label: "Gibraltar", sortOrder: 2, active: true },
      { category: "jurisdiction", value: "EE", label: "Estonia / EU", sortOrder: 3, active: true },
      { category: "jurisdiction", value: "INT", label: "International", sortOrder: 4, active: true },
      { category: "document_category", value: "aml", label: "AML/CTF", sortOrder: 1, active: true },
      { category: "document_category", value: "safeguarding", label: "Safeguarding", sortOrder: 2, active: true },
      { category: "document_category", value: "governance", label: "Governance", sortOrder: 3, active: true },
      { category: "document_category", value: "data_protection", label: "Data Protection", sortOrder: 4, active: true },
      { category: "document_category", value: "ict", label: "ICT / Resilience", sortOrder: 5, active: true },
      { category: "document_category", value: "outsourcing", label: "Outsourcing", sortOrder: 6, active: true },
      { category: "document_category", value: "crypto", label: "Crypto / Digital Assets", sortOrder: 7, active: true },
      { category: "document_category", value: "payments", label: "Payments", sortOrder: 8, active: true },
      { category: "finding_severity", value: "critical", label: "Critical", sortOrder: 1, active: true },
      { category: "finding_severity", value: "high", label: "High", sortOrder: 2, active: true },
      { category: "finding_severity", value: "medium", label: "Medium", sortOrder: 3, active: true },
      { category: "finding_severity", value: "low", label: "Low", sortOrder: 4, active: true },
    ]);
  }

  console.log("Seed data loaded successfully: 4 BUs, 20+ regulatory sources, 35+ requirements, 10 documents, mappings, findings, lookups, and audit trail");
}
