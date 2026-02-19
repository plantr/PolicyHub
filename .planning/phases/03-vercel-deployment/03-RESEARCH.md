# Phase 3: Vercel Deployment - Research

**Researched:** 2026-02-19
**Domain:** Vercel deployment, serverless functions, background job queue, SPA routing
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Serverless function structure:**
- Mirror all existing Express routes as Vercel Serverless Functions — Phase 4 removes the ones replaced by direct Supabase client calls

**AI endpoint timeout strategy:**
- Background job + polling pattern for AI analysis endpoints — do NOT use streaming or extended maxDuration
- User sees progress indicator with status updates while waiting (e.g., "Analyzing page 3 of 12...")

**Build and project layout:**
- Phase includes full Vercel setup from scratch: CLI install, project creation, linking

**Environment and preview deploys:**
- Manual env var configuration in Vercel dashboard — do NOT use Supabase Marketplace integration
- Anthropic API key available in ALL environments (preview + production)
- Create .env.example with all required vars, comments explaining each, and where to find values

### Claude's Discretion

- Serverless function file organization and middleware patterns
- Local development setup approach
- Job queue technology for AI background processing
- AI error handling strategy (retry behavior)
- Function file directory location
- Vite build pipeline adjustments needed
- Custom domain setup (if domain available)
- Preview deployment database isolation strategy

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DEPL-01 | React SPA deployed to Vercel with production build | Vite build outputs to `dist/public`; vercel.json sets outputDirectory and buildCommand |
| DEPL-02 | vercel.json configured with SPA rewrites for Wouter client-side routing | Verified: `rewrites: [{ source: "/(.*)", destination: "/index.html" }]` but MUST exclude `/api/` prefix |
| DEPL-03 | Environment variables set in Vercel (Supabase URL, anon key, service role key, Anthropic API key) | Manual dashboard configuration; 5 vars identified from codebase audit |
| DEPL-04 | Client-side env vars use VITE_ prefix for Vite build exposure | Already in use: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY confirmed in codebase |
| DEPL-05 | Preview deployments enabled per branch/PR | Enabled by default when Git repo connected; no extra config needed |
| DEPL-06 | Supabase Marketplace integration installed to auto-populate env vars | **CONFLICT: user decision overrides this requirement** — manual env var config is locked decision; ignore DEPL-06 |
| FUNC-01 | AI analysis endpoints migrated to Vercel Serverless Functions (Node 22.x runtime) | Recommended: single Express app as one Vercel function via Express framework preset, not individual files |
| FUNC-02 | maxDuration configured for long-running AI calls (Anthropic API) | NOT applicable with background job pattern — AI does not run synchronously; standard function duration is sufficient for the job-dispatch endpoint |
| FUNC-03 | Serverless functions use Supabase service role client for database access | Already implemented in server/lib/supabase-admin.ts; pattern carries forward unchanged |
| FUNC-04 | Serverless functions use pooled connection string (port 6543) for Drizzle queries | Already in server/db.ts: `postgres(process.env.DATABASE_URL, { prepare: false })`; DATABASE_URL must use port 6543 |
</phase_requirements>

---

## Summary

The app currently runs as a monolithic Replit app: Express handles all API routes + serves the Vite SPA in production. On Vercel, the deployment splits naturally: the SPA becomes static CDN output and the Express server becomes a single Vercel serverless function (not 113 individual files).

**Key architectural insight:** Vercel natively supports deploying an Express app as a single serverless function. The app exports a default Express instance, Vercel wraps it, and all `/api/*` routes are handled by that function. This is far simpler than migrating each route to individual `api/*.ts` files and avoids the path alias problem (`@shared/*` imports) that plagues individual serverless function files.

The three AI endpoints (`/api/gap-analysis/ai-match/:mappingId`, `/api/requirements/:id/ai-coverage`, `/api/documents/:id/ai-map-controls`) are the only timed-out risk. The user decision mandates a background job + polling pattern, which means these endpoints will immediately enqueue a job row in a Supabase `ai_jobs` table and return a job ID. The client polls for status updates. This eliminates the timeout concern entirely.

**Primary recommendation:** Deploy the Express server as a single Vercel function using the Express framework preset, build the Vite SPA with `npm run build` → output to `dist/public`, serve static assets from there, and implement the background job queue using a Supabase DB table with a `ai_jobs` table polled by the client via existing Supabase real-time or REST.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vercel CLI | latest | Project creation, linking, local dev, deployment | Official Vercel tooling |
| @vercel/node | bundled | TypeScript support for serverless functions | Official Vercel Node.js runtime types |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @vercel/functions | latest | `waitUntil()` helper, geolocation helpers | Only if fire-and-forget background processing is used instead of DB job queue |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Single Express function | 113 individual `api/*.ts` files | Individual files break `@shared/*` path aliases; massive migration surface; more error surface |
| Supabase DB job queue | Vercel Cron + DB polling | Both valid; DB queue is simpler (no cron schedule lag), Cron has 1-min minimum on Pro |
| Supabase DB job queue | Inngest | Inngest adds a third-party dependency; overkill for 3 AI endpoints |
| `vercel dev` for local dev | Vite dev server + Vite proxy | `vercel dev` better replicates production environment; Vite proxy is simpler but requires proxy config |

**Installation:**
```bash
npm install -g vercel
```

---

## Architecture Patterns

### Recommended Project Structure

```
/ (repo root)
├── api/                     # DO NOT CREATE — Express approach uses none
├── client/                  # existing — Vite SPA
│   ├── index.html
│   └── src/
├── server/                  # existing — Express server
│   ├── index.ts             # CRITICAL: must export Express app as default
│   ├── routes.ts
│   ├── db.ts
│   └── lib/
│       └── supabase-admin.ts
├── shared/                  # existing — shared types/routes
├── dist/                    # generated by build
│   └── public/              # Vite build output (SPA static assets)
├── vercel.json              # NEW: Vercel configuration
├── .env.example             # NEW: all required env vars documented
└── package.json             # MODIFY: add engines.node
```

### Pattern 1: Express App as Single Vercel Function

**What:** Vercel detects the Express framework and wraps the app as a single serverless function. All API routes are handled by one function. The SPA static assets are served separately from the CDN.

**When to use:** When the codebase is an Express app and migrating to individual functions would be extremely costly.

**How Vercel detects it:** Looks for `server.{js,ts}`, `app.{js,ts}`, or `index.{js,ts}` in root or `src/` that imports and exports Express as default.

**Current blocker:** `server/index.ts` currently calls `httpServer.listen()` directly and does NOT export the app. It must be modified to conditionally listen (for local dev) and export the app as a default export.

**Example (server/index.ts modification needed):**
```typescript
// Source: https://vercel.com/docs/frameworks/backend/express
import express from "express";
import { registerRoutes } from "./routes";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ... middleware setup ...

(async () => {
  await registerRoutes(httpServer, app);

  app.use(errorHandler);

  if (process.env.NODE_ENV !== "production" || process.env.IS_LOCAL) {
    const port = parseInt(process.env.PORT || "5000", 10);
    httpServer.listen({ port, host: "0.0.0.0" }, () => {
      console.log(`serving on port ${port}`);
    });
  }
})();

// Vercel requires the default export
export default app;
```

**IMPORTANT NUANCE:** The IIFE async initialization (registering routes via `await registerRoutes()`) is a problem for Vercel's function model. Vercel calls the exported handler synchronously. The routes must be registered synchronously OR the async setup must complete before any requests are served. Options:
1. Make `registerRoutes` synchronous (preferred — it currently has no truly async setup, just route registration)
2. Use a top-level await pattern (requires `"type": "module"` but current build uses CJS)
3. Lazy initialization pattern: register routes on first request

**Recommended:** Convert route registration to synchronous and remove the IIFE wrapper.

### Pattern 2: vercel.json Configuration for SPA + Express

**What:** The `vercel.json` tells Vercel how to route requests. API requests go to the Express function; all other requests serve the SPA index.html.

**Critical ordering:** The `api/` path must be handled by the function BEFORE the SPA catch-all rewrite applies. Vercel's filesystem and function routing takes precedence over rewrites automatically — but only if the Express function is the root function.

**Example:**
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "npm run build",
  "outputDirectory": "dist/public",
  "rewrites": [
    {
      "source": "/((?!api/).*)",
      "destination": "/index.html"
    }
  ],
  "functions": {
    "server/index.ts": {
      "maxDuration": 60
    }
  }
}
```

**Alternative SPA rewrite if above pattern conflicts:**
```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "/api/:path*" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**NOTE:** With Vercel's Express integration, the routing is simpler than individual `api/*.ts` files. The Express app handles everything under `/api/`. The static assets from `dist/public/` are served by Vercel's CDN automatically.

### Pattern 3: Background Job Queue for AI Endpoints

**What:** Instead of running AI analysis synchronously (which risks Vercel's function timeout), endpoints immediately create a job record in a Supabase `ai_jobs` table and return a job ID. The client polls for status.

**Why this pattern vs alternatives:**
- No Vercel Cron needed (avoids 1-min minimum frequency on Pro, daily-only on Hobby)
- No third-party queue service (Inngest, etc.)
- Works with existing Supabase infrastructure
- Simple to implement and debug

**Database schema (new migration needed):**
```sql
CREATE TABLE ai_jobs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  job_type text NOT NULL,  -- 'ai-match', 'ai-coverage', 'ai-map-controls'
  entity_id integer NOT NULL,  -- mappingId, requirementId, or documentId
  status text NOT NULL DEFAULT 'pending',  -- 'pending', 'processing', 'completed', 'failed'
  progress_message text,  -- "Analyzing page 3 of 12..."
  result jsonb,  -- stored result data on completion
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Endpoint pattern (dispatch, returns immediately):**
```typescript
// POST /api/gap-analysis/ai-match/:mappingId
// Returns job ID immediately, does NOT wait for AI
app.post("/api/gap-analysis/ai-match/:mappingId", async (req, res) => {
  const mappingId = Number(req.params.mappingId);
  // Validate mapping exists
  const mapping = await db.select()...
  if (!mapping) return res.status(404).json({ message: "Mapping not found" });

  // Create job record
  const job = await db.insert(aiJobs).values({
    jobType: 'ai-match',
    entityId: mappingId,
    status: 'pending',
  }).returning();

  // Kick off processing — fire and forget
  // DO NOT await this
  processAiMatchJob(job[0].id, mappingId).catch(err => {
    console.error('AI job processing error:', err);
  });

  res.json({ jobId: job[0].id, status: 'pending' });
});
```

**Job processor pattern (runs within same Vercel function invocation):**
```typescript
async function processAiMatchJob(jobId: string, mappingId: number) {
  await db.update(aiJobs).set({ status: 'processing', progressMessage: 'Starting analysis...' })
    .where(eq(aiJobs.id, jobId));

  try {
    // ... existing Anthropic API call logic ...
    const result = await anthropic.messages.create({ ... });

    await db.update(aiJobs).set({
      status: 'completed',
      result: { aiMatchScore, aiMatchRationale, aiMatchRecommendations },
      progressMessage: 'Analysis complete',
    }).where(eq(aiJobs.id, jobId));

    // Also update the requirement mapping
    await db.update(requirementMappings).set({ ... }).where(eq(requirementMappings.id, mappingId));
  } catch (err) {
    await db.update(aiJobs).set({
      status: 'failed',
      errorMessage: err.message,
    }).where(eq(aiJobs.id, jobId));
  }
}
```

**Polling endpoint:**
```typescript
// GET /api/ai-jobs/:jobId
app.get("/api/ai-jobs/:jobId", async (req, res) => {
  const job = await db.select().from(aiJobs)
    .where(eq(aiJobs.id, req.params.jobId))
    .then(r => r[0]);
  if (!job) return res.status(404).json({ message: "Job not found" });
  res.json(job);
});
```

**Client polling pattern (React hook example):**
```typescript
// Poll every 2 seconds until completed or failed
const { data: job } = useQuery({
  queryKey: ['ai-job', jobId],
  queryFn: () => fetch(`/api/ai-jobs/${jobId}`).then(r => r.json()),
  refetchInterval: (data) =>
    data?.status === 'completed' || data?.status === 'failed' ? false : 2000,
  enabled: !!jobId,
});
```

**NOTE ON FUNCTION TIMEOUT WITH FIRE-AND-FORGET:** The fire-and-forget pattern means the AI processing function will continue running after the HTTP response is sent. On Vercel with Fluid Compute enabled (default for new projects as of April 2025), functions have a default maxDuration of 300s (5 minutes). The existing AI analysis code for `ai-map-controls` iterates over batches and can take several minutes. The background pattern means the *dispatch* endpoint returns instantly, and the *processing* happens inside the same function invocation asynchronously. This works because Vercel's Fluid Compute keeps the function alive until background tasks complete (up to maxDuration). This requires the Vercel account to be on Pro for >60s tasks, or the processing must be fast enough for Hobby's 300s limit.

### Pattern 4: Environment Variable Configuration

**Client-side (VITE_ prefix required):**
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
```

**Server-side only (NO VITE_ prefix, never exposed to client):**
```
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://...@...supabase.com:6543/postgres
AI_INTEGRATIONS_ANTHROPIC_API_KEY=sk-ant-...
```

**Vercel environment assignment:**
- `VITE_SUPABASE_URL` → Production, Preview, Development
- `VITE_SUPABASE_PUBLISHABLE_KEY` → Production, Preview, Development
- `SUPABASE_SERVICE_ROLE_KEY` → Production, Preview (same Supabase project; risk is preview data mixing, which is acceptable for v1)
- `DATABASE_URL` → Production, Preview (both point to same Supabase project)
- `AI_INTEGRATIONS_ANTHROPIC_API_KEY` → Production, Preview (user decision: all environments)

**NOTE on DEPL-06 conflict:** The phase requirements list DEPL-06 as "Supabase Marketplace integration installed to auto-populate env vars." This directly contradicts the locked user decision: "Manual env var configuration in Vercel dashboard — do NOT use Supabase Marketplace integration." DEPL-06 should be treated as superseded by the context decision. The planner should note this conflict and document the override.

### Pattern 5: Vite Build Configuration Changes

**Current vite.config.ts issues for Vercel:**
1. Imports Replit-specific plugins (`@replit/vite-plugin-runtime-error-modal`, `@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner`) — must be made conditional
2. `root` is set to `./client` — means `vite build` outputs to `dist/public` (relative to project root) which matches vercel.json `outputDirectory: "dist/public"` — this is already correct
3. No proxy configuration for local dev (only relevant if using Vite dev server instead of vercel dev)

**Required change to vite.config.ts:**
```typescript
// Remove/guard Replit plugins
plugins: [
  react(),
  // Only load in Replit environment
  ...(process.env.REPL_ID
    ? [
        runtimeErrorOverlay(),
        // cartographer, devBanner only in non-prod Replit
      ]
    : []),
],
```

**Build pipeline (existing script/build.ts is NOT needed for Vercel):**
- Vercel runs its own build: `npm run build` (currently runs `tsx script/build.ts`)
- That script does: Vite build + esbuild for server → `dist/index.cjs`
- For Vercel Express framework, the build only needs the Vite SPA build
- The Express server is handled natively by Vercel — no esbuild step needed
- Consider updating `package.json` build script for Vercel or using `vercel.json buildCommand: "npx vite build"`

**Recommended: separate build scripts:**
```json
{
  "scripts": {
    "build": "npx vite build",
    "build:replit": "tsx script/build.ts",
    "dev": "NODE_ENV=development tsx server/index.ts"
  }
}
```

### Anti-Patterns to Avoid

- **113 individual api/*.ts files:** Do not create one serverless function per Express route. This breaks `@shared/*` path aliases (Vercel Node.js runtime explicitly does not support tsconfig path mappings), creates massive migration surface, and is unnecessary given Vercel's native Express support.
- **VITE_ prefixed server secrets:** Never prefix `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, or `AI_INTEGRATIONS_ANTHROPIC_API_KEY` with `VITE_`. Vite inlines `VITE_*` vars into the client bundle, which would expose secrets.
- **Synchronous AI calls in Vercel functions:** The existing `ai-map-controls` endpoint loops through batches of requirements with multiple sequential Anthropic API calls. Running this synchronously in a Vercel function risks timeouts even at 300s on Hobby. Always dispatch to background job.
- **Direct DB connection (port 5432) in serverless:** Serverless functions create many transient connections. Always use Supabase's transaction mode pooler (port 6543) with `prepare: false` — already configured in `server/db.ts`.
- **Using `import.meta.env.VITE_*` in server code:** Server-side code runs in Node.js, not a Vite context. Only client-side code (inside `client/src/`) should use `import.meta.env`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SPA routing 404s | Custom redirect logic | `rewrites` in vercel.json | One line; handles all edge cases |
| Express-to-Vercel function adapter | Custom wrapper | Vercel's native Express support | Built-in since early 2025; just export app as default |
| Job status storage | In-memory Map or Redis | Supabase `ai_jobs` table | Already have Supabase; serverless functions don't share memory across invocations |
| Background job polling | WebSockets | HTTP polling with react-query `refetchInterval` | Simpler, works with existing patterns in the codebase |
| Environment variable management | Custom dotenv tooling | Vercel dashboard + `vercel env pull` | Standard workflow; `vercel env pull` syncs to local `.env` |

**Key insight:** Vercel's native Express support eliminates the most complex part of this migration. The path alias problem that would affect 113 individual function files becomes irrelevant.

---

## Common Pitfalls

### Pitfall 1: IIFE Async Initialization Pattern

**What goes wrong:** `server/index.ts` uses an async IIFE to call `await registerRoutes()`. When Vercel imports the Express app for its function wrapper, the default export (`app`) is returned before routes are registered.

**Why it happens:** Vercel's Express integration expects a ready-to-use Express app as the default export. The async IIFE means routes are registered asynchronously after the export occurs.

**How to avoid:** Make route registration synchronous (it currently has no async work in the registration itself — the async parts are inside route handlers, not during registration). Remove the IIFE, call `registerRoutes` synchronously.

**Warning signs:** 404 for all `/api/*` routes in production; routes work locally (where the IIFE completes before any request hits).

### Pitfall 2: Replit Plugins in Vite Config Fail the Build

**What goes wrong:** `@replit/vite-plugin-runtime-error-modal` is imported unconditionally. On Vercel's build environment, this import might fail or cause unexpected behavior.

**Why it happens:** Replit-specific packages may not be available or may behave differently outside Replit.

**How to avoid:** Guard all Replit imports behind `process.env.REPL_ID` checks (already partially done for `cartographer` and `devBanner`, but `runtimeErrorOverlay` is unconditional).

**Warning signs:** Vercel build fails with module resolution errors for `@replit/*` packages.

### Pitfall 3: SPA Catch-All Overwrites API Routes

**What goes wrong:** A naive `rewrites: [{ source: "/(.*)", destination: "/index.html" }]` redirects ALL requests including `/api/*` to index.html.

**Why it happens:** The rewrite rule matches before Vercel's function routing in some configurations.

**How to avoid:** When using Vercel's Express framework integration, the function handles `/api/*` routes and the rewrite applies to everything else. Use a negative lookahead pattern: `source: "/((?!api/).*)"` to exclude API paths from the SPA rewrite. Or rely on the fact that Vercel function routes take precedence over rewrites for paths the function handles.

**Warning signs:** API requests in browser return HTML (the index.html content) instead of JSON.

### Pitfall 4: DEPL-06 Conflict (Supabase Marketplace)

**What goes wrong:** The original requirements include DEPL-06 (Supabase Marketplace integration), but the user's locked decision in CONTEXT.md explicitly says "Manual env var configuration — do NOT use Supabase Marketplace integration."

**Why it happens:** Requirements were written before the discussion phase.

**How to avoid:** Planner must explicitly mark DEPL-06 as superseded by context decision. Tasks should use manual env var setup only.

### Pitfall 5: AI Job Processing Timeout on Hobby Plan

**What goes wrong:** The `ai-map-controls` endpoint processes documents against all unmapped requirements in 25-requirement batches, making multiple sequential Anthropic API calls. On a large policy with many requirements, this could take 3-5 minutes.

**Why it happens:** Hobby plan maxDuration is 300s (5 min) with Fluid Compute enabled, but the background job runs within the same function invocation as the dispatch endpoint.

**How to avoid:** The fire-and-forget approach sends the HTTP response immediately (the dispatch returns the job ID). The processing continues async. Vercel's Fluid Compute will keep the function alive to complete background tasks up to maxDuration. For very large documents, the existing batch processing (25 reqs per batch) helps stay within limits.

**Warning signs:** Long AI jobs silently fail with no error in the job record; job stays in `processing` state permanently.

### Pitfall 6: DATABASE_URL Must Use Port 6543

**What goes wrong:** Using the direct connection URL (port 5432) causes connection exhaustion in serverless environments because each function invocation opens a new connection.

**Why it happens:** The direct connection doesn't pool connections. Supabase's transaction mode pooler (port 6543) multiplexes connections efficiently.

**How to avoid:** Ensure `DATABASE_URL` in Vercel env vars uses `aws-0-eu-west-1.pooler.supabase.com:6543` with `prepare: false` in the postgres client (already configured in `server/db.ts` — just verify the env var uses the right URL).

**Warning signs:** `max_connections` errors in Supabase logs; connection timeout errors.

---

## Code Examples

Verified patterns from official sources:

### vercel.json for Express + Vite SPA

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "npx vite build",
  "outputDirectory": "dist/public",
  "rewrites": [
    {
      "source": "/((?!api/).*)",
      "destination": "/index.html"
    }
  ]
}
```

Note: `buildCommand` overrides the `npm run build` script for Vercel. The Express server is handled automatically by framework detection. No `functions` configuration needed unless setting `maxDuration`.

Source: https://vercel.com/docs/frameworks/backend/express + https://vercel.com/docs/frameworks/frontend/vite

### server/index.ts Vercel-Compatible Export

```typescript
// Source: https://vercel.com/docs/frameworks/backend/express
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: false }));

// Logging middleware
app.use((req, res, next) => { /* ... */ next(); });

// Register routes synchronously
registerRoutes(httpServer, app);

// Error handler
app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ message: err.message || "Internal Server Error" });
});

// Local dev: listen on port; production Vercel: export app
if (!process.env.VERCEL) {
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen({ port, host: "0.0.0.0" }, () => {
    console.log(`serving on port ${port}`);
  });
}

export default app;
```

### Vercel Node.js Version Configuration

```json
// package.json
{
  "engines": {
    "node": "22.x"
  }
}
```

Source: https://vercel.com/docs/functions/runtimes/node-js/node-js-versions (verified: Node 22.x is available)

### VercelRequest/VercelResponse Types (if individual functions are used)

```typescript
// Source: https://vercel.com/docs/functions/runtimes/node-js
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(request: VercelRequest, response: VercelResponse) {
  const { body, query, cookies } = request;
  response.status(200).json({ body, query, cookies });
}
```

### Environment Variable Access Pattern

```typescript
// Server-side (Node.js process.env):
const anthropicKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const databaseUrl = process.env.DATABASE_URL;

// Client-side (Vite inlines VITE_ prefixed vars at build time):
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
```

### ai_jobs Table DDL

```sql
-- New migration required
CREATE TABLE ai_jobs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  job_type text NOT NULL CHECK (job_type IN ('ai-match', 'ai-coverage', 'ai-map-controls')),
  entity_id integer NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  progress_message text,
  result jsonb,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX ai_jobs_status_idx ON ai_jobs(status);
CREATE INDEX ai_jobs_entity_idx ON ai_jobs(job_type, entity_id);

-- Enable RLS if needed (for preview deployment isolation)
ALTER TABLE ai_jobs ENABLE ROW LEVEL SECURITY;
```

### .env.example Contents

```bash
# =============================================
# SUPABASE — Client-side (safe to expose)
# =============================================
# Found in: Supabase Dashboard > Project Settings > API > Project URL
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co

# Found in: Supabase Dashboard > Project Settings > API > anon (public) key
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...

# =============================================
# SUPABASE — Server-side only (NEVER expose to client)
# =============================================
# Found in: Supabase Dashboard > Project Settings > API > service_role key
# WARNING: This key bypasses Row Level Security. Keep secret.
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# =============================================
# DATABASE — Supabase pooler (transaction mode, port 6543)
# =============================================
# Found in: Supabase Dashboard > Project Settings > Database > Connection string
# Use the "Transaction" mode URL (port 6543, NOT 5432)
# Required: The URL must include ?sslmode=require or use the pooler format
DATABASE_URL=postgresql://postgres.xxxxx:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres

# =============================================
# AI — Anthropic Claude
# =============================================
# Found in: https://console.anthropic.com/account/keys
AI_INTEGRATIONS_ANTHROPIC_API_KEY=sk-ant-api03-...

# =============================================
# OPTIONAL — Anthropic base URL (for proxies/testing)
# =============================================
# Leave blank to use the default Anthropic API endpoint
# AI_INTEGRATIONS_ANTHROPIC_BASE_URL=
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 10s default maxDuration (no Fluid) | 300s default with Fluid Compute enabled by default | April 2025 | AI background jobs can run much longer without maxDuration config |
| Individual api/*.ts files per route | Express app as single function via framework preset | Early 2025 | Massively simpler migration path; no path alias problems |
| `routes` in vercel.json for SPA | `rewrites` in vercel.json | ~2022 but still commonly misunderstood | Modern approach is `rewrites`, not legacy `routes` with `"handle": "filesystem"` |
| Manual connection pooling config | Built-in Fluid Compute connection reuse | 2024-2025 | Less connection overhead for serverless; but Supabase pgbouncer still preferred |
| Supabase Realtime for job updates | HTTP polling with react-query | N/A (both valid) | Polling is simpler; Realtime requires Supabase client subscription setup |

**Deprecated/outdated:**
- `"handle": "filesystem"` in `routes`: Use `rewrites` instead. The filesystem-first behavior is the default.
- `"version": 2` in vercel.json: Not needed, legacy field.
- Individual function files for Express routes: Vercel now has native Express support.

---

## Open Questions

1. **Will the IIFE async pattern in server/index.ts cause route registration timing issues?**
   - What we know: `registerRoutes()` is declared `async` (returns `Promise<Server>`) but internally does synchronous route registration; the `async` is vestigial from earlier versions
   - What's unclear: Whether any route registration in `registerRoutes` truly awaits async work
   - Recommendation: Audit `registerRoutes` to confirm it can be made synchronous, then refactor the IIFE away

2. **Does Vercel's Express framework preset handle TypeScript `@shared/*` path aliases correctly?**
   - What we know: Vercel's Node.js runtime explicitly does NOT support tsconfig path mappings in individual function files; the Express preset uses a different code path
   - What's unclear: Whether the Express framework preset's compilation step resolves path aliases via tsconfig
   - Recommendation: Test a local `vercel build` early; if aliases fail, the esbuild build step from `script/build.ts` can be repurposed to pre-bundle with alias resolution

3. **Should preview deployments use the same Supabase project?**
   - What we know: User said Claude's discretion; using same project means preview branches can corrupt/pollute production data
   - What's unclear: How much data risk exists in practice (this is an internal compliance tool, likely low stakes for data mixing in v1)
   - Recommendation: Use the same Supabase project for all environments in v1. Create a separate Supabase project only if data integrity between preview and production becomes a concern.

4. **For the ai-map-controls batch processing — does fire-and-forget reliably complete before Vercel kills the function?**
   - What we know: Fluid Compute keeps functions alive up to maxDuration (300s on Hobby, 800s on Pro) for background tasks; existing code processes documents with 25 requirements per batch
   - What's unclear: Actual duration of the longest realistic analysis job
   - Recommendation: Add timing instrumentation to the existing AI code path during development to measure realistic durations before committing to this pattern

---

## Sources

### Primary (HIGH confidence)
- `https://vercel.com/docs/frameworks/backend/express` — Express on Vercel, single-function deployment pattern, verified Feb 2026
- `https://vercel.com/docs/project-configuration/vercel-json` — Full vercel.json reference, rewrites, functions config, verified Feb 2026
- `https://vercel.com/docs/functions/configuring-functions/duration` — maxDuration limits table (Hobby 300s, Pro 800s with Fluid), verified Feb 2026
- `https://vercel.com/docs/functions/runtimes/node-js/node-js-versions` — Node 22.x available; default is 24.x as of Feb 2026, verified Feb 2026
- `https://vercel.com/docs/frameworks/frontend/vite` — Vite SPA rewrites, VITE_ env vars, verified Feb 2026
- `https://vercel.com/docs/environment-variables` — Environment variable scoping (Production/Preview/Development), verified Feb 2026
- `https://vercel.com/docs/cron-jobs/usage-and-pricing` — Cron limits (Hobby: daily only; Pro: per-minute), verified Feb 2026
- `https://supabase.com/docs/guides/database/connecting-to-postgres` — Direct vs pooler connection, port 6543 for serverless, prepare:false requirement, verified Feb 2026

### Secondary (MEDIUM confidence)
- `https://www.jigz.dev/blogs/how-i-solved-background-jobs-using-supabase-tables-and-edge-functions` — Supabase DB table job queue pattern, verified against Supabase docs
- `https://zackproser.com/blog/how-to-run-background-jobs-on-vercel-without-a-queue` — Fire-and-forget background job pattern on Vercel
- Codebase audit: `server/routes.ts`, `server/db.ts`, `server/index.ts`, `server/lib/supabase-admin.ts`, `vite.config.ts`, `package.json`, `.env`

### Tertiary (LOW confidence)
- WebSearch community findings on path alias support in Vercel Express framework preset — not officially documented, needs validation with `vercel build`

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All Vercel docs verified directly Feb 2026
- Architecture — Express single function: HIGH — Official Vercel Express docs, verified Feb 2026
- Architecture — Background job queue: MEDIUM — Pattern verified from community sources + Supabase docs; implementation details need confirmation
- Architecture — Build pipeline: MEDIUM — Inferred from Vercel/Vite docs; needs testing with `vercel build`
- Pitfalls — IIFE async init: MEDIUM — Pattern observed in codebase; Vercel behavior with async setup not explicitly documented
- Pitfalls — Path aliases: MEDIUM — Official docs say no support in individual functions; unclear for Express preset

**Research date:** 2026-02-19
**Valid until:** 2026-03-19 (Vercel changes frequently; re-verify maxDuration table and Express preset behavior)
