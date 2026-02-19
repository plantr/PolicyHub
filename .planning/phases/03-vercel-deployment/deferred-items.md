# Deferred Items — Phase 03 Vercel Deployment

## Pre-existing TypeScript Errors (Out of Phase 3 Scope)

Discovered during Task 1 of 03-03 (`npx tsc --noEmit`) — these errors existed before Phase 3 work began.

### server/replit_integrations/ (2 files)

- `server/replit_integrations/batch/utils.ts` (lines 97, 138): `Property 'AbortError' does not exist on type` — p-retry version mismatch
- `server/replit_integrations/chat/routes.ts` (lines 25, 53, 65): `Argument of type 'string | string[]' is not assignable to parameter of type 'string'`
- `server/replit_integrations/chat/storage.ts` (lines 2): `Module '"@shared/schema"' has no exported member 'conversations'` — Replit chat schema no longer in shared

These files are Replit-specific integrations that are conditionally imported behind `REPL_ID` guards and not part of the Vercel deployment path.

### server/routes.ts (pre-existing since before Phase 2)

- Line 719: `Type 'Map<...>' can only be iterated through when using '--downlevelIteration' flag or with '--target' of 'es2015' or higher` — tsconfig has no explicit `target`, defaults to ES3
- Lines 1030, 1034: `Argument of type 'number | null' is not assignable to parameter of type 'number'` — overStrictItems array type has `businessUnitId: number | null` but Map.get returns number
- Lines 1088, 1091: Same `number | null` type issue in contentAnalysis section

**Recommended fixes (Phase 4):**
1. Add `"target": "ES2022"` to tsconfig.json
2. Change `businessUnitId: number | null` to `businessUnitId: number` in overStrictItems array type definition (line 1017) since the push only happens inside `if (mappingBuId)` truthy check
3. Consider excluding `server/replit_integrations/` from tsconfig when `REPL_ID` not set

Note: The Vite SPA build (`npx vite build`) succeeds cleanly — these TS errors do not affect the Vercel deployment. Vercel's Express framework detection compiles server/index.ts separately using its own bundling.
