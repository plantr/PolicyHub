import { db } from "./db";
import {
  businessUnits, regulatoryProfiles, regulatorySources, requirements,
  documents, documentVersions, addenda, effectivePolicies,
  approvals, auditLog, reviewHistory, requirementMappings,
  findings, findingEvidence, policyLinks,
  type BusinessUnit, type RegulatoryProfile, type RegulatorySource,
  type Requirement, type Document, type DocumentVersion, type Addendum,
  type EffectivePolicy, type Approval, type AuditLogEntry, type ReviewHistoryEntry,
  type RequirementMapping, type Finding, type FindingEvidence, type PolicyLink,
  type CreateBusinessUnitRequest, type CreateDocumentRequest, type UpdateDocumentRequest,
  type CreateDocumentVersionRequest, type CreateAddendumRequest, type CreateApprovalRequest,
  type CreateFindingRequest, type UpdateFindingRequest,
  type CreateRequirementMappingRequest, type UpdateRequirementMappingRequest
} from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

export interface IStorage {
  getBusinessUnits(): Promise<BusinessUnit[]>;
  getBusinessUnit(id: number): Promise<BusinessUnit | undefined>;

  getRegulatoryProfiles(): Promise<RegulatoryProfile[]>;

  getRegulatorySources(): Promise<RegulatorySource[]>;
  getRegulatorySource(id: number): Promise<RegulatorySource | undefined>;

  getRequirements(): Promise<Requirement[]>;
  getRequirement(id: number): Promise<Requirement | undefined>;

  getDocuments(): Promise<Document[]>;
  getDocument(id: number): Promise<Document | undefined>;
  createDocument(doc: CreateDocumentRequest): Promise<Document>;
  updateDocument(id: number, doc: UpdateDocumentRequest): Promise<Document>;

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
  updateFinding(id: number, finding: UpdateFindingRequest): Promise<Finding>;

  getFindingEvidence(findingId: number): Promise<FindingEvidence[]>;

  getPolicyLinks(): Promise<PolicyLink[]>;
}

export class DatabaseStorage implements IStorage {
  async getBusinessUnits(): Promise<BusinessUnit[]> {
    return await db.select().from(businessUnits);
  }
  async getBusinessUnit(id: number): Promise<BusinessUnit | undefined> {
    const [bu] = await db.select().from(businessUnits).where(eq(businessUnits.id, id));
    return bu;
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

  async getRequirements(): Promise<Requirement[]> {
    return await db.select().from(requirements);
  }
  async getRequirement(id: number): Promise<Requirement | undefined> {
    const [req] = await db.select().from(requirements).where(eq(requirements.id, id));
    return req;
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
  async updateDocument(id: number, doc: UpdateDocumentRequest): Promise<Document> {
    const [updated] = await db.update(documents).set(doc).where(eq(documents.id, id)).returning();
    return updated;
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
  async updateFinding(id: number, finding: UpdateFindingRequest): Promise<Finding> {
    const [updated] = await db.update(findings).set(finding).where(eq(findings.id, id)).returning();
    return updated;
  }

  async getFindingEvidence(findingId: number): Promise<FindingEvidence[]> {
    return await db.select().from(findingEvidence).where(eq(findingEvidence.findingId, findingId));
  }

  async getPolicyLinks(): Promise<PolicyLink[]> {
    return await db.select().from(policyLinks);
  }
}

export const storage = new DatabaseStorage();
