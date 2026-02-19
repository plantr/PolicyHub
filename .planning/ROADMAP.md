# Roadmap: Policy Hub — Supabase + Vercel Migration

## Overview

Migrate Policy Hub from its current Express + PostgreSQL monolith on Replit to Supabase (database, auth, storage) + Vercel (static SPA + serverless functions). Four phases in strict dependency order: foundation first (database schema, auth, RLS security policies), then storage, then the Vercel deployment layer, then the React client migration and legacy cleanup. The app is feature-complete; this migration makes it production-grade and securely multi-tenant.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Supabase Foundation** - Provision Supabase, migrate schema, wire up email/password auth, deploy RLS policies on all 27+ tables
- [ ] **Phase 2: Storage Migration** - Create private PDF bucket, write storage.objects RLS policies, implement signed upload/download URLs
- [x] **Phase 3: Vercel Deployment** - Deploy SPA and serverless functions to Vercel, configure connection pooling, AI timeouts, and environment variables
- [ ] **Phase 4: Client Migration + Cleanup** - Replace Express API calls with Supabase client reads, build auth UI, remove all Replit/Passport/S3 legacy code

## Phase Details

### Phase 1: Supabase Foundation
**Goal**: The Supabase project is live with the full schema, working email/password auth, and RLS enforced on every table — the security foundation everything else depends on
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, RLS-01, RLS-02, RLS-03, RLS-04, RLS-05, RLS-06
**Success Criteria** (what must be TRUE):
  1. A user can sign up with email/password, receive a confirmation email, and log in — session persists across browser refresh
  2. A user can reset a forgotten password via email link
  3. An admin can assign a user to a business unit with a specific role (admin/editor/viewer) and that assignment appears in the user's JWT claims on next login
  4. All 27+ database tables have Row Level Security enabled — the query `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false` returns zero rows
  5. A user in business unit A cannot read, write, or delete records belonging to business unit B
**Plans:** 4/4 plans complete
- [x] 01-01-PLAN.md — Schema migration + Drizzle driver switch (postgres.js with prepare:false)
- [x] 01-02-PLAN.md — Enable RLS on all 33 tables + Custom Access Token Hook
- [x] 01-03-PLAN.md — RLS policies for all 33 tables (BU-scoped, reference, special, audit)
- [x] 01-04-PLAN.md — Supabase client setup, auth configuration, SMTP, end-to-end verification

### Phase 2: Storage Migration
**Goal**: PDFs can be uploaded to and downloaded from a private Supabase Storage bucket with business-unit-scoped access, replacing the existing S3 and local file storage
**Depends on**: Phase 1
**Requirements**: STOR-01, STOR-02, STOR-03, STOR-04, STOR-05, STOR-06
**Success Criteria** (what must be TRUE):
  1. A user can upload a PDF document and the file lands in Supabase Storage under the correct business-unit folder path
  2. A user can download a PDF they have access to via a signed URL that expires
  3. A user cannot download a PDF belonging to a different business unit (storage.objects RLS blocks access)
  4. A PDF larger than 6 MB uploads successfully via the TUS resumable protocol
**Plans:** 1/2 plans executed
- [ ] 02-01-PLAN.md — Storage bucket SQL migrations + RLS policies + Supabase Storage service module
- [ ] 02-02-PLAN.md — Replace S3 routes with Supabase Storage signed URLs + client-side TUS upload utility

### Phase 3: Vercel Deployment
**Goal**: The React SPA and serverless functions are deployed and running on Vercel with correct environment configuration, connection pooling, and AI timeout settings
**Depends on**: Phase 1
**Requirements**: DEPL-01, DEPL-02, DEPL-03, DEPL-04, DEPL-05, DEPL-06, FUNC-01, FUNC-02, FUNC-03, FUNC-04
**Success Criteria** (what must be TRUE):
  1. The React app loads at the Vercel production URL and client-side routing works for all routes without 404s on page refresh
  2. AI analysis endpoints respond correctly under the Vercel Functions runtime with no timeout errors for typical analysis workloads
  3. Environment variables (Supabase URL, anon key, service role key, Anthropic key) are available in the correct context — VITE_ prefixed vars accessible client-side, secret vars server-side only
  4. Preview deployments are created automatically for each branch/PR
**Plans:** 3/3 plans complete
- [x] 03-01-PLAN.md — Vercel project configuration + Express server adaptation (vercel.json, vite.config.ts, server/index.ts, .env.example)
- [x] 03-02-PLAN.md — AI background job queue + polling infrastructure (ai_jobs table, dispatch-and-fire endpoints, useAiJob hook)
- [x] 03-03-PLAN.md — Build validation + Vercel deployment verification checkpoint

### Phase 4: Client Migration + Cleanup
**Goal**: The React frontend reads data directly from Supabase, auth flows through Supabase Auth UI, and all Replit, Passport.js, and S3 legacy code is removed from the codebase
**Depends on**: Phase 2, Phase 3
**Requirements**: CLNT-01, CLNT-02, CLNT-03, CLNT-04, CLNT-05, CLNP-01, CLNP-02, CLNP-03, CLNP-04, CLNP-05, CLNP-06
**Success Criteria** (what must be TRUE):
  1. A user can log in, browse documents, and view data — all served via direct Supabase client queries (no Express GET endpoints in the request chain)
  2. Login, signup, and password reset UI components work end-to-end using Supabase Auth
  3. The codebase contains no references to `.replit`, `server/replit_integrations/`, `passport`, `express-session`, `server/s3.ts`, or multer for file uploads
  4. The Express server entry point is removed or refactored — `npm run dev` starts via Vercel CLI or Vite directly, not via `server/index.ts`
**Plans:** 4 plans
- [ ] 04-01-PLAN.md — Auth UI + route protection + session management
- [ ] 04-02-PLAN.md — Migrate read operations to direct Supabase client queries
- [ ] 04-03-PLAN.md — Break Express into individual Vercel serverless functions
- [ ] 04-04-PLAN.md — Remove legacy code (Replit, Passport, S3, multer) + README

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Supabase Foundation | 4/4 | Complete    | 2026-02-19 |
| 2. Storage Migration | 1/2 | In Progress|  |
| 3. Vercel Deployment | 3/3 | Complete | 2026-02-19 |
| 4. Client Migration + Cleanup | 0/4 | Not started | - |
