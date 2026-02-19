# Coding Conventions

**Analysis Date:** 2026-02-19

## Naming Patterns

**Files:**
- Components and pages use PascalCase: `Dashboard.tsx`, `DocumentDetail.tsx`, `App.tsx`
- Utility and hook files use kebab-case: `use-mobile.tsx`, `use-toast.ts`, `app-sidebar.tsx`, `theme-provider.tsx`
- Database schema and storage files use camelCase: `queryClient.ts`, `schema.ts`
- Route/configuration files use camelCase: `routes.ts`, `storage.ts`, `db.ts`

**Functions:**
- React components: PascalCase (`Dashboard`, `DocumentDetail`, `Router`)
- Utility functions: camelCase (`getInitials`, `getAvatarColor`, `throwIfResNotOk`)
- Helper functions: camelCase (`formatDate`, `getSeverityVariant`, `getVersionStatusClass`)
- Hooks: camelCase with `use` prefix (`useIsMobile`, `useQuery`, `useMutation`, `useForm`)

**Variables:**
- Local state and constants: camelCase (`searchQuery`, `isLoading`, `coverageRate`)
- Constants and lookup tables: CONSTANT_CASE or camelCase (`MOBILE_BREAKPOINT`, `REVIEW_FREQUENCIES`)
- Props objects and destructured imports: camelCase

**Types:**
- Type names: PascalCase (`Stats`, `Document`, `BusinessUnit`, `Finding`)
- Type imports use `type` keyword: `import type { Document, BusinessUnit } from "@shared/schema"`
- Schemas (Zod): camelCase with descriptive suffix (`docFormSchema`, `addVersionSchema`)

## Code Style

**Formatting:**
- No explicit configuration file (no `.eslintrc`, `.prettierrc`, or `biome.json`)
- Code appears to follow standard TypeScript formatting conventions
- 2-space indentation (inferred from codebase samples)
- Consistent use of semicolons at end of statements

**Linting:**
- TypeScript strict mode enabled in `tsconfig.json`
- No ESLint or Prettier config present; code quality enforced through TypeScript compiler
- Type checking: `"strict": true` enforces non-null checks, strict function types, and strict property initialization

## Import Organization

**Order:**
1. External library imports (React, third-party packages)
2. Relative imports from application code
3. Type imports (using `import type`)
4. Utility and helper imports

**Pattern examples from codebase:**

```typescript
// App.tsx - React + third-party first
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
// UI components
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
// Custom components
import { ThemeProvider } from "@/components/theme-provider";
// Pages
import Dashboard from "@/pages/Dashboard";
```

```typescript
// DocumentDetail.tsx - Mixed pattern
import { useMemo, useRef, useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import type {
  Document,
  DocumentVersion,
  BusinessUnit,
} from "@shared/schema";
// UI imports
import { Badge } from "@/components/ui/badge";
// Utilities
import { useToast } from "@/hooks/use-toast";
```

**Path Aliases:**
- `@/*` maps to `./client/src/*` - used for client-side imports
- `@shared/*` maps to `./shared/*` - used for shared schemas and types

## Error Handling

**Patterns:**

**Server-side (Express routes):**
```typescript
// Routes use try-catch with Zod validation
app.post(api.businessUnits.create.path, async (req, res) => {
  try {
    const input = api.businessUnits.create.input.parse(req.body);
    const bu = await storage.createBusinessUnit(input);
    await storage.createAuditLogEntry({
      entityType: "business_unit", entityId: bu.id,
      action: "created", actor: "System", details: `Business Unit "${bu.name}" created`
    });
    res.status(201).json(bu);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
    throw err;
  }
});

// 404 responses checked inline
app.get(api.businessUnits.get.path, async (req, res) => {
  const bu = await storage.getBusinessUnit(Number(req.params.id));
  if (!bu) return res.status(404).json({ message: "Business Unit not found" });
  res.json(bu);
});
```

**Server error middleware:**
```typescript
// Global error handler in server/index.ts
app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  console.error("Internal Server Error:", err);
  if (res.headersSent) {
    return next(err);
  }
  return res.status(status).json({ message });
});
```

**Client-side (React Query):**
```typescript
// throwIfResNotOk checks response status before returning
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// API requests throw on error, handled by React Query
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });
  await throwIfResNotOk(res);
  return res;
}
```

**Client-side (Components):**
- Components use conditional rendering for error states
- Loading states checked with `isLoading` flags
- Validation errors displayed inline with Zod schema validation

## Logging

**Framework:** `console` (no external logging library)

**Patterns:**

```typescript
// server/index.ts - Custom log function with timestamp
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

// Used for server startup and API request logging
log(`serving on port ${port}`);
log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
```

- Error logging: `console.error()` in error handlers
- Request/response logging: Duration-based middleware logs API calls
- No client-side logging library used

## Comments

**When to Comment:**
- Very minimal commenting observed in the codebase
- Comments appear only for clarification of non-obvious intent or important context
- Database schema sections grouped with comment headers (e.g., `// =============================================`)
- Implementation details left to self-documenting code and type signatures

**JSDoc/TSDoc:**
- Not used extensively in this codebase
- Function signatures and type definitions serve as documentation
- No automatic documentation generation observed

## Function Design

**Size:** Functions are generally medium-sized (50-200 lines for page components)
- Page components like `DocumentDetail.tsx` (1379 lines) are monolithic due to feature complexity
- Utility functions are concise and single-purpose (2-20 lines)
- Route handlers are inline in `routes.ts` and typically 5-30 lines each

**Parameters:**
- Explicit parameters over configuration objects when count is small
- Destructured parameters for complex objects
- Type annotations required on all parameters and return types due to strict TypeScript mode

**Return Values:**
- Async functions consistently return `Promise<T>` or `Promise<T | undefined>`
- Components return JSX or React component types
- Utility functions return specific types with null checks where applicable
- Database layer returns single entity or array with undefined fallback for "not found" scenarios

## Module Design

**Exports:**
- Pages use `export default` for the page component: `export default function Dashboard()`
- Utility functions use named exports: `export function cn(...inputs: ClassValue[])`
- Schema definitions use named exports for all database tables and types
- Routes module exports single async function: `export async function registerRoutes(httpServer, app)`
- Storage class uses `export class DatabaseStorage implements IStorage`

**Barrel Files:**
- No barrel file pattern observed (no `index.ts` re-exports)
- Imports specify full paths: `import { Card } from "@/components/ui/card"` not from a barrel
- Each UI component in `components/ui/` is imported directly

## Data Validation

**Zod Schema Usage:**
- All API input validation uses Zod schemas from `@shared/schema`
- Schemas created with `createInsertSchema()` from `drizzle-zod` for database tables
- Client-side form validation with `react-hook-form` + `@hookform/resolvers/zod`
- Error messages extracted from schema validation: `z.ZodError`

```typescript
// Example validation flow
const docFormSchema = insertDocumentSchema
  .omit({ tags: true, nextReviewDate: true, ... })
  .extend({
    documentReference: z.string().nullable().default(null),
    title: z.string().min(1, "Title is required"),
    ...
  });

// Used in form with zodResolver
const form = useForm<DocFormValues>({
  resolver: zodResolver(docFormSchema),
});
```

## React Patterns

**Hooks:**
- Custom hooks use `use` prefix and live in `client/src/hooks/`
- Component-level state managed with `useState`
- Side effects with `useEffect` (e.g., resize listeners in `useIsMobile`)
- Query data fetched with `useQuery` and `useMutation` from React Query
- Form handling with `useForm` from react-hook-form

**Component Structure:**
- Functional components exclusively (no class components)
- Page components are large monolithic files handling lists, forms, and detail views
- Separated concerns: UI components in `components/ui/`, pages in `pages/`, custom components in `components/`

**Styling:**
- Tailwind CSS for styling with utility classes
- `cn()` utility function for conditional class merging: `cn(styles, conditionalClass)`
- Class variance authority (`cva`) for component variants (e.g., button sizes and variants)

---

*Convention analysis: 2026-02-19*
