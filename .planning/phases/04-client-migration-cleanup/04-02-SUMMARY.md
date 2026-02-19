---
phase: 04-client-migration-cleanup
plan: 02
subsystem: client-reads
tags: [supabase, react-query, client-migration, read-operations]
dependency_graph:
  requires: [04-01, 04-03]
  provides: [direct Supabase reads across all 25 page components]
  affects: [client/src/pages/*.tsx, client/src/lib/queryClient.ts]
tech_stack:
  added: []
  patterns:
    - Direct supabase.from().select("*") in useQuery queryFn
    - Short queryKeys without /api/ prefix (e.g. ["documents"] not ["/api/documents"])
    - Supabase query helpers (supabaseQuery, supabaseQuerySingle) in queryClient.ts
    - Stats endpoint remains fetch("/api/stats") — multi-table aggregation stays serverless
    - Gap analysis auto-map and refresh remain as serverless mutations
key_files:
  created: []
  modified:
    - client/src/lib/queryClient.ts
    - client/src/pages/BusinessUnits.tsx
    - client/src/pages/Documents.tsx
    - client/src/pages/DocumentDetail.tsx
    - client/src/pages/VersionDetail.tsx
    - client/src/pages/Requirements.tsx
    - client/src/pages/ControlDetail.tsx
    - client/src/pages/TestDetail.tsx
    - client/src/pages/RegulatorySources.tsx
    - client/src/pages/FrameworkDetail.tsx
    - client/src/pages/Findings.tsx
    - client/src/pages/Audits.tsx
    - client/src/pages/AuditTrail.tsx
    - client/src/pages/Users.tsx
    - client/src/pages/Settings.tsx
    - client/src/pages/Dashboard.tsx
    - client/src/pages/GapAnalysis.tsx
    - client/src/pages/TrustCenter.tsx
    - client/src/pages/Commitments.tsx
    - client/src/pages/KnowledgeBase.tsx
    - client/src/pages/RiskOverview.tsx
    - client/src/pages/RiskRegister.tsx
    - client/src/pages/RiskLibrary.tsx
    - client/src/pages/RiskActions.tsx
    - client/src/pages/RiskSnapshots.tsx
    - client/src/pages/RiskSettings.tsx
decisions:
  - "queryClient.ts: supabaseQuery helper simplifies repeated select(*) pattern"
  - "Stats endpoint stays as serverless fetch — multi-table aggregation cannot run client-side"
  - "GapAnalysis refresh/auto-map stays as serverless mutation — server-side computation required"
  - "knowledge_base_articles is the Supabase table name (not knowledge_base) — confirmed from schema"
  - "RiskSettings.tsx: TAB_CONFIG extended with table and queryKey fields for dynamic Supabase reads"
  - "Settings.tsx (LookupAdmin): SLUG_TO_TABLE mapping added for dynamic admin lookup table reads"
metrics:
  duration: "resumed from prior session"
  completed: "2026-02-19T20:12:47Z"
  tasks_completed: 2
  files_modified: 26
---

# Phase 4 Plan 02: Client Read Migration Summary

Direct Supabase reads across all 25+ React pages replacing Express GET API round-trips, with queryKey normalization (drop /api/ prefix) and helper utilities in queryClient.ts.

## What Was Built

### queryClient.ts Helpers

Two new exported helpers added to `client/src/lib/queryClient.ts`:

```typescript
export async function supabaseQuery<T>(table: string): Promise<T[]> {
  const { data, error } = await supabase.from(table).select("*");
  if (error) throw error;
  return (data ?? []) as T[];
}

export async function supabaseQuerySingle<T>(
  table: string,
  id: number
): Promise<T> {
  const { data, error } = await supabase.from(table).select("*").eq("id", id).single();
  if (error) throw error;
  return data as T;
}
```

### Migration Pattern Applied

Every read query converted from:
```typescript
const { data } = useQuery<Document[]>({ queryKey: ["/api/documents"] });
```

To:
```typescript
const { data } = useQuery<Document[]>({
  queryKey: ["documents"],
  queryFn: async () => {
    const { data, error } = await supabase.from("documents").select("*");
    if (error) throw error;
    return data ?? [];
  },
});
```

### Key Mapping Decisions

| Route pattern | Supabase table | QueryKey |
|---------------|----------------|----------|
| /api/business-units | business_units | ["business-units"] |
| /api/regulatory-sources | regulatory_sources | ["regulatory-sources"] |
| /api/requirement-mappings | requirement_mappings | ["requirement-mappings"] |
| /api/audit-log | audit_log | ["audit-log"] |
| /api/knowledge-base | knowledge_base_articles | ["knowledge-base"] |
| /api/risk-categories | risk_categories | ["risk-categories"] |
| /api/risk-library | risk_library | ["risk-library"] |
| /api/risk-actions | risk_actions | ["risk-actions"] |
| /api/risk-snapshots | risk_snapshots | ["risk-snapshots"] |

### Endpoints That Remain Serverless

- `fetch("/api/stats")` — multi-table aggregation that must stay server-side
- `fetch("/api/gap-analysis/auto-map")` — server-side AI keyword mapping
- `fetch("/api/gap-analysis/refresh")` — server-side analysis computation
- All `apiRequest()` calls in `useMutation` — writes (POST/PUT/DELETE) stay on serverless functions

## Verification Results

- `npx tsc --noEmit` — zero client-side TypeScript errors
- `npx vite build` — builds successfully (3.77s, 2040KB JS bundle)
- `grep queryKey.*"/api/"` in pages/ — zero matches
- `grep invalidateQueries.*"/api/"` in pages/ — zero matches
- `grep -rl supabase.from` in pages/ — 25 files

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] supabaseQuery helper TypeScript type error**
- **Found during:** Task 1 (queryClient.ts)
- **Issue:** Initial helper signature with query builder callback parameter produced type error: `Property 'data' does not exist on type 'PostgrestQueryBuilder... | PostgrestSingleResponse'`
- **Fix:** Simplified signature to `supabaseQuery<T>(table: string): Promise<T[]>` using inline `select("*")`
- **Files modified:** client/src/lib/queryClient.ts

**2. [Rule 2 - Enhancement] RiskSettings TAB_CONFIG extended for Supabase reads**
- **Found during:** Task 2 (RiskSettings.tsx)
- **Issue:** TAB_CONFIG used `apiBase` string as both the API path and queryKey, making it impossible to route to Supabase table
- **Fix:** Added `table` and `queryKey` fields to TAB_CONFIG, updated query and invalidateQueries to use `config.queryKey`
- **Files modified:** client/src/pages/RiskSettings.tsx

### Execution Notes

Task 1 migrations (core entity pages) were committed in a prior session as part of the `e08e9f8` commit (co-mingled with 04-03 serverless work). Task 2 migrations (remaining pages) committed in `4e4a794` in this session. The end state is correct — all 25 pages migrated.

## Commits

| Task | Commit | Files |
|------|--------|-------|
| Task 1 (core pages) | e08e9f8 | queryClient.ts + 15 core entity pages |
| Task 2 (remaining pages) | 4e4a794 | 11 remaining pages |

## Self-Check: PASSED

- Task 2 commit 4e4a794 verified present in git log
- All 25 pages confirmed to contain `supabase.from` calls
- Zero `/api/` queryKeys remain in any page file
- TypeScript and Vite build both pass
