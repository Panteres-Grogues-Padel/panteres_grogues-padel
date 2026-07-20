-- Bucket público per PDFs de normativa (Utilitats)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,
  10485760,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Documents public read" ON storage.objects;
CREATE POLICY "Documents public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents');
