import { z } from 'zod';
import { insertPolicySchema, insertBusinessUnitSchema, insertRequirementSchema, insertFindingSchema, policies, businessUnits, requirements, findings, coverage } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  businessUnits: {
    list: {
      method: 'GET' as const,
      path: '/api/business-units' as const,
      responses: {
        200: z.array(z.custom<typeof businessUnits.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/business-units/:id' as const,
      responses: {
        200: z.custom<typeof businessUnits.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    }
  },
  policies: {
    list: {
      method: 'GET' as const,
      path: '/api/policies' as const,
      input: z.object({
        businessUnitId: z.string().optional(),
        status: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof policies.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/policies/:id' as const,
      responses: {
        200: z.custom<typeof policies.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/policies' as const,
      input: insertPolicySchema,
      responses: {
        201: z.custom<typeof policies.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/policies/:id' as const,
      input: insertPolicySchema.partial(),
      responses: {
        200: z.custom<typeof policies.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
  },
  requirements: {
    list: {
      method: 'GET' as const,
      path: '/api/requirements' as const,
      responses: {
        200: z.array(z.custom<typeof requirements.$inferSelect>()),
      },
    },
  },
  coverage: {
    list: {
      method: 'GET' as const,
      path: '/api/coverage' as const,
      responses: {
        200: z.array(z.custom<typeof coverage.$inferSelect>()),
      },
    },
  },
  findings: {
    list: {
      method: 'GET' as const,
      path: '/api/findings' as const,
      responses: {
        200: z.array(z.custom<typeof findings.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/findings' as const,
      input: insertFindingSchema,
      responses: {
        201: z.custom<typeof findings.$inferSelect>(),
      },
    }
  },
  stats: {
    get: {
      method: 'GET' as const,
      path: '/api/stats' as const,
      responses: {
        200: z.object({
          totalPolicies: z.number(),
          totalRequirements: z.number(),
          gapCount: z.number(),
          openFindings: z.number(),
        }),
      }
    }
  }
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
