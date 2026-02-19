# Deferred Items — Phase 01 Supabase Foundation

## Pre-existing TypeScript Errors (out of scope)

Found during Plan 01, Task 1 TypeScript compilation check. These errors existed before any changes in this plan.

### server/replit_integrations/
- `batch/utils.ts`: `p-retry.AbortError` property not found (p-retry API change)
- `chat/routes.ts`: `string | string[]` argument type mismatch (3 occurrences)
- `chat/storage.ts`: Missing `conversations` and `messages` exports from `@shared/schema` — these are Replit-specific tables not in the main schema

### server/routes.ts
- Line 607: `Map` can only be iterated with `--downlevelIteration` or ES2015+ target
- Lines 918, 922, 976, 979: `number | null` not assignable to `number` (4 occurrences)
- Lines 1073, 1179: `versionNumber` property does not exist on DocumentVersion type (4 occurrences)

**Resolution:** These should be addressed as part of a TypeScript cleanup task separate from the Supabase migration work.
