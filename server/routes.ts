import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { businessUnits, policies, requirements, coverage, findings } from "@shared/schema";
import { db } from "./db";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Business Units
  app.get(api.businessUnits.list.path, async (_req, res) => {
    const bus = await storage.getBusinessUnits();
    res.json(bus);
  });

  app.get(api.businessUnits.get.path, async (req, res) => {
    const bu = await storage.getBusinessUnit(Number(req.params.id));
    if (!bu) return res.status(404).json({ message: "Business Unit not found" });
    res.json(bu);
  });

  // Policies
  app.get(api.policies.list.path, async (req, res) => {
    const policiesList = await storage.getPolicies(); // Filters to be implemented
    res.json(policiesList);
  });

  app.get(api.policies.get.path, async (req, res) => {
    const policy = await storage.getPolicy(Number(req.params.id));
    if (!policy) return res.status(404).json({ message: "Policy not found" });
    res.json(policy);
  });

  app.post(api.policies.create.path, async (req, res) => {
    try {
      const input = api.policies.create.input.parse(req.body);
      const policy = await storage.createPolicy(input);
      res.status(201).json(policy);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.put(api.policies.update.path, async (req, res) => {
    try {
      const input = api.policies.update.input.parse(req.body);
      const policy = await storage.updatePolicy(Number(req.params.id), input);
      res.json(policy);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // Requirements
  app.get(api.requirements.list.path, async (_req, res) => {
    const reqs = await storage.getRequirements();
    res.json(reqs);
  });

  // Coverage
  app.get(api.coverage.list.path, async (_req, res) => {
    const cov = await storage.getCoverage();
    res.json(cov);
  });

  // Findings
  app.get(api.findings.list.path, async (_req, res) => {
    const f = await storage.getFindings();
    res.json(f);
  });

  app.post(api.findings.create.path, async (req, res) => {
    const f = await storage.createFinding(req.body);
    res.status(201).json(f);
  });

  // Stats
  app.get(api.stats.get.path, async (_req, res) => {
    const allPolicies = await storage.getPolicies();
    const allReqs = await storage.getRequirements();
    const allCoverage = await storage.getCoverage();
    const allFindings = await storage.getFindings();
    
    // Simple mock logic for gaps
    const gapCount = allCoverage.filter(c => c.status !== 'Covered').length;
    const openFindings = allFindings.filter(f => f.status !== 'Closed').length;

    res.json({
      totalPolicies: allPolicies.length,
      totalRequirements: allReqs.length,
      gapCount,
      openFindings
    });
  });

  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existingBUs = await storage.getBusinessUnits();
  if (existingBUs.length > 0) return;

  // Seed BUs
  const bu1 = (await db.insert(businessUnits).values({
    name: "UK EMI",
    jurisdiction: "UK",
    type: "EMI"
  }).returning())[0];

  const bu2 = (await db.insert(businessUnits).values({
    name: "Gibraltar VASP",
    jurisdiction: "Gibraltar",
    type: "VASP"
  }).returning())[0];

  // Seed Requirements (from brief)
  const req1 = (await db.insert(requirements).values({
    code: "EMR-2011-19",
    description: "Safeguarding requirements for electronic money institutions",
    source: "Electronic Money Regulations 2011",
    category: "Safeguarding"
  }).returning())[0];

  const req2 = (await db.insert(requirements).values({
    code: "PSR-2017-19",
    description: "Safeguarding requirements for payment institutions",
    source: "Payment Services Regulations 2017",
    category: "Safeguarding"
  }).returning())[0];

  const req3 = (await db.insert(requirements).values({
    code: "MLR-2017-1",
    description: "Risk assessment and policies controls and procedures",
    source: "Money Laundering Regulations 2017",
    category: "AML"
  }).returning())[0];

  // Seed Policies
  const pol1 = (await db.insert(policies).values({
    title: "Global AML Policy",
    type: "Policy",
    status: "Published",
    version: "v2.1",
    content: "# Global AML Policy\n\n## 1. Purpose\nTo prevent financial crime...\n\n## 2. Scope\nApplies to all entities.",
    owner: "Head of Compliance",
    businessUnitId: null // Group level
  }).returning())[0];

  const pol2 = (await db.insert(policies).values({
    title: "Safeguarding Policy (UK)",
    type: "Policy",
    status: "Approved",
    version: "v1.0",
    content: "# Safeguarding Policy\n\n## 1. Segregation of Funds\nFunds must be segregated upon receipt...",
    owner: "UK MLRO",
    businessUnitId: bu1.id
  }).returning())[0];

  // Seed Findings
  await db.insert(findings).values({
    title: "Missing Safeguarding Audit",
    severity: "High",
    status: "Open",
    businessUnitId: bu1.id,
    description: "Annual safeguarding audit was not completed on time.",
    dueDate: new Date("2024-12-31")
  });

  // Seed Coverage
  await db.insert(coverage).values({
    policyId: pol2.id,
    requirementId: req1.id,
    status: "Covered",
    notes: "Fully mapped to section 3"
  });
}
