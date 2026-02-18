import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// =============================================
// BUSINESS UNITS & REGULATORY PROFILES
// =============================================

export const businessUnits = pgTable("business_units", {
  id: serial("id").primaryKey(),
  code: text("code"),
  name: text("name").notNull(),
  jurisdiction: text("jurisdiction").notNull(),
  type: text("type").notNull(),
  activities: text("activities").array().notNull(),
  status: text("status").notNull().default("Active"),
  effectiveDate: timestamp("effective_date"),
  description: text("description"),
});

export const regulatoryProfiles = pgTable("regulatory_profiles", {
  id: serial("id").primaryKey(),
  businessUnitId: integer("business_unit_id").notNull(),
  sourceId: integer("source_id").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  effectiveFrom: timestamp("effective_from"),
  notes: text("notes"),
});

// =============================================
// REGULATORY SOURCES & REQUIREMENTS
// =============================================

export const regulatorySources = pgTable("regulatory_sources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  jurisdiction: text("jurisdiction").notNull(),
  url: text("url"),
  category: text("category").notNull(),
  effectiveDate: timestamp("effective_date"),
  description: text("description"),
});

export const requirements = pgTable("requirements", {
  id: serial("id").primaryKey(),
  sourceId: integer("source_id").notNull(),
  code: text("code").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  article: text("article"),
});

// =============================================
// DOCUMENTS (Policies, Standards, Procedures, etc.)
// =============================================

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  documentReference: text("document_reference"),
  title: text("title").notNull(),
  docType: text("doc_type").notNull(),
  taxonomy: text("taxonomy").notNull(),
  owner: text("owner").notNull(),
  delegates: text("delegates").array(),
  reviewers: text("reviewers").array(),
  approvers: text("approvers").array(),
  tags: text("tags").array(),
  reviewFrequency: text("review_frequency"),
  nextReviewDate: timestamp("next_review_date"),
  businessUnitId: integer("business_unit_id"),
  parentDocumentId: integer("parent_document_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// =============================================
// DOCUMENT VERSIONS (Immutable)
// =============================================

export const documentVersions = pgTable("document_versions", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  version: text("version").notNull(),
  status: text("status").notNull(),
  content: text("content").notNull(),
  contentHash: text("content_hash"),
  changeReason: text("change_reason"),
  changeSummary: text("change_summary"),
  riskImpact: text("risk_impact"),
  effectiveDate: timestamp("effective_date"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  pdfS3Key: text("pdf_s3_key"),
  pdfFileName: text("pdf_file_name"),
  pdfFileSize: integer("pdf_file_size"),
  markDown: text("mark_down"),
});

// =============================================
// ADDENDA (Model A — baseline + local appendix)
// =============================================

export const addenda = pgTable("addenda", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  businessUnitId: integer("business_unit_id").notNull(),
  versionId: integer("version_id").notNull(),
  content: text("content").notNull(),
  status: text("status").notNull(),
  approvedBy: text("approved_by"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// =============================================
// EFFECTIVE POLICIES (Composed render)
// =============================================

export const effectivePolicies = pgTable("effective_policies", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  businessUnitId: integer("business_unit_id").notNull(),
  versionId: integer("version_id").notNull(),
  addendumId: integer("addendum_id"),
  composedContent: text("composed_content").notNull(),
  compositionHash: text("composition_hash").notNull(),
  generatedAt: timestamp("generated_at").defaultNow(),
});

// =============================================
// APPROVALS & AUDIT TRAIL
// =============================================

export const approvals = pgTable("approvals", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  action: text("action").notNull(),
  status: text("status").notNull(),
  approver: text("approver").notNull(),
  comments: text("comments"),
  artefactHash: text("artefact_hash"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  action: text("action").notNull(),
  actor: text("actor").notNull(),
  details: text("details"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// =============================================
// REVIEW HISTORY
// =============================================

export const reviewHistory = pgTable("review_history", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  reviewer: text("reviewer").notNull(),
  outcome: text("outcome").notNull(),
  comments: text("comments"),
  actionsRaised: text("actions_raised"),
  reviewedAt: timestamp("reviewed_at").defaultNow(),
});

// =============================================
// REQUIREMENT MAPPINGS (Policy ↔ Requirement)
// =============================================

export const requirementMappings = pgTable("requirement_mappings", {
  id: serial("id").primaryKey(),
  requirementId: integer("requirement_id").notNull(),
  documentId: integer("document_id"),
  versionId: integer("version_id"),
  businessUnitId: integer("business_unit_id"),
  coverageStatus: text("coverage_status").notNull(),
  rationale: text("rationale"),
  evidencePointers: text("evidence_pointers"),
  reviewerSignOff: text("reviewer_sign_off"),
  confirmedAt: timestamp("confirmed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// =============================================
// FINDINGS & REMEDIATION
// =============================================

export const findings = pgTable("findings", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  source: text("source").notNull(),
  severity: text("severity").notNull(),
  status: text("status").notNull(),
  businessUnitId: integer("business_unit_id").notNull(),
  requirementId: integer("requirement_id"),
  documentId: integer("document_id"),
  description: text("description"),
  rootCause: text("root_cause"),
  remediationPlan: text("remediation_plan"),
  owner: text("owner").notNull(),
  approver: text("approver"),
  dueDate: timestamp("due_date"),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const findingEvidence = pgTable("finding_evidence", {
  id: serial("id").primaryKey(),
  findingId: integer("finding_id").notNull(),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url"),
  description: text("description"),
  uploadedBy: text("uploaded_by").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// =============================================
// POLICY LINKS (Graph)
// =============================================

export const policyLinks = pgTable("policy_links", {
  id: serial("id").primaryKey(),
  fromDocumentId: integer("from_document_id").notNull(),
  toDocumentId: integer("to_document_id").notNull(),
  linkType: text("link_type").notNull(),
});

// =============================================
// AUDITS
// =============================================

export const audits = pgTable("audits", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  auditType: text("audit_type").notNull(),
  status: text("status").notNull(),
  businessUnitId: integer("business_unit_id"),
  scope: text("scope"),
  leadAuditor: text("lead_auditor").notNull(),
  auditFirm: text("audit_firm"),
  scheduledDate: timestamp("scheduled_date"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  reportDate: timestamp("report_date"),
  findingsCount: integer("findings_count").default(0),
  recommendations: text("recommendations"),
  overallRating: text("overall_rating"),
  createdAt: timestamp("created_at").defaultNow(),
});

// =============================================
// COMMITMENTS (Regulatory conditions / undertakings)
// =============================================

export const commitments = pgTable("commitments", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  source: text("source").notNull(),
  sourceReference: text("source_reference"),
  businessUnitId: integer("business_unit_id"),
  category: text("category").notNull(),
  description: text("description"),
  status: text("status").notNull().default("Open"),
  owner: text("owner").notNull(),
  dueDate: timestamp("due_date"),
  completedDate: timestamp("completed_date"),
  evidenceNotes: text("evidence_notes"),
  priority: text("priority").notNull().default("Medium"),
  createdAt: timestamp("created_at").defaultNow(),
});

// =============================================
// KNOWLEDGE BASE ARTICLES
// =============================================

export const knowledgeBaseArticles = pgTable("knowledge_base_articles", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  content: text("content").notNull(),
  author: text("author").notNull(),
  tags: text("tags").array(),
  status: text("status").notNull().default("Published"),
  jurisdiction: text("jurisdiction"),
  relatedDocumentId: integer("related_document_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// =============================================
// RISK MANAGEMENT
// =============================================

export const risks = pgTable("risks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  status: text("status").notNull().default("Identified"),
  businessUnitId: integer("business_unit_id"),
  requirementId: integer("requirement_id"),
  owner: text("owner").notNull(),
  inherentLikelihood: integer("inherent_likelihood").notNull().default(3),
  inherentImpact: integer("inherent_impact").notNull().default(3),
  inherentScore: integer("inherent_score").notNull().default(9),
  inherentRating: text("inherent_rating").notNull().default("Medium"),
  residualLikelihood: integer("residual_likelihood").notNull().default(3),
  residualImpact: integer("residual_impact").notNull().default(3),
  residualScore: integer("residual_score").notNull().default(9),
  residualRating: text("residual_rating").notNull().default("Medium"),
  mitigationStrategy: text("mitigation_strategy"),
  controlDescription: text("control_description"),
  riskAppetite: text("risk_appetite"),
  reviewDate: timestamp("review_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const riskLibrary = pgTable("risk_library", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  suggestedLikelihood: integer("suggested_likelihood").notNull().default(3),
  suggestedImpact: integer("suggested_impact").notNull().default(3),
  suggestedControls: text("suggested_controls"),
  jurisdiction: text("jurisdiction"),
  source: text("source"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const riskActions = pgTable("risk_actions", {
  id: serial("id").primaryKey(),
  riskId: integer("risk_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  assignee: text("assignee").notNull(),
  status: text("status").notNull().default("Open"),
  priority: text("priority").notNull().default("Medium"),
  dueDate: timestamp("due_date"),
  completedDate: timestamp("completed_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const riskSnapshots = pgTable("risk_snapshots", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  businessUnitId: integer("business_unit_id"),
  totalRisks: integer("total_risks").notNull().default(0),
  criticalCount: integer("critical_count").notNull().default(0),
  highCount: integer("high_count").notNull().default(0),
  mediumCount: integer("medium_count").notNull().default(0),
  lowCount: integer("low_count").notNull().default(0),
  openActions: integer("open_actions").notNull().default(0),
  snapshotData: jsonb("snapshot_data"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const riskCategories = pgTable("risk_categories", {
  id: serial("id").primaryKey(),
  value: text("value").notNull(),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const impactLevels = pgTable("impact_levels", {
  id: serial("id").primaryKey(),
  value: integer("value").notNull(),
  label: text("label").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const likelihoodLevels = pgTable("likelihood_levels", {
  id: serial("id").primaryKey(),
  value: integer("value").notNull(),
  label: text("label").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

// =============================================
// USERS
// =============================================

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull(),
  jobTitle: text("job_title"),
  department: text("department"),
  businessUnitId: integer("business_unit_id"),
  status: text("status").notNull().default("Active"),
  phone: text("phone"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// =============================================
// ADMINISTRATION REFERENCE TABLES
// =============================================

export const entityTypes = pgTable("entity_types", {
  id: serial("id").primaryKey(),
  value: text("value").notNull(),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  value: text("value").notNull(),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const jurisdictions = pgTable("jurisdictions", {
  id: serial("id").primaryKey(),
  value: text("value").notNull(),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const documentCategories = pgTable("document_categories", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const findingSeverities = pgTable("finding_severities", {
  id: serial("id").primaryKey(),
  value: text("value").notNull(),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const documentStatuses = pgTable("document_statuses", {
  id: serial("id").primaryKey(),
  value: text("value").notNull(),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

// =============================================
// INSERT SCHEMAS
// =============================================

export const insertBusinessUnitSchema = createInsertSchema(businessUnits).omit({ id: true });
export const insertRegulatoryProfileSchema = createInsertSchema(regulatoryProfiles).omit({ id: true });
export const insertRegulatorySourceSchema = createInsertSchema(regulatorySources).omit({ id: true });
export const insertRequirementSchema = createInsertSchema(requirements).omit({ id: true });
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, createdAt: true });
export const insertDocumentVersionSchema = createInsertSchema(documentVersions).omit({ id: true, createdAt: true });
export const insertAddendumSchema = createInsertSchema(addenda).omit({ id: true, createdAt: true });
export const insertApprovalSchema = createInsertSchema(approvals).omit({ id: true, createdAt: true });
export const insertReviewHistorySchema = createInsertSchema(reviewHistory).omit({ id: true, reviewedAt: true });
export const insertRequirementMappingSchema = createInsertSchema(requirementMappings).omit({ id: true, createdAt: true });
export const insertFindingSchema = createInsertSchema(findings).omit({ id: true, createdAt: true, closedAt: true });
export const insertFindingEvidenceSchema = createInsertSchema(findingEvidence).omit({ id: true, uploadedAt: true });
export const insertPolicyLinkSchema = createInsertSchema(policyLinks).omit({ id: true });
export const insertAuditSchema = createInsertSchema(audits).omit({ id: true, createdAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertEntityTypeSchema = createInsertSchema(entityTypes).omit({ id: true });
export const insertRoleSchema = createInsertSchema(roles).omit({ id: true });
export const insertJurisdictionSchema = createInsertSchema(jurisdictions).omit({ id: true });
export const insertDocumentCategorySchema = createInsertSchema(documentCategories).omit({ id: true });
export const insertFindingSeveritySchema = createInsertSchema(findingSeverities).omit({ id: true });
export const insertDocumentStatusSchema = createInsertSchema(documentStatuses).omit({ id: true });
export const insertCommitmentSchema = createInsertSchema(commitments).omit({ id: true, createdAt: true, completedDate: true });
export const insertKnowledgeBaseArticleSchema = createInsertSchema(knowledgeBaseArticles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertRiskSchema = createInsertSchema(risks).omit({ id: true, createdAt: true, updatedAt: true });
export const insertRiskLibrarySchema = createInsertSchema(riskLibrary).omit({ id: true, createdAt: true });
export const insertRiskActionSchema = createInsertSchema(riskActions).omit({ id: true, createdAt: true, completedDate: true });
export const insertRiskSnapshotSchema = createInsertSchema(riskSnapshots).omit({ id: true, createdAt: true });
export const insertRiskCategorySchema = createInsertSchema(riskCategories).omit({ id: true });
export const insertImpactLevelSchema = createInsertSchema(impactLevels).omit({ id: true });
export const insertLikelihoodLevelSchema = createInsertSchema(likelihoodLevels).omit({ id: true });

// =============================================
// SELECT TYPES
// =============================================

export type BusinessUnit = typeof businessUnits.$inferSelect;
export type RegulatoryProfile = typeof regulatoryProfiles.$inferSelect;
export type RegulatorySource = typeof regulatorySources.$inferSelect;
export type Requirement = typeof requirements.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type DocumentVersion = typeof documentVersions.$inferSelect;
export type Addendum = typeof addenda.$inferSelect;
export type EffectivePolicy = typeof effectivePolicies.$inferSelect;
export type Approval = typeof approvals.$inferSelect;
export type AuditLogEntry = typeof auditLog.$inferSelect;
export type ReviewHistoryEntry = typeof reviewHistory.$inferSelect;
export type RequirementMapping = typeof requirementMappings.$inferSelect;
export type Finding = typeof findings.$inferSelect;
export type FindingEvidence = typeof findingEvidence.$inferSelect;
export type PolicyLink = typeof policyLinks.$inferSelect;
export type Audit = typeof audits.$inferSelect;
export type User = typeof users.$inferSelect;
export type EntityType = typeof entityTypes.$inferSelect;
export type Role = typeof roles.$inferSelect;
export type Jurisdiction = typeof jurisdictions.$inferSelect;
export type DocumentCategory = typeof documentCategories.$inferSelect;
export type FindingSeverity = typeof findingSeverities.$inferSelect;
export type Commitment = typeof commitments.$inferSelect;
export type KnowledgeBaseArticle = typeof knowledgeBaseArticles.$inferSelect;
export type Risk = typeof risks.$inferSelect;
export type RiskLibraryItem = typeof riskLibrary.$inferSelect;
export type RiskAction = typeof riskActions.$inferSelect;
export type RiskSnapshot = typeof riskSnapshots.$inferSelect;
export type RiskCategory = typeof riskCategories.$inferSelect;
export type ImpactLevel = typeof impactLevels.$inferSelect;
export type LikelihoodLevel = typeof likelihoodLevels.$inferSelect;
export type AdminRecord = EntityType | Role | Jurisdiction | DocumentCategory | FindingSeverity;

// =============================================
// REQUEST TYPES
// =============================================

export type CreateBusinessUnitRequest = z.infer<typeof insertBusinessUnitSchema>;
export type UpdateBusinessUnitRequest = Partial<CreateBusinessUnitRequest>;
export type CreateDocumentRequest = z.infer<typeof insertDocumentSchema>;
export type UpdateDocumentRequest = Partial<CreateDocumentRequest>;
export type CreateAdminRecordRequest = { value?: string; label: string; sortOrder: number; active: boolean };
export type UpdateAdminRecordRequest = Partial<CreateAdminRecordRequest>;
export type CreateDocumentVersionRequest = z.infer<typeof insertDocumentVersionSchema>;
export type CreateAddendumRequest = z.infer<typeof insertAddendumSchema>;
export type CreateApprovalRequest = z.infer<typeof insertApprovalSchema>;
export type CreateFindingRequest = z.infer<typeof insertFindingSchema>;
export type UpdateFindingRequest = Partial<CreateFindingRequest>;
export type CreateRequirementMappingRequest = z.infer<typeof insertRequirementMappingSchema>;
export type UpdateRequirementMappingRequest = Partial<CreateRequirementMappingRequest>;
export type CreateAuditRequest = z.infer<typeof insertAuditSchema>;
export type UpdateAuditRequest = Partial<CreateAuditRequest>;
export type CreateUserRequest = z.infer<typeof insertUserSchema>;
export type UpdateUserRequest = Partial<CreateUserRequest>;
export type CreateRegulatorySourceRequest = z.infer<typeof insertRegulatorySourceSchema>;
export type UpdateRegulatorySourceRequest = Partial<CreateRegulatorySourceRequest>;
export type CreateRequirementRequest = z.infer<typeof insertRequirementSchema>;
export type UpdateRequirementRequest = Partial<CreateRequirementRequest>;
export type CreateCommitmentRequest = z.infer<typeof insertCommitmentSchema>;
export type UpdateCommitmentRequest = Partial<CreateCommitmentRequest>;
export type CreateKnowledgeBaseArticleRequest = z.infer<typeof insertKnowledgeBaseArticleSchema>;
export type UpdateKnowledgeBaseArticleRequest = Partial<CreateKnowledgeBaseArticleRequest>;
export type CreateRiskRequest = z.infer<typeof insertRiskSchema>;
export type UpdateRiskRequest = Partial<CreateRiskRequest>;
export type CreateRiskLibraryRequest = z.infer<typeof insertRiskLibrarySchema>;
export type UpdateRiskLibraryRequest = Partial<CreateRiskLibraryRequest>;
export type CreateRiskActionRequest = z.infer<typeof insertRiskActionSchema>;
export type UpdateRiskActionRequest = Partial<CreateRiskActionRequest>;
export type CreateRiskSnapshotRequest = z.infer<typeof insertRiskSnapshotSchema>;
