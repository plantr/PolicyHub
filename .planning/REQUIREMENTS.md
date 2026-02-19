# Requirements: Policy Hub — Platform Migration

**Defined:** 2026-02-19
**Core Value:** Get Policy Hub running on Supabase + Vercel with business-unit-scoped access control

## v1 Requirements

Requirements for initial deployment to Supabase + Vercel. Each maps to roadmap phases.

### Infrastructure

- [x] **INFRA-01**: PostgreSQL database provisioned on Supabase with schema migrated from Drizzle definitions
- [x] **INFRA-02**: Transaction-mode connection pooling (port 6543) configured for serverless function access
- [x] **INFRA-03**: Drizzle ORM configured with `prepare: false` for pooler compatibility
- [x] **INFRA-04**: Separate direct connection URL (port 5432) configured for Drizzle Kit migrations
- [x] **INFRA-05**: Custom SMTP provider configured for Supabase Auth emails (default 2/hour is insufficient)

### Authentication

- [x] **AUTH-01**: User can sign up with email and password via Supabase Auth
- [x] **AUTH-02**: User receives email confirmation after signup
- [x] **AUTH-03**: User can reset password via email link
- [x] **AUTH-04**: User session persists across browser refresh via Supabase JS auto-refresh
- [x] **AUTH-05**: Custom Access Token Hook injects business unit IDs and role into JWT from `app_metadata`
- [x] **AUTH-06**: Admin can assign users to business units with specific roles (admin/editor/viewer)

### Authorization (RLS)

- [x] **RLS-01**: Row Level Security enabled on all database tables (27+)
- [x] **RLS-02**: RLS policies scope data access by business unit using JWT claims from `app_metadata`
- [x] **RLS-03**: Anonymous (unauthenticated) access blocked on all tables
- [x] **RLS-04**: Service role bypass available for serverless functions (AI endpoints, admin operations)
- [x] **RLS-05**: RLS policies use inverted query pattern to avoid N+1 performance degradation
- [x] **RLS-06**: All tables verified via `pg_tables WHERE rowsecurity = false` query returns zero rows

### Storage

- [x] **STOR-01**: Private Supabase Storage bucket created for PDF documents
- [x] **STOR-02**: Server-generated signed upload URLs allow client to upload PDFs directly to Supabase Storage
- [x] **STOR-03**: Signed download URLs generated for authenticated PDF access
- [x] **STOR-04**: RLS policies on `storage.objects` scope PDF access by business unit
- [x] **STOR-05**: Resumable uploads via TUS protocol enabled for PDFs over 6 MB
- [x] **STOR-06**: Existing S3 upload/download code in `server/s3.ts` replaced with Supabase Storage equivalents

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
| INFRA-01 | Phase 1 | Complete |
| INFRA-02 | Phase 1 | Complete |
| INFRA-03 | Phase 1 | Complete |
| INFRA-04 | Phase 1 | Complete |
| INFRA-05 | Phase 1 | Complete |
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Complete |
| AUTH-05 | Phase 1 | Complete |
| AUTH-06 | Phase 1 | Complete |
| RLS-01 | Phase 1 | Complete |
| RLS-02 | Phase 1 | Complete |
| RLS-03 | Phase 1 | Complete |
| RLS-04 | Phase 1 | Complete |
| RLS-05 | Phase 1 | Complete |
| RLS-06 | Phase 1 | Complete |
| STOR-01 | Phase 2 | Complete |
| STOR-02 | Phase 2 | Complete |
| STOR-03 | Phase 2 | Complete |
| STOR-04 | Phase 2 | Complete |
| STOR-05 | Phase 2 | Complete |
| STOR-06 | Phase 2 | Complete |
| DEPL-01 | Phase 3 | Pending |
| DEPL-02 | Phase 3 | Pending |
| DEPL-03 | Phase 3 | Pending |
| DEPL-04 | Phase 3 | Pending |
| DEPL-05 | Phase 3 | Pending |
| DEPL-06 | Phase 3 | Pending |
| FUNC-01 | Phase 3 | Pending |
| FUNC-02 | Phase 3 | Pending |
| FUNC-03 | Phase 3 | Pending |
| FUNC-04 | Phase 3 | Pending |
| CLNT-01 | Phase 4 | Pending |
| CLNT-02 | Phase 4 | Pending |
| CLNT-03 | Phase 4 | Pending |
| CLNT-04 | Phase 4 | Pending |
| CLNT-05 | Phase 4 | Pending |
| CLNP-01 | Phase 4 | Pending |
| CLNP-02 | Phase 4 | Pending |
| CLNP-03 | Phase 4 | Pending |
| CLNP-04 | Phase 4 | Pending |
| CLNP-05 | Phase 4 | Pending |
| CLNP-06 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 44 total
- Mapped to phases: 44
- Unmapped: 0

---
*Requirements defined: 2026-02-19*
*Last updated: 2026-02-19 after roadmap creation — all 44 requirements mapped*
