---
phase: 04-client-migration-cleanup
plan: "01"
subsystem: auth
tags: [supabase, auth-ui-react, react, wouter, react-query]

# Dependency graph
requires:
  - phase: 01-supabase-foundation
    provides: Supabase client singleton with autoRefreshToken and persistSession
  - phase: 03-vercel-deployment
    provides: Deployed SPA at policy-hub-lovat.vercel.app with VITE env vars configured
provides:
  - Public landing page at / with Policy Hub branding and Sign in button
  - Branded login/signup/reset page at /login using @supabase/auth-ui-react ThemeSupa
  - useAuth hook with session, user, loading, sessionExpired state via onAuthStateChange
  - ProtectedRoute component redirecting unauthenticated users to /login
  - UserMenu avatar dropdown with user email and supabase.auth.signOut() logout
  - Session expiry toast notification and redirect to /login
  - React Query cache cleared on sign-out via queryClient.clear()
affects:
  - 04-02-PLAN.md
  - 04-03-PLAN.md
  - 04-04-PLAN.md

# Tech tracking
tech-stack:
  added:
    - "@supabase/auth-ui-react@0.4.7 - pre-built auth form UI"
    - "@supabase/auth-ui-shared@0.1.8 - ThemeSupa theme"
  patterns:
    - "useAuth hook: centralized session state via onAuthStateChange subscription"
    - "ProtectedRoute: wraps authenticated app shell in App.tsx Switch fallback route"
    - "setTimeout pattern: avoid deadlock in onAuthStateChange callback before queryClient.clear()"
    - "wasAuthenticated flag: distinguish sign-out vs never-signed-in for sessionExpired signal"

key-files:
  created:
    - client/src/hooks/use-auth.ts
    - client/src/components/auth/AuthPage.tsx
    - client/src/components/auth/ProtectedRoute.tsx
    - client/src/components/user-menu.tsx
    - client/src/pages/Landing.tsx
  modified:
    - client/src/App.tsx
    - client/src/lib/queryClient.ts
    - client/src/components/app-sidebar.tsx

key-decisions:
  - "ThemeSupa imported from @supabase/auth-ui-shared not @supabase/auth-ui-react (separate package)"
  - "queryClient.clear() wrapped in setTimeout(0) to avoid Supabase auth callback deadlock"
  - "wasAuthenticated flag tracks prior auth state to distinguish sign-out from unauthenticated load"
  - "Default queryFn on401 changed from throw to returnNull — ProtectedRoute handles redirect, not query errors"
  - "ProtectedRoute as Switch fallback (no path prop) catches all non-public routes"
  - "Dashboard moved from / to /dashboard — / is now the public landing page"

patterns-established:
  - "Auth routing: / -> public landing, /login -> auth form, all else -> ProtectedRoute"
  - "App shell (sidebar + header) only rendered inside ProtectedRoute"
  - "UserMenu in header: avatar trigger + email label + separator + logout item"

requirements-completed: [CLNT-01, CLNT-04, CLNT-05]

# Metrics
duration: 3min
completed: 2026-02-19
---

# Phase 04 Plan 01: Auth Foundation Summary

**Supabase Auth UI with branded landing page, useAuth session hook, ProtectedRoute guard, and UserMenu logout — complete auth flow from public entry to authenticated dashboard**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-19T19:53:15Z
- **Completed:** 2026-02-19T19:56:30Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- useAuth hook manages session state via onAuthStateChange with sessionExpired signal on sign-out
- AuthPage renders branded Policy Hub login/signup/reset card using @supabase/auth-ui-react ThemeSupa
- App.tsx restructured: / -> Landing (public), /login -> AuthPage (public), all other routes wrapped in ProtectedRoute
- UserMenu avatar dropdown displays user email and invokes supabase.auth.signOut() on logout
- React Query cache cleared on SIGNED_OUT via setTimeout to avoid callback deadlock
- Vite build succeeds, no client-side TypeScript errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Install auth-ui packages, create useAuth hook and auth components** - `53b9e3b` (feat)
2. **Task 2: Create landing page, wire auth into App.tsx** - `0d52fa7` (feat)
3. **Deviation fix: Update sidebar Dashboard link from / to /dashboard** - `9b31815` (fix)

## Files Created/Modified
- `client/src/hooks/use-auth.ts` - Session state hook with onAuthStateChange subscription
- `client/src/components/auth/AuthPage.tsx` - Branded login/signup/reset page with ThemeSupa
- `client/src/components/auth/ProtectedRoute.tsx` - Route guard redirecting to /login + session expiry toast
- `client/src/components/user-menu.tsx` - Avatar dropdown with logout
- `client/src/pages/Landing.tsx` - Public landing page with Shield icon, Policy Hub branding, Sign in button
- `client/src/App.tsx` - Auth-aware routing: public routes + ProtectedRoute wrapper for app shell
- `client/src/lib/queryClient.ts` - Changed default on401 from throw to returnNull
- `client/src/components/app-sidebar.tsx` - Updated Dashboard path from / to /dashboard

## Decisions Made
- ThemeSupa imported from `@supabase/auth-ui-shared` (not `auth-ui-react`) — separate package per Supabase docs
- `queryClient.clear()` wrapped in `setTimeout(0)` — avoids deadlock inside Supabase auth callback
- `wasAuthenticated` flag tracks prior auth state so sign-out is distinguished from unauthenticated initial load
- Default `on401` behavior changed to `returnNull` — ProtectedRoute handles redirect gracefully, no noisy query errors
- ProtectedRoute used as Switch fallback route (no `path` prop) — catches all routes not explicitly listed as public

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated sidebar Dashboard nav link from / to /dashboard**
- **Found during:** Task 2 (App.tsx restructuring)
- **Issue:** app-sidebar.tsx had Dashboard path as `/` which now points to public landing page, not Dashboard page
- **Fix:** Updated Dashboard path to `/dashboard` and fixed active state detection to match `/dashboard`
- **Files modified:** `client/src/components/app-sidebar.tsx`
- **Verification:** Build passes, grep confirms path="/dashboard" in sidebar
- **Committed in:** `9b31815` (separate fix commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Necessary for correctness — dashboard nav link would have navigated to public landing page for authenticated users. No scope creep.

## Issues Encountered
- Pre-existing TypeScript errors in server/ files (not caused by this plan's changes) — out of scope per scope boundary rule.

## User Setup Required
None - no external service configuration required. SMTP already noted as deferred in STATE.md pending todos.

## Next Phase Readiness
- Auth foundation complete: useAuth, AuthPage, ProtectedRoute, UserMenu all wired
- Plans 04-02 through 04-04 can now migrate client data fetching from Express API to direct Supabase queries with auth headers included in supabase client automatically
- No blockers

---
*Phase: 04-client-migration-cleanup*
*Completed: 2026-02-19*
