# PolicyHub - Policy Management SaaS

## Overview

PolicyHub is a regulated-grade, multi-entity policy management platform designed for fintech groups. It enables organizations to author, version, approve, and evidence policies across multiple jurisdictions (UK, Gibraltar, Estonia/EU). The platform provides a single system of record for policies, standards, procedures, and evidence with strong governance controls including ownership tracking, review cadence management, approval workflows, attestations, and immutable audit trails.

Key capabilities include:
- Multi-entity (Business Unit) management with regulatory profiles per jurisdiction
- Document lifecycle management (policies, standards, procedures) with versioning and approval workflows
- Regulatory requirements library with source instrument tracking
- Requirement-to-document mapping and gap analysis
- Findings/remediation tracking with evidence capture
- Audit tracking (internal, external, regulatory, thematic, follow-up) with status lifecycle
- Immutable audit trail for all governance actions
- Dashboard with analytics charts and compliance metrics

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side router)
- **State Management**: TanStack React Query for server state; React context for UI state (theme)
- **UI Components**: shadcn/ui component library (new-york style) built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Charts**: Recharts for dashboard analytics visualizations
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Build Tool**: Vite with React plugin
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

The frontend uses a sidebar layout (`AppSidebar`) with pages for Dashboard, Documents, Document Detail, Requirements, Regulatory Sources, Gap Analysis, Findings, and Audit Trail. API calls go through a centralized `apiRequest` helper and React Query's `queryFn` pattern.

### Backend Architecture
- **Runtime**: Node.js with TypeScript (tsx for dev, esbuild for production)
- **Framework**: Express 5
- **API Pattern**: RESTful JSON API under `/api/` prefix
- **Route Definition**: Routes are defined in `shared/routes.ts` with Zod schemas for type safety, implemented in `server/routes.ts`
- **Storage Layer**: `server/storage.ts` defines an `IStorage` interface abstracting all database operations, with a concrete implementation using Drizzle ORM
- **Dev Server**: Vite dev server middleware for HMR during development
- **Production**: Static file serving from `dist/public` with SPA fallback

### Data Storage
- **Database**: PostgreSQL (required via `DATABASE_URL` environment variable)
- **ORM**: Drizzle ORM with `drizzle-zod` for schema-to-validation integration
- **Schema Location**: `shared/schema.ts` (shared between client and server)
- **Migrations**: Drizzle Kit with `db:push` command for schema synchronization
- **Connection**: `pg` Pool via `server/db.ts`
- **Session Store**: `connect-pg-simple` available for session persistence

### Database Schema (Key Tables)
- `business_units` - Legal entities/operating units with jurisdiction and activity types
- `regulatory_profiles` - Links business units to regulatory sources with enablement flags
- `regulatory_sources` - Legislation and regulatory instruments (e.g., FCA rules, MiCA)
- `requirements` - Individual obligation statements derived from regulatory sources
- `documents` - Policy documents with metadata (type, taxonomy, owner, review dates, status)
- `document_versions` - Version history for documents with status tracking and PDF attachment metadata (S3 key, filename, size)
- `addenda` - Business unit-specific additions/overrides to documents
- `effective_policies` - Links documents to business units with effective dates
- `approvals` - Approval records for documents/versions
- `audit_log` - Immutable record of all system actions
- `review_history` - Document review tracking
- `requirement_mappings` - Maps requirements to documents with coverage status (Covered/Partially Covered/Not Covered)
- `findings` - Compliance findings with severity, status, and due dates
- `finding_evidence` - Evidence attachments for findings
- `policy_links` - Relationships between policy documents
- `audits` - Internal/external compliance audit records with type, status, dates, and ratings
- `users` - System users with roles, departments, business unit assignments, and status
- `entity_types`, `roles`, `jurisdictions`, `document_categories`, `finding_severities` - Administration reference tables

### Shared Code
The `shared/` directory contains code used by both frontend and backend:
- `schema.ts` - Drizzle table definitions, insert schemas (via `drizzle-zod`), and TypeScript types
- `routes.ts` - API route definitions with paths and Zod response schemas

### Build System
- **Development**: `tsx server/index.ts` with Vite middleware for HMR
- **Production Build**: Custom `script/build.ts` that runs Vite build for client and esbuild for server, outputting to `dist/`
- **Server Bundle**: esbuild bundles select dependencies (allowlist) to reduce cold start syscalls; others are external

## External Dependencies

### Database
- **PostgreSQL** - Primary data store, connected via `DATABASE_URL` environment variable. Required for the application to start.

### Key NPM Packages
- **drizzle-orm** + **drizzle-kit** - ORM and migration tooling for PostgreSQL
- **express** v5 - HTTP server framework
- **@tanstack/react-query** - Server state management
- **zod** + **drizzle-zod** - Runtime validation and schema generation
- **recharts** - Dashboard chart components
- **wouter** - Client-side routing
- **shadcn/ui** (Radix UI primitives) - Full component library
- **connect-pg-simple** - PostgreSQL session store
- **date-fns** - Date formatting utilities

### Replit-Specific Integrations
- `@replit/vite-plugin-runtime-error-modal` - Runtime error overlay in development
- `@replit/vite-plugin-cartographer` - Dev tooling (dev only)
- `@replit/vite-plugin-dev-banner` - Dev banner (dev only)