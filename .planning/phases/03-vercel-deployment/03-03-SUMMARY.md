---
phase: 03-vercel-deployment
plan: 03
status: complete
started: 2026-02-19
completed: 2026-02-19
duration: 25 min
---

## Summary

Validated the Vercel build pipeline and deployed the Policy Hub to production at https://policy-hub-lovat.vercel.app.

## Self-Check: PASSED

## What Was Built

**Task 1: Build validation** — Ran `npx vite build` locally; SPA output lands in `dist/public/` with index.html + JS/CSS bundles. No server secrets leaked into client bundle. TypeScript compilation clean for the function entry point.

**Task 2: Vercel deployment + verification** — Deployed to Vercel production. SPA loads, client-side routing works on refresh (no 404s), API endpoints return JSON from the Supabase database.

## Key Decisions

- **esbuild pre-bundle for API function:** Vercel's nft (Node File Tracer) doesn't resolve TypeScript path aliases (`@shared/*`) in server files. Solution: pre-bundle `api/_entry.ts` → `api/index.js` with esbuild, inlining all server/ and shared/ code into a single 161KB file. Node_modules packages remain external (resolved by nft at deploy time).
- **Replace @shared/* with relative imports:** Changed all server-side `@shared/schema` and `@shared/routes` imports to `../shared/schema` and `../shared/routes` for compatibility with both esbuild and direct execution.
- **Dynamic import for serveStatic:** Converted the static `import { serveStatic }` to a dynamic `import("./static")` inside the `!process.env.VERCEL` guard, preventing esbuild from bundling the entire Vite config chain into the API function.
- **ai_jobs migration applied:** SQL migration `0006_ai_jobs.sql` executed against Supabase via Node.js postgres driver (psql not available locally).

## Key Files

### Created
- `api/_entry.ts` — Express app re-export entry point for esbuild
- `api/index.js` — Pre-bundled API function (gitignored build artifact)
- `scripts/build-api.mjs` — esbuild bundler script for the API function

### Modified
- `vercel.json` — Added API rewrite rule + esbuild step in buildCommand
- `server/index.ts` — Removed static serveStatic import, made it dynamic
- `server/db.ts` — `@shared/schema` → `../shared/schema`
- `server/routes.ts` — `@shared/schema` and `@shared/routes` → relative imports
- `server/storage.ts` — `@shared/schema` → `../shared/schema`
- `.gitignore` — Added api/index.js and api/index.js.map

## Deviations

- **Vercel nft path alias limitation:** The plan assumed Vercel would auto-detect the Express server function. In reality, nft doesn't resolve tsconfig `paths` aliases, and functions in the `api/` directory can't statically import from `server/` without proper bundling. Required adding esbuild pre-bundle step.
- **Supabase CLI not authenticated:** Could not use `supabase db push` — applied migration directly via Node.js postgres driver.
- **Vercel CLI required browser login:** `vercel login` needed interactive browser flow for initial authentication.
