-- Viáticos manual: perfiles y guardado en la nube (login OTP propio, RLS por usuario).

create table if not exists public.viaticos_manual_usuario (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  nombre text not null default '',
  apellido text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.viaticos_manual_viatico (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  etiqueta text not null default '',
  datos jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.viaticos_manual_rendicion (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  viatico_origen_id uuid references public.viaticos_manual_viatico(id) on delete set null,
  etiqueta text not null default '',
  datos jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists viaticos_manual_viatico_usuario_created_idx
  on public.viaticos_manual_viatico (usuario_id, created_at desc);

create index if not exists viaticos_manual_rendicion_usuario_created_idx
  on public.viaticos_manual_rendicion (usuario_id, created_at desc);

drop trigger if exists viaticos_manual_usuario_touch_updated_at on public.viaticos_manual_usuario;
create trigger viaticos_manual_usuario_touch_updated_at
  before update on public.viaticos_manual_usuario
  for each row execute function public.entrada_touch_updated_at();

drop trigger if exists viaticos_manual_viatico_touch_updated_at on public.viaticos_manual_viatico;
create trigger viaticos_manual_viatico_touch_updated_at
  before update on public.viaticos_manual_viatico
  for each row execute function public.entrada_touch_updated_at();

drop trigger if exists viaticos_manual_rendicion_touch_updated_at on public.viaticos_manual_rendicion;
create trigger viaticos_manual_rendicion_touch_updated_at
  before update on public.viaticos_manual_rendicion
  for each row execute function public.entrada_touch_updated_at();

create or replace function public.viaticos_manual_ensure_profile(
  p_nombre text,
  p_apellido text
)
returns public.viaticos_manual_usuario
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user auth.users;
  v_profile public.viaticos_manual_usuario;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  select * into v_user from auth.users where id = auth.uid();
  if v_user.id is null then
    raise exception 'Usuario auth no encontrado';
  end if;

  insert into public.viaticos_manual_usuario (id, email, nombre, apellido)
  values (
    auth.uid(),
    lower(coalesce(v_user.email, '')),
    coalesce(nullif(trim(p_nombre), ''), ''),
    coalesce(nullif(trim(p_apellido), ''), '')
  )
  on conflict (id) do update
  set
    nombre = excluded.nombre,
    apellido = excluded.apellido,
    email = excluded.email
  returning * into v_profile;

  return v_profile;
end;
$$;

grant execute on function public.viaticos_manual_ensure_profile(text, text) to authenticated;

alter table public.viaticos_manual_usuario enable row level security;
alter table public.viaticos_manual_viatico enable row level security;
alter table public.viaticos_manual_rendicion enable row level security;

drop policy if exists viaticos_manual_usuario_select_own on public.viaticos_manual_usuario;
create policy viaticos_manual_usuario_select_own
  on public.viaticos_manual_usuario
  for select
  to authenticated
  using (id = auth.uid());

drop policy if exists viaticos_manual_usuario_insert_own on public.viaticos_manual_usuario;
create policy viaticos_manual_usuario_insert_own
  on public.viaticos_manual_usuario
  for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists viaticos_manual_usuario_update_own on public.viaticos_manual_usuario;
create policy viaticos_manual_usuario_update_own
  on public.viaticos_manual_usuario
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists viaticos_manual_viatico_select_own on public.viaticos_manual_viatico;
create policy viaticos_manual_viatico_select_own
  on public.viaticos_manual_viatico
  for select
  to authenticated
  using (usuario_id = auth.uid());

drop policy if exists viaticos_manual_viatico_insert_own on public.viaticos_manual_viatico;
create policy viaticos_manual_viatico_insert_own
  on public.viaticos_manual_viatico
  for insert
  to authenticated
  with check (usuario_id = auth.uid());

drop policy if exists viaticos_manual_viatico_update_own on public.viaticos_manual_viatico;
create policy viaticos_manual_viatico_update_own
  on public.viaticos_manual_viatico
  for update
  to authenticated
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

drop policy if exists viaticos_manual_viatico_delete_own on public.viaticos_manual_viatico;
create policy viaticos_manual_viatico_delete_own
  on public.viaticos_manual_viatico
  for delete
  to authenticated
  using (usuario_id = auth.uid());

drop policy if exists viaticos_manual_rendicion_select_own on public.viaticos_manual_rendicion;
create policy viaticos_manual_rendicion_select_own
  on public.viaticos_manual_rendicion
  for select
  to authenticated
  using (usuario_id = auth.uid());

drop policy if exists viaticos_manual_rendicion_insert_own on public.viaticos_manual_rendicion;
create policy viaticos_manual_rendicion_insert_own
  on public.viaticos_manual_rendicion
  for insert
  to authenticated
  with check (usuario_id = auth.uid());

drop policy if exists viaticos_manual_rendicion_update_own on public.viaticos_manual_rendicion;
create policy viaticos_manual_rendicion_update_own
  on public.viaticos_manual_rendicion
  for update
  to authenticated
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

drop policy if exists viaticos_manual_rendicion_delete_own on public.viaticos_manual_rendicion;
create policy viaticos_manual_rendicion_delete_own
  on public.viaticos_manual_rendicion
  for delete
  to authenticated
  using (usuario_id = auth.uid());

comment on table public.viaticos_manual_usuario is 'Perfil mínimo para la herramienta pública de viáticos manual.';
comment on table public.viaticos_manual_viatico is 'Viáticos guardados en la nube por usuario (formulario completo en JSONB).';
comment on table public.viaticos_manual_rendicion is 'Rendiciones guardadas en la nube por usuario (base + ant/rend en JSONB).';
