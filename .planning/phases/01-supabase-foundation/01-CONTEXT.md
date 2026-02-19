# Phase 1: Supabase Foundation - Context

**Gathered:** 2026-02-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Provision Supabase, migrate the full schema (27+ tables), wire up email/password auth, and deploy RLS policies on all tables. This is the security and data foundation — working auth, enforced tenant isolation, and the role/permission model that everything else depends on.

</domain>

<decisions>
## Implementation Decisions

### Role permissions
- Three roles: Admin, Editor, Viewer
- **Viewer:** Read access to all data within their BU, plus ability to comment/leave notes. Cannot edit, create, or delete documents/policies
- **Editor:** Full content management — can create, edit, and delete documents and policies within their BU. Cannot manage users or BU settings
- **Admin:** Everything an Editor can do, plus user management within their BU — invite users, assign/change roles, remove users. Admin scope is limited to their own BU only (no super-admin concept)
- Role is per-BU — a user can be Admin in BU-A and Viewer in BU-B

### Business unit boundaries
- BU data is isolated by default — users in one BU cannot see another BU's documents, policies, or data
- Shared templates pool: a read-only set of templates/reference policies visible to all BUs (specifics of how these are managed TBD — Claude's discretion based on existing codebase patterns)
- Users can belong to multiple BUs simultaneously, each with an independent role assignment
- Multi-BU users switch context via a BU switcher in the UI — one active BU at a time
- New users must be invited to a BU by an existing Admin — no self-registration into a BU

### Auth behavior
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

</decisions>

<specifics>
## Specific Ideas

No specific references — open to standard approaches for the auth and permission model. Key emphasis: this is an internal business tool, so favor low-friction onboarding (immediate access on invite, long sessions) over aggressive security measures.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-supabase-foundation*
*Context gathered: 2026-02-19*
