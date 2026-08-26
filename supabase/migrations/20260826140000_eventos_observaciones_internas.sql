-- Observaciones internas de eventos (staff: editores / técnicos / FIMBA editor_general).
-- HTML rich-text con imágenes en bucket público `eventos-internas`.
-- Path: eventos/{id|draft-uuid}/{uuid}.ext

alter table public.eventos
  add column if not exists observaciones_internas text;

comment on column public.eventos.observaciones_internas is
  'Notas internas staff (HTML). No exportar a vistas públicas / tokens / consulta.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'eventos-internas',
  'eventos-internas',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "eventos-internas public read" on storage.objects;
create policy "eventos-internas public read"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'eventos-internas');

drop policy if exists "eventos-internas upload" on storage.objects;
create policy "eventos-internas upload"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'eventos-internas'
  and name like 'eventos/%'
);

drop policy if exists "eventos-internas update" on storage.objects;
create policy "eventos-internas update"
on storage.objects
for update
to anon, authenticated
using (bucket_id = 'eventos-internas')
with check (
  bucket_id = 'eventos-internas'
  and name like 'eventos/%'
);

drop policy if exists "eventos-internas delete" on storage.objects;
create policy "eventos-internas delete"
on storage.objects
for delete
to anon, authenticated
using (
  bucket_id = 'eventos-internas'
  and name like 'eventos/%'
);
