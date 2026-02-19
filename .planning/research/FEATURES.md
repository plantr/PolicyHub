# Feature Research

**Domain:** Supabase + Vercel platform migration — full-stack Express + React + PostgreSQL compliance app
**Researched:** 2026-02-19
**Confidence:** HIGH (primary sources: Supabase official docs, Vercel official docs, verified against live documentation)

---

## Context

This research covers the Supabase + Vercel feature landscape for migrating Policy Hub — an existing Express + React + PostgreSQL app — to Supabase (database, storage, auth) + Vercel (frontend + serverless functions for AI). The question is: which platform features are table stakes to make the migration functional, which are genuine differentiators, and which should be deliberately excluded.

The scope is focused on the six areas identified as critical:
1. Supabase Auth (email/password)
2. Supabase Storage (PDF uploads)
3. Row Level Security (RLS)
4. Supabase client for direct queries
5. Vercel Serverless Functions
6. Vercel deployment configuration

---

## Feature Landscape

### Table Stakes (Migration Fails Without These)

Features that are non-negotiable for the migration to work. Missing any of these means the app is broken or insecure.

| Feature | Why Required | Complexity | Notes |
|---------|--------------|------------|-------|
| **Supabase Auth: Email/Password Sign-in** | Replaces the unwired Passport.js stub; users need to authenticate | LOW | Enabled by default. `supabase.auth.signInWithPassword()`. No additional setup beyond enabling in dashboard. Confidence: HIGH (verified in docs). |
| **Supabase Auth: Email Confirmation Flow** | Production security baseline; without it, any email can be used | LOW | On hosted projects, email confirmation is required by default. Default SMTP has 2 emails/hour limit — must configure custom SMTP for production load. Confidence: HIGH. |
| **Supabase Auth: Password Reset** | Without it the app has no recovery path | LOW | Built-in via `supabase.auth.resetPasswordForEmail()`. Requires email template and redirect URL configuration. Confidence: HIGH. |
| **Supabase Auth: Session Auto-Refresh** | React client loses auth state without this | LOW | Handled automatically by `supabase-js` in browser via localStorage. No manual JWT refresh code needed. Confidence: HIGH. |
| **Custom Access Token Hook (JWT claims)** | Business-unit-scoped RLS requires `business_unit_id` in the JWT at query time | MEDIUM | Auth hook (Postgres function) fires on every token issue. Reads user's `app_metadata.business_unit_ids` and injects them into the JWT. Available on Free and Pro plans. Confidence: HIGH (official docs). |
| **Row Level Security: Enabled on all tables** | Without RLS, any authenticated user reads all rows across all business units | MEDIUM | Must be explicitly `ENABLE ROW LEVEL SECURITY` on every table. Policies reference `auth.uid()` or `auth.jwt() -> 'business_unit_ids'`. Confidence: HIGH. |
| **RLS: anon role blocked** | Prevent unauthenticated reads of compliance data | LOW | Default behavior when RLS is enabled and no anon policy exists. Explicitly verify for every table. Confidence: HIGH. |
| **RLS: service_role bypass for serverless functions** | AI endpoints and complex writes need unrestricted DB access server-side | LOW | Supabase client initialized with `service_role` key bypasses RLS entirely. Must NEVER be used in client-side code. Confidence: HIGH. |
| **Supabase Storage: Private bucket for PDFs** | PDFs contain compliance documents — must not be publicly readable | LOW | Buckets are private by default. All access goes through RLS policies on `storage.objects`. Confidence: HIGH. |
| **Supabase Storage: RLS on storage.objects** | Without it, any authenticated user can read any PDF | MEDIUM | Requires at minimum an INSERT policy and a SELECT policy scoped to the authenticated user or business unit. Confidence: HIGH. |
| **Supabase Storage: Signed download URLs** | Client must fetch PDFs without exposing service_role key | LOW | `supabase.storage.from('bucket').createSignedUrl(path, expiresIn)`. Generated server-side or via RLS-gated client. Confidence: HIGH. |
| **Supabase Storage: Signed upload URLs (server-generated)** | Vercel Function body limit is 4.5 MB; PDFs can be up to 50 MB | MEDIUM | Server generates `createSignedUploadUrl()` then client uploads directly to Supabase Storage. Bypasses the Vercel 4.5 MB request body limit entirely. This is the only viable upload pattern. Confidence: HIGH (Vercel limit is a hard wall; Supabase signed URL pattern is documented). |
| **Supabase JS Client (anon key, client-side)** | All direct data reads from React use this | LOW | `createClient(url, anonKey)`. RLS enforced automatically. Singleton pattern required to avoid session issues across React renders. Confidence: HIGH. |
| **Supabase JS Client (service_role key, server-side only)** | Serverless functions for AI/complex writes need to bypass RLS | LOW | `createClient(url, serviceRoleKey)`. Only used in Vercel Functions. Never in client bundle. Confidence: HIGH. |
| **Vercel Serverless Functions: Node.js runtime** | AI calls to Anthropic API must stay server-side (API key protection) | LOW | Files in `api/` directory. TypeScript supported. Full Node.js API coverage. Default 300s timeout (sufficient for AI calls). Confidence: HIGH (official docs). |
| **Vercel Serverless Functions: Environment variables** | Supabase keys, Anthropic key must be injected at runtime | LOW | Set via Vercel dashboard or CLI. Sensitive variables cannot be read back after creation. Scoped per environment (preview/production). Confidence: HIGH. |
| **Vercel SPA routing configuration (vercel.json)** | Wouter client-side routing breaks on deep links without this | LOW | `vercel.json` rewrite: `"source": "/(.*)", "destination": "/index.html"`. Required for all SPA deployments on Vercel. Confidence: HIGH (official docs). |
| **Vercel: VITE_ env var prefix** | Frontend env vars (Supabase anon key, Supabase URL) must be exposed to Vite build | LOW | Any env var accessible in client bundle must be prefixed `VITE_`. E.g., `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Confidence: HIGH. |
| **Pooled connection string (transaction mode) for serverless** | Serverless functions create many short-lived DB connections; direct connection will exhaust pool | MEDIUM | Use port 6543 (transaction mode via Supavisor). Does NOT support prepared statements — Drizzle ORM queries must avoid them. Confidence: HIGH (official docs). |

### Differentiators (Competitive Advantage of This Platform Choice)

Features that go beyond baseline migration requirements. These represent genuine advantages of the Supabase + Vercel stack over the current Express + S3 + Passport approach.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Supabase Auth: MFA (TOTP)** | Compliance platforms benefit from MFA — reduces audit finding risk | LOW | Available on Free/Pro plans. Second factor via TOTP or phone OTP. Adds meaningful security posture without custom code. Confidence: HIGH. |
| **Supabase Auth: Custom Access Token Hook for RBAC** | Business-unit-scoped RLS is genuinely powerful — replaces entire custom auth/middleware layer | MEDIUM | Hook fires on login; injects user's business unit memberships into JWT. RLS policies read `auth.jwt() -> 'business_unit_ids'`. Eliminates the need for session middleware, Passport, and custom auth routes. Confidence: HIGH. |
| **RLS: Declarative multi-tenant data isolation** | Replaces 100+ methods in `server/storage.ts` that manually filter by business unit | HIGH | Once policies are written and tested, all queries from any surface (client SDK, REST API, serverless functions with user JWT) are automatically scoped. Eliminates entire class of data leakage bugs. Confidence: HIGH. |
| **Supabase Storage: Resumable uploads (TUS protocol)** | PDFs can be large; resumed uploads improve reliability on slow connections | MEDIUM | Recommended for files > 6MB. Fixed 6MB chunk size. 24-hour upload URL validity. Combine with signed URL pattern. Confidence: HIGH (official docs). |
| **Supabase Storage: CDN delivery** | PDFs served from global CDN — faster than S3 with manual presigned URL plumbing | LOW | All Supabase Storage objects served via global CDN. No configuration needed. Confidence: MEDIUM (official marketing; verified via storage docs). |
| **Vercel: Preview deployments per branch** | Each PR gets a live preview URL — unblocks parallel feature development | LOW | Git-integrated. Supabase integration automatically syncs env vars to preview deployments. Confidence: HIGH. |
| **Vercel + Supabase Marketplace Integration** | All env vars (connection string, anon key, service role key) auto-populated in Vercel | LOW | Install once via Vercel marketplace. Eliminates manual env var copy-paste across environments. Also syncs to preview branches. Confidence: HIGH (official docs). |
| **Vercel Fluid Compute** | AI endpoints benefit from reduced cold starts and idle-time concurrency — cost reduction for I/O-heavy AI calls | LOW | Enabled by default for new projects as of April 2025. Particularly valuable for Anthropic API calls (I/O-bound). No configuration needed. Confidence: HIGH (official changelog). |
| **Supabase: Postgres full feature set** | Can use pg_dump/psql for migration — zero data loss path; can keep Drizzle ORM | LOW | Standard PostgreSQL — no proprietary extensions required. Direct pg_dump import supported. Confidence: HIGH. |
| **Vercel Observability for Functions** | AI endpoint performance and cost visibility via built-in dashboards | LOW | View GB-Hours, invocations, duration. Useful for monitoring AI cost at function level without additional tooling. Confidence: HIGH. |

### Anti-Features (Deliberately NOT Build or Use)

Features that seem natural but create problems in this specific context.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Supabase Edge Functions for AI calls** | Edge runtime has a 25s response timeout (before streaming must start) and restricted Node.js APIs. Anthropic calls for batch analysis take 30-60s regularly (documented in existing code). Edge runtime would cause frequent 504s. | Use Vercel Serverless Functions (Node.js runtime) with up to 300s timeout. This is the architecture already planned. Confidence: HIGH (Edge runtime timeout is a hard limit). |
| **Routing all PDF uploads through Vercel Functions** | Vercel Functions have a hard 4.5 MB request body limit. Policy PDFs can be up to 50 MB. Every upload > 4.5 MB will return 413 FUNCTION_PAYLOAD_TOO_LARGE. | Use server-generated signed upload URLs (`createSignedUploadUrl()`). Client uploads directly to Supabase Storage. Function only handles metadata creation. Confidence: HIGH (Vercel docs confirm this is a hard limit). |
| **Client-side service_role key** | Service role bypasses all RLS. Exposing it in the browser bundle gives any user full database access — catastrophic for a multi-tenant compliance platform. | Service role only in Vercel Functions. Client uses anon key + RLS. Confidence: HIGH (Supabase docs explicitly warn against this). |
| **Using auth.jwt() -> 'user_metadata' for RLS policies** | user_metadata is writable by authenticated users. A user can update their own metadata to claim access to any business unit. | Use auth.jwt() -> 'app_metadata' which is only writable by service_role. Inject business unit membership via Custom Access Token Hook from trusted server-side data. Confidence: HIGH (Supabase docs explicitly flag this as a security issue). |
| **Keeping Drizzle ORM for client-side queries** | Drizzle is a server-side ORM. Using it client-side means bypassing RLS entirely (direct DB connection) or shipping ORM overhead to the browser. | Use Supabase JS client for client-side queries (enforces RLS automatically via JWT). Keep Drizzle only in serverless functions if needed for complex migrations or admin operations. Confidence: HIGH. |
| **Supabase Realtime subscriptions** | Policy Hub has no real-time collaborative editing requirements. Realtime adds WebSocket connection overhead and complexity for no user value. | Use React Query polling/invalidation for cache freshness. This is already the pattern in the codebase. Confidence: MEDIUM (no realtime requirements identified in codebase analysis). |
| **Keeping Passport.js / Express sessions** | Express sessions and Passport are being replaced entirely by Supabase Auth. Running both simultaneously during migration creates two auth states that can conflict. | Migrate auth in one phase. Remove Passport/express-session packages once Supabase Auth is wired. Confidence: HIGH. |
| **Supabase default SMTP for production** | Rate limit of 2 emails/hour. A compliance platform with multiple users signing up, resetting passwords, or receiving audit emails will hit this immediately. | Configure a custom SMTP provider (SendGrid, Postmark, Resend) before going to production. Free tier of most SMTP providers is sufficient. Confidence: HIGH (Supabase docs explicitly state this limit). |
| **Direct PostgreSQL connection string in serverless functions** | Serverless functions create many short-lived connections. Direct connections (port 5432) will exhaust the PostgreSQL max_connections limit under load. | Use the pooled transaction mode connection string (port 6543 via Supavisor). Confidence: HIGH (official Supabase docs). |

---

## Feature Dependencies

```
Supabase Auth (email/password)
    └──requires──> Custom SMTP (production)
    └──requires──> Custom Access Token Hook (for RBAC)
                       └──requires──> business_unit_ids in app_metadata
                                          └──requires──> User provisioning flow (admin sets membership)

RLS on all tables
    └──requires──> Supabase Auth (JWT must be present for auth.uid() / auth.jwt() to work)
    └──requires──> Custom Access Token Hook (for business_unit_id scoping)
    └──enhances──> Supabase JS Client (automatically passes JWT in all queries)

Supabase Storage (private bucket + RLS on storage.objects)
    └──requires──> Supabase Auth (user identity for storage policies)
    └──requires──> Signed upload URL pattern (server-generates URL, client uploads directly)
    └──requires──> Vercel Serverless Function (server-side signed URL generation)

Vercel Serverless Functions (AI endpoints)
    └──requires──> service_role key (as Vercel env var, never in client)
    └──requires──> Pooled DB connection string (transaction mode, port 6543)
    └──conflicts──> Supabase Edge Functions (different runtime, shorter timeout)

Vercel SPA deployment
    └──requires──> vercel.json with rewrite rule (SPA deep link support)
    └──requires──> VITE_ prefix on client env vars
    └──enhances──> Vercel + Supabase Marketplace Integration (auto env var sync)
```

### Dependency Notes

- **Custom Access Token Hook requires app_metadata with business_unit_ids:** The hook fires on login and reads user role data. That data must be written server-side (service_role only) when users are provisioned to business units. The hook cannot fabricate this data — it reads what's already stored. This means user provisioning must write to `auth.users.raw_app_meta_data`, not just the application tables.

- **Signed upload URL pattern requires both a serverless function AND Supabase Storage:** The function generates the signed URL (requires service_role or anon key with storage.objects INSERT policy), returns the URL to the client, then the client uploads directly. Two-step flow versus current single-step multer upload. This changes the frontend upload component.

- **Pooled connection (port 6543) conflicts with Drizzle prepared statements:** Supabase transaction mode connection pooler does not support PostgreSQL prepared statements. Drizzle ORM, when used in serverless functions, must not use `db.execute()` with prepared statement syntax. This is a known migration concern.

- **RLS enhances Supabase JS client but not service_role client:** Every query made with the anon-key client automatically includes the user's JWT in the Authorization header, which Supabase passes to the database as the session context for RLS evaluation. The service_role client bypasses this — useful and intentional for admin/AI operations.

---

## MVP Definition

This is a migration milestone, not a greenfield product. MVP = the existing app works on the new platform with auth and multi-tenant isolation enforced.

### Launch With (Migration Complete)

- [ ] **Supabase Auth email/password** — users can sign in/out, passwords reset, sessions persist across browser reloads
- [ ] **Custom Access Token Hook injecting business_unit_ids** — foundation for all RLS policies
- [ ] **RLS enabled on all 27+ tables** — every query is business-unit-scoped; no data leakage between tenants
- [ ] **Supabase Storage private bucket with storage.objects RLS** — PDFs protected
- [ ] **Signed upload URL pattern for PDF uploads** — bypasses Vercel 4.5 MB limit
- [ ] **Signed download URLs for PDF retrieval** — PDFs accessible to authorized users only
- [ ] **Vercel Serverless Functions for AI endpoints** — Anthropic API key stays server-side
- [ ] **Pooled connection string in serverless functions** — DB connections don't exhaust under load
- [ ] **vercel.json SPA rewrite** — Wouter routes work on direct navigation
- [ ] **Custom SMTP configured** — auth emails actually arrive in production

### Add After Validation (v1.x)

- [ ] **MFA (TOTP)** — add once core auth is stable; meaningful compliance signal
- [ ] **Vercel + Supabase marketplace integration** — reduces env var management overhead; add before team grows

### Future Consideration (v2+)

- [ ] **Resumable uploads (TUS)** — only needed if users consistently upload PDFs > 6 MB with unreliable connections; monitor upload failure rates first
- [ ] **Multiple Vercel regions for functions** — only relevant if non-US users experience latency; default iad1 is fine for launch

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Supabase Auth email/password | HIGH | LOW | P1 |
| Custom Access Token Hook (RBAC) | HIGH | MEDIUM | P1 |
| RLS on all tables | HIGH | HIGH | P1 |
| Supabase Storage private bucket + RLS | HIGH | MEDIUM | P1 |
| Signed upload URL pattern | HIGH | MEDIUM | P1 |
| Vercel Serverless Functions (AI) | HIGH | LOW | P1 |
| Pooled DB connection string | HIGH | LOW | P1 |
| vercel.json SPA rewrite | HIGH | LOW | P1 |
| Custom SMTP | HIGH | LOW | P1 |
| MFA (TOTP) | MEDIUM | LOW | P2 |
| Vercel + Supabase marketplace integration | MEDIUM | LOW | P2 |
| Resumable uploads (TUS) | LOW | MEDIUM | P3 |
| Vercel Observability dashboards | LOW | LOW | P2 |

**Priority key:**
- P1: Must have for migration to be complete and secure
- P2: Should have, add once P1 is stable
- P3: Nice to have, evaluate post-launch

---

## Technical Constraints Discovered

These are not features but hard limits that shape implementation decisions. Treat them as requirements.

| Constraint | Limit | Impact on Policy Hub |
|------------|-------|---------------------|
| Vercel Function request body | 4.5 MB hard limit | PDF uploads CANNOT go through Vercel Functions. Signed upload URL pattern is mandatory. |
| Vercel Function timeout (Hobby/Pro) | 300s default, 800s max (Pro) | AI batch processing (currently can take 30-60s) fits comfortably. Very large batch jobs approaching 300s need timeout configuration. |
| Supabase Storage: Free plan file limit | 50 MB per file | Exactly matches current multer 50 MB limit. No change needed. |
| Supabase default SMTP | 2 emails/hour | Completely unusable for production. Custom SMTP is not optional. |
| Transaction mode pooler | No prepared statements | Drizzle ORM usage in serverless functions must avoid prepared statement APIs. |
| user_metadata in RLS | Security hole | Must use app_metadata for business unit claims — only service_role can write it. |
| Supabase Edge Function timeout | 25s before streaming starts | Eliminates Edge Functions for AI use cases. Node.js Vercel Functions only. |

---

## Sources

**Supabase Official Documentation (HIGH confidence):**
- [Password-based Auth](https://supabase.com/docs/guides/auth/passwords) — verified 2026-02-19
- [Auth Hooks](https://supabase.com/docs/guides/auth/auth-hooks) — Custom Access Token Hook, available Free/Pro
- [Custom Claims & RBAC](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac)
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control)
- [Storage: File Limits](https://supabase.com/docs/guides/storage/uploads/file-limits) — 50MB free tier confirmed
- [Storage: Resumable Uploads](https://supabase.com/docs/guides/storage/uploads/resumable-uploads) — TUS protocol, 6MB chunks
- [Storage: Create Signed Upload URL](https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl)
- [Connecting to Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres) — pooler transaction mode port 6543
- [User Sessions](https://supabase.com/docs/guides/auth/sessions)

**Vercel Official Documentation (HIGH confidence):**
- [Vercel Functions](https://vercel.com/docs/functions) — Node.js runtime, fluid compute
- [Vercel Functions Limits](https://vercel.com/docs/functions/limitations) — 4.5 MB body limit, 300s/800s timeout, 4GB memory
- [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite) — SPA routing config, VITE_ env var prefix
- [Bypass 4.5 MB Body Limit](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions) — signed URL pattern recommended
- [Environment Variables](https://vercel.com/docs/environment-variables) — sensitive vars, preview/production scoping

**Vercel + Supabase Integration (HIGH confidence):**
- [Supabase for Vercel Marketplace](https://vercel.com/marketplace/supabase) — auto env var sync
- [Vercel Integration (Supabase side)](https://supabase.com/docs/guides/integrations/vercel-marketplace)

**Community Sources (MEDIUM confidence, corroborating official docs):**
- [How to Use Supabase with TanStack Query v5](https://makerkit.dev/blog/saas/supabase-react-query) — singleton client pattern, throwOnError()
- [Multi-Tenant Applications with RLS](https://www.antstack.com/blog/multi-tenant-applications-with-rls-on-supabase-postgress/) — JWT custom claims pattern

---

*Feature research for: Supabase + Vercel migration of Policy Hub compliance platform*
*Researched: 2026-02-19*
