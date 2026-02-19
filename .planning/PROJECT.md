# Policy Hub — Platform Migration

## What This Is

A policy and compliance management platform for organizations to manage documents, requirements, risks, findings, and audit trails across business units. Currently built as a full-stack TypeScript app (Express + React + PostgreSQL) on Replit, being migrated to Supabase and Vercel for production-grade infrastructure.

## Core Value

Get the existing Policy Hub running on Supabase + Vercel with proper authentication and business-unit-scoped access control, so it can be used in production.

## Requirements

### Validated

<!-- Existing capabilities already built and working. -->

- ✓ Document management with versioning — existing
- ✓ PDF upload and storage — existing
- ✓ Requirements management and mapping — existing
- ✓ Risk register and risk actions — existing
- ✓ Findings and evidence tracking — existing
- ✓ Business unit management — existing
- ✓ Dashboard with analytics — existing
- ✓ AI-powered document analysis (Anthropic API) — existing
- ✓ Audit trail logging — existing
- ✓ Users and roles management UI — existing
- ✓ 27+ page components with full CRUD — existing

### Active

<!-- New work for this migration. -->

- [ ] Database hosted on Supabase PostgreSQL
- [ ] PDF storage migrated from S3 to Supabase Storage
- [ ] Authentication via Supabase Auth (email/password)
- [ ] Business-unit-scoped role-based access control (admin/editor/viewer per business unit)
- [ ] Row Level Security policies on all tables
- [ ] React frontend deployed to Vercel
- [ ] AI analysis endpoints running as Vercel Serverless Functions
- [ ] Direct Supabase client for read operations from frontend
- [ ] Serverless functions for writes requiring business logic validation
- [ ] Replit-specific code and dependencies removed

### Out of Scope

- Google SSO — deferred to post-v1, will add to Supabase Auth later
- Mobile app — web only
- Changes to AI analysis features — working as-is, changes planned for later
- Data migration — no production data exists yet
- Real-time/WebSocket features — not needed for v1

## Context

The app is currently a monolithic Express server that serves both the API and React frontend on a single port. Key architectural changes for this migration:

- **Express to serverless**: The 2000+ line `routes.ts` with 50+ endpoints needs to be split. Simple CRUD goes through the Supabase client directly; complex logic (AI, validation) becomes Vercel Serverless Functions.
- **S3 to Supabase Storage**: `server/s3.ts` handles PDF upload/download/delete via AWS SDK. This moves to Supabase Storage with similar operations.
- **No auth to Supabase Auth**: Passport.js is in dependencies but not wired up. Supabase Auth replaces it entirely with email/password for v1.
- **Open access to RLS**: Currently all API routes are publicly accessible. RLS policies will enforce business-unit-scoped permissions at the database level.
- **Replit cleanup**: `server/replit_integrations/`, `.replit` config, Replit-specific Vite plugins, and hardcoded port 5000 need removal.

Existing shared schema (`shared/schema.ts`) with 27+ Drizzle table definitions will need to be migrated to Supabase SQL migrations. The Drizzle ORM can still be used in serverless functions.

## Constraints

- **Auth**: Email/password only for v1 — no OAuth providers yet
- **Tech stack**: Supabase (database, storage, auth) + Vercel (frontend, serverless) — no additional services
- **Existing schema**: 27+ tables with established relationships — schema structure stays, hosting moves
- **AI dependency**: Anthropic API key required for analysis features — stored as Vercel environment variable

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase for database + storage + auth | Single platform for backend services, built-in RLS for access control | — Pending |
| Vercel for frontend + serverless | Natural fit for React apps, serverless for AI endpoints | — Pending |
| Direct Supabase client for reads | Simplifies architecture, reduces serverless function count | — Pending |
| Serverless functions for complex writes | Business logic validation and AI calls need server-side execution | — Pending |
| Email/password auth for v1 | Google SSO requires additional setup, email/password gets us shipping faster | — Pending |
| Business-unit-scoped RBAC via RLS | Permissions enforced at database level, not application level | — Pending |

---
*Last updated: 2026-02-19 after initialization*
