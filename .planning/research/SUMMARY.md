# Project Research Summary

**Project:** Policy Hub — Supabase + Vercel Migration
**Domain:** Compliance management SaaS platform migration (Express + PostgreSQL to Supabase + Vercel)
**Researched:** 2026-02-19
**Confidence:** HIGH

## Executive Summary

Policy Hub is an existing multi-tenant compliance management SaaS application being migrated from Express + PostgreSQL (with a stub Passport.js auth layer) to Supabase (database, auth, storage) + Vercel (static SPA hosting + serverless functions for AI). The existing React/Vite/Drizzle/React Query frontend stack is retained unchanged. The migration scope is a platform swap, not a product rebuild — but the platform change enables genuinely better security architecture: replacing application-level authorization (which is currently unenforced) with database-level Row Level Security that is impossible to bypass from client code.

The recommended approach structures the migration in strict dependency order: Supabase infrastructure and RLS policies must be complete and verified before any application routes are migrated. The Custom Access Token hook — which injects business-unit membership into the JWT at login — is the load-bearing piece of the entire authorization model. Every RLS policy depends on it, and it must be deployed alongside the initial schema migration, not retrofitted later. The Vercel deployment layer is comparatively straightforward: the existing Express app exports as a serverless function default, AI endpoints need explicit timeout configuration, and the SPA routing rewrite in `vercel.json` is a one-liner.

The primary risks are all in the RLS and auth layer. Drizzle ORM bypasses RLS by default (connects as superuser), requiring a two-client pattern. The Vercel 4.5 MB function body limit makes multer-based PDF uploads completely broken for most real documents — signed upload URLs are mandatory from day one. RLS policies on the `storage.objects` table are entirely separate from table-level RLS and frequently missed. Any of these three oversights would result in a security incident in a compliance-oriented product.

---

## Key Findings

### Recommended Stack

The stack change is surgical: install `@supabase/supabase-js` (v2.97.0) for the React client, replace the `pg` driver with `postgres` (postgres.js) for Drizzle compatibility with Supabase's transaction-mode pooler, and add Vercel tooling (`vercel`, `@vercel/node`). No changes to React, Vite, Tailwind, Radix UI, React Query, Zod, Wouter, or the Anthropic SDK. The `@supabase/ssr` package is only required if Vercel Functions need to validate the user's session server-side (not needed for pure client-side auth flows). The deprecated `@supabase/auth-helpers-react` package must not be used.

The Vercel Marketplace integration with Supabase auto-injects 13 environment variables across environments and is the standard setup path. Two separate database URLs are required throughout: a transaction-mode pooler URL (port 6543, `prepare: false`) for serverless function runtime queries, and a direct connection URL (port 5432) for Drizzle Kit migrations only. The existing codebase runs Node 25.x locally; Vercel does not support 25.x and requires pinning to Node 22.x in `package.json`.

**Core technologies:**
- `@supabase/supabase-js` v2.97.0: unified client for database, auth, and storage — replaces `pg` direct queries and the Passport.js stub
- `@vercel/node` v5.6.5: TypeScript types for Vercel function handlers (`VercelRequest`, `VercelResponse`)
- `postgres` (postgres.js): PostgreSQL driver for Drizzle ORM with `{ prepare: false }` for transaction-mode pooler compatibility
- Vercel CLI: local dev via `vercel dev` (mirrors production including `/api` routing), env sync via `vercel env pull`

**Critical version constraints:**
- Node.js: pin to 22.x in `package.json` (Vercel does not support 25.x)
- `@supabase/supabase-js`: requires Node 20+ (dropped 18 in v2.79.0)
- Drizzle ORM 0.39.3 already installed — no change needed, but switch driver from `pg` to `postgres`

### Expected Features

This is a migration milestone, not a greenfield product launch. "Features" are the platform capabilities that make the migration functional and secure. Missing any P1 item means the app is broken or has a critical security gap.

**Must have — Migration complete (P1):**
- Supabase Auth email/password sign-in, session auto-refresh, password reset
- Custom Access Token Hook injecting `business_unit_ids` and `app_role` into JWT via `app_metadata` (not `user_metadata`)
- Custom SMTP provider configured (Supabase default SMTP is rate-limited to 2 emails/hour — unusable for production)
- RLS enabled and verified on all 27+ tables (`pg_tables WHERE rowsecurity = false` returns zero rows)
- Supabase Storage private bucket with RLS policies on `storage.objects` (separate from table RLS)
- Signed upload URL pattern for PDF uploads (Vercel function body limit is a hard 4.5 MB wall; PDFs are up to 50 MB)
- Signed download URLs generated server-side for PDF retrieval
- Vercel Serverless Functions for AI endpoints (Anthropic API key stays server-side, `maxDuration: 60-300` configured)
- Transaction-mode pooler URL (port 6543) with `prepare: false` for all runtime database connections
- `vercel.json` with SPA rewrite and `/api/*` routing

**Should have — After core migration is stable (P2):**
- MFA via TOTP (meaningful compliance signal, available on Free/Pro, low implementation cost)
- Vercel + Supabase Marketplace integration (eliminates manual env var management across environments)
- Vercel Observability dashboards for AI endpoint cost/performance monitoring

**Defer (v2+):**
- Resumable uploads via TUS protocol (only needed if users consistently upload PDFs > 6 MB with unreliable connections)
- Multiple Vercel regions for functions (only relevant if non-US users report latency; default iad1 is fine for launch)

**Anti-features to explicitly avoid:**
- Supabase Edge Functions for AI calls (hard 25s timeout; Anthropic batch analysis regularly takes 30-60s)
- Routing PDF uploads through Vercel Functions (4.5 MB body limit breaks all real-world PDFs)
- Service role key in any client-side code
- RLS policies referencing `user_metadata` (user-controllable; privilege escalation vector)
- Running Passport.js and Supabase Auth simultaneously (creates conflicting auth states)

### Architecture Approach

The target architecture has three distinct layers: a React SPA serving all UI (deployed as static files on Vercel CDN); a Supabase JS client handling direct reads via PostgREST with automatic JWT-based RLS enforcement; and Vercel Serverless Functions handling AI analysis, complex writes, multi-step transactions, and PDF processing. Approximately 70% of the current Express GET endpoints can be eliminated entirely — replaced by direct `supabase.from()` queries in React Query hooks. The remaining serverless functions for AI and complex mutations are largely a lift-and-shift of the existing Express routes (exported as a default instead of calling `app.listen()`).

**Major components:**

1. **React SPA** — all UI rendering, client routing (Wouter), state management (React Query + Supabase auth session); deployed as static build to Vercel CDN; unchanged architecture
2. **Supabase JS Client** — direct PostgREST reads with user JWT attached automatically; RLS enforced transparently; replaces `apiRequest('GET', ...)` wrapper for all list/get operations
3. **Vercel Serverless Functions** — Express app exported as default in `api/index.ts`; handles AI (Anthropic), PDF upload/download, complex mutations; uses service-role key server-side
4. **Supabase Auth + Custom Access Token Hook** — GoTrue email/password auth; PL/pgSQL hook injects `business_unit_ids` and `app_role` into JWT on every login; enables RLS-based multi-tenancy
5. **Supabase Storage** — private `policy-documents` bucket; RLS on `storage.objects` enforces business-unit folder-level access; replaces local `data/uploads/` and simulated S3
6. **Supabase PostgreSQL** — existing 27+ table schema; RLS policies enforced at database level; two connection URLs (pooler for runtime, direct for migrations)

### Critical Pitfalls

1. **Drizzle ORM bypasses RLS by default** — Drizzle connects as the `postgres` superuser role, which has admin privileges and ignores all RLS policies. Prevention: use the two-client pattern — an `adminDb` (service role) for background/admin ops and an `rlsDb` that sets JWT context via `set_config` in a transaction wrapper. The `drizzle-supabase-rls` package provides this. Validate RLS with authenticated Supabase JS client requests, never the SQL Editor (also runs as superuser).

2. **Vercel 4.5 MB body limit silently breaks PDF uploads** — Multer-based uploads work locally but fail with `413 FUNCTION_PAYLOAD_TOO_LARGE` in deployment for any PDF over 4.5 MB. Prevention: implement signed upload URL pattern from day one — Vercel Function generates a signed URL (no file data), client uploads directly to Supabase Storage, function only stores the returned path (a few hundred bytes).

3. **Storage RLS is separate from table RLS** — The `private` bucket designation only requires authentication; it does not scope access by business unit. `storage.objects` policies must be written explicitly using `storage.foldername()` to enforce folder-level ownership (folder structure should be `{business_unit_id}/{document_id}/versions/{version_id}/{filename}.pdf`).

4. **`user_metadata` in RLS policies is a privilege escalation vector** — Users can modify their own `user_metadata` via `supabase.auth.updateUser()`. Any RLS policy referencing `user_metadata` for role or business-unit claims can be bypassed from the browser console. Prevention: use the Custom Access Token Hook to inject claims into `app_metadata` (server-controlled only). All RLS policies must reference `auth.jwt() -> 'app_metadata'`, never `user_metadata`.

5. **Prepared statements on transaction-mode pooler cause production errors** — Supabase's PgBouncer transaction-mode pooler (port 6543) does not support PostgreSQL prepared statements. Drizzle ORM uses them by default. Errors manifest as `prepared statement already exists` under concurrent load in production but not in local development (which uses the direct connection). Prevention: set `{ prepare: false }` in the `postgres` client config for all Vercel Function database connections.

---

## Implications for Roadmap

Based on the dependency graph across all research files, the migration must proceed in strict layers. Infrastructure must be verified before application code is migrated. Auth must be fully operational before RLS can be tested. Storage must be designed before any upload endpoint is built. Only then can the client-side migration proceed.

### Phase 1: Supabase Infrastructure + RLS Foundation

**Rationale:** Everything else depends on this. The Custom Access Token hook is a prerequisite for all RLS policies. RLS policies are a prerequisite for validating any data access. The schema migration must run before any application code can connect to Supabase. This phase has the highest security stakes in the entire project — errors here create compliance incidents.

**Delivers:** A functional Supabase project with the full schema migrated, RLS enforced on all 27+ tables, the Custom Access Token hook deployed and emitting correct JWT claims, and the auth flow (email/password, email confirmation, password reset) working end-to-end.

**Addresses:** Supabase Auth email/password, Custom Access Token hook, RLS on all tables, custom SMTP

**Avoids:** `user_metadata` RBAC bypass (pitfall 3), Drizzle superuser bypass (pitfall 1 — establish the two-client pattern here), missing RLS on all 27 tables (pitfall 5), JWT claims stale after role change (design token lifetime here)

**Research flag:** Standard patterns — Supabase auth and RLS are thoroughly documented with official examples. No additional research needed. Use the SQL verification query (`pg_tables WHERE rowsecurity = false`) as the acceptance criterion.

---

### Phase 2: Supabase Storage Migration

**Rationale:** Storage depends on Phase 1 (auth + RLS foundation) to scope storage policies by business unit. The signed upload URL pattern — mandatory due to Vercel's 4.5 MB body limit — must be designed and implemented before any document upload endpoint is built in Phase 3. Existing PDFs must be migrated to the new bucket before the application can switch over.

**Delivers:** A private `policy-documents` bucket with folder-structured paths (`{business_unit_id}/...`), RLS policies on `storage.objects` enforcing business-unit access, signed upload and download URL generation in Vercel Functions, and all existing PDFs migrated from `data/uploads/`.

**Addresses:** Supabase Storage private bucket, storage.objects RLS, signed upload URL pattern, signed download URLs

**Avoids:** Storage RLS gap (pitfall 7 — `storage.objects` policies are separate and frequently missed), Vercel 4.5 MB upload limit (pitfall 2 — signed URL pattern is mandatory, not optional), storing PDF binary in PostgreSQL (architecture anti-pattern 5)

**Research flag:** Standard patterns — Supabase Storage docs provide the folder-structure RLS pattern and signed URL API. No additional research needed.

---

### Phase 3: Vercel Deployment + Serverless Functions

**Rationale:** The Vercel deployment layer is comparatively mechanical once Supabase infrastructure is solid. The Express app exports as a serverless function default with minimal changes. This phase also handles connection pooling configuration (a prerequisite for any production database usage) and AI endpoint timeout configuration (a prerequisite for any AI migration in Phase 4).

**Delivers:** A deployed Vercel project with the Express app running as a serverless function (`api/index.ts`), `vercel.json` routing configured, transaction-mode pooler URL with `prepare: false` configured, AI function `maxDuration` set, and environment variables synced via the Vercel + Supabase marketplace integration.

**Uses:** `@vercel/node` v5.6.5, `vercel.json` SPA rewrite + function config, transaction pooler URL (port 6543), `VITE_` prefix convention for client env vars

**Avoids:** Prepared statement errors on pooler (pitfall 4 — set `prepare: false` here), AI streaming timeouts (pitfall 8 — configure `maxDuration` for all Anthropic endpoints), direct connection exhaustion under load (architecture anti-pattern 4), exposing service role key or Anthropic key to client bundle

**Research flag:** Standard patterns — Vercel Express deployment and function configuration are well-documented. No additional research needed. The only judgment call is whether to keep the single `api/index.ts` monolithic function or split to per-route files — start with the monolith for simplicity.

---

### Phase 4: React Client Migration

**Rationale:** The client migration is last because it depends on all three prior phases being complete and validated. Each React Query hook needs RLS-gated data to test against. The auth flow needs the real Supabase project. Upload components need the signed URL infrastructure. Attempting to migrate client code before the backend is verified leads to inability to distinguish application bugs from infrastructure bugs.

**Delivers:** All `apiRequest('GET', ...)` hooks replaced with `supabase.from()` React Query queries; login/logout/session via `supabase.auth`; upload components using the signed URL pattern; Passport.js and Express session packages removed.

**Addresses:** Supabase JS client (anon key, client-side), auth session auto-refresh, migration of 70% of Express GET routes to direct PostgREST queries

**Avoids:** Drizzle ORM used client-side (architecture anti-pattern — Drizzle is server-only), `staleTime: Infinity` on permission-sensitive queries (pitfall 6 cross-reference — reset stale times on business unit and role queries)

**Research flag:** Standard patterns — React Query + Supabase JS client singleton is well-documented. The main judgment call is query migration priority order: start with the simplest, least-joined tables (business units, jurisdictions) to validate RLS before migrating complex entities (requirements, documents, findings).

---

### Phase 5: AI Features + Polish

**Rationale:** AI endpoints are the highest-risk serverless functions due to timeout sensitivity, streaming complexity, and Anthropic API costs. Migrating them last — after the deployment infrastructure is proven in Phase 3 — allows isolated testing and timeout tuning. The batch auto-mapping endpoint (which processes 25+ requirements sequentially) is the most likely candidate for the async job queue pattern; this decision should be validated against real production usage before engineering the queue.

**Delivers:** All Anthropic API endpoints migrated and verified in Vercel Functions, SSE streaming confirmed working with Fluid Compute, batch auto-mapping timeout behavior assessed and addressed (either `maxDuration` configuration or async job queue), optional MFA/TOTP added.

**Addresses:** Vercel Serverless Functions for AI endpoints, AI streaming (SSE), batch operation timeout management, Vercel Observability setup, optional MFA

**Avoids:** AI streaming timeouts (pitfall 8 — `maxDuration` configured in Phase 3, tuned here), Anthropic API key leakage to client, sequential Anthropic calls in single function causing 504s (performance trap — parallelize with `Promise.all()` where possible)

**Research flag:** Needs research-phase consideration if the batch auto-mapping endpoint consistently approaches 300s. The async job queue pattern (Inngest, Trigger.dev, or Vercel Cron) is well-documented independently but the integration with the existing streaming UI would need design work. If the current 30-60s batch times hold, the explicit `maxDuration: 300` with Fluid Compute is sufficient and no job queue is needed.

---

### Phase Ordering Rationale

The order is determined by three dependency chains discovered across all four research files:

1. **Auth before RLS:** The Custom Access Token hook must exist and be deployed before any RLS policy can reference JWT claims. Auth is not decoupled from security in this architecture.

2. **RLS before data access:** Any client or serverless function that reads production data before RLS is verified risks exposing cross-business-unit data. The Phase 1 acceptance criterion (zero rows from `pg_tables WHERE rowsecurity = false`) gates all downstream phases.

3. **Storage design before upload endpoints:** The signed upload URL pattern is a two-system interaction (Vercel Function + Supabase Storage) that changes the upload component architecture in the React client. It must be designed and verified before Phase 4's client migration can wire up document upload.

The architecture research's suggested build order (Infrastructure → Storage → Serverless → Client → AI) maps directly to the phase structure here. The pitfalls research reinforces this ordering: the most catastrophic pitfalls (RLS bypass, `user_metadata` escalation) are Phase 1 concerns; the most user-visible pitfalls (broken uploads, AI timeouts) are addressed in Phases 2 and 5 respectively.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All core technologies verified against official docs and npm release data. The only MEDIUM-confidence finding is the new `sb_publishable_xxx` API key format for post-May 2025 Supabase projects (from GitHub discussion, not official docs page). |
| Features | HIGH | All P1 table-stakes features verified against official Supabase and Vercel documentation. Technical constraints (4.5 MB limit, 2 emails/hour SMTP limit, 25s Edge Function timeout) are verified hard limits, not estimates. |
| Architecture | HIGH | All architectural patterns (PostgREST direct reads, Express serverless export, JWT custom claims, two-client Drizzle pattern) verified against official documentation for each platform. No speculative patterns. |
| Pitfalls | HIGH | All 9 critical pitfalls verified against official documentation, including the exact error messages, the query verification (`pg_tables WHERE rowsecurity = false`), and the Supabase Performance Advisor lint code (`0003_auth_rls_initplan`) for the RLS N+1 pattern. |

**Overall confidence:** HIGH

### Gaps to Address

- **New API key format confirmation:** The `sb_publishable_xxx` / `sb_secret_xxx` key format for new Supabase projects (post-May 2025) was sourced from a GitHub discussion rather than official documentation. When provisioning the Supabase project, confirm the actual key format and update environment variable names accordingly. The Vercel Marketplace integration handles this automatically if used.

- **Batch auto-mapping timeout budget:** The existing codebase mentions 30-60s for AI analysis. The precise duration of the batch auto-mapping endpoint (which processes 25+ requirements sequentially) under real data volumes is unknown. If this endpoint approaches 300s, the async job queue pattern becomes mandatory. Validate against a real Supabase + Vercel deployment with representative data before committing to the streaming architecture for that endpoint.

- **Drizzle vs. Supabase JS client split for serverless writes:** Research recommends using Supabase JS client for all client-side reads and Drizzle ORM only for serverless function complex writes/admin operations. The exact boundary — which write operations need Drizzle and which can use `supabase.from().insert/update/delete()` — should be evaluated table by table during Phase 4 migration. The default should be Supabase JS client; Drizzle is the exception for genuinely complex multi-step transactions.

- **Node 22.x vs. 24.x on Vercel:** The research recommends Node 22.x (LTS) over 24.x (new default) for compatibility with existing dependencies. This should be validated before final deployment configuration by checking whether the existing dependency set (especially any native modules) has known incompatibilities with 24.x.

---

## Sources

### Primary (HIGH confidence)

**Supabase official documentation (all verified 2026-02-19):**
- [github.com/supabase/supabase-js releases](https://github.com/supabase/supabase-js/releases) — v2.97.0 confirmed as latest
- [supabase.com/docs/guides/auth/passwords](https://supabase.com/docs/guides/auth/passwords) — email/password auth
- [supabase.com/docs/guides/auth/auth-hooks](https://supabase.com/docs/guides/auth/auth-hooks) — Custom Access Token hook, Free/Pro availability
- [supabase.com/docs/guides/database/postgres/row-level-security](https://supabase.com/docs/guides/database/postgres/row-level-security) — RLS policies
- [supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac) — JWT custom claims, Auth Hook pattern
- [supabase.com/docs/guides/database/drizzle](https://supabase.com/docs/guides/database/drizzle) — `{ prepare: false }` requirement
- [supabase.com/docs/guides/database/connecting-to-postgres](https://supabase.com/docs/guides/database/connecting-to-postgres) — pooler modes, port 6543 vs 5432
- [supabase.com/docs/guides/storage/security/access-control](https://supabase.com/docs/guides/storage/security/access-control) — storage.objects RLS
- [supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl](https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl) — signed upload URL pattern
- [supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) — RLS N+1 pattern and `0003_auth_rls_initplan` lint
- [supabase.com/docs/guides/troubleshooting/disabling-prepared-statements-qL8lEL](https://supabase.com/docs/guides/troubleshooting/disabling-prepared-statements-qL8lEL) — prepared statements on pooler

**Vercel official documentation (all verified 2026-02-19):**
- [vercel.com/docs/frameworks/frontend/vite](https://vercel.com/docs/frameworks/frontend/vite) — SPA routing config, Vite detection
- [vercel.com/docs/functions](https://vercel.com/docs/functions) — Node.js runtime, Fluid Compute
- [vercel.com/docs/functions/limitations](https://vercel.com/docs/functions/limitations) — 4.5 MB body limit, 300s/800s timeout limits
- [vercel.com/docs/functions/runtimes/node-js/node-js-versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions) — 20.x, 22.x, 24.x supported
- [vercel.com/docs/frameworks/backend/express](https://vercel.com/docs/frameworks/backend/express) — Express default export pattern
- [vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions) — signed URL pattern recommendation
- [vercel.com/marketplace/supabase](https://vercel.com/marketplace/supabase) — Marketplace integration, auto env var sync
- [npm: @vercel/node v5.6.5](https://www.npmjs.com/package/@vercel/node) — confirmed current version

**Drizzle ORM official documentation:**
- [orm.drizzle.team/docs/rls](https://orm.drizzle.team/docs/rls) — Row Level Security, two-client pattern
- [orm.drizzle.team/docs/get-started/supabase-existing](https://orm.drizzle.team/docs/get-started/supabase-existing) — Supabase existing project setup

### Secondary (MEDIUM confidence)

- [github.com/orgs/supabase/discussions/29260](https://github.com/orgs/supabase/discussions/29260) — new `sb_publishable_xxx` API key format for projects post-May 2025
- [github.com/rphlmr/drizzle-supabase-rls](https://github.com/rphlmr/drizzle-supabase-rls) — community implementation of Drizzle + Supabase RLS two-client pattern
- [makerkit.dev/blog/saas/supabase-react-query](https://makerkit.dev/blog/saas/supabase-react-query) — singleton Supabase client pattern with React Query
- [github.com/orgs/supabase/discussions/14576](https://github.com/orgs/supabase/discussions/14576) — RLS performance with Supabase team participation

---

*Research completed: 2026-02-19*
*Ready for roadmap: yes*
