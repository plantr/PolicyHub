import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// =============================================
// BUSINESS UNITS & REGULATORY PROFILES
// =============================================

export const businessUnits = pgTable("business_units", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  jurisdiction: text("jurisdiction").notNull(),
  type: text("type").notNull(),
  activities: text("activities").array().notNull(),
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
  documentId: integer("document_id").notNull(),
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

// =============================================
// REQUEST TYPES
// =============================================

export type CreateBusinessUnitRequest = z.infer<typeof insertBusinessUnitSchema>;
export type CreateDocumentRequest = z.infer<typeof insertDocumentSchema>;
export type UpdateDocumentRequest = Partial<CreateDocumentRequest>;
export type CreateDocumentVersionRequest = z.infer<typeof insertDocumentVersionSchema>;
export type CreateAddendumRequest = z.infer<typeof insertAddendumSchema>;
export type CreateApprovalRequest = z.infer<typeof insertApprovalSchema>;
export type CreateFindingRequest = z.infer<typeof insertFindingSchema>;
export type UpdateFindingRequest = Partial<CreateFindingRequest>;
export type CreateRequirementMappingRequest = z.infer<typeof insertRequirementMappingSchema>;
export type UpdateRequirementMappingRequest = Partial<CreateRequirementMappingRequest>;
