# External Integrations

**Analysis Date:** 2026-02-19

## APIs & External Services

**AI Analysis & Chat:**
- Anthropic Claude API - Core compliance analysis and conversational AI
  - SDK/Client: `@anthropic-ai/sdk` v0.77.0
  - Auth: `process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY`
  - Base URL: `process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL` (optional override)
  - Models used: `claude-sonnet-4-5` (balanced), `claude-opus-4-5` (most capable), `claude-haiku-4-5` (fastest)
  - Streaming: Implemented via SSE (Server-Sent Events)
  - Usage locations:
    - `server/replit_integrations/chat/routes.ts` - Conversational chat interface
    - `server/routes.ts` - AI-powered requirement coverage analysis
    - `server/replit_integrations/batch/utils.ts` - Batch processing utilities

## Data Storage

**Databases:**
- PostgreSQL (via `@aws-sdk/client-s3` compatibility)
  - Connection: `process.env.DATABASE_URL` (required)
  - Client: `pg` v8.16.3 for native PostgreSQL
  - ORM: Drizzle ORM v0.39.3
  - Migration Tool: Drizzle Kit v0.31.8
  - Config: `drizzle.config.ts` - Points to `shared/schema.ts`
  - Dialect: postgresql

**File Storage:**
- Local filesystem only (simulated S3 interface)
  - Implementation: `server/s3.ts` provides S3-like abstraction
  - Storage location: `data/uploads/` directory
  - File structure: `policies/{documentId}/versions/{versionId}/{timestamp}_{fileName}`
  - Max file size: 50MB (via multer configuration in `server/routes.ts`)
  - Supported formats: PDF only
  - Functions: `uploadToS3()`, `deleteFromS3()`, `getLocalFilePath()`

**Caching:**
- None detected (in-memory session store only via `memorystore`)

## Authentication & Identity

**Auth Provider:**
- Custom local authentication
  - Implementation: Passport + Passport Local strategy
  - Session management: Express-session v1.18.1
  - Storage: In-memory store via `memorystore` v1.6.7
  - Note: In-memory storage means sessions are lost on server restart (development only)

**Session Configuration:**
- Express-session with connect-pg-simple for PostgreSQL (package present but not fully implemented in current codebase)

## Monitoring & Observability

**Error Tracking:**
- None detected (custom error handling only)

**Logs:**
- Console-based logging via `console.log()` and `console.error()`
- Request logging in `server/index.ts`:
  - HTTP method, path, status code, duration (ms)
  - JSON response body capture for `/api` endpoints
  - Formatted timestamps

## CI/CD & Deployment

**Hosting:**
- Replit platform (inferred from configuration and Replit Vite plugins)
  - Environment detection: `process.env.REPL_ID`
  - Port: Fixed to 5000 (only non-firewalled port)
  - Host binding: 0.0.0.0 with reusePort enabled

**CI Pipeline:**
- Not detected (no GitHub Actions, GitLab CI, or other pipeline files found)

## Environment Configuration

**Required env vars:**
- `DATABASE_URL` - PostgreSQL connection string (critical)
- `AI_INTEGRATIONS_ANTHROPIC_API_KEY` - Anthropic API key for AI features (required for analysis endpoints)
- `NODE_ENV` - Set to "development" or "production" (dev: `tsx server/index.ts`)

**Optional env vars:**
- `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` - Override Anthropic API endpoint
- `PORT` - Server port (defaults to 5000)
- `REPL_ID` - Replit detection flag (triggers special dev plugins)

**Secrets location:**
- Environment variables only (no secrets file detected)
- Must be set via environment or `.env` file (not committed to git)

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- None detected

## API Endpoints & Route Structure

**Prefix:** `/api`

**Authentication Routes:**
- Session-based (Passport) - implementation present in packages but routes not visible in current route registration

**Business Units:**
- `GET /api/business-units` - List all business units
- `GET /api/business-units/:id` - Get single business unit
- `POST /api/business-units` - Create business unit
- `PUT /api/business-units/:id` - Update business unit
- `PUT /api/business-units/:id/archive` - Archive business unit

**Regulatory Sources & Requirements:**
- `GET /api/regulatory-sources` - List sources
- `POST /api/regulatory-sources` - Create source
- `PUT /api/regulatory-sources/:id` - Update source
- `DELETE /api/regulatory-sources/:id` - Delete source
- `GET /api/requirements` - List requirements
- `GET /api/requirements/:id` - Get single requirement
- `POST /api/requirements` - Create requirement
- `PUT /api/requirements/:id` - Update requirement
- `DELETE /api/requirements/:id` - Delete requirement

**Documents & Versions:**
- `GET /api/documents` - List documents
- `POST /api/documents` - Create with PDF upload (multipart/form-data)
- `GET /api/documents/:id` - Get single document
- `PUT /api/documents/:id` - Update document
- `DELETE /api/documents/:id` - Delete document
- `GET /api/document-versions` - List all versions
- `GET /api/documents/:id/versions` - List versions for document
- `POST /api/documents/:id/versions` - Create new version with PDF
- `PUT /api/document-versions/:id` - Update version metadata
- `PUT /api/document-versions/:id/status` - Update document status
- `POST /api/document-versions/:id/pdf` - Upload/update PDF
- `GET /api/document-versions/:id/pdf/download` - Download PDF
- `DELETE /api/document-versions/:id/pdf` - Delete PDF

**AI Analysis Endpoints:**
- `POST /api/requirements/:id/ai-match/:mappingId` - Single document coverage analysis
  - Input: requirement ID, mapping ID
  - Output: AI match score (0-100), rationale, recommendations
  - Uses Anthropic Claude Sonnet model
- `POST /api/requirements/:id/ai-coverage` - Combined multi-document analysis
  - Input: requirement ID
  - Output: Combined coverage score, cross-document gap analysis
  - Implements floor rule: combined score >= highest individual score

**Gap Analysis:**
- `POST /api/gap-analysis/auto-match` - Automatic requirement-document matching
- `GET /api/gap-analysis/refresh` - Recalculate gap analysis across all requirements

**Conversations (Chat):**
- `GET /api/conversations` - List all conversations
- `GET /api/conversations/:id` - Get conversation with messages
- `POST /api/conversations` - Create new conversation
- `DELETE /api/conversations/:id` - Delete conversation
- `POST /api/conversations/:id/messages` - Send message with streaming AI response
  - Streaming protocol: Server-Sent Events (text/event-stream)
  - Response format: `{data: {content: string} | {done: true} | {error: string}}`

**Other Routes:**
- Requirement mappings, findings, audits, users, reviews, commitments, knowledge base, risks, admin records
- File evidence uploads for findings

---

*Integration audit: 2026-02-19*
