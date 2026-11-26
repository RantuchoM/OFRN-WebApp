-- firmas: subida/borrado estaban solo para rol anon.
-- El formulario de integrantes usa sesión authenticated, así que remove/upload
-- fallaban en silencio (el cliente no chequeaba error de Storage).

DROP POLICY IF EXISTS "Subida Firmas" ON storage.objects;
CREATE POLICY "Subida Firmas"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'firmas');

DROP POLICY IF EXISTS "Borrado Firmas" ON storage.objects;
CREATE POLICY "Borrado Firmas"
ON storage.objects
FOR DELETE
TO anon, authenticated
USING (bucket_id = 'firmas');

-- Upsert / reemplazo de objeto (crop o re-subida con mismo path).
DROP POLICY IF EXISTS "Actualizacion Firmas" ON storage.objects;
CREATE POLICY "Actualizacion Firmas"
ON storage.objects
FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'firmas')
WITH CHECK (bucket_id = 'firmas');
