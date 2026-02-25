-- =============================================
-- RLS POLICIES FOR ALL 33 TABLES
-- =============================================
-- Templates:
--   A: BU-scoped (user must be member of the row's BU)
--   A-shared: BU-scoped with NULL = shared/global (documents)
--   A-indirect: No direct BU column (scope via service role writes, permissive reads)
--   B: Reference/lookup (read-only for all authenticated)
--   C: Special (custom per-table)
--   D: Audit log (read for authenticated, write via service role)
--
-- All policies use TO authenticated — anon role has NO policies (blocked by default)
-- Service role bypasses all RLS by design
--
-- JWT claims path: auth.jwt()->'app_metadata'->'business_units'
-- Each element: {"id": <int>, "role": "admin"|"editor"|"viewer"}

-- =============================================
-- TEMPLATE A: BU-SCOPED (NOT NULL business_unit_id)
-- Tables: addenda, effective_policies, findings, regulatory_profiles
-- =============================================

-- -------------------------------------------------
-- TABLE: addenda
-- -------------------------------------------------

CREATE POLICY "addenda_select" ON public.addenda
FOR SELECT TO authenticated
USING (
  business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
  )
);

CREATE POLICY "addenda_insert" ON public.addenda
FOR INSERT TO authenticated
WITH CHECK (
  business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
);

CREATE POLICY "addenda_update" ON public.addenda
FOR UPDATE TO authenticated
USING (
  business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
)
WITH CHECK (
  business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
);

CREATE POLICY "addenda_delete" ON public.addenda
FOR DELETE TO authenticated
USING (
  business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
);

-- -------------------------------------------------
-- TABLE: effective_policies
-- -------------------------------------------------

CREATE POLICY "effective_policies_select" ON public.effective_policies
FOR SELECT TO authenticated
USING (
  business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
  )
);

CREATE POLICY "effective_policies_insert" ON public.effective_policies
FOR INSERT TO authenticated
WITH CHECK (
  business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
);

CREATE POLICY "effective_policies_update" ON public.effective_policies
FOR UPDATE TO authenticated
USING (
  business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
)
WITH CHECK (
  business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
);

CREATE POLICY "effective_policies_delete" ON public.effective_policies
FOR DELETE TO authenticated
USING (
  business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
);

-- -------------------------------------------------
-- TABLE: findings
-- -------------------------------------------------

CREATE POLICY "findings_select" ON public.findings
FOR SELECT TO authenticated
USING (
  business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
  )
);

CREATE POLICY "findings_insert" ON public.findings
FOR INSERT TO authenticated
WITH CHECK (
  business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
);

CREATE POLICY "findings_update" ON public.findings
FOR UPDATE TO authenticated
USING (
  business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
)
WITH CHECK (
  business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
);

CREATE POLICY "findings_delete" ON public.findings
FOR DELETE TO authenticated
USING (
  business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
);

-- -------------------------------------------------
-- TABLE: regulatory_profiles
-- -------------------------------------------------

CREATE POLICY "regulatory_profiles_select" ON public.regulatory_profiles
FOR SELECT TO authenticated
USING (
  business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
  )
);

CREATE POLICY "regulatory_profiles_insert" ON public.regulatory_profiles
FOR INSERT TO authenticated
WITH CHECK (
  business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
);

CREATE POLICY "regulatory_profiles_update" ON public.regulatory_profiles
FOR UPDATE TO authenticated
USING (
  business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
)
WITH CHECK (
  business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
);

CREATE POLICY "regulatory_profiles_delete" ON public.regulatory_profiles
FOR DELETE TO authenticated
USING (
  business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
);

-- =============================================
-- TEMPLATE A: BU-SCOPED (NULLABLE business_unit_id)
-- NULL rows are readable by all authenticated; NULL rows not writable by authenticated
-- Tables: requirement_mappings, audits, commitments, risks, risk_snapshots
-- =============================================

-- -------------------------------------------------
-- TABLE: requirement_mappings
-- -------------------------------------------------

CREATE POLICY "requirement_mappings_select" ON public.requirement_mappings
FOR SELECT TO authenticated
USING (
  (business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
  ))
  OR business_unit_id IS NULL
);

CREATE POLICY "requirement_mappings_insert" ON public.requirement_mappings
FOR INSERT TO authenticated
WITH CHECK (
  business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
);

CREATE POLICY "requirement_mappings_update" ON public.requirement_mappings
FOR UPDATE TO authenticated
USING (
  business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
)
WITH CHECK (
  business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
);

CREATE POLICY "requirement_mappings_delete" ON public.requirement_mappings
FOR DELETE TO authenticated
USING (
  business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
);

-- -------------------------------------------------
-- TABLE: audits
-- -------------------------------------------------

CREATE POLICY "audits_select" ON public.audits
FOR SELECT TO authenticated
USING (
  (business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
  ))
  OR business_unit_id IS NULL
);

CREATE POLICY "audits_insert" ON public.audits
FOR INSERT TO authenticated
WITH CHECK (
  business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
);

CREATE POLICY "audits_update" ON public.audits
FOR UPDATE TO authenticated
USING (
  business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
)
WITH CHECK (
  business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
);

CREATE POLICY "audits_delete" ON public.audits
FOR DELETE TO authenticated
USING (
  business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
);

-- -------------------------------------------------
-- TABLE: commitments
-- -------------------------------------------------

CREATE POLICY "commitments_select" ON public.commitments
FOR SELECT TO authenticated
USING (
  (business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
  ))
  OR business_unit_id IS NULL
);

CREATE POLICY "commitments_insert" ON public.commitments
FOR INSERT TO authenticated
WITH CHECK (
  business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
);

CREATE POLICY "commitments_update" ON public.commitments
FOR UPDATE TO authenticated
USING (
  business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
)
WITH CHECK (
  business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
);

CREATE POLICY "commitments_delete" ON public.commitments
FOR DELETE TO authenticated
USING (
  business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
);

-- -------------------------------------------------
-- TABLE: risks
-- -------------------------------------------------

CREATE POLICY "risks_select" ON public.risks
FOR SELECT TO authenticated
USING (
  (business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
  ))
  OR business_unit_id IS NULL
);

CREATE POLICY "risks_insert" ON public.risks
FOR INSERT TO authenticated
WITH CHECK (
  business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
);

CREATE POLICY "risks_update" ON public.risks
FOR UPDATE TO authenticated
USING (
  business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
)
WITH CHECK (
  business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
);

CREATE POLICY "risks_delete" ON public.risks
FOR DELETE TO authenticated
USING (
  business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
);

-- -------------------------------------------------
-- TABLE: risk_snapshots
-- -------------------------------------------------

CREATE POLICY "risk_snapshots_select" ON public.risk_snapshots
FOR SELECT TO authenticated
USING (
  (business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
  ))
  OR business_unit_id IS NULL
);

CREATE POLICY "risk_snapshots_insert" ON public.risk_snapshots
FOR INSERT TO authenticated
WITH CHECK (
  business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
);

CREATE POLICY "risk_snapshots_update" ON public.risk_snapshots
FOR UPDATE TO authenticated
USING (
  business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
)
WITH CHECK (
  business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
);

CREATE POLICY "risk_snapshots_delete" ON public.risk_snapshots
FOR DELETE TO authenticated
USING (
  business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
);

-- =============================================
-- TEMPLATE A-SHARED: documents
-- NULL business_unit_id = shared template, visible to all authenticated
-- =============================================

-- -------------------------------------------------
-- TABLE: documents
-- -------------------------------------------------

-- SELECT: BU members see their BU's documents; all authenticated see shared (NULL BU) templates
CREATE POLICY "documents_select" ON public.documents
FOR SELECT TO authenticated
USING (
  (business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
  ))
  OR business_unit_id IS NULL  -- Shared templates visible to all authenticated
);

-- INSERT: editor/admin can write to their own BU's documents only
-- NULL BU documents (shared templates) are service-role-only writes
CREATE POLICY "documents_insert" ON public.documents
FOR INSERT TO authenticated
WITH CHECK (
  business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
);

-- UPDATE: editor/admin can update their own BU's documents only
CREATE POLICY "documents_update" ON public.documents
FOR UPDATE TO authenticated
USING (
  business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
)
WITH CHECK (
  business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
);

-- DELETE: editor/admin can delete their own BU's documents only
CREATE POLICY "documents_delete" ON public.documents
FOR DELETE TO authenticated
USING (
  business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
);

-- =============================================
-- TEMPLATE A-INDIRECT: No direct business_unit_id column
-- Permissive read for all authenticated; writes via service role only
-- Tables: document_versions, review_history, finding_evidence,
--         policy_links, risk_actions, knowledge_base_articles, approvals
-- =============================================

-- -------------------------------------------------
-- TABLE: document_versions (parent: documents)
-- -------------------------------------------------

CREATE POLICY "document_versions_select" ON public.document_versions
FOR SELECT TO authenticated
USING (true);

-- No INSERT/UPDATE/DELETE policies — writes go through service role

-- -------------------------------------------------
-- TABLE: review_history (parent: documents)
-- -------------------------------------------------

CREATE POLICY "review_history_select" ON public.review_history
FOR SELECT TO authenticated
USING (true);

-- No INSERT/UPDATE/DELETE policies — writes go through service role

-- -------------------------------------------------
-- TABLE: finding_evidence (parent: findings)
-- -------------------------------------------------

CREATE POLICY "finding_evidence_select" ON public.finding_evidence
FOR SELECT TO authenticated
USING (true);

-- No INSERT/UPDATE/DELETE policies — writes go through service role

-- -------------------------------------------------
-- TABLE: policy_links (parent: documents)
-- -------------------------------------------------

CREATE POLICY "policy_links_select" ON public.policy_links
FOR SELECT TO authenticated
USING (true);

-- No INSERT/UPDATE/DELETE policies — writes go through service role

-- -------------------------------------------------
-- TABLE: risk_actions (parent: risks)
-- -------------------------------------------------

CREATE POLICY "risk_actions_select" ON public.risk_actions
FOR SELECT TO authenticated
USING (true);

-- No INSERT/UPDATE/DELETE policies — writes go through service role

-- -------------------------------------------------
-- TABLE: knowledge_base_articles (no clear BU parent)
-- -------------------------------------------------

CREATE POLICY "knowledge_base_articles_select" ON public.knowledge_base_articles
FOR SELECT TO authenticated
USING (true);

-- No INSERT/UPDATE/DELETE policies — writes go through service role

-- -------------------------------------------------
-- TABLE: approvals (entity-based, mixed parents)
-- -------------------------------------------------

CREATE POLICY "approvals_select" ON public.approvals
FOR SELECT TO authenticated
USING (true);

-- No INSERT/UPDATE/DELETE policies — writes go through service role

-- =============================================
-- TEMPLATE C: SPECIAL — users table
-- Profile store: users see their own profile and others in their BU
-- =============================================

-- Users can read their own profile
CREATE POLICY "users_select_own" ON public.users
FOR SELECT TO authenticated
USING (auth_user_id = (select auth.uid())::text);

-- Admins and members can read users in their BU
CREATE POLICY "users_select_bu" ON public.users
FOR SELECT TO authenticated
USING (
  business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
  )
);

-- Users can update their own profile
CREATE POLICY "users_update_own" ON public.users
FOR UPDATE TO authenticated
USING (auth_user_id = (select auth.uid())::text)
WITH CHECK (auth_user_id = (select auth.uid())::text);

-- No INSERT/DELETE for authenticated — managed via service role during invite flow

-- =============================================
-- TEMPLATE B: REFERENCE/LOOKUP TABLES
-- Read-only for all authenticated; writes are service-role-only
-- Tables: regulatory_sources, requirements, entity_types, roles, jurisdictions,
--         document_domains, finding_severities, document_statuses,
--         risk_categories, impact_levels, likelihood_levels, risk_library
-- =============================================

-- -------------------------------------------------
-- TABLE: regulatory_sources
-- -------------------------------------------------

CREATE POLICY "regulatory_sources_select" ON public.regulatory_sources
FOR SELECT TO authenticated
USING (true);

-- No INSERT/UPDATE/DELETE policies — service role only

-- -------------------------------------------------
-- TABLE: requirements
-- -------------------------------------------------

CREATE POLICY "requirements_select" ON public.requirements
FOR SELECT TO authenticated
USING (true);

-- No INSERT/UPDATE/DELETE policies — service role only

-- -------------------------------------------------
-- TABLE: entity_types
-- -------------------------------------------------

CREATE POLICY "entity_types_select" ON public.entity_types
FOR SELECT TO authenticated
USING (true);

-- No INSERT/UPDATE/DELETE policies — service role only

-- -------------------------------------------------
-- TABLE: roles
-- -------------------------------------------------

CREATE POLICY "roles_select" ON public.roles
FOR SELECT TO authenticated
USING (true);

-- No INSERT/UPDATE/DELETE policies — service role only

-- -------------------------------------------------
-- TABLE: jurisdictions
-- -------------------------------------------------

CREATE POLICY "jurisdictions_select" ON public.jurisdictions
FOR SELECT TO authenticated
USING (true);

-- No INSERT/UPDATE/DELETE policies — service role only

-- -------------------------------------------------
-- TABLE: document_domains
-- -------------------------------------------------

CREATE POLICY "document_domains_select" ON public.document_domains
FOR SELECT TO authenticated
USING (true);

-- No INSERT/UPDATE/DELETE policies — service role only

-- -------------------------------------------------
-- TABLE: finding_severities
-- -------------------------------------------------

CREATE POLICY "finding_severities_select" ON public.finding_severities
FOR SELECT TO authenticated
USING (true);

-- No INSERT/UPDATE/DELETE policies — service role only

-- -------------------------------------------------
-- TABLE: document_statuses
-- -------------------------------------------------

CREATE POLICY "document_statuses_select" ON public.document_statuses
FOR SELECT TO authenticated
USING (true);

-- No INSERT/UPDATE/DELETE policies — service role only

-- -------------------------------------------------
-- TABLE: risk_categories
-- -------------------------------------------------

CREATE POLICY "risk_categories_select" ON public.risk_categories
FOR SELECT TO authenticated
USING (true);

-- No INSERT/UPDATE/DELETE policies — service role only

-- -------------------------------------------------
-- TABLE: impact_levels
-- -------------------------------------------------

CREATE POLICY "impact_levels_select" ON public.impact_levels
FOR SELECT TO authenticated
USING (true);

-- No INSERT/UPDATE/DELETE policies — service role only

-- -------------------------------------------------
-- TABLE: likelihood_levels
-- -------------------------------------------------

CREATE POLICY "likelihood_levels_select" ON public.likelihood_levels
FOR SELECT TO authenticated
USING (true);

-- No INSERT/UPDATE/DELETE policies — service role only

-- -------------------------------------------------
-- TABLE: risk_library
-- -------------------------------------------------

CREATE POLICY "risk_library_select" ON public.risk_library
FOR SELECT TO authenticated
USING (true);

-- No INSERT/UPDATE/DELETE policies — service role only

-- =============================================
-- TEMPLATE C: SPECIAL — business_units
-- Users see BUs they belong to; no writes from authenticated
-- =============================================

-- Users can read BUs they belong to
CREATE POLICY "business_units_select" ON public.business_units
FOR SELECT TO authenticated
USING (
  id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
  )
);

-- No INSERT/UPDATE/DELETE for authenticated — service role only

-- =============================================
-- TEMPLATE C: SPECIAL — user_business_units
-- Note: supabase_auth_admin_select policy was already added in 0002_auth_hook.sql
-- Adding user-facing policies here
-- =============================================

-- Users can read their own memberships
CREATE POLICY "user_business_units_select_own" ON public.user_business_units
FOR SELECT TO authenticated
USING (user_id = (select auth.uid())::text);

-- Admins can read memberships for BUs they admin
CREATE POLICY "user_business_units_select_admin" ON public.user_business_units
FOR SELECT TO authenticated
USING (
  business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' = 'admin'
  )
);

-- No INSERT/UPDATE/DELETE for authenticated — service role only (invite flow)

-- =============================================
-- TEMPLATE D: AUDIT LOG
-- Permissive read for all authenticated; writes via service role only
-- Phase 1: permissive read; tighten BU-scoping in Phase 4
-- =============================================

-- All authenticated users can read audit log entries
-- Phase 1: permissive read; tighten BU-scoping in Phase 4
CREATE POLICY "audit_log_select" ON public.audit_log
FOR SELECT TO authenticated
USING (true);

-- No INSERT/UPDATE/DELETE for authenticated — service role writes audit entries

-- =============================================
-- VERIFICATION
-- =============================================
-- After applying this migration, run:
--   SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false;
-- Expected: zero rows
--
-- To verify policies exist on a table:
--   SELECT policyname, cmd, roles FROM pg_policies WHERE tablename = '{table}';
--
-- To list all policies across all tables:
--   SELECT tablename, policyname, cmd, roles FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;
