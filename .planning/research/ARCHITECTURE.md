# Architecture Research

**Domain:** Full-stack compliance platform migration — Express + React + PostgreSQL to Supabase + Vercel
**Researched:** 2026-02-19
**Confidence:** HIGH (Supabase RLS, auth, storage patterns from official docs; Vercel Express deployment from official docs; connection pooling from official Vercel guide; Drizzle RLS support from official docs)

---

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                        VERCEL CDN / EDGE                              │
├──────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                React SPA (Static Build)                         │  │
│  │  Wouter routing · React Query · Radix UI · Tailwind             │  │
│  └────────────┬───────────────────────────────────┬───────────────┘  │
│               │ direct (reads, auth)               │ complex ops      │
│               │                                    │                  │
│  ┌────────────▼────────────┐   ┌───────────────────▼──────────────┐  │
│  │  Supabase JS Client     │   │  Vercel Serverless Functions      │  │
│  │  - supabase.from(...)   │   │  (Express or bare handlers)       │  │
│  │  - supabase.auth.*      │   │  - AI analysis (Anthropic)        │  │
│  │  - supabase.storage.*   │   │  - PDF processing / bulk ops      │  │
│  │  Respects JWT + RLS     │   │  - Complex writes & transactions  │  │
│  └────────────┬────────────┘   └───────────────────┬──────────────┘  │
└───────────────│────────────────────────────────────│─────────────────┘
                │                                    │
┌───────────────▼────────────────────────────────────▼─────────────────┐
│                        SUPABASE PLATFORM                               │
├───────────────────────────────────────────────────────────────────────┤
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────────────┐   │
│  │  Auth (GoTrue) │  │  Storage       │  │  PostgREST (REST API)  │   │
│  │  Email/pw      │  │  S3-compatible │  │  Auto-generated from   │   │
│  │  JWT issuance  │  │  PDFs/docs     │  │  schema, enforces RLS  │   │
│  │  Custom claims │  │  RLS enforced  │  │                        │   │
│  └───────┬────────┘  └───────┬────────┘  └───────────┬───────────┘   │
│          │                   │                        │               │
│  ┌───────▼───────────────────▼────────────────────────▼────────────┐  │
│  │                  PostgreSQL (Supabase managed)                    │  │
│  │  27+ tables · RLS policies · Custom JWT hook · PgBouncer pool    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────┘
                                    │
                        ┌───────────▼───────────┐
                        │   Anthropic Claude API │
                        │  (called from Vercel   │
                        │   serverless only)     │
                        └───────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| React SPA | All UI rendering, client routing, local state | Wouter + React Query + Radix UI, deployed as static files to Vercel CDN |
| Supabase JS Client | Direct reads via PostgREST, auth session management, storage uploads/downloads | `@supabase/supabase-js` v2+, uses anon key + user JWT; RLS enforced automatically |
| Vercel Serverless Functions | Complex writes, AI analysis, multi-step transactions, PDF processing | Express exported as default (or bare handlers); uses Supabase service-role key to bypass RLS where needed |
| Supabase Auth | Email/password authentication, JWT issuance, Custom Access Token hook for business-unit claims | GoTrue; injects `business_unit_ids` and `role` into JWT via PL/pgSQL hook |
| Supabase Storage | PDF bucket, RLS-enforced access, signed URL generation | Replaces local `data/uploads/`; S3-compatible protocol available for migration |
| Supabase PostgreSQL | All persistent data, RLS policies, schema enforcement | Same schema as current (27+ tables); adds `user_id` FK and RLS policies per table |
| PostgREST (Supabase REST) | Auto-generated REST API from schema; enforces RLS; serves simple list/get queries | Accessed via Supabase JS client; no custom code required for standard CRUD |
| Anthropic API | AI coverage analysis, auto-mapping, chat | Called exclusively from Vercel serverless functions (never from client) |

---

## Recommended Project Structure

```
Policy-Hub/
├── client/                      # React SPA — unchanged structure
│   └── src/
│       ├── lib/
│       │   ├── supabase.ts      # Supabase JS client (replaces queryClient fetch)
│       │   └── queryClient.ts   # React Query config (updated base URLs)
│       ├── hooks/
│       │   └── use-auth.ts      # Auth state from supabase.auth.onAuthStateChange
│       ├── pages/               # Unchanged; queries swap to supabase.from()
│       └── components/          # Unchanged
│
├── api/                         # Vercel serverless functions
│   ├── index.ts                 # Express app exported as default (handles /api/* routes)
│   │                            # OR individual files per route group:
│   ├── ai/
│   │   ├── match.ts             # POST /api/requirements/:id/ai-match/:mappingId
│   │   ├── coverage.ts          # POST /api/requirements/:id/ai-coverage
│   │   └── auto-match.ts        # POST /api/gap-analysis/auto-match
│   ├── documents/
│   │   ├── upload.ts            # POST /api/documents/:id/versions (PDF upload)
│   │   └── download.ts          # GET /api/document-versions/:id/pdf/download
│   └── admin/
│       └── import.ts            # Complex bulk imports
│
├── supabase/                    # Supabase local config (CLI)
│   ├── config.toml              # Project config
│   ├── migrations/              # SQL migrations (replaces drizzle migrations/)
│   │   ├── 0001_initial.sql     # Port from Drizzle-generated DDL
│   │   ├── 0002_add_rls.sql     # Enable RLS + add policies per table
│   │   └── 0003_auth_hook.sql   # Custom Access Token hook function
│   └── functions/               # Supabase Edge Functions (optional, for webhooks)
│
├── shared/                      # Unchanged — schema types still shared
│   ├── schema.ts                # Drizzle table defs (kept for type inference)
│   └── routes.ts                # API contracts (kept for type safety on serverless routes)
│
├── vercel.json                  # Routes: /api/* → serverless, /* → static SPA
└── package.json
```

### Structure Rationale

- **`api/`:** Vercel's convention for serverless functions. A single `api/index.ts` exporting the Express app is the simplest migration path — Vercel wraps it as one Fluid compute function. Individual files per route group give finer-grained cold start control at cost of more configuration.
- **`supabase/migrations/`:** Replaces `migrations/` (Drizzle-generated). Supabase CLI manages these. Existing Drizzle DDL can be ported almost verbatim; add RLS policy migrations on top.
- **`client/src/lib/supabase.ts`:** Single Supabase JS client instance shared across the app — the equivalent of the current `queryClient.ts` API wrapper, but now with built-in auth token handling.
- **`shared/`:** Retain for TypeScript types inferred from Drizzle schema. Even without Drizzle running queries, `$inferSelect` types remain valid for API contracts.

---

## Architectural Patterns

### Pattern 1: Direct Client Reads via PostgREST + RLS

**What:** The React client uses the Supabase JS client with the user's JWT to query the database directly via PostgREST. RLS policies enforce business-unit scoping transparently — no Express route handler required for simple list/get operations.

**When to use:** All read queries that don't require server-side computation. Replaces the majority of the current `GET` endpoints in `routes.ts`.

**Trade-offs:** Faster (PostgREST resolves to a single SQL statement) and simpler (no serverless invocation). Requires correct RLS policies; a missing policy silently returns empty results rather than an error.

**Example:**
```typescript
// client/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// client/src/pages/Documents.tsx
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// Replaces: useQuery({ queryKey: ['/api/documents'] })
const { data: documents } = useQuery({
  queryKey: ['documents'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('documents')
      .select('*, document_versions(*)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }
});
```

### Pattern 2: Serverless Functions for Mutations and AI Operations

**What:** Writes, multi-table transactions, and all Anthropic API calls are handled by Vercel serverless functions. These use the Supabase **service-role key** (bypasses RLS) when performing admin operations, or impersonate the user by passing their JWT for user-scoped writes.

**When to use:** Any operation that cannot or should not run client-side: AI analysis, bulk operations, PDF processing, operations requiring service-role privileges, audit log writes.

**Trade-offs:** Adds latency (cold start) versus direct client. For Fluid compute on Vercel Pro, cold starts are mitigated. The 300s default timeout (800s max on Pro) covers all current AI operations. Express can be exported as default — minimal migration overhead.

**Example:**
```typescript
// api/index.ts — Express exported as default; Vercel treats entire app as one function
import express from 'express';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(express.json());

// Service-role client for admin ops (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// AI coverage analysis — moved from routes.ts
app.post('/api/requirements/:id/ai-coverage', async (req, res) => {
  // ... Anthropic call logic unchanged from current routes.ts
  // Uses supabaseAdmin to read/write without RLS interference
});

// No app.listen() — Vercel handles that
export default app;
```

### Pattern 3: JWT Custom Claims for Business-Unit RBAC

**What:** A PostgreSQL Custom Access Token hook injects the user's business-unit memberships and role into every JWT at login. RLS policies read these claims via `auth.jwt()` — no extra query per request required.

**When to use:** All tables that need business-unit scoping. This is the correct pattern for the existing multi-tenancy model (users belong to one or more business units).

**Trade-offs:** Claims are embedded at login time, so if a user's business-unit assignment changes, they need to re-authenticate (or token refresh) to see updated scope. This is acceptable for Policy Hub's use case. Using `raw_app_meta_data` (not `raw_user_meta_data`) prevents users from injecting their own claims.

**Example:**
```sql
-- supabase/migrations/0003_auth_hook.sql

-- 1. Hook function: inject business_unit_ids into JWT
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
  claims JSONB;
  bu_ids UUID[];
  user_role TEXT;
BEGIN
  -- Fetch business unit memberships for this user
  SELECT ARRAY_AGG(business_unit_id), MAX(role)
    INTO bu_ids, user_role
    FROM public.user_business_units
   WHERE user_id = (event->>'user_id')::UUID;

  claims := event->'claims';
  claims := jsonb_set(claims, '{business_unit_ids}', to_jsonb(bu_ids));
  claims := jsonb_set(claims, '{app_role}', to_jsonb(user_role));
  event  := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM PUBLIC;

-- 2. RLS policy using the claim (no extra query, no JOIN)
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents_business_unit_access" ON public.documents
FOR ALL TO authenticated
USING (
  business_unit_id = ANY(
    (SELECT (auth.jwt() -> 'business_unit_ids')::UUID[])
  )
);
```

### Pattern 4: Supabase Storage for PDFs

**What:** Replace the local `data/uploads/` + simulated S3 with Supabase Storage. One private bucket (`policy-documents`) with RLS policies mirroring the database. Signed URLs generated server-side for downloads.

**When to use:** All PDF uploads and downloads. Supabase Storage supports the S3 protocol — the existing `server/s3.ts` interface can be adapted with minimal changes using the S3-compatible endpoint.

**Trade-offs:** Signed URLs expire (configurable); client must request a fresh URL per download. This is more secure than permanent S3 presigned URLs. The S3-compatible endpoint means the existing `server/s3.ts` helper can migrate with minimal code changes.

**Example:**
```typescript
// api/documents/upload.ts (serverless function)
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Upload PDF — replaces uploadToS3()
async function uploadPDF(file: Buffer, path: string) {
  const { data, error } = await supabaseAdmin.storage
    .from('policy-documents')
    .upload(path, file, { contentType: 'application/pdf', upsert: true });
  if (error) throw error;
  return data.path; // Store this path in document_versions.pdf_storage_path
}

// Generate signed download URL — replaces presigned S3 URL
async function getDownloadUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from('policy-documents')
    .createSignedUrl(storagePath, 3600); // 1 hour expiry
  if (error) throw error;
  return data.signedUrl;
}
```

---

## Data Flow

### Request Flow: Simple Read (replaces GET /api/documents)

```
User opens Documents page
    ↓
React Query queryFn calls supabase.from('documents').select(...)
    ↓
Supabase JS Client attaches JWT from auth session (Authorization header)
    ↓
PostgREST receives request → evaluates RLS policy
    → (SELECT auth.jwt()->'business_unit_ids') → filters rows
    ↓
PostgreSQL returns filtered rows
    ↓
React Query caches result, component renders
```

### Request Flow: AI Analysis (replaces POST /api/requirements/:id/ai-coverage)

```
User triggers AI coverage analysis
    ↓
React calls fetch('/api/requirements/:id/ai-coverage') with JWT in Authorization header
    ↓
Vercel serverless function receives request
    → Validates JWT (using Supabase service client or verifying JWT signature)
    → Reads requirement + document content via supabaseAdmin (service role)
    → Calls Anthropic API (streaming or await)
    → Writes result back via supabaseAdmin
    ↓
Returns JSON result to client
    ↓
React Query invalidates cache, re-fetches updated mapping
```

### Request Flow: Authentication + JWT Claims

```
User submits email + password
    ↓
supabase.auth.signInWithPassword({ email, password })
    ↓
GoTrue validates credentials
    → Triggers Custom Access Token hook (PL/pgSQL)
    → Hook queries user_business_units table
    → Injects business_unit_ids + app_role into JWT claims
    ↓
JWT returned to client (stored in localStorage / cookie)
    ↓
All subsequent requests carry this JWT
RLS policies read claims from JWT → no per-request DB lookup needed
```

### Request Flow: PDF Upload

```
User uploads PDF for a document version
    ↓
Client POSTs multipart form to /api/documents/:id/versions
    ↓
Vercel serverless function handles upload
    → Validates file type + size
    → Calls supabaseAdmin.storage.from('policy-documents').upload(path, buffer)
    → Stores returned storage path in document_versions.pdf_storage_path
    ↓
Returns updated document version to client
```

### State Management (unchanged from current)

```
Supabase Auth Session (localStorage/cookie)
    ↓ (JWT attached automatically by Supabase JS client)
React Query Cache ←→ supabase.from() queries (reads)
                 ←→ fetch('/api/...') calls (complex writes/AI)
                       ↓ on mutation success
                 invalidateQueries → re-fetches from Supabase
```

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0–1k users | Direct client reads + single Express serverless function for all complex ops. Supabase free tier adequate. Connection pooling via Supabase built-in PgBouncer (Transaction mode). |
| 1k–10k users | Enable Vercel Fluid Compute (Pro). Split AI functions to separate route files for independent scaling. Add `maxDuration: 300` on AI routes. Monitor Supabase connection count via dashboard. |
| 10k+ users | Consider Supabase Pro with dedicated pooler. Introduce job queue (e.g., Inngest or Trigger.dev) for async AI batch operations to avoid serverless timeouts and rate limits on Anthropic API. |

### Scaling Priorities

1. **First bottleneck: Database connections** — Serverless functions can exhaust Postgres connections under concurrent load. Supabase's built-in PgBouncer (Transaction pool mode) mitigates this. Use `DATABASE_URL` with the pooler URL (port 6543), not the direct connection (port 5432), for serverless functions. For Drizzle ORM (if retained), set `prepare: false` in pool config when using Transaction mode.

2. **Second bottleneck: AI operation latency** — Anthropic API calls can run 10–60 seconds for large batch auto-mapping. Vercel Fluid Compute (default 300s, max 800s on Pro) handles current load. For requests covering 100+ requirements, convert to async job pattern (fire job, poll for status) before hitting Pro plan limits.

---

## Anti-Patterns

### Anti-Pattern 1: Service-Role Key in Client

**What people do:** Pass `SUPABASE_SERVICE_ROLE_KEY` to the browser to avoid dealing with RLS during development.

**Why it's wrong:** The service role bypasses all RLS policies. Anyone who can open DevTools gets admin access to the entire database. There is no mitigation short of rotating the key.

**Do this instead:** Use the anon key in the browser. Use the service-role key only in Vercel serverless functions via `process.env` (never exposed to the client). For operations that legitimately need to bypass RLS (e.g., admin imports), route them through a serverless function.

### Anti-Pattern 2: Porting All 50+ Routes to Serverless

**What people do:** Convert every Express route to a Vercel serverless function, one file per endpoint.

**Why it's wrong:** Most current GET endpoints are simple reads that PostgREST already handles with better performance. Over-routing to serverless adds cold-start latency, increases deployment complexity, and doesn't benefit from RLS enforcement in PostgREST.

**Do this instead:** Default to direct Supabase client reads (PostgREST) for all list/get operations. Only put logic in serverless functions when it requires: AI API calls, complex multi-table transactions, file processing, service-role operations, or operations that must not be exposed to the client.

### Anti-Pattern 3: RLS Policies That Reference app_metadata Without the Hook

**What people do:** Store role information in `raw_user_meta_data` (user-editable) or skip the Custom Access Token hook and try to read from the `auth.users` table in every policy.

**Why it's wrong:** `raw_user_meta_data` can be modified by the authenticated user via `supabase.auth.updateUser()` — using it for authorization allows privilege escalation. Reading from `auth.users` in every policy adds a database lookup per query, negating RLS performance benefits.

**Do this instead:** Store roles and business-unit memberships in `raw_app_meta_data` (only settable server-side) and inject them via the Custom Access Token hook. Policies then read from `auth.jwt()` — a configuration parameter already in memory, requiring no disk I/O.

### Anti-Pattern 4: Skipping Connection Pool Configuration

**What people do:** Use the Supabase direct connection URL (port 5432) from Vercel functions without pool management.

**Why it's wrong:** Each serverless function invocation opens a new database connection. Under moderate load (10+ concurrent requests), Postgres connection limits are exhausted. Supabase free tier allows ~60 connections; Vercel can spawn far more function instances.

**Do this instead:** Use the Supabase PgBouncer URL (port 6543, Transaction mode). Add `attachDatabasePool(pool)` if using `pg` directly with Vercel's Fluid Compute helper. Set `idleTimeoutMillis: 5000` to release connections before function suspension. If using Drizzle ORM with Transaction pooling, set `prepare: false`.

### Anti-Pattern 5: Storing PDF Binary in PostgreSQL

**What people do:** Store PDFs as `bytea` columns to avoid dealing with a storage service.

**Why it's wrong:** Bloats the database, makes backups slow, and degrades query performance on unrelated tables. Supabase database row size limits apply. PDFs in this app can be up to 50MB — completely unsuitable for inline storage.

**Do this instead:** Use Supabase Storage (or S3) for PDFs. Store only the storage path (`pdf_storage_path TEXT`) in `document_versions`. Generate signed URLs on-demand from serverless functions for downloads.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Supabase Auth | `supabase.auth.signInWithPassword()` in client; JWT verified by serverless functions using Supabase JWT secret | GoTrue handles session refresh automatically; anon key safe in browser with RLS enabled |
| Supabase Storage | `supabase.storage.from('policy-documents')` — uploads from serverless (service role), signed URL generation from serverless, public CDN for bucket read if policies permit | S3-compatible endpoint available for migration of existing `server/s3.ts` code |
| Supabase PostgREST | `supabase.from('table').select/insert/update/delete()` in client; automatic RLS enforcement | Replaces ~70% of current Express GET routes; faster than custom handlers |
| Anthropic API | Called exclusively from Vercel serverless functions; API key in `process.env.ANTHROPIC_API_KEY` (never exposed to client) | Streaming via SSE works in Vercel serverless (Fluid Compute supports it); current 10–60s calls within 300s default limit |
| Vercel (hosting) | Static SPA deployed to CDN; `api/` directory auto-deployed as serverless functions | Express exported as default in `api/index.ts` requires no `app.listen()` call; `vercel.json` routes `/api/*` to function |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| React SPA ↔ Supabase | Supabase JS client with user JWT (anon key); RLS enforces data scope | Replaces current `apiRequest()` fetch wrapper for all reads |
| React SPA ↔ Vercel Functions | Standard `fetch('/api/...')` with `Authorization: Bearer <jwt>` header | Replaces current `apiRequest()` for writes and AI calls; same CORS origin so no CORS config needed |
| Vercel Functions ↔ Supabase DB | Supabase JS client with service-role key OR Drizzle ORM via PgBouncer URL | Service-role for admin ops; pass user JWT for user-scoped writes if RLS should apply |
| Vercel Functions ↔ Supabase Storage | `supabaseAdmin.storage.from()` with service-role key | Upload, delete, signed URL generation — all server-side; client never touches storage API directly |
| Vercel Functions ↔ Anthropic | `@anthropic-ai/sdk` with API key from env | Unchanged from current; consolidate the 3 Anthropic client instantiations into one singleton |
| React SPA ↔ Auth | `supabase.auth.*` methods; session stored in localStorage (default) | `onAuthStateChange` listener replaces current session management; no Express session middleware needed |

---

## Suggested Build Order

Dependencies flow from infrastructure to application layer. Building out of order creates blocking rework.

### Phase 1: Supabase Infrastructure (foundation for everything)

1. **Provision Supabase project** — get URL, anon key, service-role key
2. **Port schema to Supabase migrations** — convert Drizzle DDL to SQL migrations; run via Supabase CLI
3. **Enable RLS on all tables** — `ALTER TABLE x ENABLE ROW LEVEL SECURITY;` (no policies yet — blocks all access, verifiable)
4. **Configure Auth** — enable email/password provider, set JWT expiry, configure redirect URLs
5. **Implement Custom Access Token hook** — PL/pgSQL function injecting `business_unit_ids` and `app_role`
6. **Write RLS policies** — per-table policies using `auth.jwt() -> 'business_unit_ids'` claims

_Unblocks: all client reads, all serverless writes, storage_

### Phase 2: Supabase Storage

1. **Create `policy-documents` bucket** — private, RLS enabled
2. **Write storage RLS policies** — restrict to users whose JWT includes the document's business unit
3. **Migrate existing PDFs** — copy from `data/uploads/` to Supabase Storage using S3-compatible endpoint or CLI
4. **Update `pdf_s3_key` column** — rename/adapt to `pdf_storage_path` with Supabase paths

_Unblocks: document upload/download in serverless functions_

### Phase 3: Vercel Serverless Functions

1. **Configure Vercel project** — connect git repo, set environment variables (Supabase URL/keys, Anthropic key)
2. **Export Express app** — modify `server/index.ts` (or create `api/index.ts`) to export as default without `app.listen()`
3. **Add `vercel.json`** — route `/api/*` to serverless function, `/*` to static build
4. **Configure connection pooling** — switch to PgBouncer URL, set `prepare: false` if using Drizzle
5. **Test AI routes** — verify Anthropic streaming within Fluid Compute timeout; set `maxDuration` appropriately

_Unblocks: complex mutations, AI analysis, PDF processing_

### Phase 4: React Client Migration

1. **Install Supabase JS** — `npm install @supabase/supabase-js`
2. **Create `client/src/lib/supabase.ts`** — single client instance with anon key
3. **Add auth flow** — login page using `supabase.auth.signInWithPassword()`, `onAuthStateChange` listener
4. **Migrate read queries** — replace `useQuery` + `apiRequest('GET', '/api/...')` with `supabase.from()` calls; start with simplest tables (business units, requirements)
5. **Migrate write mutations** — replace `apiRequest('POST/PUT/DELETE')` calls with either `supabase.from().insert/update/delete()` (simple) or `fetch('/api/...')` (complex/AI)
6. **Remove Passport + Express session** — no longer needed

_Depends on: Phase 1 RLS, Phase 3 serverless for AI routes_

---

## Sources

- [Supabase Row Level Security — official docs](https://supabase.com/docs/guides/database/postgres/row-level-security) — HIGH confidence
- [Supabase Custom Claims & RBAC — official docs](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac) — HIGH confidence
- [Supabase Auth Hooks — official docs](https://supabase.com/docs/guides/auth/auth-hooks) — HIGH confidence
- [Supabase Storage — official docs](https://supabase.com/docs/guides/storage) — HIGH confidence
- [Supabase REST API / PostgREST — official docs](https://supabase.com/docs/guides/api) — HIGH confidence
- [Supabase Edge Functions Architecture — official docs](https://supabase.com/docs/guides/functions/architecture) — HIGH confidence
- [Express on Vercel — official docs](https://vercel.com/docs/frameworks/backend/express) — HIGH confidence
- [Vercel Functions Limitations — official docs](https://vercel.com/docs/functions/limitations) — HIGH confidence
- [Vercel Connection Pooling with Functions — official guide](https://vercel.com/guides/connection-pooling-with-serverless-functions) — HIGH confidence
- [Vercel Fluid Compute timeout limits — official changelog](https://vercel.com/changelog/higher-defaults-and-limits-for-vercel-functions-running-fluid-compute) — HIGH confidence (300s default, 800s max on Pro)
- [Drizzle ORM Row-Level Security — official docs](https://orm.drizzle.team/docs/rls) — HIGH confidence
- [Drizzle ORM with Supabase existing project — official docs](https://orm.drizzle.team/docs/get-started/supabase-existing) — HIGH confidence
- [Supabase API Keys (anon vs service role) — official docs](https://supabase.com/docs/guides/api/api-keys) — HIGH confidence

---

*Architecture research for: Supabase + Vercel platform migration — Policy Hub compliance platform*
*Researched: 2026-02-19*
