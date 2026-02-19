# Phase 1: Supabase Foundation - Research

**Researched:** 2026-02-19
**Domain:** Supabase project provisioning, schema migration via Drizzle, email/password auth, Custom Access Token Hook, RLS policies (32 tables)
**Confidence:** HIGH — all core findings verified against official Supabase docs and Drizzle docs

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Role permissions:**
- Three roles: Admin, Editor, Viewer
- Viewer: Read access to all data within their BU, plus ability to comment/leave notes. Cannot edit, create, or delete documents/policies
- Editor: Full content management — can create, edit, and delete documents and policies within their BU. Cannot manage users or BU settings
- Admin: Everything an Editor can do, plus user management within their BU — invite users, assign/change roles, remove users. Admin scope is limited to their own BU only (no super-admin concept)
- Role is per-BU — a user can be Admin in BU-A and Viewer in BU-B

**Business unit boundaries:**
- BU data is isolated by default — users in one BU cannot see another BU's documents, policies, or data
- Shared templates pool: a read-only set of templates/reference policies visible to all BUs (specifics of how these are managed TBD — Claude's discretion based on existing codebase patterns)
- Users can belong to multiple BUs simultaneously, each with an independent role assignment
- Multi-BU users switch context via a BU switcher in the UI — one active BU at a time
- New users must be invited to a BU by an existing Admin — no self-registration into a BU

**Auth behavior:**
- Email/password only (v1 — Google SSO deferred per project decisions)
- No email confirmation required — invited users can log in immediately
- Long-lived sessions (7-30 days) — users stay logged in unless they explicitly log out. Typical internal tool behavior
- No failed login lockout or rate limiting for v1
- Password reset via email link (per phase success criteria)

### Claude's Discretion
- Password policy strength (reasonable defaults for an enterprise app)
- Shared template management mechanism (research existing codebase patterns first)
- Exact session duration within the 7-30 day range
- Email template design for invitations and password reset
- Loading/error states for auth flows

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-01 | PostgreSQL database provisioned on Supabase with schema migrated from Drizzle definitions | Drizzle-to-Supabase migration workflow: `drizzle-kit generate` → SQL migrations applied via direct connection (port 5432) |
| INFRA-02 | Transaction-mode connection pooling (port 6543) configured for serverless function access | Supabase Supavisor transaction mode; `{ prepare: false }` in postgres.js client |
| INFRA-03 | Drizzle ORM configured with `prepare: false` for pooler compatibility | Verified in official Drizzle + Supabase docs; one-line fix in db.ts |
| INFRA-04 | Separate direct connection URL (port 5432) configured for Drizzle Kit migrations | Two-URL pattern: `DATABASE_URL` (pooler) + `DATABASE_URL_DIRECT` (direct); documented in drizzle.config.ts update |
| INFRA-05 | Custom SMTP provider configured for Supabase Auth emails (default 2/hour is insufficient) | Project Settings → Auth → SMTP; Resend recommended; 30/hr limit after custom SMTP |
| AUTH-01 | User can sign up with email and password via Supabase Auth | `supabase.auth.signInWithPassword()` — standard email provider; no additional setup beyond enabling email auth |
| AUTH-02 | User receives email confirmation after signup | Per locked decision: email confirmation disabled. Invited users get invitation email (different flow) via `inviteUserByEmail()` |
| AUTH-03 | User can reset password via email link | `supabase.auth.resetPasswordForEmail()` — built-in; requires SMTP configured (INFRA-05) |
| AUTH-04 | User session persists across browser refresh via Supabase JS auto-refresh | `@supabase/supabase-js` auto-refresh built in; access token max 7 days (JWT max), refresh token never expires — set JWT expiry to 7 days, rely on refresh token for 30-day feel |
| AUTH-05 | Custom Access Token Hook injects business unit IDs and role into JWT from `app_metadata` | PL/pgSQL hook reads `user_business_units` table; injects per-BU role map into `app_metadata` claims |
| AUTH-06 | Admin can assign users to business units with specific roles (admin/editor/viewer) | `inviteUserByEmail()` + admin API to write to `user_business_units` table; role stored in that table, injected into JWT on next login |
| RLS-01 | Row Level Security enabled on all database tables (27+) | `ALTER TABLE x ENABLE ROW LEVEL SECURITY;` — 32 tables in this schema; verified count |
| RLS-02 | RLS policies scope data access by business unit using JWT claims from `app_metadata` | `auth.jwt()->'app_metadata'->'business_unit_ids'` + `ANY()` inverted pattern for performance |
| RLS-03 | Anonymous (unauthenticated) access blocked on all tables | `TO authenticated` clause on all policies + no permissive policies for `anon` role |
| RLS-04 | Service role bypass available for serverless functions (AI endpoints, admin operations) | Service role client created with `SUPABASE_SERVICE_ROLE_KEY`; bypasses RLS by design |
| RLS-05 | RLS policies use inverted query pattern to avoid N+1 performance degradation | `business_unit_id = ANY((auth.jwt()->'app_metadata'->'business_unit_ids')::int[])` — no subquery join |
| RLS-06 | All tables verified via `pg_tables WHERE rowsecurity = false` query returns zero rows | Acceptance test query documented; run after all migrations applied |
</phase_requirements>

---

## Summary

Phase 1 establishes everything the rest of the migration depends on: a provisioned Supabase project, the 32-table schema migrated from Drizzle, working email/password auth with a Custom Access Token Hook that injects per-BU role claims, and RLS policies on every table enforcing BU isolation. No phase after this can be safely built without it.

The schema migration is straightforward — the existing `shared/schema.ts` Drizzle definitions can generate SQL migrations via `drizzle-kit generate`, which are then applied to Supabase via the direct connection URL (port 5432). After the schema lands, three additional migration files cover the foundational concerns: enabling RLS on all 32 tables, adding RLS policies per table, and installing the Custom Access Token Hook.

The central complexity of this phase is the **multi-BU JWT design**. Because a user can have different roles in different BUs (Admin in BU-A, Viewer in BU-B), the JWT must carry a per-BU role map, not a single flat role. The hook reads from a new `user_business_units` table that acts as the source of truth for all assignments. RLS policies must handle the multi-BU case using `ANY()` against an integer array extracted from the JWT claims — this is the key performance pattern to get right.

**Primary recommendation:** Build the schema migration, then the auth hook and `user_business_units` table, then RLS policies. Validate each layer with the acceptance test query before moving on. Do not defer the `prepare: false` config — it must be in place before any Vercel function queries the database.

---

## Standard Stack

### Core (already installed or being added in this phase)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `drizzle-orm` | 0.39.3 (installed) | Type-safe ORM; schema remains the TypeScript source of truth | Already in codebase; generates DDL migrations via `drizzle-kit generate` |
| `drizzle-kit` | 0.31.8 (installed) | Generates SQL migration files from schema, applies via `drizzle-kit migrate` | Already in codebase; use `migrate` not `push` for Supabase |
| `postgres` (postgres.js) | latest | PostgreSQL driver for Drizzle when using Supabase pooler | Required by `drizzle-orm/postgres-js`; replaces the existing `pg` package |
| `@supabase/supabase-js` | 2.97.0 | Supabase client — auth, database, storage | The single library for all Supabase interactions; auto-refresh built in |

### New in This Phase

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `postgres` | ^3.x | Replace `pg` as the Drizzle driver | `{ prepare: false }` flag required for transaction-mode pooler |
| `@supabase/supabase-js` | 2.97.0 | Auth client in React; admin API in server functions | Install now; used fully in Phase 4 but auth setup happens here |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `drizzle-kit generate` + `migrate` | `drizzle-kit push` | `push` is fine for prototyping but doesn't produce auditable migration files. Use `generate`+`migrate` for Supabase — migrations become part of the codebase |
| `postgres` (postgres.js) driver | `pg` (node-postgres) | `pg` is already installed but requires different pooling config and is less actively maintained for this pattern. Switch to `postgres` when updating Drizzle connection |
| Custom Access Token Hook (PL/pgSQL) | HTTP hook (external endpoint) | HTTP hook adds network latency on every login; PL/pgSQL runs in-database, zero latency, no external dependency. Use PL/pgSQL for this use case |

**Installation:**
```bash
# Replace pg with postgres.js for Drizzle pooler compatibility
npm install postgres
npm uninstall pg

# Supabase client (if not yet installed)
npm install @supabase/supabase-js
```

---

## Architecture Patterns

### Recommended File Structure for This Phase

```
Policy-Hub/
├── shared/
│   └── schema.ts              # Unchanged — stays as TypeScript source of truth
├── drizzle.config.ts          # UPDATE: switch DATABASE_URL → DATABASE_URL_DIRECT
├── migrations/                # GENERATED: drizzle-kit generate creates these
│   └── 0000_initial.sql       # Schema DDL from existing Drizzle definitions
├── supabase/
│   └── migrations/            # Additional SQL for RLS (written by hand)
│       ├── 0001_enable_rls.sql        # ALTER TABLE ... ENABLE ROW LEVEL SECURITY for all 32 tables
│       ├── 0002_rls_policies.sql      # Per-table RLS policies
│       └── 0003_auth_hook.sql         # Custom Access Token Hook function
└── server/
    └── db.ts                  # UPDATE: switch to postgres.js + { prepare: false }
```

### Pattern 1: Two-URL Database Configuration

**What:** Drizzle Kit migrations require a direct PostgreSQL connection (port 5432 — prepared statements work). Vercel serverless functions must use the transaction-mode pooler (port 6543 — no prepared statements). Two env vars, two use cases.

**Example — Updated `drizzle.config.ts`:**
```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './shared/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // Direct connection (port 5432) — supports prepared statements for migrations
    url: process.env.DATABASE_URL_DIRECT!,
  },
});
```

**Example — Updated `server/db.ts` (or future `api/lib/db.ts`):**
```typescript
// server/db.ts — transaction-mode pooler for runtime queries
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@shared/schema';

// Transaction pooler (port 6543) — { prepare: false } REQUIRED
const client = postgres(process.env.DATABASE_URL!, { prepare: false });
export const db = drizzle({ client, schema });
```

### Pattern 2: user_business_units Table (New Schema Addition)

**What:** This is the source of truth for all BU membership and role assignments. The existing `users` table in `shared/schema.ts` has a single `businessUnitId` integer and a single `role` text field — this is incompatible with the multi-BU requirement. A new junction table is needed.

The existing `users` table in `shared/schema.ts` references Passport-era design. For Phase 1, we need to add a `user_business_units` table that:
- Links `auth.users` (Supabase Auth UUID) to `business_units` (integer ID)
- Carries the role per assignment (admin/editor/viewer)
- Is the table the Custom Access Token Hook reads from

**Example — New table to add to schema:**
```typescript
// Add to shared/schema.ts
export const userBusinessUnits = pgTable("user_business_units", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),        // auth.users.id (UUID as text)
  businessUnitId: integer("business_unit_id").notNull().references(() => businessUnits.id),
  role: text("role").notNull(),              // 'admin' | 'editor' | 'viewer'
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  uniq: unique().on(t.userId, t.businessUnitId),
}));
```

**Note on existing `users` table:** The existing `public.users` table stores profile data (name, job title, etc.) and was designed without Supabase Auth in mind. It should be retained as a profile store but its `role` and `businessUnitId` columns become redundant — the `user_business_units` table takes over as the authoritative source. The existing `users` table should grow a `auth_user_id` column (text, referencing `auth.users.id`) to link profiles to auth identities.

### Pattern 3: Custom Access Token Hook (Per-BU Role Map)

**What:** A PL/pgSQL function that Supabase Auth invokes before issuing every JWT. It reads from `user_business_units` and injects a per-BU role map into `app_metadata` claims. The `app_metadata` field is server-controlled — users cannot modify it via the Supabase JS client.

**Why per-BU map instead of single active BU:** The user decides their active BU in the UI (BU switcher). If we only inject the active BU's role, we'd need to force a re-login every time they switch. Instead, inject all their BU memberships; the application selects the active one from the list. RLS policies grant access to all BUs the user belongs to simultaneously (the table filtering still works correctly — a document belongs to one BU and the user either is or isn't in it).

**JWT claims structure after hook:**
```json
{
  "sub": "user-uuid-here",
  "email": "user@example.com",
  "role": "authenticated",
  "app_metadata": {
    "provider": "email",
    "business_units": [
      { "id": 1, "role": "admin" },
      { "id": 3, "role": "viewer" }
    ]
  }
}
```

**Full PL/pgSQL hook implementation:**
```sql
-- supabase/migrations/0003_auth_hook.sql

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE  -- reads DB, doesn't write
AS $$
DECLARE
  claims         JSONB;
  bu_memberships JSONB;
BEGIN
  -- Build array of {id, role} objects for all BU memberships
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object('id', business_unit_id, 'role', role)
      ORDER BY business_unit_id
    ),
    '[]'::jsonb
  )
  INTO bu_memberships
  FROM public.user_business_units
  WHERE user_id = (event->>'user_id');

  claims := event->'claims';

  -- Ensure app_metadata exists
  IF jsonb_typeof(claims->'app_metadata') IS NULL THEN
    claims := jsonb_set(claims, '{app_metadata}', '{}');
  END IF;

  -- Inject business_units array into app_metadata
  claims := jsonb_set(claims, '{app_metadata,business_units}', bu_memberships);

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Required permissions
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

-- Hook needs SELECT on user_business_units
GRANT SELECT ON TABLE public.user_business_units TO supabase_auth_admin;
```

**Enable in dashboard:** Authentication > Hooks > Custom Access Token → select `public.custom_access_token_hook`.

### Pattern 4: RLS Policy Templates

**What:** RLS policies follow three templates depending on table type. Apply the correct template to each of the 32 tables.

**Template A — BU-scoped tables (most tables):**
These tables have a `business_unit_id integer` column. Access is granted only if the user has a membership in that BU.

```sql
-- documents table example — apply same pattern to all BU-scoped tables
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- SELECT: any role in the BU can read
CREATE POLICY "documents_select" ON public.documents
FOR SELECT TO authenticated
USING (
  business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)
    ) AS elem
  )
);

-- INSERT/UPDATE: editor or admin only, WITH CHECK enforces BU ownership on new rows
CREATE POLICY "documents_insert" ON public.documents
FOR INSERT TO authenticated
WITH CHECK (
  business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
);

CREATE POLICY "documents_update" ON public.documents
FOR UPDATE TO authenticated
USING (
  business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
)
WITH CHECK (
  business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
);

-- DELETE: editor or admin only
CREATE POLICY "documents_delete" ON public.documents
FOR DELETE TO authenticated
USING (
  business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
);
```

**Template B — Reference/lookup tables (no BU column, globally shared):**
Tables like `regulatory_sources`, `requirements`, `roles`, `jurisdictions`, `entity_types`, `document_categories`, `finding_severities`, `document_statuses`, `risk_categories`, `impact_levels`, `likelihood_levels`, `risk_library`. These are read-only for all authenticated users; writes go through service role only.

```sql
ALTER TABLE public.jurisdictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jurisdictions_select" ON public.jurisdictions
FOR SELECT TO authenticated
USING (true);

-- No INSERT/UPDATE/DELETE policies — service role only via admin client
```

**Template C — User-scoped tables:**
The `user_business_units` table itself and the `users` profile table need special handling.

```sql
ALTER TABLE public.user_business_units ENABLE ROW LEVEL SECURITY;

-- Users can read their own memberships
CREATE POLICY "ub_select_own" ON public.user_business_units
FOR SELECT TO authenticated
USING (user_id = auth.uid()::text);

-- Admins can read memberships for their BUs (needed for admin user management)
CREATE POLICY "ub_select_admin" ON public.user_business_units
FOR SELECT TO authenticated
USING (
  business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' = 'admin'
  )
);

-- Writes to user_business_units: service role only (admin operations via serverless function)
-- No INSERT/UPDATE/DELETE policies for 'authenticated' role
```

**Template D — Audit log (insert-only for authenticated, service role for all):**
```sql
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Users can read audit entries for their BUs
CREATE POLICY "audit_select" ON public.audit_log
FOR SELECT TO authenticated
USING (
  entity_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)
    ) AS elem
  )
  OR entity_type = 'business_unit'  -- simplification; may need refinement per entity_type
);
-- All writes via service role only
```

### Pattern 5: Invite Flow for New Users

**What:** Admins invite users via email. Invited user clicks link, sets password, immediately has access to the BU. No separate email confirmation step.

**Flow:**
1. Admin (in UI) submits email + BU + role to a serverless endpoint
2. Serverless function (service role) calls `supabase.auth.admin.inviteUserByEmail(email, { data: { invited_by_bu: buId } })`
3. Supabase sends invitation email with a magic link
4. User clicks link → lands on a "set your password" page (custom UI)
5. After password set, `user_business_units` row is created (either in a webhook or after the admin pre-creates it)
6. User can immediately log in — JWT is issued with their BU memberships on first login

**Auth configuration for this flow:**
- **Confirm email: OFF** — invited users must not need to verify email again after the invite link
- The `inviteUserByEmail()` method itself sends the invitation email; it's not the same as the signup confirmation email

**Important:** The `user_business_units` row should be created **before or during** the invite (not after login), so the hook can inject the correct claims on first login. Create it server-side in the invite endpoint using the service role client, using the user's UUID from the `inviteUserByEmail()` response.

### Pattern 6: Shared Templates Pool

**Recommendation (Claude's discretion):** Looking at the existing codebase, the `documents` table has a `businessUnitId` column that is nullable (`integer("business_unit_id")`). This is already the right hook for shared templates — a `business_unit_id = NULL` document is a shared/global template visible to all authenticated users.

Implementation: Add a special RLS policy clause for null BU documents:

```sql
-- documents_select policy (extends Template A above):
CREATE POLICY "documents_select" ON public.documents
FOR SELECT TO authenticated
USING (
  -- Private BU documents: user must be in that BU
  (business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)
    ) AS elem
  ))
  OR
  -- Shared templates: visible to all authenticated users
  business_unit_id IS NULL
);
```

Writes to shared templates (NULL BU documents) are blocked for all authenticated users — only service role can create/modify them. This matches "TBD — Claude's discretion" from CONTEXT.md and leverages the existing nullable column without schema changes.

### Anti-Patterns to Avoid

- **user_metadata for roles:** `auth.jwt()->'user_metadata'->'role'` is user-controllable; anyone can escalate to admin via browser console. Always use `app_metadata` (injected server-side by the hook).
- **Service role in client:** Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser. It bypasses all RLS.
- **Missing WITH CHECK:** An INSERT policy without `WITH CHECK` lets authenticated users insert rows with any `business_unit_id` — including BUs they don't belong to. Every INSERT/UPDATE policy needs both `USING` and `WITH CHECK`.
- **`drizzle-kit push` for Supabase:** `push` works but silently drops/recreates objects in some edge cases. Use `generate` + `migrate` for a Supabase project. Push is fine locally with the Supabase CLI's local stack.
- **Testing RLS in SQL Editor:** The Supabase SQL Editor runs as the `postgres` superuser, which bypasses all RLS. Always test policies with an authenticated Supabase JS client.
- **Leaving `pg` package:** The existing `server/db.ts` uses `pg` with `drizzle-orm/node-postgres`. When switching to Supabase's transaction pooler, replace with `postgres` (postgres.js) and `drizzle-orm/postgres-js`. The `pg` driver has different pooling behavior and isn't the recommended path for this setup.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email delivery for auth | Custom email sending logic | Supabase Auth SMTP integration | Auth triggers (confirmation, reset, invite) are built into GoTrue; just configure the SMTP provider |
| Password reset flow | Custom token generation and validation | `supabase.auth.resetPasswordForEmail()` + `supabase.auth.updateUser()` | Supabase handles the secure token, expiry, and one-time-use semantics |
| JWT refresh | Manual token refresh on expiry | `@supabase/supabase-js` auto-refresh | The client library proactively refreshes before expiry; no application code needed |
| User invitation | Custom invite token system | `supabase.auth.admin.inviteUserByEmail()` | GoTrue handles the secure invite link; just call the admin API |
| Session persistence | localStorage management | Supabase JS client storage adapter | Default localStorage persistence with auto-restore across refresh; built in |
| RLS per-request user context | Passing user ID to every query | Supabase JS client with user JWT | PostgREST injects the user's JWT; RLS policies run automatically via `auth.jwt()` |

---

## Common Pitfalls

### Pitfall 1: JWT claims not refreshed after BU assignment

**What goes wrong:** Admin assigns user to a BU. User is already logged in. Their JWT still has the old `business_units` list. They can't see the new BU's data until they log out and back in (or the JWT refreshes).

**Why it happens:** JWTs are stateless — the hook only runs at token issuance. Updating `user_business_units` doesn't retroactively change the issued token.

**How to avoid:** After a BU assignment change, force a session refresh for the affected user. Options:
1. Call `supabase.auth.admin.deleteUserSessions(userId)` from the serverless endpoint after modifying `user_business_units` — forces re-login
2. Or, notify the client via a mechanism (out of scope for Phase 1) to call `supabase.auth.refreshSession()`

For Phase 1 (foundation only), document the behavior and use option 1 for the invite flow where the user is logging in fresh anyway. JWT staleness for existing sessions is a Phase 4 concern (UI handles the BU switcher).

**Warning signs:** User is assigned to BU but gets empty results from BU-scoped queries.

### Pitfall 2: Drizzle `prepare: false` omitted

**What goes wrong:** `prepared statement "d1" already exists` errors in Vercel serverless functions under load. Works fine locally.

**Why it happens:** Transaction-mode pooler (port 6543) doesn't support prepared statements. The `postgres` driver uses them by default.

**How to avoid:** Set `{ prepare: false }` in the postgres client — see Pattern 1 above. Must be in place before any Vercel function is deployed.

**Warning signs:** Errors appear only in production, never in local development.

### Pitfall 3: RLS blocks the hook's SELECT on user_business_units

**What goes wrong:** The auth hook runs as `supabase_auth_admin`. If `user_business_units` has RLS enabled, the hook's SELECT will return nothing unless the hook's role has explicit SELECT permission.

**Why it happens:** RLS applies to all roles including `supabase_auth_admin` unless explicitly excepted.

**How to avoid:** After enabling RLS on `user_business_units`, grant `supabase_auth_admin` SELECT via a policy or direct grant:

```sql
-- Option A: Grant via policy (preferred — keeps RLS uniform)
CREATE POLICY "supabase_auth_admin_select" ON public.user_business_units
FOR SELECT TO supabase_auth_admin
USING (true);

-- Option B: GRANT SELECT (bypasses RLS entirely for this role)
GRANT SELECT ON public.user_business_units TO supabase_auth_admin;
```

Option A is shown in the Supabase RBAC docs example.

**Warning signs:** Hook runs but `bu_memberships` is always `[]`; decoded JWT shows empty `business_units` array.

### Pitfall 4: Missing WITH CHECK on write policies

**What goes wrong:** Users can insert a `document` with any `business_unit_id`, including BUs they don't belong to. An editor in BU-1 could create a document in BU-2.

**Why it happens:** The `USING` clause in `FOR INSERT` governs which rows the user can "see" during the insert check, but without `WITH CHECK`, the new row data is not validated.

**How to avoid:** Every INSERT and UPDATE policy must have a `WITH CHECK` clause that mirrors the `USING` clause. See Template A above.

**Warning signs:** Cross-BU data appears; documents with wrong `business_unit_id` in the database.

### Pitfall 5: Supabase default email rate limit (2/hour) blocks testing

**What goes wrong:** Testing invite flow and password reset during development exhausts the 2 emails/hour default limit. After that, no auth emails are delivered.

**Why it happens:** The Supabase built-in email provider is for demo use only.

**How to avoid:** Configure custom SMTP before any auth email testing. Resend is the simplest option — free tier supports 3,000 emails/month, 100/day. Set up early in the phase.

**Warning signs:** `inviteUserByEmail()` returns no error but email never arrives.

### Pitfall 6: auth.uid() returns UUID but user_business_units.user_id is text

**What goes wrong:** `WHERE user_id = auth.uid()` type mismatch because `auth.uid()` returns `uuid` type but the column is `text`.

**Why it happens:** The existing schema uses `text` for foreign keys to `auth.users` (which are UUIDs). PostgreSQL won't implicitly cast `uuid` to `text` in comparisons.

**How to avoid:** Cast explicitly: `WHERE user_id = auth.uid()::text` in RLS policies and hook queries.

### Pitfall 7: 32 tables — easy to miss one

**What goes wrong:** One table is left without RLS enabled. The verification query returns a row. The phase acceptance criterion fails.

**Why it happens:** 32 tables is a lot to manually enable. Easy to miss a lookup table.

**How to avoid:** Write a single migration that enables RLS on all 32 tables in one block. Run the verification query `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false` as a mandatory step before phase sign-off.

---

## Code Examples

Verified patterns from official sources:

### Auth Client Setup (React)
```typescript
// client/src/lib/supabase.ts
// Source: Supabase docs - Creating a Supabase client
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);
// Auto-refresh is ON by default — sessions persist across page refresh
```

### Sign In
```typescript
// Source: Supabase docs - Email/Password auth
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password',
});
// data.session contains the JWT; data.user contains user info
```

### Password Reset
```typescript
// Source: Supabase docs - resetPasswordForEmail
const { error } = await supabase.auth.resetPasswordForEmail(
  'user@example.com',
  { redirectTo: 'https://your-app.vercel.app/reset-password' }
);
```

### Admin: Invite User (from serverless function)
```typescript
// Source: Supabase docs - inviteUserByEmail
// Requires service role client
const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
  'user@example.com',
  { redirectTo: 'https://your-app.vercel.app/set-password' }
);
// data.user.id is the new user's UUID — use it to create user_business_units row
```

### Create user_business_units row after invite
```typescript
// Immediately after inviteUserByEmail, create the BU membership
const { error: memberError } = await supabaseAdmin
  .from('user_business_units')
  .insert({
    user_id: data.user.id,          // UUID from invite response
    business_unit_id: targetBuId,
    role: 'editor',                  // admin-selected role
  });
```

### Enable RLS — All 32 Tables
```sql
-- supabase/migrations/0001_enable_rls.sql
ALTER TABLE public.business_units         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regulatory_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regulatory_sources     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirements           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addenda                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.effective_policies     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_history         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirement_mappings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.findings               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finding_evidence       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_links           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audits                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commitments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risks                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_library           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_actions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_snapshots         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_categories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impact_levels          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likelihood_levels      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_types           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jurisdictions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finding_severities     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_statuses      ENABLE ROW LEVEL SECURITY;
-- Also: user_business_units (new table added in this phase)
ALTER TABLE public.user_business_units    ENABLE ROW LEVEL SECURITY;
```

### Acceptance Test Query
```sql
-- This MUST return zero rows at phase completion
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false;
```

### Decode JWT claims in React (to read business_units)
```typescript
// The custom claims are in the JWT; decode from session
import { jwtDecode } from 'jwt-decode';

const session = await supabase.auth.getSession();
if (session.data.session) {
  const decoded = jwtDecode(session.data.session.access_token);
  const businessUnits = decoded.app_metadata?.business_units;
  // [{ id: 1, role: 'admin' }, { id: 3, role: 'viewer' }]
}

// Or subscribe to auth state changes:
supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    const decoded = jwtDecode(session.access_token);
    const businessUnits = decoded.app_metadata?.business_units ?? [];
  }
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `anon` key for Supabase client | `sb_publishable_xxx` / `PUBLISHABLE_KEY` | Post-May 2025 (new projects) | New Supabase projects use `SUPABASE_PUBLISHABLE_KEY` not `SUPABASE_ANON_KEY`. The Vercel Marketplace integration auto-populates the correct var names. |
| `@supabase/auth-helpers-react` | `@supabase/ssr` (or base `supabase-js` for SPA) | 2023–2024 | The entire `auth-helpers-*` family is deprecated. For this pure SPA (no Next.js), use base `@supabase/supabase-js` directly — no `@supabase/ssr` needed. |
| `drizzle-kit push` for production | `drizzle-kit generate` + `drizzle-kit migrate` | Drizzle stable | `push` is for local dev only. Supabase needs generated SQL files — they're auditable, version-controlled, and applied via the migration runner. |
| `pg` (node-postgres) | `postgres` (postgres.js) | Current Drizzle recommendation | Drizzle's Supabase tutorials show the `postgres` driver. Required for `drizzle-orm/postgres-js` adapter and cleaner pooler config. |

**Deprecated/outdated in this codebase:**
- `server/db.ts` using `drizzle-orm/node-postgres` with `pg`: replace with `drizzle-orm/postgres-js` + `postgres`
- `connect-pg-simple` and `express-session` in package.json: Supabase Auth replaces session middleware entirely (Phase 4 cleanup)
- `passport` and `passport-local`: same — removed in Phase 4 cleanup
- `memorystore`: same — removed in Phase 4 cleanup

---

## Table Classification for RLS

All 32 existing tables, classified by which RLS template applies:

| Template | Tables | Access Pattern |
|----------|--------|----------------|
| **A — BU-scoped** (full CRUD per role) | `documents`, `document_versions`, `addenda`, `effective_policies`, `approvals`, `review_history`, `requirement_mappings`, `findings`, `finding_evidence`, `policy_links`, `audits`, `commitments`, `knowledge_base_articles`, `risks`, `risk_actions`, `risk_snapshots`, `regulatory_profiles`, `users` | SELECT: any BU member; INSERT/UPDATE/DELETE: editor/admin in BU |
| **B — Reference** (read-only for authenticated) | `regulatory_sources`, `requirements`, `entity_types`, `roles`, `jurisdictions`, `document_categories`, `finding_severities`, `document_statuses`, `risk_categories`, `impact_levels`, `likelihood_levels`, `risk_library` | SELECT: all authenticated; no writes via API |
| **C — Special** | `business_units`, `user_business_units`, `audit_log` | Custom policies per table |
| **NEW** | `user_business_units` | User reads own; admin reads BU's; service role writes |

**Notes on classification edge cases:**
- `business_units`: Users can read BUs they belong to. Admins cannot create BUs (no super-admin). Service role only for create/delete.
- `audit_log`: `entity_id` refers to mixed entity types, making BU-scoping complex. For Phase 1: allow authenticated users to select where `entity_type = 'business_unit'` and `entity_id = ANY(their_bu_ids)`. Refine in later phases.
- `regulatory_sources` and `requirements`: These are global reference data — not per-BU. All authenticated users can read.
- `risk_library`: Same as above — shared reference data.

---

## Auth Configuration Settings

Recommended configuration for this internal enterprise tool:

| Setting | Value | Location | Reason |
|---------|-------|----------|--------|
| Confirm email | **OFF** | Auth > General | Invited users log in immediately — no confirmation step |
| JWT Expiry | **604800 seconds (7 days)** | Auth > Sessions | Maximum allowed by Supabase. Refresh tokens never expire and auto-refresh keeps sessions alive indefinitely — this achieves the 7-30 day feel |
| Inactivity timeout | **0 (disabled)** | Auth > Sessions | Internal tool; users should stay logged in as long as they use the app |
| Allow new user signup | **OFF** | Auth > General | No self-registration — invite-only flow enforced at DB level (no signup UI) and at policy level |
| Anonymous sign-ins | **OFF** | Auth > General | Not applicable |
| Password minimum length | **8 characters** | Auth > Passwords | Reasonable enterprise default; complexity rules (mixed case, number) optional |

**Note on JWT max expiry being 7 days:** The user decision said "7-30 days." Supabase's maximum JWT expiry is 7 days (604,800 seconds). However, because Supabase JS client auto-refreshes using the refresh token (which never expires), users effectively stay logged in indefinitely as long as they use the app regularly. The 7-day JWT expiry is the right setting — it's not visible to users.

---

## Custom SMTP Configuration

**Required before testing any auth email flow.**

Navigate to: Supabase Dashboard → Project Settings → Auth → SMTP

| Field | Value |
|-------|-------|
| Enable Custom SMTP | ON |
| SMTP Host | `smtp.resend.com` (Resend) |
| SMTP Port | `587` |
| SMTP User | `resend` |
| SMTP Password | `[Resend API key]` |
| Sender Email | `noreply@[your-domain]` |
| Sender Name | `Policy Hub` |

**Resend recommended** (Claude's discretion): Developer-friendly, free tier (3,000/month), purpose-built for transactional email, good deliverability. Alternative: Postmark or AWS SES if already used elsewhere.

**After custom SMTP:** The rate limit increases from 2/hour to 30/hour by default. For an internal tool with small invite volume this is sufficient.

---

## Open Questions

1. **Multi-BU JWT size**
   - What we know: JWT claims have no hard size limit in Supabase, but JWTs are sent in every request header
   - What's unclear: If a user belongs to many BUs (e.g., 20+), the JWT grows significantly
   - Recommendation: For v1 with few BUs, this is not a concern. If BU count grows beyond ~10 per user, consider switching to a lookup-on-every-request pattern instead of JWT-embedded array

2. **RLS for audit_log with mixed entity types**
   - What we know: `audit_log.entity_type` is a text field that could be "document", "business_unit", "finding", etc.; `entity_id` refers to the primary key of whatever entity
   - What's unclear: A user in BU-1 should see audit entries for BU-1's documents, but `entity_id` is just an integer — it doesn't directly say which BU the entity belongs to
   - Recommendation: For Phase 1, use a permissive policy (all authenticated can read all audit entries) and tighten in Phase 4 when the full data model is better understood. This is a compliance concern, not a blocking issue for the foundation phase.

3. **users profile table vs auth.users**
   - What we know: The existing `public.users` table has `role` and `businessUnitId` columns that are made redundant by `user_business_units`
   - What's unclear: Should `public.users` be kept as a profile store (linked by `auth_user_id`) or collapsed?
   - Recommendation: Keep `public.users` as the profile store. Add an `auth_user_id text` column to link it to `auth.users`. Remove the `role` and `businessUnitId` columns or leave them deprecated. The `user_business_units` table takes over as the authoritative source. Defer profile table cleanup to Phase 4.

4. **Password set flow after invite**
   - What we know: `inviteUserByEmail()` sends an email with a magic link; user clicks it and is redirected to `redirectTo` URL
   - What's unclear: The exact flow for setting a password after clicking the invite link (is it `updateUser()` with a new password, or does Supabase show its own form?)
   - Recommendation: The invite link sets a session; the app's "set password" page calls `supabase.auth.updateUser({ password: newPassword })`. Build a minimal React page for this in Phase 1's auth UI tasks.

---

## Sources

### Primary (HIGH confidence)
- [Supabase Docs — Auth Hooks](https://supabase.com/docs/guides/auth/auth-hooks) — custom access token hook setup, GRANT/REVOKE requirements
- [Supabase Docs — Custom Access Token Hook](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook) — function signature, event structure, claims injection
- [Supabase Docs — Custom Claims & RBAC](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac) — RBAC pattern with hook, user_roles table, authorize() function pattern
- [Supabase Docs — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) — USING/WITH CHECK, inverted subquery pattern, TO authenticated clause
- [Supabase Docs — RLS Performance and Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) — inverted query 99.78% improvement claim
- [Supabase Docs — General Auth Configuration](https://supabase.com/docs/guides/auth/general-configuration) — confirm email toggle, session settings
- [Supabase Docs — User Sessions](https://supabase.com/docs/guides/auth/sessions) — JWT vs refresh token lifetimes, inactivity timeout, auto-refresh behavior
- [Supabase Docs — JWT Claims Reference](https://supabase.com/docs/guides/auth/jwt-fields) — app_metadata vs user_metadata, path syntax for RLS
- [Supabase Docs — Send emails with custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp) — SMTP configuration fields, recommended providers
- [Supabase Docs — inviteUserByEmail](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail) — invite API, PKCE limitation
- [Supabase Docs — createUser (admin)](https://supabase.com/docs/reference/javascript/auth-admin-createuser) — email_confirm flag, user_metadata
- [Drizzle Docs — Get Started with Supabase (existing project)](https://orm.drizzle.team/docs/get-started/supabase-existing) — postgres.js driver, prepare:false, migration workflow

### Secondary (MEDIUM confidence)
- [GitHub Supabase Discussions — Custom claims for multi tenancy](https://github.com/orgs/supabase/discussions/1148) — community patterns for multi-tenant JWT claims
- [Resend Docs — Send emails using Supabase with SMTP](https://resend.com/docs/send-with-supabase-smtp) — Resend as SMTP provider for Supabase Auth

### Existing Project Research (HIGH confidence — from prior phase research)
- `.planning/research/PITFALLS.md` — Drizzle RLS bypass (superuser role), user_metadata RBAC bypass, prepared statement errors, RLS N+1 pattern, missing WITH CHECK pitfall
- `.planning/research/STACK.md` — postgres.js driver, two-URL pattern, prepare:false requirement, supabase-js v2.97.0
- `.planning/research/ARCHITECTURE.md` — Custom Access Token Hook flow, build order for Phase 1

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified against official Drizzle and Supabase docs
- Auth hook implementation: HIGH — function signature and GRANT/REVOKE from official docs; per-BU claims structure is author's synthesis based on documented patterns
- RLS policies: HIGH — template patterns from official docs; table classification is analysis of existing schema
- Session configuration: HIGH — JWT 7-day max verified; refresh token behavior verified
- SMTP/email: HIGH — Supabase SMTP setup verified; Resend recommendation is Claude's discretion (MEDIUM)
- Audit log RLS: LOW — mixed entity_type table makes BU-scoping ambiguous; recommendation to defer is pragmatic

**Research date:** 2026-02-19
**Valid until:** 2026-05-19 (90 days — Supabase auth hook API is stable; JWT/RLS patterns are stable)
