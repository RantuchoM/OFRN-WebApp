-- FIMBA rider images (Quill inline <img>).
-- Bucket público: URLs durables para ficha, consulta RO y PDF/print (sin signed URL que expire).
-- Escritura: anon + authenticated. FIMBA editor_general usa la anon key (sin JWT de Auth);
-- el gate de producto es canEditPropuestaMeta. Path: edicion/{id}/propuesta/{id}/{uuid}.ext

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'fimba-riders',
  'fimba-riders',
  true,
  8388608,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "fimba-riders public read" ON storage.objects;
CREATE POLICY "fimba-riders public read"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'fimba-riders');

DROP POLICY IF EXISTS "fimba-riders upload" ON storage.objects;
CREATE POLICY "fimba-riders upload"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'fimba-riders'
  AND name LIKE 'edicion/%/propuesta/%'
);

DROP POLICY IF EXISTS "fimba-riders update" ON storage.objects;
CREATE POLICY "fimba-riders update"
ON storage.objects
FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'fimba-riders')
WITH CHECK (
  bucket_id = 'fimba-riders'
  AND name LIKE 'edicion/%/propuesta/%'
);

DROP POLICY IF EXISTS "fimba-riders delete" ON storage.objects;
CREATE POLICY "fimba-riders delete"
ON storage.objects
FOR DELETE
TO anon, authenticated
USING (
  bucket_id = 'fimba-riders'
  AND name LIKE 'edicion/%/propuesta/%'
);
