-- Rename "requirements" table and related objects to "controls"
-- This migration renames tables, columns, and RLS policies.

-- =============================================
-- 1. Drop existing RLS policies (old names)
-- =============================================

DROP POLICY IF EXISTS "requirements_select" ON public.requirements;
DROP POLICY IF EXISTS "requirement_mappings_select" ON public.requirement_mappings;
DROP POLICY IF EXISTS "requirement_mappings_insert" ON public.requirement_mappings;
DROP POLICY IF EXISTS "requirement_mappings_update" ON public.requirement_mappings;
DROP POLICY IF EXISTS "requirement_mappings_delete" ON public.requirement_mappings;

-- =============================================
-- 2. Rename tables
-- =============================================

ALTER TABLE public.requirements RENAME TO controls;
ALTER TABLE public.requirement_mappings RENAME TO control_mappings;

-- =============================================
-- 3. Rename foreign-key columns
-- =============================================

ALTER TABLE public.control_mappings RENAME COLUMN requirement_id TO control_id;
ALTER TABLE public.findings RENAME COLUMN requirement_id TO control_id;
ALTER TABLE public.risks RENAME COLUMN requirement_id TO control_id;

-- =============================================
-- 4. Re-create RLS policies with new names
-- =============================================

-- controls (read-only for authenticated, writes via service role)
CREATE POLICY "controls_select" ON public.controls
FOR SELECT TO authenticated
USING (true);

-- control_mappings (BU-scoped)
CREATE POLICY "control_mappings_select" ON public.control_mappings
FOR SELECT TO authenticated
USING (
  (business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT ubu.business_unit_id
    FROM public.user_business_units ubu
    WHERE ubu.user_id = (SELECT auth.uid()::text)
  ))
  OR business_unit_id IS NULL
);

CREATE POLICY "control_mappings_insert" ON public.control_mappings
FOR INSERT TO authenticated
WITH CHECK (
  business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT ubu.business_unit_id
    FROM public.user_business_units ubu
    WHERE ubu.user_id = (SELECT auth.uid()::text)
      AND ubu.role IN ('admin', 'editor')
  )
);

CREATE POLICY "control_mappings_update" ON public.control_mappings
FOR UPDATE TO authenticated
USING (
  business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT ubu.business_unit_id
    FROM public.user_business_units ubu
    WHERE ubu.user_id = (SELECT auth.uid()::text)
      AND ubu.role IN ('admin', 'editor')
  )
)
WITH CHECK (
  business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT ubu.business_unit_id
    FROM public.user_business_units ubu
    WHERE ubu.user_id = (SELECT auth.uid()::text)
      AND ubu.role IN ('admin', 'editor')
  )
);

CREATE POLICY "control_mappings_delete" ON public.control_mappings
FOR DELETE TO authenticated
USING (
  business_unit_id IS NOT NULL AND business_unit_id = ANY(
    SELECT ubu.business_unit_id
    FROM public.user_business_units ubu
    WHERE ubu.user_id = (SELECT auth.uid()::text)
      AND ubu.role IN ('admin', 'editor')
  )
);
