import { z } from 'zod';
import {
  insertBusinessUnitSchema, insertDocumentSchema, insertDocumentVersionSchema,
  insertAddendumSchema, insertApprovalSchema, insertFindingSchema,
  insertRequirementMappingSchema, insertReviewHistorySchema,
  insertRegulatorySourceSchema, insertRequirementSchema, insertAuditSchema,
  insertUserSchema, insertCommitmentSchema, insertKnowledgeBaseArticleSchema,
  businessUnits, regulatorySources, requirements, documents, documentVersions,
  addenda, effectivePolicies, approvals, auditLog, reviewHistory,
  requirementMappings, findings, findingEvidence, policyLinks, regulatoryProfiles,
  audits, users, entityTypes, roles, jurisdictions, documentCategories, findingSeverities,
  commitments, knowledgeBaseArticles,
} from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
};

export const api = {
  // =============================================
  // BUSINESS UNITS
  // =============================================
  businessUnits: {
    list: {
      method: 'GET' as const,
      path: '/api/business-units' as const,
      responses: { 200: z.array(z.custom<typeof businessUnits.$inferSelect>()) },
    },
    get: {
      method: 'GET' as const,
      path: '/api/business-units/:id' as const,
      responses: {
        200: z.custom<typeof businessUnits.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/business-units' as const,
      input: insertBusinessUnitSchema,
      responses: {
        201: z.custom<typeof businessUnits.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/business-units/:id' as const,
      input: insertBusinessUnitSchema.partial(),
      responses: {
        200: z.custom<typeof businessUnits.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/business-units/:id' as const,
      responses: {
        204: z.object({}),
        404: errorSchemas.notFound,
      },
    },
  },

  // =============================================
  // REGULATORY SOURCES
  // =============================================
  regulatorySources: {
    list: {
      method: 'GET' as const,
      path: '/api/regulatory-sources' as const,
      responses: { 200: z.array(z.custom<typeof regulatorySources.$inferSelect>()) },
    },
    get: {
      method: 'GET' as const,
      path: '/api/regulatory-sources/:id' as const,
      responses: {
        200: z.custom<typeof regulatorySources.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/regulatory-sources' as const,
      input: insertRegulatorySourceSchema,
      responses: {
        201: z.custom<typeof regulatorySources.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/regulatory-sources/:id' as const,
      input: insertRegulatorySourceSchema.partial(),
      responses: {
        200: z.custom<typeof regulatorySources.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/regulatory-sources/:id' as const,
      responses: {
        204: z.object({}),
        404: errorSchemas.notFound,
      },
    },
  },

  // =============================================
  // REGULATORY PROFILES (BU ↔ Source applicability)
  // =============================================
  regulatoryProfiles: {
    list: {
      method: 'GET' as const,
      path: '/api/regulatory-profiles' as const,
      responses: { 200: z.array(z.custom<typeof regulatoryProfiles.$inferSelect>()) },
    },
  },

  // =============================================
  // REQUIREMENTS
  // =============================================
  requirements: {
    list: {
      method: 'GET' as const,
      path: '/api/requirements' as const,
      responses: { 200: z.array(z.custom<typeof requirements.$inferSelect>()) },
    },
    get: {
      method: 'GET' as const,
      path: '/api/requirements/:id' as const,
      responses: {
        200: z.custom<typeof requirements.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/requirements' as const,
      input: insertRequirementSchema,
      responses: {
        201: z.custom<typeof requirements.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/requirements/:id' as const,
      input: insertRequirementSchema.partial(),
      responses: {
        200: z.custom<typeof requirements.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/requirements/:id' as const,
      responses: {
        204: z.object({}),
        404: errorSchemas.notFound,
      },
    },
  },

  // =============================================
  // DOCUMENTS
  // =============================================
  documents: {
    list: {
      method: 'GET' as const,
      path: '/api/documents' as const,
      responses: { 200: z.array(z.custom<typeof documents.$inferSelect>()) },
    },
    get: {
      method: 'GET' as const,
      path: '/api/documents/:id' as const,
      responses: {
        200: z.custom<typeof documents.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/documents' as const,
      input: insertDocumentSchema,
      responses: {
        201: z.custom<typeof documents.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/documents/:id' as const,
      input: insertDocumentSchema.partial(),
      responses: {
        200: z.custom<typeof documents.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/documents/:id' as const,
      responses: {
        204: z.object({}),
        404: errorSchemas.notFound,
      },
    },
  },

  // =============================================
  // DOCUMENT VERSIONS
  // =============================================
  documentVersions: {
    list: {
      method: 'GET' as const,
      path: '/api/documents/:documentId/versions' as const,
      responses: { 200: z.array(z.custom<typeof documentVersions.$inferSelect>()) },
    },
    create: {
      method: 'POST' as const,
      path: '/api/documents/:documentId/versions' as const,
      input: insertDocumentVersionSchema,
      responses: {
        201: z.custom<typeof documentVersions.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    updateStatus: {
      method: 'PUT' as const,
      path: '/api/document-versions/:id/status' as const,
      input: z.object({ status: z.string() }),
      responses: {
        200: z.custom<typeof documentVersions.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },

  // =============================================
  // ADDENDA (Model A)
  // =============================================
  addenda: {
    list: {
      method: 'GET' as const,
      path: '/api/documents/:documentId/addenda' as const,
      responses: { 200: z.array(z.custom<typeof addenda.$inferSelect>()) },
    },
    create: {
      method: 'POST' as const,
      path: '/api/addenda' as const,
      input: insertAddendumSchema,
      responses: {
        201: z.custom<typeof addenda.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },

  // =============================================
  // EFFECTIVE POLICIES
  // =============================================
  effectivePolicies: {
    get: {
      method: 'GET' as const,
      path: '/api/effective-policies/:documentId/:businessUnitId' as const,
      responses: {
        200: z.custom<typeof effectivePolicies.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    generate: {
      method: 'POST' as const,
      path: '/api/effective-policies/generate' as const,
      input: z.object({
        documentId: z.number(),
        businessUnitId: z.number(),
        versionId: z.number(),
        addendumId: z.number().optional(),
      }),
      responses: {
        201: z.custom<typeof effectivePolicies.$inferSelect>(),
      },
    },
  },

  // =============================================
  // APPROVALS
  // =============================================
  approvals: {
    list: {
      method: 'GET' as const,
      path: '/api/approvals' as const,
      responses: { 200: z.array(z.custom<typeof approvals.$inferSelect>()) },
    },
    create: {
      method: 'POST' as const,
      path: '/api/approvals' as const,
      input: insertApprovalSchema,
      responses: {
        201: z.custom<typeof approvals.$inferSelect>(),
      },
    },
  },

  // =============================================
  // AUDIT LOG
  // =============================================
  auditLog: {
    list: {
      method: 'GET' as const,
      path: '/api/audit-log' as const,
      responses: { 200: z.array(z.custom<typeof auditLog.$inferSelect>()) },
    },
  },

  // =============================================
  // REVIEW HISTORY
  // =============================================
  reviewHistory: {
    list: {
      method: 'GET' as const,
      path: '/api/documents/:documentId/reviews' as const,
      responses: { 200: z.array(z.custom<typeof reviewHistory.$inferSelect>()) },
    },
    create: {
      method: 'POST' as const,
      path: '/api/reviews' as const,
      input: insertReviewHistorySchema,
      responses: {
        201: z.custom<typeof reviewHistory.$inferSelect>(),
      },
    },
  },

  // =============================================
  // REQUIREMENT MAPPINGS
  // =============================================
  requirementMappings: {
    list: {
      method: 'GET' as const,
      path: '/api/requirement-mappings' as const,
      responses: { 200: z.array(z.custom<typeof requirementMappings.$inferSelect>()) },
    },
    create: {
      method: 'POST' as const,
      path: '/api/requirement-mappings' as const,
      input: insertRequirementMappingSchema,
      responses: {
        201: z.custom<typeof requirementMappings.$inferSelect>(),
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/requirement-mappings/:id' as const,
      input: insertRequirementMappingSchema.partial(),
      responses: {
        200: z.custom<typeof requirementMappings.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },

  // =============================================
  // FINDINGS & REMEDIATION
  // =============================================
  findings: {
    list: {
      method: 'GET' as const,
      path: '/api/findings' as const,
      responses: { 200: z.array(z.custom<typeof findings.$inferSelect>()) },
    },
    get: {
      method: 'GET' as const,
      path: '/api/findings/:id' as const,
      responses: {
        200: z.custom<typeof findings.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/findings' as const,
      input: insertFindingSchema,
      responses: {
        201: z.custom<typeof findings.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/findings/:id' as const,
      input: insertFindingSchema.partial(),
      responses: {
        200: z.custom<typeof findings.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/findings/:id' as const,
      responses: {
        204: z.object({}),
        404: errorSchemas.notFound,
      },
    },
  },

  findingEvidence: {
    list: {
      method: 'GET' as const,
      path: '/api/findings/:findingId/evidence' as const,
      responses: { 200: z.array(z.custom<typeof findingEvidence.$inferSelect>()) },
    },
  },

  // =============================================
  // POLICY LINKS (Graph)
  // =============================================
  policyLinks: {
    list: {
      method: 'GET' as const,
      path: '/api/policy-links' as const,
      responses: { 200: z.array(z.custom<typeof policyLinks.$inferSelect>()) },
    },
  },

  // =============================================
  // AUDITS
  // =============================================
  audits: {
    list: {
      method: 'GET' as const,
      path: '/api/audits' as const,
      responses: { 200: z.array(z.custom<typeof audits.$inferSelect>()) },
    },
    get: {
      method: 'GET' as const,
      path: '/api/audits/:id' as const,
      responses: {
        200: z.custom<typeof audits.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/audits' as const,
      input: insertAuditSchema,
      responses: {
        201: z.custom<typeof audits.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/audits/:id' as const,
      input: insertAuditSchema.partial(),
      responses: {
        200: z.custom<typeof audits.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/audits/:id' as const,
      responses: {
        204: z.object({}),
        404: errorSchemas.notFound,
      },
    },
  },

  // =============================================
  // USERS
  // =============================================
  users: {
    list: {
      method: 'GET' as const,
      path: '/api/users' as const,
      responses: { 200: z.array(z.custom<typeof users.$inferSelect>()) },
    },
    get: {
      method: 'GET' as const,
      path: '/api/users/:id' as const,
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/users' as const,
      input: insertUserSchema,
      responses: {
        201: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/users/:id' as const,
      input: insertUserSchema.partial(),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },

  // =============================================
  // ADMINISTRATION REFERENCE TABLES
  // =============================================
  admin: {
    list: {
      method: 'GET' as const,
      path: '/api/admin/:table' as const,
      responses: { 200: z.array(z.object({ id: z.number(), value: z.string().optional(), label: z.string(), sortOrder: z.number(), active: z.boolean() })) },
    },
    create: {
      method: 'POST' as const,
      path: '/api/admin/:table' as const,
      input: z.object({ value: z.string().optional(), label: z.string(), sortOrder: z.number().int().default(0), active: z.boolean().default(true) }),
      responses: {
        201: z.object({ id: z.number(), value: z.string().optional(), label: z.string(), sortOrder: z.number(), active: z.boolean() }),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/admin/:table/:id' as const,
      input: z.object({ value: z.string().optional(), label: z.string(), sortOrder: z.number().int(), active: z.boolean() }).partial(),
      responses: {
        200: z.object({ id: z.number(), value: z.string().optional(), label: z.string(), sortOrder: z.number(), active: z.boolean() }),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/admin/:table/:id' as const,
      responses: {
        204: z.object({}),
        404: errorSchemas.notFound,
      },
    },
  },

  // =============================================
  // COMMITMENTS
  // =============================================
  commitments: {
    list: {
      method: 'GET' as const,
      path: '/api/commitments' as const,
      responses: { 200: z.array(z.custom<typeof commitments.$inferSelect>()) },
    },
    get: {
      method: 'GET' as const,
      path: '/api/commitments/:id' as const,
      responses: {
        200: z.custom<typeof commitments.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/commitments' as const,
      input: insertCommitmentSchema,
      responses: {
        201: z.custom<typeof commitments.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/commitments/:id' as const,
      input: insertCommitmentSchema.partial(),
      responses: {
        200: z.custom<typeof commitments.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/commitments/:id' as const,
      responses: {
        204: z.object({}),
        404: errorSchemas.notFound,
      },
    },
  },

  // =============================================
  // KNOWLEDGE BASE
  // =============================================
  knowledgeBase: {
    list: {
      method: 'GET' as const,
      path: '/api/knowledge-base' as const,
      responses: { 200: z.array(z.custom<typeof knowledgeBaseArticles.$inferSelect>()) },
    },
    get: {
      method: 'GET' as const,
      path: '/api/knowledge-base/:id' as const,
      responses: {
        200: z.custom<typeof knowledgeBaseArticles.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/knowledge-base' as const,
      input: insertKnowledgeBaseArticleSchema,
      responses: {
        201: z.custom<typeof knowledgeBaseArticles.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/knowledge-base/:id' as const,
      input: insertKnowledgeBaseArticleSchema.partial(),
      responses: {
        200: z.custom<typeof knowledgeBaseArticles.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/knowledge-base/:id' as const,
      responses: {
        204: z.object({}),
        404: errorSchemas.notFound,
      },
    },
  },

  // =============================================
  // DASHBOARD STATS
  // =============================================
  stats: {
    get: {
      method: 'GET' as const,
      path: '/api/stats' as const,
      responses: {
        200: z.object({
          totalDocuments: z.number(),
          totalRequirements: z.number(),
          totalSources: z.number(),
          businessUnits: z.number(),
          coveredCount: z.number(),
          partiallyCoveredCount: z.number(),
          notCoveredCount: z.number(),
          openFindings: z.number(),
          overdueFindings: z.number(),
          pendingApprovals: z.number(),
          pendingReviews: z.number(),
        }),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
