import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

// Business Units (e.g., UK EMI, Gibraltar VASP)
export const businessUnits = pgTable("business_units", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  jurisdiction: text("jurisdiction").notNull(), // UK, Gibraltar, Estonia
  type: text("type").notNull(), // EMI, VASP, CASP
});

// Policies / Documents
export const policies = pgTable("policies", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull(), // Policy, Standard, Procedure
  status: text("status").notNull(), // Draft, In Review, Approved, Published
  version: text("version").notNull(), // v1.0, v1.1
  content: text("content").notNull(), // Markdown content
  owner: text("owner").notNull(),
  lastUpdated: timestamp("last_updated").defaultNow(),
  businessUnitId: integer("business_unit_id"), // Null = Group Level
});

// Regulatory Requirements (Library)
export const requirements = pgTable("requirements", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(), // e.g., "EMR-2011-19"
  description: text("description").notNull(),
  source: text("source").notNull(), // e.g., "Electronic Money Regulations 2011"
  category: text("category").notNull(), // Safeguarding, AML, Governance
});

// Gap Analysis / Mappings (Policy <-> Requirement)
export const coverage = pgTable("coverage", {
  id: serial("id").primaryKey(),
  policyId: integer("policy_id").notNull(),
  requirementId: integer("requirement_id").notNull(),
  status: text("status").notNull(), // Covered, Partially Covered, Not Covered
  notes: text("notes"),
});

// Findings / Issues
export const findings = pgTable("findings", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  severity: text("severity").notNull(), // High, Medium, Low
  status: text("status").notNull(), // Open, In Progress, Closed
  businessUnitId: integer("business_unit_id").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date"),
});

// === SCHEMAS ===

export const insertBusinessUnitSchema = createInsertSchema(businessUnits).omit({ id: true });
export const insertPolicySchema = createInsertSchema(policies).omit({ id: true, lastUpdated: true });
export const insertRequirementSchema = createInsertSchema(requirements).omit({ id: true });
export const insertCoverageSchema = createInsertSchema(coverage).omit({ id: true });
export const insertFindingSchema = createInsertSchema(findings).omit({ id: true });

// === EXPLICIT API TYPES ===

export type BusinessUnit = typeof businessUnits.$inferSelect;
export type Policy = typeof policies.$inferSelect;
export type Requirement = typeof requirements.$inferSelect;
export type Coverage = typeof coverage.$inferSelect;
export type Finding = typeof findings.$inferSelect;

export type CreatePolicyRequest = z.infer<typeof insertPolicySchema>;
export type UpdatePolicyRequest = Partial<CreatePolicyRequest>;
