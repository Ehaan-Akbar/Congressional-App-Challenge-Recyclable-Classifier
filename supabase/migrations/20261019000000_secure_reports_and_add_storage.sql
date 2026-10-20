-- Reports are public submissions. Only trusted dashboard/server operators
-- may update or delete them; visitors may read and submit open reports.
DROP POLICY IF EXISTS "public_update_reports" ON public.trash_reports;
DROP POLICY IF EXISTS "public_delete_reports" ON public.trash_reports;
DROP POLICY IF EXISTS "public_insert_reports" ON public.trash_reports;
CREATE POLICY "public_insert_reports" ON public.trash_reports FOR INSERT
TO anon, authenticated WITH CHECK (
  status = 'open'
  AND length(trim(title)) BETWEEN 1 AND 200
  AND length(trim(description)) BETWEEN 1 AND 10000
  AND category IN ('illegal_dumping', 'litter', 'pollution', 'hazardous_waste', 'graffiti', 'other')
  AND latitude BETWEEN -90 AND 90
  AND longitude BETWEEN -180 AND 180
);

GRANT SELECT, INSERT ON public.trash_reports TO anon, authenticated;
REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.trash_reports FROM anon, authenticated;

-- Photos are public, matching reports displayed on the map and community feed.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'report-images', 'report-images', true, 5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "public_upload_report_images" ON storage.objects FOR INSERT
TO anon, authenticated WITH CHECK (
  bucket_id = 'report-images'
  AND (storage.foldername(name))[1] = 'reports'
);
