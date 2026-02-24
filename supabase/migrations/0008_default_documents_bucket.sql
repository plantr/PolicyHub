-- =============================================
-- DEFAULT "documents" BUCKET + RLS POLICIES
-- =============================================
-- Documents without a business unit use a shared "documents" bucket.
-- All authenticated users can read/write/delete from it.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents', 'documents', false, 10485760,
  ARRAY['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.openxmlformats-officedocument.presentationml.presentation','image/png','image/jpeg']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "documents_bucket_select" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "documents_bucket_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "documents_bucket_delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'documents');
