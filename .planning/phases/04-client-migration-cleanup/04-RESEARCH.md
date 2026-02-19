# Phase 4: Client Migration + Cleanup - Research

**Researched:** 2026-02-19
**Domain:** Supabase Auth UI, direct Supabase client reads, React Query auth integration, Vercel serverless Express adapter, legacy code removal
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Auth screens**
- Use @supabase/auth-ui-react pre-built components (not custom forms)
- Auth form displayed as a card on a branded page — logo and branding visible around the form
- After successful login, always redirect to dashboard/home (no return URL pattern)
- Auth UI themed to match the existing Policy Hub design system — same colors, fonts, spacing

**Session & auth behavior**
- On session expiry: show a toast notification ("Session expired, please log in again") then redirect to login
- Persistent sessions — users stay logged in across browser restarts until explicit logout or refresh token expiry
- Logout option lives inside a user/avatar dropdown menu in the header (standard SaaS pattern)
- Public landing/welcome page visible to unauthenticated users; all other routes require login

**Loading & error states**
- Empty list states show a helpful message with a CTA button (e.g., "No documents yet" + create button)
- Data refreshes on navigation only — no background polling or window-focus refetching
- Loading indicators and error handling: Claude's discretion per page context

**Local dev workflow**
- Local development via `vercel dev` (matches production, handles serverless functions)
- Replit config files (.replit, replit.nix) removed from tracking but kept in .gitignore
- Full restructure: break Express server/index.ts into individual /api/*.ts serverless functions (Vercel-native)
- README updated to reflect new Supabase + Vercel architecture — setup instructions, env vars, dev commands

### Claude's Discretion
- Loading indicator style per page (skeletons vs spinners)
- Error state presentation (inline vs toast) based on context
- Exact /api/ route file structure and naming
- Serverless function bundling and shared utilities approach

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CLNT-01 | Supabase JS client initialized as singleton with anon key for frontend queries | Singleton already exists at `client/src/lib/supabase.ts` — needs no change, just verification |
| CLNT-02 | Read operations (list/get) migrated from API calls to direct Supabase client queries | 45 GET routes in Express; all simple list/get routes can become direct `.from('table').select()` calls in queryFn |
| CLNT-03 | Write operations with business logic validation use serverless functions | POST/PUT/DELETE routes with validation, audit logging, or business logic stay as `/api/*.ts` Vercel functions |
| CLNT-04 | React Query cache invalidation updated for Supabase auth state changes | `onAuthStateChange` SIGNED_OUT event → `queryClient.clear()` in a `useEffect`; avoid async inside the callback |
| CLNT-05 | Login/signup/password reset UI components built using Supabase Auth | `@supabase/auth-ui-react` Auth component with `view` prop switching; `appearance.variables` for custom theming |
| CLNP-01 | Replit-specific code removed (.replit, server/replit_integrations/, Vite plugins) | `.replit` exists at root; `vite.config.ts` has `REPL_ID` conditional; 3 `@replit/*` devDependencies; `server/replit_integrations/` directory |
| CLNP-02 | Passport.js and express-session packages and configuration removed | `passport`, `passport-local`, `express-session`, `connect-pg-simple`, `memorystore` in dependencies; `script/build.ts` allowlist includes them — remove both |
| CLNP-03 | AWS S3 integration (server/s3.ts, multer config) removed | `server/s3.ts` already stub-only (deprecated comment); `multer` still imported in `routes.ts` on 3 routes; `@aws-sdk/*` packages in deps |
| CLNP-04 | Express server entry point (server/index.ts) refactored or removed | Decision: break into individual `/api/*.ts` functions; `server/index.ts` can be removed; `api/_entry.ts` + single-function adapter approach for complex routes retained only if needed |
| CLNP-05 | Hardcoded port 5000 and Replit-specific environment detection removed | `server/index.ts` line 92: `process.env.PORT \|\| "5000"` — removed when `server/index.ts` is deleted; `REPL_ID` check in `vite.config.ts` |
| CLNP-06 | Node.js engine pinned to 22.x in package.json (Vercel compatibility) | Already done: `"engines": { "node": "22.x" }` in `package.json` line 7 — CLNP-06 is already satisfied |
</phase_requirements>

---

## Summary

Phase 4 is a large migration-and-cleanup phase. The work splits into two independent streams: (1) migrating the React frontend to read data directly from Supabase instead of through Express GET routes, and (2) removing all legacy infrastructure (Replit, Passport, S3/multer, the Express monolith). The auth UI layer is a third distinct track.

The Supabase JS client singleton already exists at `client/src/lib/supabase.ts` and is correctly configured with `persistSession: true` and `autoRefreshToken: true`. There are approximately 45 GET routes in Express across 25 pages — all simple `.select()` calls that map directly to Supabase table reads. Write/mutation routes (POST/PUT/DELETE) stay as serverless functions since they contain validation, audit logging, and business logic.

The biggest architectural decision — already locked by the user — is breaking `server/index.ts` into individual `/api/*.ts` Vercel serverless functions. The current `api/_entry.ts` → `api/index.js` single-bundle approach runs the entire Express app as one function. The new target is one `.ts` file per route group. The existing `scripts/build-api.mjs` esbuild config will need updating (or replacing) to support multiple entry points.

**Primary recommendation:** Implement this phase in four sequential subtasks — (1) auth UI + route protection, (2) read migration (direct Supabase queries), (3) serverless function restructure, (4) cleanup. The read migration is the largest by line count but mechanically simple; the serverless restructure is the most architecturally significant.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | ^2.97.0 (already installed) | Auth state, direct DB reads | Official Supabase client |
| `@supabase/auth-ui-react` | 0.4.7 (needs install) | Pre-built login/signup/reset UI | Locked decision; in maintenance but fully functional for email/password |
| `@supabase/auth-ui-shared` | peer dep of auth-ui-react | Exports `ThemeSupa` theme | Required alongside auth-ui-react |
| `@tanstack/react-query` | ^5.60.5 (already installed) | Query caching, invalidation | Already in use; no change needed |
| `wouter` | ^3.3.5 (already installed) | SPA routing, `<Redirect>` component | Already in use |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vercel` CLI | latest (dev only) | Local dev server matching production | `vercel dev` replaces `npm run dev` per locked decision |
| Existing `use-toast` + Radix toast | already in codebase | Session expiry toast | Use existing Radix toast infrastructure — do not add Sonner |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@supabase/auth-ui-react` | Custom forms | Custom forms = more work, no advantage for email/password-only v1; auth-ui-react is functional despite maintenance mode |
| Single Express bundle (`api/_entry.ts`) | Individual `/api/*.ts` per route group | Locked decision requires individual functions; single bundle is simpler but not the target architecture |
| `queryClient.invalidateQueries()` on SIGNED_OUT | `queryClient.clear()` | `clear()` removes ALL cached data immediately on sign-out, which is correct for security; `invalidateQueries` just marks stale |

**Installation (new packages only):**
```bash
npm install @supabase/auth-ui-react @supabase/auth-ui-shared
```

---

## Architecture Patterns

### Recommended Project Structure

After phase completion:

```
api/                        # Vercel serverless functions
├── business-units.ts       # GET list/get, POST, PUT, DELETE
├── documents.ts            # GET list/get, POST (create + TUS flow), PUT, DELETE
├── document-versions.ts    # GET list, POST, PUT, upload-url, upload-confirm, download, pdf ops
├── regulatory-sources.ts
├── requirements.ts
├── findings.ts
├── audits.ts
├── approvals.ts
├── audit-log.ts
├── requirement-mappings.ts
├── gap-analysis.ts         # Complex AI routes stay here
├── ai-jobs.ts
├── admin.ts                # /api/admin/:table
├── stats.ts                # Computed stats — stays server-side (multi-table aggregation)
├── users.ts
├── risks.ts
├── risk-library.ts
├── risk-actions.ts
├── risk-snapshots.ts
├── risk-categories.ts
├── commitments.ts
├── knowledge-base.ts
├── _shared/                # Shared utilities
│   ├── supabase-admin.ts   # Re-export from server/lib/supabase-admin.ts
│   ├── storage.ts          # Re-export storage module
│   └── cors.ts             # CORS headers for Vercel functions
└── index.ts                # Catch-all / health check

client/src/
├── lib/
│   ├── supabase.ts         # Unchanged — singleton client
│   ├── queryClient.ts      # Updated — Supabase queryFn replaces fetch for reads
│   └── storage.ts          # Unchanged — TUS upload helper
├── components/
│   └── auth/
│       ├── AuthPage.tsx    # Branded auth page wrapper (logo + card)
│       └── ProtectedRoute.tsx  # Route guard using wouter + supabase session
├── hooks/
│   └── use-auth.ts         # Auth state hook (session, user, loading)
└── pages/
    └── Landing.tsx         # Public page (unauthenticated)
```

### Pattern 1: Direct Supabase Read in queryFn

**What:** Replace `fetch('/api/documents')` with `supabase.from('documents').select('*')` directly in the React Query `queryFn`.

**When to use:** Any GET route that is a simple table read with no server-side business logic. This covers ~35 of the 45 GET routes.

**Example:**
```typescript
// Before (current pattern)
const { data: documents } = useQuery<Document[]>({
  queryKey: ["/api/documents"],
  // uses default queryFn which calls fetch(queryKey[0])
});

// After (Phase 4 pattern)
import { supabase } from "@/lib/supabase";

const { data: documents } = useQuery<Document[]>({
  queryKey: ["documents"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("documents")
      .select("*");
    if (error) throw error;
    return data ?? [];
  },
});
```

**QueryKey change:** Drop the `/api/` prefix. New keys are `["documents"]`, `["business-units"]`, etc. This also means `queryClient.invalidateQueries({ queryKey: ["documents"] })` instead of `["/api/documents"]`.

### Pattern 2: Auth State Listener for Cache Invalidation (CLNT-04)

**What:** Subscribe to Supabase auth events in the React tree root. On `SIGNED_OUT`, clear all query cache. On `SIGNED_IN`, optionally pre-warm critical queries.

**Critical constraint:** The `onAuthStateChange` callback MUST NOT contain any `await` calls or other Supabase method calls — doing so causes a deadlock. Use `setTimeout(..., 0)` to defer any async work.

**Example:**
```typescript
// client/src/hooks/use-auth.ts
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";

export function useAuth() {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (event === "SIGNED_OUT") {
          // defer to avoid deadlock — do NOT await inside callback
          setTimeout(() => queryClient.clear(), 0);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [queryClient]);

  return { session, user: session?.user ?? null, loading };
}
```

### Pattern 3: Protected Routes with Wouter

**What:** A `ProtectedRoute` wrapper component that checks auth state and redirects to the auth page if unauthenticated.

**Example:**
```typescript
// client/src/components/auth/ProtectedRoute.tsx
import { Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center h-screen">
    {/* spinner or skeleton */}
  </div>;

  if (!session) return <Redirect to="/login" />;

  return <>{children}</>;
}
```

**App.tsx usage:**
```typescript
// Wrap the entire Router (or individual routes) in ProtectedRoute
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Switch>
        <Route path="/login" component={AuthPage} />
        <Route path="/" nest>
          <ProtectedRoute>
            <AppShell>
              <Router />
            </AppShell>
          </ProtectedRoute>
        </Route>
      </Switch>
    </QueryClientProvider>
  );
}
```

### Pattern 4: @supabase/auth-ui-react Auth Component

**What:** Pre-built Auth component with `view` prop to switch between login/signup/password-reset flows. Themed via `appearance.variables`.

**Important note:** `ThemeSupa` is imported from `@supabase/auth-ui-shared`, not from `@supabase/auth-ui-react`. The library entered maintenance mode in February 2024 but continues to work for email/password auth — no functional issues for this use case.

**Example:**
```typescript
// client/src/components/auth/AuthPage.tsx
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/lib/supabase";

type AuthView = "sign_in" | "sign_up" | "forgotten_password";

export function AuthPage() {
  const [view, setView] = useState<AuthView>("sign_in");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      {/* Logo / branding */}
      <div className="mb-8">
        <img src="/logo.svg" alt="Policy Hub" className="h-10" />
      </div>

      {/* Auth card */}
      <div className="w-full max-w-sm rounded-lg border bg-card p-8 shadow-sm">
        <Auth
          supabaseClient={supabase}
          view={view}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: "hsl(var(--primary))",
                  brandAccent: "hsl(var(--primary))",
                  brandButtonText: "hsl(var(--primary-foreground))",
                  inputBackground: "hsl(var(--background))",
                  inputBorder: "hsl(var(--border))",
                  inputText: "hsl(var(--foreground))",
                  inputLabelText: "hsl(var(--muted-foreground))",
                  inputPlaceholder: "hsl(var(--muted-foreground))",
                },
                fonts: {
                  bodyFontFamily: `var(--font-sans)`,
                  buttonFontFamily: `var(--font-sans)`,
                  labelFontFamily: `var(--font-sans)`,
                },
                borderWidths: { buttonBorderWidth: "1px", inputBorderWidth: "1px" },
                radii: { borderRadiusButton: "0.375rem", buttonPadding: "0.5rem 1rem" },
              },
            },
          }}
          providers={[]}
          showLinks={true}  // shows "Forgot password?" link etc.
        />
      </div>
    </div>
  );
}
```

**View switching:** `@supabase/auth-ui-react` handles view switching internally when `showLinks={true}`. The Auth component displays "Sign up" / "Forgot password?" links that switch the view. No manual `setView` needed unless you want explicit control.

### Pattern 5: Session Expiry Toast

**What:** Detect `SIGNED_OUT` in the auth listener. Show a toast, then redirect to `/login`. Use the existing `useToast` + Radix toast infrastructure (already used across all pages).

**Example:**
```typescript
// In use-auth.ts onAuthStateChange handler:
if (event === "SIGNED_OUT") {
  // Defer all async/supabase ops to avoid deadlock
  setTimeout(() => {
    queryClient.clear();
    // Toast must be shown from a component context, not here directly.
    // Signal via a ref or state that session expired.
  }, 0);
}
```

**Implementation approach:** Because `onAuthStateChange` is not in component scope, the session expiry toast requires a small state signal. The cleanest pattern for this codebase is a React context or a module-level event emitter:

```typescript
// Approach: signal via a simple event
// use-auth.ts sets a "sessionExpired" flag
// App.tsx or AuthGuard watches the flag and shows toast + redirect
const [sessionExpired, setSessionExpired] = useState(false);

// In onAuthStateChange (synchronous part):
if (event === "SIGNED_OUT" && wasAuthenticated) {
  setSessionExpired(true); // synchronous state set — safe
}

// In JSX:
useEffect(() => {
  if (sessionExpired) {
    toast({ title: "Session expired, please log in again" });
    setLocation("/login");
    setSessionExpired(false);
  }
}, [sessionExpired]);
```

### Pattern 6: Vercel Serverless Function Structure

**What:** Individual `/api/*.ts` files replace the single Express bundle. Each file handles one route group.

**Key constraint from prior phases:** The current `vercel.json` routes `/api/(.*)` to `/api` (single function). After restructuring to individual files, Vercel auto-discovers files in `/api/` as separate functions — the rewrite rule must change or be removed for the API routes.

**Vercel function signature:**
```typescript
// api/documents.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    // list or get
  } else if (req.method === "POST") {
    // create
  }
  // etc.
}
```

**Shared utilities:** Extract common server code (supabase-admin client, storage module, db) into `api/_shared/` or keep in `server/` and import from there. The esbuild bundler in `scripts/build-api.mjs` will need to support multiple entry points instead of the single `api/_entry.ts`.

**Alternative (simpler) approach:** Keep the current single-function Express adapter (`api/_entry.ts` → `api/index.ts`) but migrate the frontend reads to direct Supabase. The locked decision says "break Express server/index.ts into individual /api/*.ts serverless functions", so individual files is the target — but this is the highest-effort part of the phase.

**IMPORTANT — vercel.json rewrite change:** Once individual `/api/*.ts` files exist, Vercel auto-routes `/api/documents` to `api/documents.ts`. Remove the existing catch-all `/api/(.*)` → `/api` rewrite. The SPA rewrite stays:
```json
{
  "rewrites": [
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

### Anti-Patterns to Avoid

- **Async in onAuthStateChange:** Calling `await supabase.auth.*` inside the callback deadlocks the auth system. Defer with `setTimeout(..., 0)` or use synchronous-only operations.
- **Calling fetch in Supabase queryFn:** After migration, queryFns should call `supabase.from(...).select()`, not `fetch('/api/...')`. The default `getQueryFn` in `queryClient.ts` calls fetch — it will still be needed for write operations but GET queries should use the Supabase client directly.
- **Leaving `/api/` prefix in queryKeys:** After migration, queryKeys like `["/api/documents"]` should become `["documents"]` (no prefix). This also means all `invalidateQueries` calls must be updated. The `/api/` prefix made sense when queryKeys doubled as fetch URLs; it doesn't for Supabase client calls.
- **Exposing service role key to frontend:** The frontend Supabase client uses `VITE_SUPABASE_PUBLISHABLE_KEY` (anon key). RLS enforces access. The service role key (`SUPABASE_SERVICE_ROLE_KEY`) stays server-side only in `/api/*.ts` functions.
- **Using ThemeSupa import from auth-ui-react:** ThemeSupa was moved to `@supabase/auth-ui-shared`. Import it from there.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Login/signup/password reset UI | Custom forms with validation | `@supabase/auth-ui-react` Auth component | Handles all edge cases, error states, view switching, form validation |
| Token refresh on expiry | Manual refresh logic | Supabase JS client with `autoRefreshToken: true` | Already configured in `client/src/lib/supabase.ts`; client handles silently |
| Session persistence | localStorage management | `persistSession: true` in Supabase client | Already configured; handles page reload, tab close, restart |
| Route protection | Cookie-based auth middleware | `ProtectedRoute` component + `onAuthStateChange` | SPA auth works client-side; no server middleware needed |
| Cache invalidation on sign-out | Manual query clearing | `queryClient.clear()` in `onAuthStateChange` | One call removes all stale data; no need to enumerate queryKeys |

**Key insight:** The Supabase JS client handles nearly all auth complexity (token storage, refresh, session recovery). The frontend only needs to react to the events it emits.

---

## Common Pitfalls

### Pitfall 1: Async deadlock in onAuthStateChange

**What goes wrong:** The app hangs on session refresh or sign-out. Queries stop returning.

**Why it happens:** Calling `await supabase.auth.getSession()` or any other Supabase async method inside the `onAuthStateChange` callback. The auth system processes events synchronously; awaiting another Supabase call inside the callback re-enters the auth lock.

**How to avoid:** Keep the callback synchronous. Defer any async work with `setTimeout(..., 0)`.

**Warning signs:** App hangs after signing in on another device or after refresh token expiry.

### Pitfall 2: QueryKey mismatch after migration

**What goes wrong:** After migrating a queryFn to Supabase, mutations that call `queryClient.invalidateQueries({ queryKey: ["/api/documents"] })` no longer invalidate the now-renamed `["documents"]` query.

**Why it happens:** QueryKeys change when switching from the fetch-based pattern (where the URL was the key) to named keys.

**How to avoid:** Do a codebase-wide search for every `queryClient.invalidateQueries` and `queryClient.setQueryData` call and update queryKeys alongside each migrated query.

**Warning signs:** Stale data shown after mutations (list doesn't update after create/delete).

### Pitfall 3: Stats endpoint stays server-side

**What goes wrong:** Attempting to migrate `/api/stats` to a direct Supabase client read. The stats endpoint aggregates data from 7 tables with filtering logic (counting documents, requirements, findings, approvals, etc.).

**Why it happens:** Assuming all GET routes are simple selects.

**How to avoid:** Keep `/api/stats` as a serverless function. Direct Supabase reads cannot efficiently replicate multi-table aggregation without either multiple round-trips or a database view/function. Similarly, keep `/api/gap-analysis/refresh`, AI routes, and file download/upload routes as serverless functions.

**Warning signs:** Stats computation on the client would require fetching all rows from 7 tables.

### Pitfall 4: @supabase/auth-ui-react ThemeSupa import path

**What goes wrong:** `import { ThemeSupa } from "@supabase/auth-ui-react"` throws a module error at runtime.

**Why it happens:** ThemeSupa was moved to `@supabase/auth-ui-shared` (a peer dependency). The auth-ui-react package no longer re-exports it.

**How to avoid:** `import { ThemeSupa } from "@supabase/auth-ui-shared"` and install `@supabase/auth-ui-shared` alongside `@supabase/auth-ui-react`.

### Pitfall 5: vercel.json API rewrite conflicts with individual functions

**What goes wrong:** After creating `api/documents.ts`, requests to `/api/documents` still route to the old single-function `api/index.js`.

**Why it happens:** The existing `vercel.json` has `"source": "/api/(.*)", "destination": "/api"` which overrides Vercel's auto-discovery of individual function files.

**How to avoid:** Remove the `/api/(.*)` → `/api` rewrite from `vercel.json` when switching to individual function files. Vercel auto-discovers all `.ts`/`.js` files in `/api/` as separate functions.

### Pitfall 6: multer removed before upload routes migrated

**What goes wrong:** Removing multer while the document upload flow in `Documents.tsx` still POSTs multipart/form-data.

**Why it happens:** The frontend `Documents.tsx` create mutation at line 398 posts FormData to `/api/documents`. Phase 2/3 retained legacy multer routes during transition. Phase 4 switches to the TUS signed-URL flow — the client already has `client/src/lib/storage.ts` with `uploadFileToStorage()` — but the UI (`Documents.tsx`) still posts to the old route.

**How to avoid:** Migrate the document create flow in `Documents.tsx` to use the two-step TUS approach (get signed upload URL → TUS upload → confirm) before removing multer. This is required for CLNP-03.

### Pitfall 7: Replit vite plugins crash local dev after removal

**What goes wrong:** After removing `@replit/vite-plugin-*` from `vite.config.ts`, `npm run dev` still works but `vercel dev` fails to start the Vite dev server correctly.

**Why it happens:** `server/vite.ts` imports from `../vite.config` using a relative import. When switching to `vercel dev`, the Vite server is started by Vite CLI directly (not via Express), so `server/vite.ts` is no longer in the hot path.

**How to avoid:** After removing the `server/index.ts` Express dev server, `vercel dev` starts Vite directly using the Vite CLI — the `server/vite.ts` middleware file becomes unused. Remove it alongside `server/index.ts`.

---

## Code Examples

Verified patterns from official sources and codebase analysis:

### Singleton Supabase client check (CLNT-01 already satisfied)

```typescript
// client/src/lib/supabase.ts — already correct, no change needed
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,  // handles token refresh silently
    persistSession: true,    // survives browser restart
  },
});
```

### Migrated list query (CLNT-02 pattern)

```typescript
// Replace the default fetch-based queryFn with direct Supabase read
const { data: businessUnits } = useQuery<BusinessUnit[]>({
  queryKey: ["business-units"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("business_units")
      .select("*");
    if (error) throw error;
    return data ?? [];
  },
});
```

### Migrated single-item query

```typescript
const { data: document } = useQuery({
  queryKey: ["documents", id],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  },
  enabled: !!id,
});
```

### Auth state change subscription with cache clear (CLNT-04)

```typescript
// Source: Supabase docs — onAuthStateChange event types
// SIGNED_OUT fires on: signOut(), session expiry, timebox, inactivity timeout
const { data: { subscription } } = supabase.auth.onAuthStateChange(
  (event, session) => {
    // SYNCHRONOUS ONLY — no await, no supabase calls inside here
    setSession(session);
    if (event === "SIGNED_OUT") {
      setTimeout(() => queryClient.clear(), 0);
    }
  }
);
// Cleanup on unmount:
return () => subscription.unsubscribe();
```

### Auth UI component (CLNT-05)

```typescript
// Source: @supabase/auth-ui-react npm page, Supabase Auth UI docs
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared"; // NOT from auth-ui-react

<Auth
  supabaseClient={supabase}
  appearance={{
    theme: ThemeSupa,
    variables: {
      default: {
        colors: {
          brand: "hsl(var(--primary))",
          brandAccent: "hsl(var(--primary))",
        },
      },
    },
  }}
  providers={[]}
  view="sign_in"   // "sign_in" | "sign_up" | "forgotten_password"
  showLinks={true} // renders "Forgot password?" and "Sign up" links
/>
```

### Vercel serverless function (individual file pattern)

```typescript
// api/business-units.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../server/storage";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    if (req.query.id) {
      const bu = await storage.getBusinessUnit(Number(req.query.id));
      if (!bu) return res.status(404).json({ message: "Not found" });
      return res.json(bu);
    }
    return res.json(await storage.getBusinessUnits());
  }
  // POST, PUT, DELETE...
  res.status(405).json({ message: "Method not allowed" });
}
```

### Package cleanup (CLNP-02 and CLNP-03)

```bash
# Remove legacy packages
npm uninstall passport passport-local express-session connect-pg-simple memorystore
npm uninstall @aws-sdk/client-s3 @aws-sdk/s3-request-presigner multer @types/multer

# Remove Replit devDependencies
npm uninstall @replit/vite-plugin-cartographer @replit/vite-plugin-dev-banner @replit/vite-plugin-runtime-error-modal
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Express GET routes → fetch in queryFn | Direct `supabase.from().select()` in queryFn | Eliminates ~35 API round-trips through Express/Vercel function; RLS enforced at DB |
| Express monolith as single Vercel function | Individual `/api/*.ts` per route group | Better cold start isolation, Vercel function limits per-function not global |
| Passport.js + express-session | Supabase Auth (JWT + refresh tokens) | Already migrated server-side in Phases 1-3; Phase 4 removes the dead code |
| Multer inline upload → S3 | TUS resumable upload → Supabase Storage | Client already has TUS library (`tus-js-client`) and `storage.ts`; UI just needs updating |

**Deprecated/outdated in this codebase:**
- `script/build.ts`: The esbuild server bundler for Replit deployment — entirely replaced by `scripts/build-api.mjs`; can be deleted
- `server/s3.ts`: Already a stub with a deprecation comment — safe to delete
- `server/vite.ts`: Only used by `server/index.ts` dev server — deleted with it
- `server/static.ts`: Only used by `server/index.ts` production static serving — deleted with it
- `api/_entry.ts`: Re-exports `server/index.ts` for the single-function adapter — deleted when switching to individual functions

---

## Open Questions

1. **Stats endpoint: serverless function or database view?**
   - What we know: `/api/stats` runs 7 separate DB queries then aggregates in JS. As a serverless function it works. As direct Supabase reads it would require 7 parallel queries + client-side aggregation.
   - What's unclear: Whether a Postgres view or function (`supabase.rpc('get_stats')`) would be cleaner long-term.
   - Recommendation: Keep `/api/stats.ts` as a serverless function for Phase 4. A Postgres view is a Phase 5+ optimization.

2. **`/api/document-versions/:id/pdf/to-markdown` route**
   - What we know: This route at line 515 of `routes.ts` fetches a PDF from Supabase Storage, then processes it (likely AI/OCR). It cannot be a direct client read.
   - What's unclear: Whether it belongs in a serverless function file alongside other document-version routes or in a dedicated `api/ai-processing.ts`.
   - Recommendation: Keep with the document-versions serverless function or split to `api/ai-processing.ts` alongside the other AI routes.

3. **vercel.json rewrite strategy during individual function migration**
   - What we know: The current catch-all `/api/(.*)` → `/api` rewrite must be removed when individual function files are added, or Vercel will still route to the old bundle.
   - What's unclear: Whether there's a safe migration order (can old and new coexist?).
   - Recommendation: Remove the API catch-all rewrite in the same commit that adds individual `/api/*.ts` files. The SPA rewrite `/((?!api/).*)` → `/index.html` stays unchanged.

4. **`server/replit_integrations/batch` and `chat` directories**
   - What we know: These exist at `server/replit_integrations/batch/` and `server/replit_integrations/chat/`. CLNP-01 requires removing them.
   - What's unclear: Whether any current Express routes import from these directories.
   - Recommendation: Grep for imports before deleting; likely safe to delete entirely.

---

## Sources

### Primary (HIGH confidence)

- Supabase JS docs — `onAuthStateChange` event types, callback warning (no async), unsubscribe pattern: https://supabase.com/docs/reference/javascript/auth-onauthstatechange
- Codebase inspection — `client/src/lib/supabase.ts`, `client/src/lib/queryClient.ts`, `client/src/lib/storage.ts`, `server/routes.ts` (2358 lines), `server/index.ts`, `vite.config.ts`, `package.json`, `vercel.json`, `scripts/build-api.mjs`
- Supabase React quickstart — session management, `onAuthStateChange` pattern: https://supabase.com/docs/guides/auth/quickstarts/react

### Secondary (MEDIUM confidence)

- `@supabase/auth-ui-react` maintenance mode announcement (Feb 7, 2024), version 0.4.7, ThemeSupa import from `auth-ui-shared` — via npm page and GitHub repo README
- Supabase Auth UI docs — appearance prop, ThemeSupa, view prop: https://supabase.com/docs/guides/auth/auth-helpers/auth-ui
- TanStack Query v5 Supabase integration pattern — `queryFn` with `.from().select().throwOnError()`, `queryClient.clear()` on sign-out: community-verified via multiple sources

### Tertiary (LOW confidence)

- Vercel individual serverless function file structure — multiple community sources consistent but Vercel docs vary; recommend testing `vercel dev` with one pilot function first before full migration

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are already installed or well-documented
- Architecture: HIGH for auth patterns; MEDIUM for serverless restructure (complex, untested in this specific codebase)
- Pitfalls: HIGH — most identified from direct codebase reading, not assumptions

**Research date:** 2026-02-19
**Valid until:** 2026-03-19 (30 days — stable libraries, CLNT patterns are settled)
