-- =============================================
-- STORAGE BUCKETS: Per-business-unit private buckets
-- =============================================
-- Creates one private Supabase Storage bucket per existing business unit.
-- Bucket naming: bu-{id} (e.g., bu-1, bu-42)
--   - Lowercase + hyphens, satisfies 3-63 char constraint
--   - id and name both set to bu-{id} (Supabase requires both fields)
-- Settings:
--   - public = false (signed URLs required for all access)
--   - file_size_limit = 10485760 (10 MB)
--   - allowed_mime_types = PDF, Word, Excel, PowerPoint, PNG, JPEG
-- Idempotent: ON CONFLICT (id) DO NOTHING

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
