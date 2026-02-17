import { db } from "./db";
import {
  businessUnits, policies, requirements, coverage, findings,
  type BusinessUnit, type Policy, type Requirement, type Coverage, type Finding,
  type CreatePolicyRequest, type UpdatePolicyRequest
} from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Business Units
  getBusinessUnits(): Promise<BusinessUnit[]>;
  getBusinessUnit(id: number): Promise<BusinessUnit | undefined>;
  
  // Policies
  getPolicies(filters?: { businessUnitId?: number, status?: string }): Promise<Policy[]>;
  getPolicy(id: number): Promise<Policy | undefined>;
  createPolicy(policy: CreatePolicyRequest): Promise<Policy>;
  updatePolicy(id: number, policy: UpdatePolicyRequest): Promise<Policy>;
  
  // Requirements
  getRequirements(): Promise<Requirement[]>;
  
  // Coverage
  getCoverage(): Promise<Coverage[]>;
  
  // Findings
  getFindings(): Promise<Finding[]>;
  createFinding(finding: any): Promise<Finding>;
}

export class DatabaseStorage implements IStorage {
  // Business Units
  async getBusinessUnits(): Promise<BusinessUnit[]> {
    return await db.select().from(businessUnits);
  }

  async getBusinessUnit(id: number): Promise<BusinessUnit | undefined> {
    const [bu] = await db.select().from(businessUnits).where(eq(businessUnits.id, id));
    return bu;
  }

  // Policies
  async getPolicies(filters?: { businessUnitId?: number, status?: string }): Promise<Policy[]> {
    let query = db.select().from(policies);
    // Note: Drizzle query building would go here for filters
    // For MVP shell, returning all
    return await query;
  }

  async getPolicy(id: number): Promise<Policy | undefined> {
    const [policy] = await db.select().from(policies).where(eq(policies.id, id));
    return policy;
  }

  async createPolicy(policy: CreatePolicyRequest): Promise<Policy> {
    const [newPolicy] = await db.insert(policies).values(policy).returning();
    return newPolicy;
  }

  async updatePolicy(id: number, policy: UpdatePolicyRequest): Promise<Policy> {
    const [updated] = await db.update(policies)
      .set(policy)
      .where(eq(policies.id, id))
      .returning();
    return updated;
  }

  // Requirements
  async getRequirements(): Promise<Requirement[]> {
    return await db.select().from(requirements);
  }

  // Coverage
  async getCoverage(): Promise<Coverage[]> {
    return await db.select().from(coverage);
  }

  // Findings
  async getFindings(): Promise<Finding[]> {
    return await db.select().from(findings);
  }

  async createFinding(finding: any): Promise<Finding> {
    const [newFinding] = await db.insert(findings).values(finding).returning();
    return newFinding;
  }
}

export const storage = new DatabaseStorage();
