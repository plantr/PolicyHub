# Phase 3: Vercel Deployment - Context

**Gathered:** 2026-02-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Deploy the React SPA and serverless functions to Vercel with correct environment configuration, connection pooling, and AI timeout settings. This phase moves the app from Replit to Vercel — it does NOT change client-side data fetching patterns (Phase 4) or add new features.

</domain>

<decisions>
## Implementation Decisions

### Serverless function structure
- Mirror all existing Express routes as Vercel Serverless Functions — Phase 4 removes the ones replaced by direct Supabase client calls
- Shared middleware wrapper vs self-contained functions: Claude's discretion based on existing Express middleware patterns
- Function file organization (one per route vs grouped by domain): Claude's discretion based on codebase analysis
- Local dev experience (vercel dev vs Vite + proxy): Claude's discretion based on most practical setup

### AI endpoint timeout strategy
- Background job + polling pattern for AI analysis endpoints — do NOT use streaming or extended maxDuration
- Job queue implementation (Supabase Edge Function, Vercel Cron, DB table): Claude's discretion — research best approach for Vercel + Supabase
- User sees progress indicator with status updates while waiting (e.g., "Analyzing page 3 of 12...")
- AI job error handling (auto-retry vs immediate error): Claude's discretion based on failure modes

### Build & project layout
- Phase includes full Vercel setup from scratch: CLI install, project creation, linking
- Function file location (top-level api/ vs server/ directory): Claude's discretion based on Vercel best practices
- Vite build config changes: Claude's discretion — determine what adjustments are needed
- Custom domain vs default vercel.app URL: Claude's discretion based on availability

### Environment & preview deploys
- Manual env var configuration in Vercel dashboard — do NOT use Supabase Marketplace integration
- Preview deployments sharing same vs separate Supabase project: Claude's discretion based on data risk trade-off
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

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User wants a production-ready Vercel deployment with working AI analysis via background jobs, and clear env var documentation via .env.example.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-vercel-deployment*
*Context gathered: 2026-02-19*
