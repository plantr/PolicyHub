# Requirements: Policy Hub — Platform Migration

**Defined:** 2026-02-19
**Core Value:** Get Policy Hub running on Supabase + Vercel with business-unit-scoped access control

## v1 Requirements

Requirements for initial deployment to Supabase + Vercel. Each maps to roadmap phases.

### Infrastructure

- [ ] **INFRA-01**: PostgreSQL database provisioned on Supabase with schema migrated from Drizzle definitions
- [ ] **INFRA-02**: Transaction-mode connection pooling (port 6543) configured for serverless function access
- [ ] **INFRA-03**: Drizzle ORM configured with `prepare: false` for pooler compatibility
- [ ] **INFRA-04**: Separate direct connection URL (port 5432) configured for Drizzle Kit migrations
- [ ] **INFRA-05**: Custom SMTP provider configured for Supabase Auth emails (default 2/hour is insufficient)

### Authentication

- [ ] **AUTH-01**: User can sign up with email and password via Supabase Auth
- [ ] **AUTH-02**: User receives email confirmation after signup
- [ ] **AUTH-03**: User can reset password via email link
- [ ] **AUTH-04**: User session persists across browser refresh via Supabase JS auto-refresh
- [ ] **AUTH-05**: Custom Access Token Hook injects business unit IDs and role into JWT from `app_metadata`
- [ ] **AUTH-06**: Admin can assign users to business units with specific roles (admin/editor/viewer)

### Authorization (RLS)

- [ ] **RLS-01**: Row Level Security enabled on all database tables (27+)
- [ ] **RLS-02**: RLS policies scope data access by business unit using JWT claims from `app_metadata`
- [ ] **RLS-03**: Anonymous (unauthenticated) access blocked on all tables
- [ ] **RLS-04**: Service role bypass available for serverless functions (AI endpoints, admin operations)
- [ ] **RLS-05**: RLS policies use inverted query pattern to avoid N+1 performance degradation
- [ ] **RLS-06**: All tables verified via `pg_tables WHERE rowsecurity = false` query returns zero rows

### Storage

- [ ] **STOR-01**: Private Supabase Storage bucket created for PDF documents
- [ ] **STOR-02**: Server-generated signed upload URLs allow client to upload PDFs directly to Supabase Storage
- [ ] **STOR-03**: Signed download URLs generated for authenticated PDF access
- [ ] **STOR-04**: RLS policies on `storage.objects` scope PDF access by business unit
- [ ] **STOR-05**: Resumable uploads via TUS protocol enabled for PDFs over 6 MB
- [ ] **STOR-06**: Existing S3 upload/download code in `server/s3.ts` replaced with Supabase Storage equivalents

### Deployment

- [ ] **DEPL-01**: React SPA deployed to Vercel with production build
- [ ] **DEPL-02**: `vercel.json` configured with SPA rewrites for Wouter client-side routing
- [ ] **DEPL-03**: Environment variables set in Vercel (Supabase URL, anon key, service role key, Anthropic API key)
- [ ] **DEPL-04**: Client-side env vars use `VITE_` prefix for Vite build exposure
- [ ] **DEPL-05**: Preview deployments enabled per branch/PR
- [ ] **DEPL-06**: Supabase Marketplace integration installed to auto-populate env vars

### Serverless Functions

- [ ] **FUNC-01**: AI analysis endpoints migrated to Vercel Serverless Functions (Node 22.x runtime)
- [ ] **FUNC-02**: `maxDuration` configured for long-running AI calls (Anthropic API)
- [ ] **FUNC-03**: Serverless functions use Supabase service role client for database access
- [ ] **FUNC-04**: Serverless functions use pooled connection string (port 6543) for Drizzle queries

### Client Migration

- [ ] **CLNT-01**: Supabase JS client initialized as singleton with anon key for frontend queries
- [ ] **CLNT-02**: Read operations (list/get) migrated from API calls to direct Supabase client queries
- [ ] **CLNT-03**: Write operations with business logic validation use serverless functions
- [ ] **CLNT-04**: React Query cache invalidation updated for Supabase auth state changes
- [ ] **CLNT-05**: Login/signup/password reset UI components built using Supabase Auth

### Cleanup

- [ ] **CLNP-01**: Replit-specific code removed (`.replit`, `server/replit_integrations/`, Vite plugins)
- [ ] **CLNP-02**: Passport.js and express-session packages and configuration removed
- [ ] **CLNP-03**: AWS S3 integration (`server/s3.ts`, multer config) removed
- [ ] **CLNP-04**: Express server entry point (`server/index.ts`) refactored or removed
- [ ] **CLNP-05**: Hardcoded port 5000 and Replit-specific environment detection removed
- [ ] **CLNP-06**: Node.js engine pinned to 22.x in package.json (Vercel compatibility)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Authentication

- **AUTH-07**: User can sign in with Google SSO via Supabase Auth
- **AUTH-08**: MFA/TOTP second factor for enhanced compliance security

## Out of Scope

| Feature | Reason |
|---------|--------|
| Supabase Edge Functions | 25s timeout too short for AI calls; Vercel Functions used instead |
| Supabase Realtime | No real-time collaboration requirements; React Query polling sufficient |
| Mobile app | Web-first deployment |
| AI feature changes | Working as-is; changes planned for separate milestone |
| Data migration | No production data exists yet |
| Keeping Express server | Replaced by Supabase client + Vercel Serverless Functions |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | — | Pending |
| INFRA-02 | — | Pending |
| INFRA-03 | — | Pending |
| INFRA-04 | — | Pending |
| INFRA-05 | — | Pending |
| AUTH-01 | — | Pending |
| AUTH-02 | — | Pending |
| AUTH-03 | — | Pending |
| AUTH-04 | — | Pending |
| AUTH-05 | — | Pending |
| AUTH-06 | — | Pending |
| RLS-01 | — | Pending |
| RLS-02 | — | Pending |
| RLS-03 | — | Pending |
| RLS-04 | — | Pending |
| RLS-05 | — | Pending |
| RLS-06 | — | Pending |
| STOR-01 | — | Pending |
| STOR-02 | — | Pending |
| STOR-03 | — | Pending |
| STOR-04 | — | Pending |
| STOR-05 | — | Pending |
| STOR-06 | — | Pending |
| DEPL-01 | — | Pending |
| DEPL-02 | — | Pending |
| DEPL-03 | — | Pending |
| DEPL-04 | — | Pending |
| DEPL-05 | — | Pending |
| DEPL-06 | — | Pending |
| FUNC-01 | — | Pending |
| FUNC-02 | — | Pending |
| FUNC-03 | — | Pending |
| FUNC-04 | — | Pending |
| CLNT-01 | — | Pending |
| CLNT-02 | — | Pending |
| CLNT-03 | — | Pending |
| CLNT-04 | — | Pending |
| CLNT-05 | — | Pending |
| CLNP-01 | — | Pending |
| CLNP-02 | — | Pending |
| CLNP-03 | — | Pending |
| CLNP-04 | — | Pending |
| CLNP-05 | — | Pending |
| CLNP-06 | — | Pending |

**Coverage:**
- v1 requirements: 38 total
- Mapped to phases: 0
- Unmapped: 38

---
*Requirements defined: 2026-02-19*
*Last updated: 2026-02-19 after initial definition*
