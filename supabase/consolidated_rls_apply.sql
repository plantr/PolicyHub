-- =============================================
-- CONSOLIDATED RLS MIGRATION
-- Safe to run against the current database state
-- Idempotent: uses DROP POLICY IF EXISTS before CREATE
-- =============================================
-- Run this in the Supabase Dashboard SQL Editor as a single transaction.

BEGIN;

-- =============================================
-- STEP 1: ENABLE RLS ON ALL 33 PUBLIC TABLES
-- =============================================

ALTER TABLE public.addenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.control_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.effective_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finding_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finding_severities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impact_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jurisdictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likelihood_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regulatory_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regulatory_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_business_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_jobs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- STEP 2: CUSTOM ACCESS TOKEN HOOK
-- =============================================

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims         JSONB;
  bu_memberships JSONB;
BEGIN
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

  IF jsonb_typeof(claims->'app_metadata') IS NULL THEN
    claims := jsonb_set(claims, '{app_metadata}', '{}');
  END IF;

  claims := jsonb_set(claims, '{app_metadata,business_units}', bu_memberships);

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

DROP POLICY IF EXISTS "supabase_auth_admin_select" ON public.user_business_units;
CREATE POLICY "supabase_auth_admin_select" ON public.user_business_units
FOR SELECT TO supabase_auth_admin
USING (true);

GRANT SELECT ON TABLE public.user_business_units TO supabase_auth_admin;

-- =============================================
-- STEP 3: RLS POLICIES — TEMPLATE A (BU-SCOPED, NOT NULL business_unit_id)
-- Tables: addenda, effective_policies, findings, regulatory_profiles
-- =============================================

-- addenda
DROP POLICY IF EXISTS "addenda_select" ON public.addenda;
DROP POLICY IF EXISTS "addenda_insert" ON public.addenda;
DROP POLICY IF EXISTS "addenda_update" ON public.addenda;
DROP POLICY IF EXISTS "addenda_delete" ON public.addenda;

CREATE POLICY "addenda_select" ON public.addenda
FOR SELECT TO authenticated
USING (
  business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)
    ) AS elem
  )
);

CREATE POLICY "addenda_insert" ON public.addenda
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

CREATE POLICY "addenda_update" ON public.addenda
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

CREATE POLICY "addenda_delete" ON public.addenda
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

-- effective_policies
DROP POLICY IF EXISTS "effective_policies_select" ON public.effective_policies;
DROP POLICY IF EXISTS "effective_policies_insert" ON public.effective_policies;
DROP POLICY IF EXISTS "effective_policies_update" ON public.effective_policies;
DROP POLICY IF EXISTS "effective_policies_delete" ON public.effective_policies;

CREATE POLICY "effective_policies_select" ON public.effective_policies
FOR SELECT TO authenticated
USING (
  business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)
    ) AS elem
  )
);

CREATE POLICY "effective_policies_insert" ON public.effective_policies
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

CREATE POLICY "effective_policies_update" ON public.effective_policies
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

CREATE POLICY "effective_policies_delete" ON public.effective_policies
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

-- findings
DROP POLICY IF EXISTS "findings_select" ON public.findings;
DROP POLICY IF EXISTS "findings_insert" ON public.findings;
DROP POLICY IF EXISTS "findings_update" ON public.findings;
DROP POLICY IF EXISTS "findings_delete" ON public.findings;

CREATE POLICY "findings_select" ON public.findings
FOR SELECT TO authenticated
USING (
  business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)
    ) AS elem
  )
);

CREATE POLICY "findings_insert" ON public.findings
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

CREATE POLICY "findings_update" ON public.findings
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

CREATE POLICY "findings_delete" ON public.findings
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

-- regulatory_profiles
DROP POLICY IF EXISTS "regulatory_profiles_select" ON public.regulatory_profiles;
DROP POLICY IF EXISTS "regulatory_profiles_insert" ON public.regulatory_profiles;
DROP POLICY IF EXISTS "regulatory_profiles_update" ON public.regulatory_profiles;
DROP POLICY IF EXISTS "regulatory_profiles_delete" ON public.regulatory_profiles;

CREATE POLICY "regulatory_profiles_select" ON public.regulatory_profiles
FOR SELECT TO authenticated
USING (
  business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)
    ) AS elem
  )
);

CREATE POLICY "regulatory_profiles_insert" ON public.regulatory_profiles
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

CREATE POLICY "regulatory_profiles_update" ON public.regulatory_profiles
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

CREATE POLICY "regulatory_profiles_delete" ON public.regulatory_profiles
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

-- =============================================
-- STEP 4: RLS POLICIES — TEMPLATE A-SHARED (NULLABLE business_unit_id)
-- Tables: control_mappings, audits, commitments, risks, risk_snapshots
-- =============================================

-- control_mappings (renamed from requirement_mappings)
DROP POLICY IF EXISTS "control_mappings_select" ON public.control_mappings;
DROP POLICY IF EXISTS "control_mappings_insert" ON public.control_mappings;
DROP POLICY IF EXISTS "control_mappings_update" ON public.control_mappings;
DROP POLICY IF EXISTS "control_mappings_delete" ON public.control_mappings;

CREATE POLICY "control_mappings_select" ON public.control_mappings
FOR SELECT TO authenticated
USING (
  (business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)
    ) AS elem
  ))
  OR business_unit_id IS NULL
);

CREATE POLICY "control_mappings_insert" ON public.control_mappings
FOR INSERT TO authenticated
WITH CHECK (
  business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
);

CREATE POLICY "control_mappings_update" ON public.control_mappings
FOR UPDATE TO authenticated
USING (
  business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
)
WITH CHECK (
  business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
);

CREATE POLICY "control_mappings_delete" ON public.control_mappings
FOR DELETE TO authenticated
USING (
  business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
);

-- audits
DROP POLICY IF EXISTS "audits_select" ON public.audits;
DROP POLICY IF EXISTS "audits_insert" ON public.audits;
DROP POLICY IF EXISTS "audits_update" ON public.audits;
DROP POLICY IF EXISTS "audits_delete" ON public.audits;

CREATE POLICY "audits_select" ON public.audits
FOR SELECT TO authenticated
USING (
  (business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)
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
      COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)
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
      COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
)
WITH CHECK (
  business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)
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
      COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
);

-- commitments
DROP POLICY IF EXISTS "commitments_select" ON public.commitments;
DROP POLICY IF EXISTS "commitments_insert" ON public.commitments;
DROP POLICY IF EXISTS "commitments_update" ON public.commitments;
DROP POLICY IF EXISTS "commitments_delete" ON public.commitments;

CREATE POLICY "commitments_select" ON public.commitments
FOR SELECT TO authenticated
USING (
  (business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)
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
      COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)
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
      COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
)
WITH CHECK (
  business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)
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
      COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
);

-- risks
DROP POLICY IF EXISTS "risks_select" ON public.risks;
DROP POLICY IF EXISTS "risks_insert" ON public.risks;
DROP POLICY IF EXISTS "risks_update" ON public.risks;
DROP POLICY IF EXISTS "risks_delete" ON public.risks;

CREATE POLICY "risks_select" ON public.risks
FOR SELECT TO authenticated
USING (
  (business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)
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
      COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)
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
      COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
)
WITH CHECK (
  business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)
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
      COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
);

-- risk_snapshots
DROP POLICY IF EXISTS "risk_snapshots_select" ON public.risk_snapshots;
DROP POLICY IF EXISTS "risk_snapshots_insert" ON public.risk_snapshots;
DROP POLICY IF EXISTS "risk_snapshots_update" ON public.risk_snapshots;
DROP POLICY IF EXISTS "risk_snapshots_delete" ON public.risk_snapshots;

CREATE POLICY "risk_snapshots_select" ON public.risk_snapshots
FOR SELECT TO authenticated
USING (
  (business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)
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
      COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)
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
      COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
)
WITH CHECK (
  business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)
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
      COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
);

-- =============================================
-- STEP 5: RLS POLICIES — DOCUMENTS (shared templates)
-- =============================================

DROP POLICY IF EXISTS "documents_select" ON public.documents;
DROP POLICY IF EXISTS "documents_insert" ON public.documents;
DROP POLICY IF EXISTS "documents_update" ON public.documents;
DROP POLICY IF EXISTS "documents_delete" ON public.documents;

CREATE POLICY "documents_select" ON public.documents
FOR SELECT TO authenticated
USING (
  (business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)
    ) AS elem
  ))
  OR business_unit_id IS NULL
);

CREATE POLICY "documents_insert" ON public.documents
FOR INSERT TO authenticated
WITH CHECK (
  business_unit_id IS NOT NULL AND business_unit_id = ANY(
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
  business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
)
WITH CHECK (
  business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
);

CREATE POLICY "documents_delete" ON public.documents
FOR DELETE TO authenticated
USING (
  business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)
    ) AS elem
    WHERE elem->>'role' IN ('admin', 'editor')
  )
);

-- =============================================
-- STEP 6: RLS POLICIES — INDIRECT TABLES (permissive read, service-role writes)
-- Tables: document_versions, review_history, finding_evidence,
--         policy_links, risk_actions, knowledge_base_articles, approvals
-- =============================================

DROP POLICY IF EXISTS "document_versions_select" ON public.document_versions;
CREATE POLICY "document_versions_select" ON public.document_versions
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "review_history_select" ON public.review_history;
CREATE POLICY "review_history_select" ON public.review_history
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "finding_evidence_select" ON public.finding_evidence;
CREATE POLICY "finding_evidence_select" ON public.finding_evidence
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "policy_links_select" ON public.policy_links;
CREATE POLICY "policy_links_select" ON public.policy_links
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "risk_actions_select" ON public.risk_actions;
CREATE POLICY "risk_actions_select" ON public.risk_actions
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "knowledge_base_articles_select" ON public.knowledge_base_articles;
CREATE POLICY "knowledge_base_articles_select" ON public.knowledge_base_articles
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "approvals_select" ON public.approvals;
CREATE POLICY "approvals_select" ON public.approvals
FOR SELECT TO authenticated
USING (true);

-- =============================================
-- STEP 7: RLS POLICIES — SPECIAL TABLES
-- =============================================

-- users
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_select_bu" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;

CREATE POLICY "users_select_own" ON public.users
FOR SELECT TO authenticated
USING (auth_user_id = auth.uid()::text);

CREATE POLICY "users_select_bu" ON public.users
FOR SELECT TO authenticated
USING (
  business_unit_id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)
    ) AS elem
  )
);

CREATE POLICY "users_update_own" ON public.users
FOR UPDATE TO authenticated
USING (auth_user_id = auth.uid()::text)
WITH CHECK (auth_user_id = auth.uid()::text);

-- business_units
DROP POLICY IF EXISTS "business_units_select" ON public.business_units;
CREATE POLICY "business_units_select" ON public.business_units
FOR SELECT TO authenticated
USING (
  id = ANY(
    SELECT (elem->>'id')::int
    FROM jsonb_array_elements(
      COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)
    ) AS elem
  )
);

-- user_business_units
DROP POLICY IF EXISTS "user_business_units_select_own" ON public.user_business_units;
DROP POLICY IF EXISTS "user_business_units_select_admin" ON public.user_business_units;

CREATE POLICY "user_business_units_select_own" ON public.user_business_units
FOR SELECT TO authenticated
USING (user_id = auth.uid()::text);

CREATE POLICY "user_business_units_select_admin" ON public.user_business_units
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

-- =============================================
-- STEP 8: RLS POLICIES — REFERENCE/LOOKUP TABLES (read-only)
-- =============================================

DROP POLICY IF EXISTS "controls_select" ON public.controls;
CREATE POLICY "controls_select" ON public.controls
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "regulatory_sources_select" ON public.regulatory_sources;
CREATE POLICY "regulatory_sources_select" ON public.regulatory_sources
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "entity_types_select" ON public.entity_types;
CREATE POLICY "entity_types_select" ON public.entity_types
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "roles_select" ON public.roles;
CREATE POLICY "roles_select" ON public.roles
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "jurisdictions_select" ON public.jurisdictions;
CREATE POLICY "jurisdictions_select" ON public.jurisdictions
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "document_categories_select" ON public.document_categories;
CREATE POLICY "document_categories_select" ON public.document_categories
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "finding_severities_select" ON public.finding_severities;
CREATE POLICY "finding_severities_select" ON public.finding_severities
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "document_statuses_select" ON public.document_statuses;
CREATE POLICY "document_statuses_select" ON public.document_statuses
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "risk_categories_select" ON public.risk_categories;
CREATE POLICY "risk_categories_select" ON public.risk_categories
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "impact_levels_select" ON public.impact_levels;
CREATE POLICY "impact_levels_select" ON public.impact_levels
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "likelihood_levels_select" ON public.likelihood_levels;
CREATE POLICY "likelihood_levels_select" ON public.likelihood_levels
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "risk_library_select" ON public.risk_library;
CREATE POLICY "risk_library_select" ON public.risk_library
FOR SELECT TO authenticated
USING (true);

-- =============================================
-- STEP 9: RLS POLICIES — AUDIT LOG
-- =============================================

DROP POLICY IF EXISTS "audit_log_select" ON public.audit_log;
CREATE POLICY "audit_log_select" ON public.audit_log
FOR SELECT TO authenticated
USING (true);

-- =============================================
-- STEP 10: RLS POLICIES — AI JOBS
-- =============================================

DROP POLICY IF EXISTS "ai_jobs_select_authenticated" ON public.ai_jobs;
CREATE POLICY "ai_jobs_select_authenticated" ON public.ai_jobs
FOR SELECT TO authenticated
USING (true);

-- =============================================
-- STEP 11: STORAGE BUCKETS
-- =============================================

-- Per-BU private buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
SELECT
  'bu-' || id::text,
  'bu-' || id::text,
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/png',
    'image/jpeg'
  ]
FROM public.business_units
ON CONFLICT (id) DO NOTHING;

-- Shared documents bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents', 'documents', false, 10485760,
  ARRAY['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.openxmlformats-officedocument.presentationml.presentation','image/png','image/jpeg']
)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- STEP 12: STORAGE RLS POLICIES
-- =============================================

-- Per-BU bucket policies
DROP POLICY IF EXISTS "storage_objects_select" ON storage.objects;
CREATE POLICY "storage_objects_select" ON storage.objects
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM jsonb_array_elements(
      COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)
    ) AS elem
    WHERE ('bu-' || (elem->>'id')::text) = bucket_id
  )
);

DROP POLICY IF EXISTS "storage_objects_insert" ON storage.objects;
CREATE POLICY "storage_objects_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM jsonb_array_elements(
      COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)
    ) AS elem
    WHERE ('bu-' || (elem->>'id')::text) = bucket_id
      AND elem->>'role' IN ('admin', 'editor')
  )
);

DROP POLICY IF EXISTS "storage_objects_delete" ON storage.objects;
CREATE POLICY "storage_objects_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM jsonb_array_elements(
      COALESCE(auth.jwt()->'app_metadata'->'business_units', '[]'::jsonb)
    ) AS elem
    WHERE ('bu-' || (elem->>'id')::text) = bucket_id
      AND elem->>'role' IN ('admin', 'editor')
  )
);

-- Shared documents bucket policies
DROP POLICY IF EXISTS "documents_bucket_select" ON storage.objects;
CREATE POLICY "documents_bucket_select" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "documents_bucket_insert" ON storage.objects;
CREATE POLICY "documents_bucket_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "documents_bucket_delete" ON storage.objects;
CREATE POLICY "documents_bucket_delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'documents');

-- =============================================
-- VERIFICATION QUERIES (run after to confirm)
-- =============================================
-- Check no tables remain without RLS:
--   SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false;
-- Expected: zero rows
--
-- List all policies:
--   SELECT tablename, policyname, cmd, roles FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;

COMMIT;
