-- Permite que usuarios autenticados suban y borren archivos en musician-docs.
-- Mantiene lectura pública del bucket.

drop policy if exists "Subida Anónima" on storage.objects;
create policy "Subida Anónima"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'musician-docs');

drop policy if exists "Borrado Público" on storage.objects;
create policy "Borrado Público"
on storage.objects
for delete
to anon, authenticated
using (bucket_id = 'musician-docs');
