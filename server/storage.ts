import { db } from "./db";
import {
  businessUnits, regulatoryProfiles, regulatorySources, requirements,
  documents, documentVersions, addenda, effectivePolicies,
  approvals, auditLog, reviewHistory, requirementMappings,
  findings, findingEvidence, policyLinks, lookups,
  type BusinessUnit, type RegulatoryProfile, type RegulatorySource,
  type Requirement, type Document, type DocumentVersion, type Addendum,
  type EffectivePolicy, type Approval, type AuditLogEntry, type ReviewHistoryEntry,
  type RequirementMapping, type Finding, type FindingEvidence, type PolicyLink,
  type Lookup,
  type CreateBusinessUnitRequest, type UpdateBusinessUnitRequest,
  type CreateDocumentRequest, type UpdateDocumentRequest,
  type CreateDocumentVersionRequest, type CreateAddendumRequest, type CreateApprovalRequest,
  type CreateFindingRequest, type UpdateFindingRequest,
  type CreateRequirementMappingRequest, type UpdateRequirementMappingRequest,
  type CreateLookupRequest, type UpdateLookupRequest,
  type CreateRegulatorySourceRequest, type UpdateRegulatorySourceRequest,
  type CreateRequirementRequest, type UpdateRequirementRequest
} from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

export interface IStorage {
  getBusinessUnits(): Promise<BusinessUnit[]>;
  getBusinessUnit(id: number): Promise<BusinessUnit | undefined>;
  createBusinessUnit(bu: CreateBusinessUnitRequest): Promise<BusinessUnit>;
  updateBusinessUnit(id: number, bu: UpdateBusinessUnitRequest): Promise<BusinessUnit | undefined>;
  deleteBusinessUnit(id: number): Promise<void>;

  getRegulatoryProfiles(): Promise<RegulatoryProfile[]>;

  getRegulatorySources(): Promise<RegulatorySource[]>;
  getRegulatorySource(id: number): Promise<RegulatorySource | undefined>;
  createRegulatorySource(source: CreateRegulatorySourceRequest): Promise<RegulatorySource>;
  updateRegulatorySource(id: number, source: UpdateRegulatorySourceRequest): Promise<RegulatorySource | undefined>;
  deleteRegulatorySource(id: number): Promise<void>;

  getRequirements(): Promise<Requirement[]>;
  getRequirement(id: number): Promise<Requirement | undefined>;
  createRequirement(req: CreateRequirementRequest): Promise<Requirement>;
  updateRequirement(id: number, req: UpdateRequirementRequest): Promise<Requirement | undefined>;
  deleteRequirement(id: number): Promise<void>;

  getDocuments(): Promise<Document[]>;
  getDocument(id: number): Promise<Document | undefined>;
  createDocument(doc: CreateDocumentRequest): Promise<Document>;
  updateDocument(id: number, doc: UpdateDocumentRequest): Promise<Document | undefined>;
  deleteDocument(id: number): Promise<void>;

  getDocumentVersions(documentId: number): Promise<DocumentVersion[]>;
  createDocumentVersion(version: CreateDocumentVersionRequest): Promise<DocumentVersion>;
  updateDocumentVersionStatus(id: number, status: string): Promise<DocumentVersion>;

  getAddenda(documentId: number): Promise<Addendum[]>;
  createAddendum(addendum: CreateAddendumRequest): Promise<Addendum>;

  getEffectivePolicy(documentId: number, businessUnitId: number): Promise<EffectivePolicy | undefined>;
  createEffectivePolicy(ep: any): Promise<EffectivePolicy>;

  getApprovals(): Promise<Approval[]>;
  createApproval(approval: CreateApprovalRequest): Promise<Approval>;

  getAuditLog(): Promise<AuditLogEntry[]>;
  createAuditLogEntry(entry: any): Promise<AuditLogEntry>;

  getReviewHistory(documentId: number): Promise<ReviewHistoryEntry[]>;
  createReviewHistory(review: any): Promise<ReviewHistoryEntry>;

  getRequirementMappings(): Promise<RequirementMapping[]>;
  createRequirementMapping(mapping: CreateRequirementMappingRequest): Promise<RequirementMapping>;
  updateRequirementMapping(id: number, mapping: UpdateRequirementMappingRequest): Promise<RequirementMapping>;

  getFindings(): Promise<Finding[]>;
  getFinding(id: number): Promise<Finding | undefined>;
  createFinding(finding: CreateFindingRequest): Promise<Finding>;
  updateFinding(id: number, finding: UpdateFindingRequest): Promise<Finding | undefined>;
  deleteFinding(id: number): Promise<void>;

  getFindingEvidence(findingId: number): Promise<FindingEvidence[]>;

  getPolicyLinks(): Promise<PolicyLink[]>;

  getLookups(): Promise<Lookup[]>;
  getLookup(id: number): Promise<Lookup | undefined>;
  getLookupsByCategory(category: string): Promise<Lookup[]>;
  createLookup(lookup: CreateLookupRequest): Promise<Lookup>;
  updateLookup(id: number, lookup: UpdateLookupRequest): Promise<Lookup | undefined>;
  deleteLookup(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getBusinessUnits(): Promise<BusinessUnit[]> {
    return await db.select().from(businessUnits);
  }
  async getBusinessUnit(id: number): Promise<BusinessUnit | undefined> {
    const [bu] = await db.select().from(businessUnits).where(eq(businessUnits.id, id));
    return bu;
  }
  async createBusinessUnit(bu: CreateBusinessUnitRequest): Promise<BusinessUnit> {
    const [created] = await db.insert(businessUnits).values(bu).returning();
    return created;
  }
  async updateBusinessUnit(id: number, bu: UpdateBusinessUnitRequest): Promise<BusinessUnit | undefined> {
    const [updated] = await db.update(businessUnits).set(bu).where(eq(businessUnits.id, id)).returning();
    return updated;
  }
  async deleteBusinessUnit(id: number): Promise<void> {
    await db.delete(businessUnits).where(eq(businessUnits.id, id));
  }

  async getRegulatoryProfiles(): Promise<RegulatoryProfile[]> {
    return await db.select().from(regulatoryProfiles);
  }

  async getRegulatorySources(): Promise<RegulatorySource[]> {
    return await db.select().from(regulatorySources);
  }
  async getRegulatorySource(id: number): Promise<RegulatorySource | undefined> {
    const [src] = await db.select().from(regulatorySources).where(eq(regulatorySources.id, id));
    return src;
  }
  async createRegulatorySource(source: CreateRegulatorySourceRequest): Promise<RegulatorySource> {
    const [created] = await db.insert(regulatorySources).values(source).returning();
    return created;
  }
  async updateRegulatorySource(id: number, source: UpdateRegulatorySourceRequest): Promise<RegulatorySource | undefined> {
    const [updated] = await db.update(regulatorySources).set(source).where(eq(regulatorySources.id, id)).returning();
    return updated;
  }
  async deleteRegulatorySource(id: number): Promise<void> {
    await db.delete(regulatorySources).where(eq(regulatorySources.id, id));
  }

  async getRequirements(): Promise<Requirement[]> {
    return await db.select().from(requirements);
  }
  async getRequirement(id: number): Promise<Requirement | undefined> {
    const [req] = await db.select().from(requirements).where(eq(requirements.id, id));
    return req;
  }
  async createRequirement(req: CreateRequirementRequest): Promise<Requirement> {
    const [created] = await db.insert(requirements).values(req).returning();
    return created;
  }
  async updateRequirement(id: number, req: UpdateRequirementRequest): Promise<Requirement | undefined> {
    const [updated] = await db.update(requirements).set(req).where(eq(requirements.id, id)).returning();
    return updated;
  }
  async deleteRequirement(id: number): Promise<void> {
    await db.delete(requirements).where(eq(requirements.id, id));
  }

  async getDocuments(): Promise<Document[]> {
    return await db.select().from(documents);
  }
  async getDocument(id: number): Promise<Document | undefined> {
    const [doc] = await db.select().from(documents).where(eq(documents.id, id));
    return doc;
  }
  async createDocument(doc: CreateDocumentRequest): Promise<Document> {
    const [created] = await db.insert(documents).values(doc).returning();
    return created;
  }
  async updateDocument(id: number, doc: UpdateDocumentRequest): Promise<Document | undefined> {
    const [updated] = await db.update(documents).set(doc).where(eq(documents.id, id)).returning();
    return updated;
  }
  async deleteDocument(id: number): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  async getDocumentVersions(documentId: number): Promise<DocumentVersion[]> {
    return await db.select().from(documentVersions).where(eq(documentVersions.documentId, documentId));
  }
  async createDocumentVersion(version: CreateDocumentVersionRequest): Promise<DocumentVersion> {
    const [created] = await db.insert(documentVersions).values(version).returning();
    return created;
  }
  async updateDocumentVersionStatus(id: number, status: string): Promise<DocumentVersion> {
    const [updated] = await db.update(documentVersions).set({ status }).where(eq(documentVersions.id, id)).returning();
    return updated;
  }

  async getAddenda(documentId: number): Promise<Addendum[]> {
    return await db.select().from(addenda).where(eq(addenda.documentId, documentId));
  }
  async createAddendum(addendum: CreateAddendumRequest): Promise<Addendum> {
    const [created] = await db.insert(addenda).values(addendum).returning();
    return created;
  }

  async getEffectivePolicy(documentId: number, businessUnitId: number): Promise<EffectivePolicy | undefined> {
    const [ep] = await db.select().from(effectivePolicies)
      .where(and(eq(effectivePolicies.documentId, documentId), eq(effectivePolicies.businessUnitId, businessUnitId)));
    return ep;
  }
  async createEffectivePolicy(ep: any): Promise<EffectivePolicy> {
    const [created] = await db.insert(effectivePolicies).values(ep).returning();
    return created;
  }

  async getApprovals(): Promise<Approval[]> {
    return await db.select().from(approvals);
  }
  async createApproval(approval: CreateApprovalRequest): Promise<Approval> {
    const [created] = await db.insert(approvals).values(approval).returning();
    return created;
  }

  async getAuditLog(): Promise<AuditLogEntry[]> {
    return await db.select().from(auditLog);
  }
  async createAuditLogEntry(entry: any): Promise<AuditLogEntry> {
    const [created] = await db.insert(auditLog).values(entry).returning();
    return created;
  }

  async getReviewHistory(documentId: number): Promise<ReviewHistoryEntry[]> {
    return await db.select().from(reviewHistory).where(eq(reviewHistory.documentId, documentId));
  }
  async createReviewHistory(review: any): Promise<ReviewHistoryEntry> {
    const [created] = await db.insert(reviewHistory).values(review).returning();
    return created;
  }

  async getRequirementMappings(): Promise<RequirementMapping[]> {
    return await db.select().from(requirementMappings);
  }
  async createRequirementMapping(mapping: CreateRequirementMappingRequest): Promise<RequirementMapping> {
    const [created] = await db.insert(requirementMappings).values(mapping).returning();
    return created;
  }
  async updateRequirementMapping(id: number, mapping: UpdateRequirementMappingRequest): Promise<RequirementMapping> {
    const [updated] = await db.update(requirementMappings).set(mapping).where(eq(requirementMappings.id, id)).returning();
    return updated;
  }

  async getFindings(): Promise<Finding[]> {
    return await db.select().from(findings);
  }
  async getFinding(id: number): Promise<Finding | undefined> {
    const [finding] = await db.select().from(findings).where(eq(findings.id, id));
    return finding;
  }
  async createFinding(finding: CreateFindingRequest): Promise<Finding> {
    const [created] = await db.insert(findings).values(finding).returning();
    return created;
  }
  async updateFinding(id: number, finding: UpdateFindingRequest): Promise<Finding | undefined> {
    const [updated] = await db.update(findings).set(finding).where(eq(findings.id, id)).returning();
    return updated;
  }
  async deleteFinding(id: number): Promise<void> {
    await db.delete(findings).where(eq(findings.id, id));
  }

  async getFindingEvidence(findingId: number): Promise<FindingEvidence[]> {
    return await db.select().from(findingEvidence).where(eq(findingEvidence.findingId, findingId));
  }

  async getPolicyLinks(): Promise<PolicyLink[]> {
    return await db.select().from(policyLinks);
  }

  async getLookups(): Promise<Lookup[]> {
    return await db.select().from(lookups);
  }
  async getLookup(id: number): Promise<Lookup | undefined> {
    const [lookup] = await db.select().from(lookups).where(eq(lookups.id, id));
    return lookup;
  }
  async getLookupsByCategory(category: string): Promise<Lookup[]> {
    return await db.select().from(lookups).where(eq(lookups.category, category));
  }
  async createLookup(lookup: CreateLookupRequest): Promise<Lookup> {
    const [created] = await db.insert(lookups).values(lookup).returning();
    return created;
  }
  async updateLookup(id: number, lookup: UpdateLookupRequest): Promise<Lookup | undefined> {
    const [updated] = await db.update(lookups).set(lookup).where(eq(lookups.id, id)).returning();
    return updated;
  }
  async deleteLookup(id: number): Promise<void> {
    await db.delete(lookups).where(eq(lookups.id, id));
  }
}

export const storage = new DatabaseStorage();
