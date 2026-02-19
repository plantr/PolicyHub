# Pitfalls Research

**Domain:** Express + PostgreSQL → Supabase + Vercel migration (compliance management SaaS)
**Researched:** 2026-02-19
**Confidence:** HIGH (Supabase RLS, Vercel limits, Drizzle/pooling verified against official docs and Context7)

---

## Critical Pitfalls

### Pitfall 1: Drizzle ORM Bypasses RLS by Default — Queries Run as Superuser

**What goes wrong:**
Drizzle ORM connects to Supabase using the `postgres` superuser role by default. The `postgres` role has admin privileges and bypasses all RLS policies entirely. You write RLS policies, test them in the Supabase dashboard, deploy — and every query silently ignores them. All users can read and write all rows. The system appears to work because data flows normally; there is no error.

**Why it happens:**
Developers configure Drizzle with the standard `DATABASE_URL` (direct connection or transaction pooler URL) and never switch roles. RLS only applies to non-superuser roles (`anon` and `authenticated`). Using the `postgres` role is effectively the same as having no RLS at all. This is documented in the Supabase troubleshooting guide but easy to miss when coming from a traditional Express + PostgreSQL setup where the server owns the database.

**How to avoid:**
Use the **two-client pattern**: an admin client (service role, bypasses RLS) for background jobs, webhooks, and migrations, and an RLS client that sets the JWT context per-request. The RLS client must:

1. Wrap every query in a transaction
2. Call `set_config('request.jwt.claims', jwt_payload, true)` and `set local role authenticated` at the start of the transaction
3. Reset role in a `finally` block

Use the `drizzle-supabase-rls` package (github.com/rphlmr/drizzle-supabase-rls) or implement the pattern directly via Drizzle's `crudPolicy` and `withTransaction` helpers. The Drizzle docs at `orm.drizzle.team/docs/rls` provide the authoritative pattern.

```typescript
// WRONG — this bypasses RLS:
const db = drizzle(process.env.DATABASE_URL);

// CORRECT — two-client pattern:
const adminDb = drizzle(process.env.SUPABASE_SERVICE_URL);    // bypasses RLS
const rlsDb   = drizzle(process.env.SUPABASE_ANON_URL);       // respects RLS via JWT
```

**Warning signs:**
- All users can see all business units regardless of assignment
- DELETE operations work without ownership checks
- RLS policies pass tests in the Supabase SQL Editor but don't restrict real application queries (SQL Editor runs as superuser — it always bypasses RLS)

**Phase to address:**
Database / Auth foundation phase — before any user-facing endpoint is wired up. RLS must be validated with authenticated requests before migrating any routes.

---

### Pitfall 2: Vercel's 4.5 MB Request Body Limit Breaks PDF Uploads

**What goes wrong:**
The current app accepts PDF uploads up to 50 MB via multer directly in Express route handlers. On Vercel, any request body (including multipart file uploads) exceeding **4.5 MB** returns a `413 FUNCTION_PAYLOAD_TOO_LARGE` error. This is a hard platform limit that cannot be configured away. The upload appears to work locally and in staging but fails in production on all but the smallest PDFs.

**Why it happens:**
Vercel routes requests through its edge network before they reach serverless functions. The 4.5 MB limit is enforced at the infrastructure level, not in application code. Multer-based streaming that works in a long-running Express process is incompatible with this architecture. The file never reaches the function handler.

**How to avoid:**
Use Supabase Storage's **signed upload URL pattern**: the client requests a signed upload URL from a lightweight Vercel function (no file data involved), then uploads the file **directly from the browser to Supabase Storage** using that URL. The function handler only receives the resulting `path` or `key` to store in the database, which is a few hundred bytes.

```typescript
// Vercel function: generate signed upload URL (no file data)
const { data, error } = await supabase.storage
  .from('policy-documents')
  .createSignedUploadUrl(`versions/${versionId}/${fileName}`);
// Return signedUrl to client — client uploads directly to Supabase

// After client upload completes, client calls separate endpoint with just the path
```

The Supabase Storage free tier supports files up to 50 MB per file (matching the current multer limit). This also eliminates the function as a file-processing bottleneck.

**Warning signs:**
- File uploads work on `localhost` but fail in deployed preview environments
- `413` errors in Vercel function logs on any PDF over ~4 MB
- Any code that reads `req.file` or `req.files` in a Vercel API route will be broken for large files

**Phase to address:**
Storage migration phase — the upload architecture must be redesigned before any document creation endpoint is deployed to Vercel.

---

### Pitfall 3: RLS Policies Using `user_metadata` Are User-Controllable and Insecure

**What goes wrong:**
Developers put role/business-unit claims into `user_metadata` (accessible via `auth.jwt() -> 'user_metadata'`) because it is easy to set and immediately visible. They then write RLS policies referencing `user_metadata.role` or `user_metadata.business_unit_id`. Users can modify their own `user_metadata` via the Supabase client SDK. An attacker sets their own `business_unit_id` claim to any value and instantly gains access to other business units' data.

**Why it happens:**
The Supabase dashboard makes `user_metadata` trivially easy to set and inspect. Documentation on the distinction between `user_metadata` (user-editable) and custom JWT claims from Auth Hooks (server-controlled) is present but not prominent. Developers reach for the easiest thing and miss the security boundary.

**How to avoid:**
Use **Supabase Auth Hooks** (Custom Access Token hook) to inject business-unit roles as custom JWT claims. The hook runs server-side before token issuance and reads from your `user_roles` or `user_business_units` table — data users cannot directly modify.

```sql
-- Auth Hook (runs server-side, user cannot tamper with output):
-- Reads from user_roles table and injects into JWT claims
-- Policy then references: auth.jwt() -> 'app_metadata' -> 'role'
-- NOT: auth.jwt() -> 'user_metadata' -> 'role'

CREATE POLICY "editors can update documents in their business unit"
ON documents FOR UPDATE
USING (
  business_unit_id = (auth.jwt() -> 'app_metadata' ->> 'business_unit_id')::int
  AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'editor')
);
```

The `app_metadata` field is server-controlled and cannot be modified by users. For the per-business-unit RBAC this app requires (admin/editor/viewer per business unit), a lookup table join in the Auth Hook is the correct approach.

**Warning signs:**
- RLS policies reference `user_metadata` rather than `app_metadata` or custom claims
- Role elevation can be achieved by calling `supabase.auth.updateUser({ data: { role: 'admin' } })` from the browser console

**Phase to address:**
Auth implementation phase — define the Auth Hook and custom claims schema before writing any RLS policy that checks roles.

---

### Pitfall 4: Supabase Connection Pooler (Transaction Mode) Breaks Drizzle Prepared Statements

**What goes wrong:**
Supabase's recommended connection string for serverless environments uses **Supavisor in Transaction mode** (port 6543). Drizzle ORM and the underlying `postgres` or `pg` driver use prepared statements by default for query efficiency. Transaction mode pooling does not support prepared statements — each logical connection may be served by a different physical connection, making statement caching impossible. The result is `prepared statement "d1" already exists` errors in production that do not occur locally (where you typically connect directly).

**Why it happens:**
Local development uses the direct connection (port 5432) which supports prepared statements without issue. The Transaction mode pooler only routes connections for the duration of a transaction and does not preserve session state. The error surfaces only under load in production, often after deployment.

**How to avoid:**
Disable prepared statements when using the Transaction mode pooler. This is a one-line fix but must be applied consistently:

```typescript
// With 'postgres' driver (used by Drizzle):
const client = postgres(process.env.DATABASE_URL, { prepare: false });
const db = drizzle(client);

// With 'pg' driver:
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
// pg doesn't use prepared statements by default — verify explicitly
```

Use the Transaction pooler URL (port 6543) for all Vercel functions. Reserve the direct connection URL (port 5432) for migrations run via Drizzle Kit from CI/CD only — Drizzle Kit requires a direct connection for DDL operations.

**Warning signs:**
- `prepared statement already exists` errors in Vercel function logs
- Errors only appear in production (or under concurrent load in staging), not in local development
- Using the Supabase `[project-ref].supabase.co:6543` connection string without `prepare: false`

**Phase to address:**
Database connection setup — before any Vercel function makes a database query.

---

### Pitfall 5: RLS Policies on All 27 Tables is Mandatory, Not Optional

**What goes wrong:**
Teams enable RLS on the "important" tables (documents, requirements) but overlook lookup tables, audit logs, join tables, and reference data tables. Any table with RLS disabled returns all rows to any authenticated user via the Supabase REST API (PostgREST). For Policy Hub, this means tables like `regulatory_sources`, `audit_log`, `findings`, `finding_evidence`, `risk_actions`, `requirement_mappings`, `roles`, `jurisdictions`, and `users` expose all data to any logged-in user — including data from other business units.

**Why it happens:**
There are 27+ tables and writing RLS policies for all of them is tedious. Developers prioritize the primary entity tables and assume lookup/reference tables are safe because they "don't contain sensitive data." But `audit_log` contains all user actions; `users` contains all user accounts; `finding_evidence` contains uploaded files. None of these should be cross-business-unit accessible.

**How to avoid:**
Treat RLS as mandatory on every table with no exceptions. Create a migration checklist:

```sql
-- Verify all tables have RLS enabled:
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false;
-- This query should return zero rows after setup.
```

For reference tables that are genuinely global (e.g., `entity_types`, `jurisdictions`, `document_categories`, `finding_severities`), create explicit read-only policies for authenticated users rather than leaving RLS disabled:

```sql
-- Reference tables: anyone authenticated can read, nobody can write via API
CREATE POLICY "authenticated read" ON jurisdictions
  FOR SELECT TO authenticated USING (true);
```

**Warning signs:**
- Any table visible in `pg_tables` with `rowsecurity = false` after migration
- A user can query `/rest/v1/audit_log` and see entries from other business units
- Supabase's Database Advisor flags tables with missing RLS (it has a built-in lint for this)

**Phase to address:**
Database / RLS foundation phase — run the verification query as an acceptance criterion before any phase is considered complete.

---

### Pitfall 6: JWT Claims for RBAC Are Not Available Until After Token Refresh

**What goes wrong:**
Business-unit role assignments are stored in the database and injected into JWTs via an Auth Hook. When a user is assigned a new role or removed from a business unit, the change takes effect in the database immediately — but the user's current JWT still contains the old claims. The user continues to see (and mutate) data they should no longer have access to until their token expires (Supabase tokens expire after 1 hour by default) or they manually sign out and back in. In a compliance context, this is a real access control gap.

**Why it happens:**
JWTs are stateless and signed at issuance. The Auth Hook only runs when a new token is issued. Updating the database record does not retroactively invalidate the existing JWT. This is a fundamental JWT property, not a Supabase-specific bug, but the impact is significant for permission-sensitive applications.

**How to avoid:**
Implement a **short token lifetime** combined with forced refresh on permission changes:

1. Set a shorter access token expiry (e.g., 15 minutes) in the Supabase Auth settings
2. Use Supabase Realtime or a server-push mechanism to notify the client when their permissions change, triggering `supabase.auth.refreshSession()`
3. For critical permission removals (e.g., revoking admin access), immediately revoke all sessions for that user via the Admin API: `supabase.auth.admin.deleteUserSessions(userId)`

For the `staleTime: Infinity` React Query configuration currently in this app: React Query will serve cached data even after a JWT refresh delivers new claims. Permission-sensitive queries (what business units is this user allowed to see?) must use `staleTime: 0` or be invalidated explicitly on auth state changes.

**Warning signs:**
- User demoted from admin can still perform admin actions for up to 1 hour
- Business unit access revocation is not immediate
- React Query cache serves stale business-unit-scoped data after role change

**Phase to address:**
Auth implementation phase — token lifetime and session management must be designed alongside the Auth Hook, not retrofitted.

---

### Pitfall 7: Supabase Storage RLS Is Separate From Table RLS and Often Missed

**What goes wrong:**
Storage RLS operates on the `storage.objects` table — completely separate from `public.*` table policies. Developers implement thorough RLS on all business tables and assume storage is covered. The result: authenticated users can access (download, list, delete) any PDF in the storage bucket regardless of which business unit owns it, because `storage.objects` has no restrictive policies.

**Why it happens:**
Supabase Storage uses the same PostgreSQL RLS mechanism but in a different schema. The storage bucket's "private" designation does not automatically scope access by business unit — it only requires authentication. Business-unit scoping requires explicit policies on `storage.objects` referencing folder structure or metadata.

**How to avoid:**
Design storage folder structure to enable RLS policy enforcement from the start. Recommended path structure:

```
policy-documents/
  {business_unit_id}/
    {document_id}/
      versions/
        {version_id}/
          {filename}.pdf
```

Then RLS policies can enforce business-unit scoping using `storage.foldername()`:

```sql
CREATE POLICY "users access their business unit documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'policy-documents' AND
  (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'business_unit_id')
);
```

Note: signed URLs bypass RLS at the time of use — the RLS check only happens when the signed URL is generated. Never generate signed URLs for resources the requesting user is not authorized to access.

**Warning signs:**
- `storage.objects` has no policies listed in the Supabase dashboard
- A user from Business Unit A can download PDFs by guessing the storage path of Business Unit B
- Storage policies appear only on the primary entity tables, not in the Storage section of the dashboard

**Phase to address:**
Storage migration phase — folder structure and storage policies must be designed together before any files are migrated.

---

### Pitfall 8: AI Streaming (SSE) Needs Explicit Timeout Configuration on Vercel

**What goes wrong:**
The current app streams Anthropic AI responses to clients via Server-Sent Events (SSE). On Vercel, serverless functions have a default maximum duration. Without explicit configuration, long AI streaming responses (especially for the batch auto-mapping endpoint which processes 25 requirements sequentially) will hit the timeout and return a `504 FUNCTION_INVOCATION_TIMEOUT` error mid-stream. The client receives a partial response with no indication of failure other than the stream cutting off.

**Why it happens:**
Vercel's default function duration with Fluid Compute is 300 seconds, but without Fluid Compute enabled (or with non-default configurations), the older 10-second (Hobby) or 60-second (Pro) limits apply. The AI batch processing endpoint currently takes 30+ seconds for 100 requirements. Even with Fluid Compute, this endpoint needs explicit `maxDuration` configuration.

**How to avoid:**
Configure `maxDuration` explicitly for AI functions in `vercel.json`:

```json
{
  "functions": {
    "api/ai/**": {
      "maxDuration": 300
    }
  }
}
```

Enable Fluid Compute (default for new projects as of April 2025) to allow multiple concurrent invocations to share an instance. For the batch auto-mapping flow, migrate to an **async job pattern**: the function queues a job and immediately returns a job ID; a separate function (or Vercel Cron) polls for completion. This removes the streaming dependency for long operations.

For the conversational chat SSE endpoint (shorter, single responses): explicit `maxDuration: 60` is sufficient and the streaming architecture can remain as-is.

**Warning signs:**
- SSE streams cut off after exactly 10, 60, or 300 seconds
- `504` errors in Vercel logs for AI endpoints during batch operations
- The batch auto-mapping endpoint completes locally but times out in deployment

**Phase to address:**
AI features migration phase — before migrating any Anthropic API endpoint to Vercel functions.

---

### Pitfall 9: RLS Policy Query Direction Causes Silent Performance Degradation

**What goes wrong:**
RLS policies written in a natural but inefficient direction cause sequential table scans on every query. For this app's multi-table schema (27+ tables, many with business-unit scoping), poorly structured RLS policies can make common list queries 10-50x slower than equivalent queries without RLS. The application appears correct but becomes unusably slow at modest data volumes.

**Why it happens:**
The intuitive policy structure reads: "check if this row's business_unit_id is in the set of business units this user belongs to." This structure causes PostgreSQL to evaluate a subquery for every row:

```sql
-- SLOW: subquery evaluated per-row (sequential scan):
USING (
  business_unit_id IN (
    SELECT bu_id FROM user_business_units WHERE user_id = auth.uid()
  )
)
```

The correct direction inverts the query: find the user's business units first (once), then filter:

```sql
-- FAST: user's BUs computed once, then indexed lookup:
USING (
  business_unit_id = ANY(
    SELECT bu_id FROM user_business_units WHERE user_id = auth.uid()
  )
)
-- Or using a function that can be inlined/cached by the planner
```

**How to avoid:**
Follow the documented Supabase RLS performance pattern: filter by user first, not by row. Add indexes on every column referenced in an RLS policy (`business_unit_id`, `user_id`, foreign key columns). Use `EXPLAIN ANALYZE` to verify plans after writing policies. The Supabase Performance Advisor will flag `auth_rls_initplan` lint for policies with this anti-pattern.

**Warning signs:**
- List queries become slower as data volume grows (linear, not constant)
- `EXPLAIN ANALYZE` shows `Seq Scan` on large tables even for indexed queries
- Supabase Performance Advisor reports `0003_auth_rls_initplan` warnings

**Phase to address:**
RLS policy implementation phase — write and benchmark policies before migrating all tables, not after.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Use service role key for all Drizzle queries | Simpler setup, no RLS wiring | All users see all data; security breach risk | Never for user-facing queries |
| Keep serial integer PKs, don't add UUID foreign keys to auth.users | No schema migration needed | Cannot use `auth.uid()` in RLS policies; must maintain separate user mapping table | Acceptable if using a mapping table — but add the mapping table upfront |
| Disable RLS on "low-risk" lookup tables | Faster to ship | Cross-tenant data leakage on reference data; violates compliance posture | Never — use a permissive "authenticated can read" policy instead |
| Keep `staleTime: Infinity` on all React Query queries | Snappy UI, no refetches | Auth-scoped data (business units, roles) served from stale cache after permission changes | Acceptable only for truly static reference data |
| Put RLS policies off until "auth is done" | Faster early iteration | RLS retrofitted onto a working app requires re-testing every endpoint | Never — RLS must be validated per-table as auth is implemented |
| Use Vercel serverless functions for multer file uploads | Familiar pattern | Hard 4.5 MB limit causes silent failures for most real PDFs | Never — use signed upload URLs |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase Auth + Drizzle | Use `supabase.auth.getUser()` to get the user, then pass user ID to Drizzle queries manually | Set JWT context via `set_config` in a transaction; let RLS policies reference `auth.uid()` directly |
| Supabase Storage + RLS | Set bucket to "private" and assume it's scoped by business unit | Create explicit `storage.objects` policies using `storage.foldername()` to enforce folder-level ownership |
| Anthropic API + Vercel | Port the Express streaming handler directly as a serverless function | Configure `maxDuration`, verify SSE compatibility in Vercel's response model, use `TransformStream` for streaming |
| Supabase Connection Pooler + Drizzle | Use same `DATABASE_URL` for serverless functions and Drizzle Kit migrations | Use Transaction Pooler URL (port 6543, `prepare: false`) for functions; Direct URL (port 5432) for migrations only |
| React Query + Supabase Auth | Keep existing `staleTime: Infinity` for all queries | Use `supabase.auth.onAuthStateChange` to invalidate permission-sensitive queries on token refresh |
| Drizzle Kit + Supabase | Run `drizzle-kit push` against the Transaction Pooler URL | Run `drizzle-kit push` against the Direct URL only (DDL requires session mode) |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| RLS subquery per-row (N+1 in policy) | List queries slow down proportionally to row count | Write policies that query user first, filter rows second; add indexes on policy columns | 1,000+ rows per table |
| New DB connection per Vercel function invocation | "Too many clients" PostgreSQL errors under load | Use Supabase Transaction Pooler; enable Fluid Compute to share connections across invocations | ~50 concurrent requests |
| React Query `staleTime: Infinity` on user-scoped data | Users see stale data after role changes; no background refetch | Set `staleTime` appropriately per query type; invalidate on auth state change | Any permission change event |
| In-process multer + PDF processing in serverless function | `413 FUNCTION_PAYLOAD_TOO_LARGE` on files >4.5 MB | Client-side direct upload to Supabase Storage via signed URL | First PDF upload >4.5 MB |
| Sequential Anthropic API calls in single function | 30+ second function duration; 504 timeouts | Parallel batching with `Promise.all()`; async job queue for >10 requirements | 10+ requirements in auto-map |
| Drizzle with prepared statements on Transaction Pooler | `prepared statement already exists` errors in production | Set `prepare: false` in postgres client config | First concurrent request |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| RLS policies referencing `user_metadata` | Users can self-escalate to admin or cross business-unit access by updating their own metadata via Supabase JS client | Use Auth Hook custom claims in `app_metadata` (server-controlled) for all role/permission claims |
| Service role key exposed to client or Vercel Edge functions | Service role bypasses all RLS; any exposure grants full database access | Service role key must only exist in server-side environment variables, never in client bundles or Edge runtime |
| Signed storage URLs generated without authorization check | Anyone with a guessable path can request a signed URL from the server; RLS is checked at URL generation, not at download time | Verify the requesting user has access to the resource before generating a signed URL in the Vercel function |
| SQL Editor testing passing RLS | SQL Editor runs as PostgreSQL superuser; policies that pass there will bypass all RLS checks | Always test RLS policies via authenticated Supabase JS client requests, never via SQL Editor |
| `anon` key used for server-side admin operations | Anon key has the most restrictive permissions; server-side code that needs to write audit logs or manage users will fail silently | Use service role key (via `SUPABASE_SERVICE_ROLE_KEY`) for server-side admin operations; anon key for client-facing RLS |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **RLS enabled:** Verify with `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false` — must return zero rows
- [ ] **RLS tested correctly:** All policy tests performed via authenticated Supabase JS client requests (not SQL Editor, which bypasses RLS as superuser)
- [ ] **Storage policies written:** Check `storage.objects` policies in Supabase dashboard — separate from `public.*` table policies
- [ ] **Drizzle prepared statements disabled:** `prepare: false` set in postgres client when using Transaction Pooler (port 6543)
- [ ] **Auth Hook deployed:** Custom access token hook injecting `app_metadata.role` and `app_metadata.business_unit_id` — verify claims appear in decoded JWT
- [ ] **PDF upload path:** No `req.file` / multer in Vercel function handlers — upload flow uses signed URLs direct to Supabase Storage
- [ ] **AI function timeout configured:** `maxDuration` set in `vercel.json` for all Anthropic API functions
- [ ] **Connection URL differentiation:** Drizzle Kit migrations use Direct URL (port 5432); Vercel functions use Transaction Pooler URL (port 6543)
- [ ] **WITH CHECK on write policies:** INSERT and UPDATE RLS policies include `WITH CHECK` clause — a missing `WITH CHECK` allows users to insert/update rows with any `business_unit_id`
- [ ] **No cross-business-unit data in any query:** Authenticated user from Business Unit A cannot access Business Unit B's documents, requirements, findings, or audit logs

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| RLS bypass discovered in production (superuser role used) | HIGH | Immediately restrict API access; audit all queries for unauthorized data access; add JWT context to all Drizzle queries; notify affected business units per compliance obligations |
| `user_metadata` used for RBAC — users self-escalated | HIGH | Rotate all JWTs (force re-login); audit access logs for anomalous operations; migrate to Auth Hook custom claims; assess if data integrity was compromised |
| PDF uploads broken by 4.5 MB limit | MEDIUM | Implement signed upload URL pattern; no data loss (files never reached the function); re-test all upload sizes |
| Prepared statement errors in production | LOW | Set `prepare: false` in Drizzle config and redeploy; no data loss |
| AI function timeouts | LOW | Configure `maxDuration` in vercel.json; split batch operations; no data loss |
| RLS performance degradation | MEDIUM | Rewrite inefficient policies (invert query direction); add missing indexes; analyze with `EXPLAIN ANALYZE`; performance recovers immediately |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Drizzle bypasses RLS (superuser role) | Database + Auth foundation | Two-client pattern implemented; authenticated query returns only business-unit-scoped rows |
| PDF uploads broken by 4.5 MB limit | Storage migration | 50 MB PDF upload succeeds via signed URL; no multer in Vercel functions |
| `user_metadata` RBAC bypass | Auth implementation | Decoded JWT shows `app_metadata` claims, not `user_metadata`; role escalation attempt from client fails |
| Prepared statement errors | Database connection setup | `prepare: false` in Drizzle config; concurrent requests succeed without `already exists` errors |
| Missing RLS on all 27 tables | RLS policy implementation | Zero rows returned by `pg_tables WHERE rowsecurity = false` |
| JWT claims stale after role change | Auth implementation | Admin revocation immediately (or within token TTL) takes effect |
| Storage RLS separate from table RLS | Storage migration | User from Business Unit A cannot download Business Unit B PDFs |
| AI streaming timeouts | AI features migration | Batch auto-map for 100 requirements completes without 504 errors |
| RLS policy performance (N+1 direction) | RLS policy implementation | `EXPLAIN ANALYZE` shows index scans; Supabase Advisor shows zero `auth_rls_initplan` warnings |

---

## Sources

- [Drizzle ORM — Row-Level Security](https://orm.drizzle.team/docs/rls) — HIGH confidence (official docs)
- [Drizzle ORM — Drizzle with Supabase Database](https://orm.drizzle.team/docs/tutorials/drizzle-with-supabase) — HIGH confidence (official docs)
- [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) — HIGH confidence (official docs)
- [Supabase — Custom Claims & RBAC](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac) — HIGH confidence (official docs)
- [Supabase — Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control) — HIGH confidence (official docs)
- [Supabase — RLS Performance and Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) — HIGH confidence (official troubleshooting docs)
- [Supabase — Disabling Prepared Statements](https://supabase.com/docs/guides/troubleshooting/disabling-prepared-statements-qL8lEL) — HIGH confidence (official troubleshooting docs)
- [Supabase — Why is my service role key client getting RLS errors?](https://supabase.com/docs/guides/troubleshooting/why-is-my-service-role-key-client-getting-rls-errors-or-not-returning-data-7_1K9z) — HIGH confidence (official docs)
- [Supabase — Performance and Security Advisors](https://supabase.com/docs/guides/database/database-advisors?queryGroups=lint&lint=0003_auth_rls_initplan) — HIGH confidence (official docs)
- [Vercel — Functions Limits](https://vercel.com/docs/functions/limitations) — HIGH confidence (official docs, verified 4.5 MB body limit and duration limits)
- [Vercel — Fluid Compute](https://vercel.com/docs/fluid-compute) — HIGH confidence (official docs)
- [Vercel — Connection Pooling with Functions](https://vercel.com/kb/guide/connection-pooling-with-functions) — HIGH confidence (official knowledge base)
- [GitHub — rphlmr/drizzle-supabase-rls](https://github.com/rphlmr/drizzle-supabase-rls) — MEDIUM confidence (community implementation, widely referenced)
- [MakerKit — Using Drizzle as a client for interacting with Supabase](https://makerkit.dev/docs/next-supabase-turbo/recipes/drizzle-supabase) — MEDIUM confidence (established community pattern)
- [Supabase GitHub — RLS Performance Discussion](https://github.com/orgs/supabase/discussions/14576) — MEDIUM confidence (community discussion with Supabase team participation)

---
*Pitfalls research for: Express + PostgreSQL → Supabase + Vercel migration (Policy Hub compliance platform)*
*Researched: 2026-02-19*
