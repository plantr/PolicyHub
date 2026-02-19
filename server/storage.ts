import { db } from "./db";
import {
  businessUnits, regulatoryProfiles, regulatorySources, requirements,
  documents, documentVersions, addenda, effectivePolicies,
  approvals, auditLog, reviewHistory, requirementMappings,
  findings, findingEvidence, policyLinks, audits, users,
  entityTypes, roles, jurisdictions, documentCategories, findingSeverities, documentStatuses,
  commitments, knowledgeBaseArticles,
  risks, riskLibrary, riskActions, riskSnapshots, riskCategories, impactLevels, likelihoodLevels,
  type BusinessUnit, type RegulatoryProfile, type RegulatorySource,
  type Requirement, type Document, type DocumentVersion, type Addendum,
  type EffectivePolicy, type Approval, type AuditLogEntry, type ReviewHistoryEntry,
  type RequirementMapping, type Finding, type FindingEvidence, type PolicyLink,
  type Audit, type CreateAuditRequest, type UpdateAuditRequest,
  type User, type CreateUserRequest, type UpdateUserRequest,
  type AdminRecord, type CreateAdminRecordRequest, type UpdateAdminRecordRequest,
  type CreateBusinessUnitRequest, type UpdateBusinessUnitRequest,
  type CreateDocumentRequest, type UpdateDocumentRequest,
  type CreateDocumentVersionRequest, type CreateAddendumRequest, type CreateApprovalRequest,
  type CreateFindingRequest, type UpdateFindingRequest,
  type CreateRequirementMappingRequest, type UpdateRequirementMappingRequest,
  type CreateRegulatorySourceRequest, type UpdateRegulatorySourceRequest,
  type CreateRequirementRequest, type UpdateRequirementRequest,
  type Commitment, type CreateCommitmentRequest, type UpdateCommitmentRequest,
  type KnowledgeBaseArticle, type CreateKnowledgeBaseArticleRequest, type UpdateKnowledgeBaseArticleRequest,
  type Risk, type CreateRiskRequest, type UpdateRiskRequest,
  type RiskLibraryItem, type CreateRiskLibraryRequest, type UpdateRiskLibraryRequest,
  type RiskAction, type CreateRiskActionRequest, type UpdateRiskActionRequest,
  type RiskSnapshot, type CreateRiskSnapshotRequest,
  type RiskCategory, type ImpactLevel, type LikelihoodLevel,
} from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

export interface IStorage {
  getBusinessUnits(): Promise<BusinessUnit[]>;
  getBusinessUnit(id: number): Promise<BusinessUnit | undefined>;
  createBusinessUnit(bu: CreateBusinessUnitRequest): Promise<BusinessUnit>;
  updateBusinessUnit(id: number, bu: UpdateBusinessUnitRequest): Promise<BusinessUnit | undefined>;
  archiveBusinessUnit(id: number): Promise<BusinessUnit | undefined>;

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

  getAllDocumentVersions(): Promise<DocumentVersion[]>;
  getDocumentVersions(documentId: number): Promise<DocumentVersion[]>;
  getDocumentVersion(id: number): Promise<DocumentVersion | undefined>;
  createDocumentVersion(version: CreateDocumentVersionRequest): Promise<DocumentVersion>;
  updateDocumentVersion(id: number, data: Partial<Pick<DocumentVersion, "version" | "status" | "changeReason" | "createdBy" | "effectiveDate">>): Promise<DocumentVersion | undefined>;
  updateDocumentVersionStatus(id: number, status: string): Promise<DocumentVersion>;
  updateDocumentVersionPdf(id: number, pdfS3Key: string, pdfFileName: string, pdfFileSize: number): Promise<DocumentVersion>;

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
  deleteRequirementMapping(id: number): Promise<void>;

  getFindings(): Promise<Finding[]>;
  getFinding(id: number): Promise<Finding | undefined>;
  createFinding(finding: CreateFindingRequest): Promise<Finding>;
  updateFinding(id: number, finding: UpdateFindingRequest): Promise<Finding | undefined>;
  deleteFinding(id: number): Promise<void>;

  getFindingEvidence(findingId: number): Promise<FindingEvidence[]>;

  getPolicyLinks(): Promise<PolicyLink[]>;

  getAudits(): Promise<Audit[]>;
  getAudit(id: number): Promise<Audit | undefined>;
  createAudit(audit: CreateAuditRequest): Promise<Audit>;
  updateAudit(id: number, audit: UpdateAuditRequest): Promise<Audit | undefined>;
  deleteAudit(id: number): Promise<void>;

  getUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  createUser(user: CreateUserRequest): Promise<User>;
  updateUser(id: number, user: UpdateUserRequest): Promise<User | undefined>;
  deactivateUser(id: number): Promise<User | undefined>;

  getCommitments(): Promise<Commitment[]>;
  getCommitment(id: number): Promise<Commitment | undefined>;
  createCommitment(commitment: CreateCommitmentRequest): Promise<Commitment>;
  updateCommitment(id: number, commitment: UpdateCommitmentRequest): Promise<Commitment | undefined>;
  deleteCommitment(id: number): Promise<void>;

  getKnowledgeBaseArticles(): Promise<KnowledgeBaseArticle[]>;
  getKnowledgeBaseArticle(id: number): Promise<KnowledgeBaseArticle | undefined>;
  createKnowledgeBaseArticle(article: CreateKnowledgeBaseArticleRequest): Promise<KnowledgeBaseArticle>;
  updateKnowledgeBaseArticle(id: number, article: UpdateKnowledgeBaseArticleRequest): Promise<KnowledgeBaseArticle | undefined>;
  deleteKnowledgeBaseArticle(id: number): Promise<void>;

  getRisks(): Promise<Risk[]>;
  getRisk(id: number): Promise<Risk | undefined>;
  createRisk(data: CreateRiskRequest): Promise<Risk>;
  updateRisk(id: number, data: UpdateRiskRequest): Promise<Risk | undefined>;
  deleteRisk(id: number): Promise<void>;

  getRiskLibraryItems(): Promise<RiskLibraryItem[]>;
  getRiskLibraryItem(id: number): Promise<RiskLibraryItem | undefined>;
  createRiskLibraryItem(data: CreateRiskLibraryRequest): Promise<RiskLibraryItem>;
  updateRiskLibraryItem(id: number, data: UpdateRiskLibraryRequest): Promise<RiskLibraryItem | undefined>;
  deleteRiskLibraryItem(id: number): Promise<void>;

  getRiskActions(): Promise<RiskAction[]>;
  getRiskAction(id: number): Promise<RiskAction | undefined>;
  createRiskAction(data: CreateRiskActionRequest): Promise<RiskAction>;
  updateRiskAction(id: number, data: UpdateRiskActionRequest): Promise<RiskAction | undefined>;
  deleteRiskAction(id: number): Promise<void>;

  getRiskSnapshots(): Promise<RiskSnapshot[]>;
  createRiskSnapshot(data: CreateRiskSnapshotRequest): Promise<RiskSnapshot>;
  deleteRiskSnapshot(id: number): Promise<void>;

  getRiskCategories(): Promise<RiskCategory[]>;
  createRiskCategory(data: any): Promise<RiskCategory>;
  updateRiskCategory(id: number, data: any): Promise<RiskCategory | undefined>;
  deleteRiskCategory(id: number): Promise<void>;

  getImpactLevels(): Promise<ImpactLevel[]>;
  createImpactLevel(data: any): Promise<ImpactLevel>;
  updateImpactLevel(id: number, data: any): Promise<ImpactLevel | undefined>;
  deleteImpactLevel(id: number): Promise<void>;

  getLikelihoodLevels(): Promise<LikelihoodLevel[]>;
  createLikelihoodLevel(data: any): Promise<LikelihoodLevel>;
  updateLikelihoodLevel(id: number, data: any): Promise<LikelihoodLevel | undefined>;
  deleteLikelihoodLevel(id: number): Promise<void>;

  getAdminRecords(table: string): Promise<AdminRecord[]>;
  getAdminRecord(table: string, id: number): Promise<AdminRecord | undefined>;
  createAdminRecord(table: string, data: CreateAdminRecordRequest): Promise<AdminRecord>;
  updateAdminRecord(table: string, id: number, data: UpdateAdminRecordRequest): Promise<AdminRecord | undefined>;
  deleteAdminRecord(table: string, id: number): Promise<void>;
  reorderAdminRecords(table: string, orderedIds: number[]): Promise<AdminRecord[]>;
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
  async archiveBusinessUnit(id: number): Promise<BusinessUnit | undefined> {
    const [updated] = await db.update(businessUnits).set({ status: "Archived" }).where(eq(businessUnits.id, id)).returning();
    return updated;
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

  async getAllDocumentVersions(): Promise<DocumentVersion[]> {
    return await db.select().from(documentVersions);
  }
  async getDocumentVersions(documentId: number): Promise<DocumentVersion[]> {
    return await db.select().from(documentVersions).where(eq(documentVersions.documentId, documentId));
  }
  async getDocumentVersion(id: number): Promise<DocumentVersion | undefined> {
    const [version] = await db.select().from(documentVersions).where(eq(documentVersions.id, id));
    return version;
  }
  async createDocumentVersion(version: CreateDocumentVersionRequest): Promise<DocumentVersion> {
    const [created] = await db.insert(documentVersions).values(version).returning();
    return created;
  }
  async updateDocumentVersion(id: number, data: Partial<Pick<DocumentVersion, "version" | "status" | "changeReason" | "createdBy" | "effectiveDate">>): Promise<DocumentVersion | undefined> {
    const [updated] = await db.update(documentVersions).set(data).where(eq(documentVersions.id, id)).returning();
    return updated;
  }
  async updateDocumentVersionStatus(id: number, status: string): Promise<DocumentVersion> {
    const [updated] = await db.update(documentVersions).set({ status }).where(eq(documentVersions.id, id)).returning();
    return updated;
  }
  async updateDocumentVersionPdf(id: number, pdfS3Key: string, pdfFileName: string, pdfFileSize: number): Promise<DocumentVersion> {
    const [updated] = await db.update(documentVersions).set({ pdfS3Key, pdfFileName, pdfFileSize }).where(eq(documentVersions.id, id)).returning();
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
  async deleteRequirementMapping(id: number): Promise<void> {
    await db.delete(requirementMappings).where(eq(requirementMappings.id, id));
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

  async getAudits(): Promise<Audit[]> {
    return await db.select().from(audits);
  }
  async getAudit(id: number): Promise<Audit | undefined> {
    const [audit] = await db.select().from(audits).where(eq(audits.id, id));
    return audit;
  }
  async createAudit(data: CreateAuditRequest): Promise<Audit> {
    const [created] = await db.insert(audits).values(data).returning();
    return created;
  }
  async updateAudit(id: number, data: UpdateAuditRequest): Promise<Audit | undefined> {
    const [updated] = await db.update(audits).set(data).where(eq(audits.id, id)).returning();
    return updated;
  }
  async deleteAudit(id: number): Promise<void> {
    await db.delete(audits).where(eq(audits.id, id));
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async createUser(data: CreateUserRequest): Promise<User> {
    const [created] = await db.insert(users).values(data).returning();
    return created;
  }
  async updateUser(id: number, data: UpdateUserRequest): Promise<User | undefined> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }
  async deactivateUser(id: number): Promise<User | undefined> {
    const [updated] = await db.update(users).set({ status: "Inactive" }).where(eq(users.id, id)).returning();
    return updated;
  }

  async getCommitments(): Promise<Commitment[]> {
    return await db.select().from(commitments);
  }
  async getCommitment(id: number): Promise<Commitment | undefined> {
    const [c] = await db.select().from(commitments).where(eq(commitments.id, id));
    return c;
  }
  async createCommitment(data: CreateCommitmentRequest): Promise<Commitment> {
    const [created] = await db.insert(commitments).values(data).returning();
    return created;
  }
  async updateCommitment(id: number, data: UpdateCommitmentRequest): Promise<Commitment | undefined> {
    const [updated] = await db.update(commitments).set(data).where(eq(commitments.id, id)).returning();
    return updated;
  }
  async deleteCommitment(id: number): Promise<void> {
    await db.delete(commitments).where(eq(commitments.id, id));
  }

  async getKnowledgeBaseArticles(): Promise<KnowledgeBaseArticle[]> {
    return await db.select().from(knowledgeBaseArticles);
  }
  async getKnowledgeBaseArticle(id: number): Promise<KnowledgeBaseArticle | undefined> {
    const [a] = await db.select().from(knowledgeBaseArticles).where(eq(knowledgeBaseArticles.id, id));
    return a;
  }
  async createKnowledgeBaseArticle(data: CreateKnowledgeBaseArticleRequest): Promise<KnowledgeBaseArticle> {
    const [created] = await db.insert(knowledgeBaseArticles).values(data).returning();
    return created;
  }
  async updateKnowledgeBaseArticle(id: number, data: UpdateKnowledgeBaseArticleRequest): Promise<KnowledgeBaseArticle | undefined> {
    const [updated] = await db.update(knowledgeBaseArticles).set(data).where(eq(knowledgeBaseArticles.id, id)).returning();
    return updated;
  }
  async deleteKnowledgeBaseArticle(id: number): Promise<void> {
    await db.delete(knowledgeBaseArticles).where(eq(knowledgeBaseArticles.id, id));
  }

  async getRisks(): Promise<Risk[]> {
    return await db.select().from(risks);
  }
  async getRisk(id: number): Promise<Risk | undefined> {
    const [r] = await db.select().from(risks).where(eq(risks.id, id));
    return r;
  }
  async createRisk(data: CreateRiskRequest): Promise<Risk> {
    const [created] = await db.insert(risks).values(data).returning();
    return created;
  }
  async updateRisk(id: number, data: UpdateRiskRequest): Promise<Risk | undefined> {
    const [updated] = await db.update(risks).set({ ...data, updatedAt: new Date() }).where(eq(risks.id, id)).returning();
    return updated;
  }
  async deleteRisk(id: number): Promise<void> {
    await db.delete(riskActions).where(eq(riskActions.riskId, id));
    await db.delete(risks).where(eq(risks.id, id));
  }

  async getRiskLibraryItems(): Promise<RiskLibraryItem[]> {
    return await db.select().from(riskLibrary);
  }
  async getRiskLibraryItem(id: number): Promise<RiskLibraryItem | undefined> {
    const [r] = await db.select().from(riskLibrary).where(eq(riskLibrary.id, id));
    return r;
  }
  async createRiskLibraryItem(data: CreateRiskLibraryRequest): Promise<RiskLibraryItem> {
    const [created] = await db.insert(riskLibrary).values(data).returning();
    return created;
  }
  async updateRiskLibraryItem(id: number, data: UpdateRiskLibraryRequest): Promise<RiskLibraryItem | undefined> {
    const [updated] = await db.update(riskLibrary).set(data).where(eq(riskLibrary.id, id)).returning();
    return updated;
  }
  async deleteRiskLibraryItem(id: number): Promise<void> {
    await db.delete(riskLibrary).where(eq(riskLibrary.id, id));
  }

  async getRiskActions(): Promise<RiskAction[]> {
    return await db.select().from(riskActions);
  }
  async getRiskAction(id: number): Promise<RiskAction | undefined> {
    const [r] = await db.select().from(riskActions).where(eq(riskActions.id, id));
    return r;
  }
  async createRiskAction(data: CreateRiskActionRequest): Promise<RiskAction> {
    const [created] = await db.insert(riskActions).values(data).returning();
    return created;
  }
  async updateRiskAction(id: number, data: UpdateRiskActionRequest): Promise<RiskAction | undefined> {
    const [updated] = await db.update(riskActions).set(data).where(eq(riskActions.id, id)).returning();
    return updated;
  }
  async deleteRiskAction(id: number): Promise<void> {
    await db.delete(riskActions).where(eq(riskActions.id, id));
  }

  async getRiskSnapshots(): Promise<RiskSnapshot[]> {
    return await db.select().from(riskSnapshots);
  }
  async createRiskSnapshot(data: CreateRiskSnapshotRequest): Promise<RiskSnapshot> {
    const [created] = await db.insert(riskSnapshots).values(data).returning();
    return created;
  }
  async deleteRiskSnapshot(id: number): Promise<void> {
    await db.delete(riskSnapshots).where(eq(riskSnapshots.id, id));
  }

  async getRiskCategories(): Promise<RiskCategory[]> {
    return await db.select().from(riskCategories);
  }
  async createRiskCategory(data: any): Promise<RiskCategory> {
    const [created] = await db.insert(riskCategories).values(data).returning();
    return created;
  }
  async updateRiskCategory(id: number, data: any): Promise<RiskCategory | undefined> {
    const [updated] = await db.update(riskCategories).set(data).where(eq(riskCategories.id, id)).returning();
    return updated;
  }
  async deleteRiskCategory(id: number): Promise<void> {
    await db.delete(riskCategories).where(eq(riskCategories.id, id));
  }

  async getImpactLevels(): Promise<ImpactLevel[]> {
    return await db.select().from(impactLevels);
  }
  async createImpactLevel(data: any): Promise<ImpactLevel> {
    const [created] = await db.insert(impactLevels).values(data).returning();
    return created;
  }
  async updateImpactLevel(id: number, data: any): Promise<ImpactLevel | undefined> {
    const [updated] = await db.update(impactLevels).set(data).where(eq(impactLevels.id, id)).returning();
    return updated;
  }
  async deleteImpactLevel(id: number): Promise<void> {
    await db.delete(impactLevels).where(eq(impactLevels.id, id));
  }

  async getLikelihoodLevels(): Promise<LikelihoodLevel[]> {
    return await db.select().from(likelihoodLevels);
  }
  async createLikelihoodLevel(data: any): Promise<LikelihoodLevel> {
    const [created] = await db.insert(likelihoodLevels).values(data).returning();
    return created;
  }
  async updateLikelihoodLevel(id: number, data: any): Promise<LikelihoodLevel | undefined> {
    const [updated] = await db.update(likelihoodLevels).set(data).where(eq(likelihoodLevels.id, id)).returning();
    return updated;
  }
  async deleteLikelihoodLevel(id: number): Promise<void> {
    await db.delete(likelihoodLevels).where(eq(likelihoodLevels.id, id));
  }

  private getAdminTable(table: string) {
    const tables: Record<string, any> = {
      "entity-types": entityTypes,
      "roles": roles,
      "jurisdictions": jurisdictions,
      "document-categories": documentCategories,
      "finding-severities": findingSeverities,
      "document-statuses": documentStatuses,
    };
    const t = tables[table];
    if (!t) throw new Error(`Unknown admin table: ${table}`);
    return t;
  }

  async getAdminRecords(table: string): Promise<AdminRecord[]> {
    const t = this.getAdminTable(table);
    return await db.select().from(t) as AdminRecord[];
  }
  async getAdminRecord(table: string, id: number): Promise<AdminRecord | undefined> {
    const t = this.getAdminTable(table);
    const rows = await db.select().from(t).where(eq(t.id, id)) as AdminRecord[];
    return rows[0];
  }
  async createAdminRecord(table: string, data: CreateAdminRecordRequest): Promise<AdminRecord> {
    const t = this.getAdminTable(table);
    const rows = await db.insert(t).values(data as any).returning() as AdminRecord[];
    return rows[0];
  }
  async updateAdminRecord(table: string, id: number, data: UpdateAdminRecordRequest): Promise<AdminRecord | undefined> {
    const t = this.getAdminTable(table);
    const rows = await db.update(t).set(data as any).where(eq(t.id, id)).returning() as AdminRecord[];
    return rows[0];
  }
  async deleteAdminRecord(table: string, id: number): Promise<void> {
    const t = this.getAdminTable(table);
    await db.delete(t).where(eq(t.id, id));
  }
  async reorderAdminRecords(table: string, orderedIds: number[]): Promise<AdminRecord[]> {
    const t = this.getAdminTable(table);
    for (let i = 0; i < orderedIds.length; i++) {
      await db.update(t).set({ sortOrder: i + 1 } as any).where(eq(t.id, orderedIds[i]));
    }
    return await db.select().from(t) as AdminRecord[];
  }
}

export const storage = new DatabaseStorage();
