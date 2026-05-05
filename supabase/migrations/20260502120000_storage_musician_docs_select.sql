-- Lectura en Storage (necesaria para createSignedUrl / download desde el cliente con JWT).
drop policy if exists "Lectura musician-docs" on storage.objects;
create policy "Lectura musician-docs"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'musician-docs');
