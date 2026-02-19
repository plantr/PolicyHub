---
phase: 04-client-migration-cleanup
verified: 2026-02-19T21:00:00Z
status: passed
score: 22/22 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "Sign in and sign out flow"
    expected: "Signing in redirects to /dashboard; signing out shows 'Session expired, please log in again' toast and redirects to /login"
    why_human: "Auth state transitions and toast notifications cannot be verified by static file analysis"
  - test: "Protected route redirect"
    expected: "Navigating to /documents while unauthenticated redirects to /login"
    why_human: "Runtime routing behavior requires a browser"
  - test: "Direct Supabase reads return data"
    expected: "Documents, requirements, findings, etc. pages load live data from Supabase with RLS enforced"
    why_human: "Requires a live Supabase project with configured RLS policies"
  - test: "TUS upload flow"
    expected: "Creating a document with an attached file in Documents.tsx completes without error"
    why_human: "Requires a live Supabase Storage bucket and vercel dev running"
---

# Phase 04: Client Migration & Cleanup — Verification Report

**Phase Goal:** The React frontend reads data directly from Supabase, auth flows through Supabase Auth UI, and all Replit, Passport.js, and S3 legacy code is removed from the codebase.
**Verified:** 2026-02-19T21:00:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Unauthenticated users see a public landing page at / with Policy Hub branding and a sign-in button | VERIFIED | `Landing.tsx` renders Shield icon, "Policy Hub" heading, "Sign in" button linking to /login. Renders only when `!session`. |
| 2 | User sees a branded login page at /login with Policy Hub logo and auth form | VERIFIED | `AuthPage.tsx` renders Shield + "Policy Hub" header, Supabase `Auth` component with `ThemeSupa` theming inside a card |
| 3 | User can sign up, sign in, and reset password via the auth form | VERIFIED | `Auth` component configured with `showLinks={true}` and `providers={[]}` — all three views built in to @supabase/auth-ui-react |
| 4 | After login, user is redirected to the dashboard | VERIFIED | `AuthPage.tsx` line 16: `if (session) return <Redirect to="/dashboard" />`. `Landing.tsx` line 17 same redirect. |
| 5 | Authenticated user visiting / is redirected to the dashboard | VERIFIED | `Landing.tsx` checks `useAuth()` session and returns `<Redirect to="/dashboard" />` when authenticated |
| 6 | Unauthenticated user attempting any app route is redirected to /login | VERIFIED | `App.tsx` fallback `<Route>` wraps all non-public routes in `<ProtectedRoute>`, which returns `<Redirect to="/login" />` when `!session` |
| 7 | Session expiry shows a toast and redirects to /login | VERIFIED | `ProtectedRoute.tsx` useEffect watches `sessionExpired`, fires `toast({ title: "Session expired, please log in again" })`, then redirects |
| 8 | User can log out via avatar dropdown in the header | VERIFIED | `UserMenu.tsx` renders DropdownMenuItem with `onClick={handleSignOut}` calling `supabase.auth.signOut()`. Wired in `App.tsx` header. |
| 9 | All React Query cache is cleared on sign-out | VERIFIED | `use-auth.ts` line 36: `setTimeout(() => queryClient.clear(), 0)` triggered on `SIGNED_OUT` event when `wasAuthenticated` |
| 10 | All list/get page queries use supabase.from().select() instead of fetch('/api/...') | VERIFIED | 25 pages confirmed with `supabase.from` calls. Zero `/api/` queryKeys found in any page file. |
| 11 | QueryKeys no longer use /api/ prefix | VERIFIED | `grep queryKey.*"/api/"` across pages/ — zero matches |
| 12 | All invalidateQueries and setQueryData calls updated to match new queryKeys | VERIFIED | `grep invalidateQueries.*"/api/"` across pages/ — zero matches |
| 13 | Mutations still use apiRequest() to call /api/ serverless endpoints for writes | VERIFIED | `apiRequest()` preserved in `queryClient.ts`; mutation calls in pages use it for POST/PUT/DELETE |
| 14 | Stats endpoint remains a serverless function call | VERIFIED | `Dashboard.tsx` line 63: `fetch("/api/stats")` — not migrated to Supabase direct read |
| 15 | Each route group has its own /api/*.ts serverless function file | VERIFIED | 21 individual `api/*.ts` files present, each with `export default async function handler` |
| 16 | vercel.json no longer has the /api/(.*) catch-all rewrite | VERIFIED | `vercel.json` contains only `{ "source": "/((?!api/).*)", "destination": "/index.html" }` — no API catch-all |
| 17 | Build script produces individual function bundles | VERIFIED | `scripts/build-api.mjs` uses `entryPoints: entries` + `outdir: "api"`. 21 `.js` + `.js.map` pairs present in `api/` |
| 18 | No references to .replit, server/replit_integrations/, @replit/* packages | VERIFIED | `server/replit_integrations/` deleted. `.replit` added to `.gitignore`. No `@replit` in `package.json`. `vite.config.ts` clean. |
| 19 | No references to passport, express-session, connect-pg-simple, memorystore in package.json | VERIFIED | `grep passport\|express-session\|...` in `package.json` — zero matches |
| 20 | No references to @aws-sdk/*, multer in package.json or source | VERIFIED | Zero matches in `package.json` and all `client/src/` source files |
| 21 | Legacy server files deleted (s3.ts, vite.ts, static.ts, routes.ts, index.ts, script/build.ts, replit_integrations/) | VERIFIED | All six files confirmed deleted; `server/replit_integrations/` directory gone |
| 22 | Document upload flow uses TUS signed-URL pattern in Documents.tsx, DocumentDetail.tsx, VersionDetail.tsx | VERIFIED | All three pages import and call `uploadFileToStorage` from `@/lib/storage`. Zero `new FormData()` instances remain. |

**Score:** 22/22 truths verified

---

## Required Artifacts

### Plan 04-01 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `client/src/hooks/use-auth.ts` | Auth state hook with session, user, loading, sessionExpired, onAuthStateChange | VERIFIED | 55 lines. Contains `onAuthStateChange`, `sessionExpired`, `queryClient.clear()`. Wired into AuthPage, ProtectedRoute, Landing, UserMenu. |
| `client/src/components/auth/AuthPage.tsx` | Branded login/signup/reset page using @supabase/auth-ui-react | VERIFIED | 52 lines. `Auth` component with `ThemeSupa`, Shield branding, `providers={[]}`, `showLinks={true}`. Wired in App.tsx at `/login`. |
| `client/src/components/auth/ProtectedRoute.tsx` | Route guard redirecting unauthenticated users to /login | VERIFIED | 36 lines. Checks `session`, shows spinner on loading, shows session expiry toast, returns `<Redirect to="/login" />`. Wired as App.tsx Switch fallback. |
| `client/src/components/user-menu.tsx` | User avatar dropdown with logout in the header | VERIFIED | 50 lines. Avatar with initials, email label, `supabase.auth.signOut()` on "Log out" item. Wired in App.tsx header. |
| `client/src/pages/Landing.tsx` | Public landing page with branding and sign-in button | VERIFIED | 36 lines. Shield icon, "Policy Hub" h1, "Sign in" button → `/login`. Auth redirect to `/dashboard`. Wired in App.tsx at `/`. |

### Plan 04-02 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `client/src/lib/queryClient.ts` | Supabase query helper function for direct reads | VERIFIED | `supabaseQuery<T>` and `supabaseQuerySingle<T>` exported. `on401: "returnNull"` set. `refetchOnWindowFocus: false` preserved. |
| `client/src/pages/Documents.tsx` | Documents page using direct Supabase reads | VERIFIED | `supabase.from` present. `uploadFileToStorage` imported and called. |
| `client/src/pages/Dashboard.tsx` | Dashboard — stats query stays as fetch, other reads migrate | VERIFIED | `fetch("/api/stats")` preserved. `supabase.from("findings")` and `supabase.from("business_units")` used for other reads. |

### Plan 04-03 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `api/documents.ts` | Document write operations as Vercel serverless function | VERIFIED | `export default async function handler` present. Imports `storage` from `../server/storage`. `handleCors` applied. |
| `api/_shared/handler.ts` | Shared request handling utilities | VERIFIED | `parseBody`, `sendError`, `getIdParam` exports present. |
| `api/_shared/cors.ts` | CORS headers for Vercel functions | VERIFIED | `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers` set. |
| `scripts/build-api.mjs` | Multi-entry esbuild config | VERIFIED | `entryPoints: entries` (dynamic from readdirSync), `outdir: "api"`. 21 `.js` bundles present. |
| `vercel.json` | Updated config without API catch-all | VERIFIED | Only SPA rewrite `/((?!api/).*)` present. No `/api/(.*)` rewrite. |

### Plan 04-04 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `package.json` | Clean dependencies — no legacy packages | VERIFIED | No passport, multer, @aws-sdk, @replit packages. `"dev": "vercel dev"`. `"engines": { "node": "22.x" }`. |
| `vite.config.ts` | Clean Vite config — no Replit plugin conditionals | VERIFIED | 19 lines. Only `@vitejs/plugin-react`. No `REPL_ID` block. No `server.fs`. |
| `.gitignore` | Replit files ignored | VERIFIED | `.replit` present at line 13. |
| `README.md` | Updated setup instructions for Supabase + Vercel | VERIFIED | Contains `vercel dev`, Supabase env vars documentation, architecture notes. |

---

## Key Link Verification

### Plan 04-01 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `client/src/hooks/use-auth.ts` | `supabase.auth.onAuthStateChange` | Auth state subscription | WIRED | Line 30: `supabase.auth.onAuthStateChange(...)` |
| `client/src/components/auth/ProtectedRoute.tsx` | `client/src/hooks/use-auth.ts` | useAuth hook | WIRED | Line 12: `const { session, loading, sessionExpired } = useAuth()` |
| `client/src/App.tsx` | `client/src/components/auth/ProtectedRoute.tsx` | Wraps protected routes | WIRED | Lines 93-111: `<ProtectedRoute>` wraps app shell in Switch fallback |
| `client/src/pages/Landing.tsx` | `client/src/hooks/use-auth.ts` | useAuth hook checks session | WIRED | Line 6: `const { session, loading } = useAuth()` |
| `client/src/App.tsx` | `client/src/pages/Landing.tsx` | Public route at / | WIRED | Line 90: `<Route path="/" component={Landing} />` |
| `client/src/hooks/use-auth.ts` | `queryClient.clear()` | Cache clear on SIGNED_OUT | WIRED | Line 36: `setTimeout(() => queryClient.clear(), 0)` |

### Plan 04-02 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `client/src/pages/*.tsx` (25 files) | `supabase.from().select()` | Direct Supabase reads | WIRED | 25 page files confirmed with `supabase.from` calls |
| `client/src/pages/*.tsx` | `queryClient.invalidateQueries` | Updated queryKeys (no /api/ prefix) | WIRED | Zero `/api/` prefix in any queryKey across all pages |

### Plan 04-03 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `api/*.ts` | `server/storage.ts` | Import storage for database operations | WIRED | `documents.ts`, `stats.ts`, `ai-jobs.ts` all import `storage` from `../server/storage` |
| `scripts/build-api.mjs` | `api/*.ts` | Multi-entry esbuild bundle | WIRED | `entryPoints: entries` uses `readdirSync("api")` to find all .ts files |

### Plan 04-04 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `package.json` | `vercel dev` | dev script | WIRED | `"dev": "vercel dev"` confirmed |
| `client/src/pages/Documents.tsx` | `client/src/lib/storage.ts` | TUS upload replaces multer | WIRED | Line 57: `import { uploadFileToStorage }`. Line 467: `await uploadFileToStorage(...)` |
| `client/src/pages/DocumentDetail.tsx` | `client/src/lib/storage.ts` | TUS upload for version uploads | WIRED | Line 87: import. Lines 470, 586: two call sites |
| `client/src/pages/VersionDetail.tsx` | `client/src/lib/storage.ts` | TUS upload for version re-upload | WIRED | Line 36: import. Line 188: call site |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| CLNT-01 | 04-01 | Supabase JS client initialized as singleton with anon key | SATISFIED | `client/src/lib/supabase.ts`: `createClient` with `autoRefreshToken: true`, `persistSession: true` |
| CLNT-02 | 04-02 | Read operations migrated to direct Supabase client queries | SATISFIED | 25 pages with `supabase.from`. Zero `/api/` queryKeys. |
| CLNT-03 | 04-03 | Write operations with validation use serverless functions | SATISFIED | 21 `api/*.ts` files with `export default handler`. Mutations in pages call `apiRequest()`. |
| CLNT-04 | 04-01 | React Query cache invalidation updated for Supabase auth changes | SATISFIED | `use-auth.ts`: `queryClient.clear()` on `SIGNED_OUT`. QueryKeys normalized (no `/api/` prefix). |
| CLNT-05 | 04-01 | Login/signup/password reset UI using Supabase Auth | SATISFIED | `AuthPage.tsx` with `@supabase/auth-ui-react` `Auth` component, `ThemeSupa`, `showLinks={true}` |
| CLNP-01 | 04-04 | Replit-specific code removed | SATISFIED | `server/replit_integrations/` deleted. `.replit` in `.gitignore`. `vite.config.ts` has no `REPL_ID` block. No `@replit` packages. |
| CLNP-02 | 04-04 | Passport.js and express-session removed | SATISFIED | Zero matches for `passport\|express-session` in `package.json` or source files |
| CLNP-03 | 04-04 | AWS S3 integration removed | SATISFIED | Zero matches for `@aws-sdk\|multer` in `package.json` or source files. `server/s3.ts` deleted. |
| CLNP-04 | 04-03 | Express server entry point refactored or removed | SATISFIED | `server/index.ts` deleted. `server/routes.ts` deleted. Only `server/storage.ts`, `server/db.ts`, `server/lib/` remain (data layer). |
| CLNP-05 | 04-04 | Hardcoded port 5000 and Replit environment detection removed | SATISFIED | Zero matches for `port.*5000` or `REPL_ID` across all source files |
| CLNP-06 | 04-04 | Node.js engine pinned to 22.x in package.json | SATISFIED | `package.json` line 7: `"engines": { "node": "22.x" }` |

All 11 requirements satisfied. No orphaned requirements detected.

---

## Anti-Patterns Found

None detected in created or modified files. No TODO/FIXME/HACK comments, no placeholder returns, no stub handlers.

Notable: `api/business-units.ts` DELETE returns 405 directing to `PUT?action=archive` — this is correct behavior matching the legacy storage interface, not a stub.

---

## Human Verification Required

### 1. Auth Sign-In and Sign-Out Flow

**Test:** Open the app unauthenticated. Navigate to `/`. Click "Sign in". Enter valid credentials. Submit.
**Expected:** Redirect to `/dashboard` with sidebar and header avatar showing user email. Click avatar → "Log out". Should see toast "Session expired, please log in again" and redirect to `/login`.
**Why human:** Auth state transitions, toast display, and redirect behavior require a running browser with a configured Supabase project.

### 2. Protected Route Redirect

**Test:** With the app running, navigate directly to `/documents` in a browser without being authenticated.
**Expected:** Immediate redirect to `/login`.
**Why human:** Runtime routing behavior cannot be verified by static analysis.

### 3. Live Supabase Reads

**Test:** Sign in and navigate to Documents, Requirements, Findings, and RiskRegister pages.
**Expected:** Real data loads from Supabase tables with RLS policies applied. No Express API calls in the network tab for GET requests (only `/api/stats` should appear).
**Why human:** Requires a live Supabase project with RLS policies configured and seed data.

### 4. TUS Document Upload

**Test:** Sign in, navigate to Documents, create a new document with a PDF file attached.
**Expected:** Document created in Supabase, file uploaded via TUS signed-URL flow (no multipart form submission to Express), upload progress shown, document appears in list.
**Why human:** Requires a live Supabase Storage bucket and running `vercel dev` environment.

---

## Gaps Summary

No gaps. All 22 observable truths verified. All 11 requirements satisfied. All key links wired. All legacy artifacts deleted. No anti-patterns detected.

The phase goal is fully achieved in the codebase:

- **Auth:** useAuth hook, AuthPage (Supabase Auth UI), ProtectedRoute, UserMenu, Landing page — complete and wired in App.tsx.
- **Client reads:** 25 pages use `supabase.from().select()` directly. Zero `/api/` queryKeys remain. Stats endpoint intentionally stays as serverless fetch.
- **Serverless API:** 21 individual `api/*.ts` functions with shared CORS and error handling. Multi-entry esbuild builds 21 individual bundles. `vercel.json` API catch-all removed.
- **Cleanup:** All legacy packages uninstalled. All legacy files deleted. `vite.config.ts` clean. `package.json` scripts updated. README documents the architecture.

---

_Verified: 2026-02-19T21:00:00Z_
_Verifier: Claude (gsd-verifier)_
