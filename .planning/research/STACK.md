# Stack Research

**Domain:** Full-stack TypeScript SaaS migration — Supabase + Vercel platform
**Researched:** 2026-02-19
**Confidence:** HIGH (all core recommendations verified against official documentation and npm release data)

---

## Context

This research covers only the **new platform layer** being introduced in the migration. The existing application stack (React 18, Vite, Tailwind, Radix UI, React Query, Drizzle ORM, Zod, Wouter, Anthropic SDK) is retained as-is. Research scope is limited to:

1. Supabase client libraries (database, storage, auth)
2. Vercel deployment configuration and serverless functions
3. Integration tooling between the two platforms

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@supabase/supabase-js` | 2.97.0 | Unified client for Supabase database, auth, storage, realtime | The single isomorphic library covering all Supabase surface areas; actively released (7 releases in Feb 2026 alone); replaces `pg` direct connection for client-facing queries |
| `@supabase/ssr` | latest | Cookie-based auth session management across browser/server boundary | Required when API functions need to verify the authenticated user; exports `createBrowserClient` (React) and `createServerClient` (Vercel Functions). Not needed for pure client-only SPAs without server-side auth validation |
| Vercel CLI (`vercel`) | latest (npm global) | Deploy, preview, local dev, env management | Standard deployment tool; `vercel dev` replicates the production environment locally including `/api` function routing |
| `@vercel/node` | 5.6.5 | TypeScript types for Vercel Node.js functions (`VercelRequest`, `VercelResponse`) | Provides type safety for the `/api` directory functions used for AI proxying; avoids shipping secrets to client |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `postgres` | latest | Low-level PostgreSQL driver (replaces `pg`) | Required by Drizzle ORM when connecting to Supabase via connection pooler. The `postgres` (postgres.js) driver is what Drizzle's `drizzle-orm/postgres-js` adapter uses |
| `drizzle-orm` | 0.39.3 (already installed) | ORM for type-safe database queries against Supabase Postgres | No change needed — Drizzle works directly against Supabase's Postgres with one config tweak: `{ prepare: false }` for transaction-mode pooling |
| `drizzle-kit` | 0.31.8 (already installed) | Migration generation and execution | Migrations run against Supabase's direct connection URL (not the pooler), so they need a separate `DATABASE_URL_DIRECT` env var |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vercel CLI (`npx vercel dev`) | Local development server that mirrors production | Serves Vite frontend + `/api` functions together; use instead of `npm run dev` during API development |
| Supabase CLI (`supabase`) | Local Supabase stack (Postgres, auth, storage, edge functions) | Optional but recommended for testing RLS policies and migrations locally before pushing to hosted Supabase |
| `vercel env pull .env.local` | Pulls production env vars locally | Standard workflow to sync Supabase credentials from Vercel to local `.env.local` without manual copying |

---

## Vercel Deployment Configuration

### Project Structure for Vite + API Functions

```
Policy-Hub/
├── client/          # Vite React app (existing)
├── api/             # NEW: Vercel serverless functions
│   ├── analyze.ts   # AI analysis endpoint (Anthropic API)
│   └── [other AI-heavy endpoints]
├── server/          # Express server (removed after migration)
├── shared/          # Unchanged
├── vercel.json      # NEW: SPA routing + function config
└── package.json
```

### `vercel.json` Configuration

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "vite build",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "functions": {
    "api/*.ts": {
      "maxDuration": 60
    }
  }
}
```

**Why this structure:** The `/api/(.*) → /api/$1` rewrite must come before the SPA catch-all. Without it, all routes including API routes resolve to `index.html`. The `maxDuration: 60` is appropriate for AI analysis endpoints that call Anthropic (Pro plan supports up to 800s; Hobby caps at 300s).

### Node.js Version

Set in `package.json` to match Vercel's available versions:

```json
{
  "engines": {
    "node": "22.x"
  }
}
```

**Why 22.x not 24.x:** Node 24.x is the new default as of early 2026 but may introduce breaking changes with existing dependencies. Node 22.x is LTS and stable. Both are supported. Verify compatibility before using 24.x.

**Note:** The existing codebase was developed with Node 25.x (local). Vercel does not support 25.x. Pin to 22.x for compatibility.

### Environment Variable Strategy

Vercel requires the `VITE_` prefix for any variable that must be accessible in client-side bundle code:

| Variable Name | Where Used | Notes |
|--------------|-----------|-------|
| `VITE_SUPABASE_URL` | React client | Public — safe to expose |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | React client | Public — replaces old `anon` key for new projects |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel Functions only | Secret — never prefix with `VITE_` |
| `DATABASE_URL` | Vercel Functions + Drizzle | Transaction-mode pooler URL (port 6543) |
| `DATABASE_URL_DIRECT` | Drizzle Kit migrations only | Direct connection URL (port 5432) — used in `drizzle.config.ts` |
| `AI_INTEGRATIONS_ANTHROPIC_API_KEY` | Vercel Functions only | Secret — keep as-is, no `VITE_` prefix |

**Supabase Vercel Marketplace Integration:** The official Supabase integration in the Vercel marketplace automatically injects 13 environment variables including `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and Postgres connection strings. Use this integration to avoid manual credential management.

---

## Supabase Client Configuration

### Database Connection (Drizzle)

```typescript
// server/db.ts (or api/lib/db.ts for Vercel Functions)
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Transaction-mode pooler (port 6543) — for serverless/API functions
const client = postgres(process.env.DATABASE_URL!, { prepare: false });
export const db = drizzle({ client });
```

**Why `{ prepare: false }`:** Supabase's transaction-mode connection pooler (PgBouncer on port 6543) does not support PostgreSQL prepared statements. Omitting this flag causes `prepared statement does not exist` errors in production.

### Drizzle Kit Migration Config

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './shared/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // Direct connection (port 5432) — prepared statements work for migrations
    url: process.env.DATABASE_URL_DIRECT!,
  },
});
```

**Why two URLs:** Drizzle Kit migrations use prepared statements internally and require a direct connection. The application runtime uses the pooler URL for serverless-compatible connection handling.

### Auth Client (React)

For a pure SPA (no SSR), use `@supabase/supabase-js` directly:

```typescript
// client/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);
```

Only add `@supabase/ssr` with `createBrowserClient` if Vercel Functions need to verify the user's session server-side (i.e., the function needs to call `supabase.auth.getUser()` with the user's JWT from cookies).

### RBAC with Custom JWT Claims

Supabase's RBAC pattern for business-unit scoping:

1. Store roles in `user_roles` and `role_permissions` tables (existing schema can be adapted)
2. Use a **Custom Access Token Hook** (Supabase Auth Hook) to inject `business_unit_id` and `role` into the JWT on login
3. Write RLS policies that read `auth.jwt() ->> 'business_unit_id'` to scope queries
4. Policy example:
   ```sql
   CREATE POLICY "users_see_own_bu_documents"
   ON documents FOR SELECT
   USING (business_unit_id = (auth.jwt() ->> 'business_unit_id')::uuid);
   ```

This replaces the current application-level authorization (which is not enforced) with database-enforced RLS.

---

## Installation

```bash
# Core Supabase client libraries
npm install @supabase/supabase-js

# Only if Vercel Functions need server-side auth validation
npm install @supabase/ssr

# Replace 'pg' package with postgres.js (Drizzle postgres-js adapter)
npm install postgres
npm uninstall pg

# Dev tooling
npm install -D vercel @vercel/node

# Global tools (run once)
npm install -g vercel
npm install -g supabase
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `@supabase/supabase-js` direct | Drizzle ORM against Supabase via `postgres` driver | Use Drizzle for complex server-side queries in Vercel Functions; use supabase-js client for auth, storage, and simpler reads. Both can coexist |
| Vercel Functions in `/api` | Keep Express on Railway/Render, proxy from Vercel | Valid if 50+ endpoints are too complex to decompose; but Express on Vercel works (deploy as single function), it just loses per-route scaling |
| `postgres.js` driver | `pg` (node-postgres) | `pg` is not recommended for Drizzle with Supabase pooler — `pg` requires different pooling config and is less actively maintained for this pattern |
| Vercel Marketplace integration | Manual env var setup | Manual is fine but the integration auto-syncs 13 vars across preview/production environments and is the standard pattern |
| `@supabase/ssr` only when needed | `@supabase/ssr` everywhere | Next.js templates default to `@supabase/ssr` for everything; for a pure Vite SPA the base `supabase-js` is sufficient unless server-side session validation is required |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@supabase/auth-helpers-react` | Deprecated package; the entire `auth-helpers-*` family was consolidated into `@supabase/ssr` | `@supabase/ssr` (or just `@supabase/supabase-js` for SPA-only) |
| Supabase `anon` / `service_role` JWT keys on new projects | New projects (post-May 2025) use `sb_publishable_xxx` and `sb_secret_xxx` format by default; legacy keys may not be available | `SUPABASE_PUBLISHABLE_KEY` (replaces anon) and `SUPABASE_SERVICE_ROLE_KEY` (new secret format) |
| `VITE_` prefix on secrets | Any variable prefixed `VITE_` is embedded in the client bundle and visible in browser devtools | Put secrets (Anthropic key, service role key, DATABASE_URL) in unprefixed env vars used only in Vercel Functions |
| Session-mode pooler for serverless | Session pooler keeps connections alive per session — wrong model for stateless serverless functions | Transaction-mode pooler (port 6543) for Vercel Functions |
| Direct connection URL for Vercel Functions | Direct connections don't pool — each function invocation opens a new connection, exhausting Postgres's 60-connection default limit under load | Transaction-mode pooler URL for all runtime database access |
| Deploying the existing Express server verbatim to Vercel | Express can run on Vercel but as a monolithic function; loses per-route cold start optimization and has the 250 MB bundle size constraint to manage | Decompose AI-heavy routes into `/api` functions; migrate auth/data routes to Supabase directly where RLS handles the logic |

---

## Stack Patterns by Variant

**For AI analysis endpoints (Anthropic API calls):**
- Deploy as Vercel Functions in `/api/analyze.ts`
- Set `maxDuration: 60` (or higher if streaming) in `vercel.json`
- Keep `AI_INTEGRATIONS_ANTHROPIC_API_KEY` as a server-side env var (no `VITE_` prefix)
- Because Anthropic calls can take 10-30s, Fluid Compute (enabled by default on Pro) prevents cold start penalties

**For data CRUD endpoints:**
- Migrate to Supabase RLS policies + direct client-side `supabase-js` queries where possible
- This eliminates the API layer entirely for standard read/write operations
- Retain as Vercel Functions only where business logic is too complex for RLS (e.g., multi-step transactions)

**For file storage (replacing S3):**
- Use Supabase Storage with RLS policies on `storage.objects` table
- Storage buckets replace S3 buckets; upload via `supabase.storage.from('bucket').upload(path, file)`
- Access control via RLS is unified with database security (no separate IAM to manage)

**For local development:**
- Run `vercel dev` to get the full Vite + `/api` function environment
- The SPA rewrite in `vercel.json` does NOT work with Vite's own dev server — use `vercel dev` instead of `npm run dev` when working on API functions
- Run `vercel env pull .env.local` to sync credentials from Vercel dashboard

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `@supabase/supabase-js@2.97.0` | Node.js 20+ (dropped 18 in 2.79.0) | Vercel's Node 20.x, 22.x, 24.x all compatible |
| `drizzle-orm@0.39.3` | `postgres@^3.0` (postgres.js) | Switch from `pg` to `postgres` package; `drizzle-orm/postgres-js` adapter |
| `@supabase/ssr` | `@supabase/supabase-js@^2` | Peer dependency; must use same major version |
| `@vercel/node@5.6.5` | TypeScript 5.x | Already on TS 5.6.3 — compatible |
| Vite 7.3.0 | Vercel's Vite framework detection | Vercel auto-detects Vite; no `@vercel/static-build` needed |

---

## Sources

- [GitHub: supabase/supabase-js releases](https://github.com/supabase/supabase-js/releases) — Confirmed v2.97.0 as latest (Feb 18, 2026); HIGH confidence
- [Supabase Docs: Drizzle integration](https://supabase.com/docs/guides/database/drizzle) — Confirmed `{ prepare: false }` requirement for transaction pooler; HIGH confidence
- [Supabase Docs: Connecting to Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres) — Confirmed direct vs session vs transaction modes; HIGH confidence
- [Supabase Docs: Custom Claims & RBAC](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac) — Confirmed Auth Hook + JWT claims pattern; HIGH confidence
- [Supabase Docs: Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control) — Confirmed RLS on `storage.objects`; HIGH confidence
- [Supabase Docs: Creating SSR clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client) — Confirmed SPA uses `supabase-js` directly; `@supabase/ssr` only for SSR boundary; HIGH confidence
- [Supabase Docs: Vercel Marketplace integration](https://supabase.com/docs/guides/integrations/vercel-marketplace) — Confirmed 13 auto-injected env vars; HIGH confidence
- [Supabase API key discussion](https://github.com/orgs/supabase/discussions/29260) — Confirmed new `sb_publishable_xxx` format for projects post-May 2025; MEDIUM confidence (GitHub discussion, not official docs page)
- [Vercel Docs: Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite) — Confirmed SPA rewrite pattern, `/api` directory, `vite-plugin-vercel`; HIGH confidence
- [Vercel Docs: Node.js runtime](https://vercel.com/docs/functions/runtimes/node-js) — Confirmed `/api` directory, TypeScript support, `VercelRequest`/`VercelResponse`; HIGH confidence
- [Vercel Docs: Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions) — Confirmed 20.x, 22.x, 24.x (default) available; HIGH confidence
- [Vercel Docs: Function duration limits](https://vercel.com/docs/functions/configuring-functions/duration) — Confirmed Hobby 300s max, Pro 800s max with Fluid Compute; HIGH confidence
- [npm: @vercel/node](https://www.npmjs.com/package/@vercel/node) — Confirmed v5.6.5 as current version; HIGH confidence

---

*Stack research for: Policy Hub — Supabase + Vercel migration*
*Researched: 2026-02-19*
