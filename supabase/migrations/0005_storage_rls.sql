-- =============================================
-- RLS POLICIES FOR storage.objects
-- =============================================
-- Restricts access to storage objects by business unit membership.
-- Bucket naming: bu-{id} matches JWT claims where elem->>'id' = BU id.
--
-- JWT claims path (same as Phase 1):
--   auth.jwt()->'app_metadata'->'business_units'
--   Each element: {"id": <int>, "role": "admin"|"editor"|"viewer"}
--
-- Policies:
--   SELECT: any BU member (viewer/editor/admin) can download
--   INSERT: only editor/admin can upload
--   DELETE: only editor/admin can delete
--
-- No UPDATE policy: files are immutable.
-- Version "updates" create new files via the version suffix pattern.
--
-- All policies use COALESCE with '[]'::jsonb default (Phase 1 pattern).
-- This prevents null errors for users with no BU memberships.

-- -------------------------------------------------
-- SELECT (download): any BU member can read
-- -------------------------------------------------

CREATE POLICY "storage_objects_select" ON storage.objects
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
    WHERE ('bu-' || (elem->>'id')::text) = bucket_id
  )
);

-- -------------------------------------------------
-- INSERT (upload): editor/admin only
-- -------------------------------------------------

CREATE POLICY "storage_objects_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
    WHERE ('bu-' || (elem->>'id')::text) = bucket_id
      AND elem->>'role' IN ('admin', 'editor')
  )
);

-- -------------------------------------------------
-- DELETE: editor/admin only
-- -------------------------------------------------

CREATE POLICY "storage_objects_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM jsonb_array_elements(
      COALESCE((select auth.jwt()->'app_metadata'->'business_units'), '[]'::jsonb)
    ) AS elem
    WHERE ('bu-' || (elem->>'id')::text) = bucket_id
      AND elem->>'role' IN ('admin', 'editor')
  )
);
