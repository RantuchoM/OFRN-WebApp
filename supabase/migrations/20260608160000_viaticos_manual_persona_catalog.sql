-- Catálogo comunitario de personas y localidades para viáticos/rendiciones manual.
-- Se alimenta automáticamente con los datos que cargan los usuarios autenticados.

create table if not exists public.viaticos_manual_persona (
  id uuid primary key default gen_random_uuid(),
  apellido text not null default '',
  nombre text not null default '',
  dni text not null default '',
  cargo text not null default '',
  jornada_laboral text not null default '',
  ciudad_origen text not null default '',
  asiento_habitual text not null default '',
  valor_diario_base numeric,
  aportes integer not null default 1,
  ultimo_usuario_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint viaticos_manual_persona_nombre_chk check (
    trim(apellido) <> '' and trim(nombre) <> ''
  )
);

create unique index if not exists viaticos_manual_persona_dni_uidx
  on public.viaticos_manual_persona (lower(trim(dni)))
  where trim(dni) <> '';

create unique index if not exists viaticos_manual_persona_nombre_uidx
  on public.viaticos_manual_persona (lower(trim(apellido)), lower(trim(nombre)))
  where trim(dni) = '';

create index if not exists viaticos_manual_persona_updated_idx
  on public.viaticos_manual_persona (updated_at desc);

create table if not exists public.viaticos_manual_localidad (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  aportes integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists viaticos_manual_localidad_nombre_uidx
  on public.viaticos_manual_localidad (lower(trim(nombre)));

drop trigger if exists viaticos_manual_persona_touch_updated_at on public.viaticos_manual_persona;
create trigger viaticos_manual_persona_touch_updated_at
  before update on public.viaticos_manual_persona
  for each row execute function public.entrada_touch_updated_at();

drop trigger if exists viaticos_manual_localidad_touch_updated_at on public.viaticos_manual_localidad;
create trigger viaticos_manual_localidad_touch_updated_at
  before update on public.viaticos_manual_localidad
  for each row execute function public.entrada_touch_updated_at();

create or replace function public.viaticos_manual_upsert_persona(
  p_apellido text,
  p_nombre text,
  p_dni text default '',
  p_cargo text default '',
  p_jornada_laboral text default '',
  p_ciudad_origen text default '',
  p_asiento_habitual text default '',
  p_valor_diario_base numeric default null,
  p_lugar_comision text default ''
)
returns public.viaticos_manual_persona
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.viaticos_manual_persona;
  v_apellido text := trim(coalesce(p_apellido, ''));
  v_nombre text := trim(coalesce(p_nombre, ''));
  v_dni text := trim(coalesce(p_dni, ''));
begin
  if v_apellido = '' or v_nombre = '' then
    return null;
  end if;

  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  if v_dni <> '' then
    select * into v_row
    from public.viaticos_manual_persona
    where lower(trim(dni)) = lower(v_dni)
    limit 1;
  else
    select * into v_row
    from public.viaticos_manual_persona
    where lower(trim(apellido)) = lower(v_apellido)
      and lower(trim(nombre)) = lower(v_nombre)
      and trim(dni) = ''
    limit 1;
  end if;

  if v_row.id is not null then
    update public.viaticos_manual_persona
    set
      apellido = v_apellido,
      nombre = v_nombre,
      dni = case when v_dni <> '' then v_dni else dni end,
      cargo = case when trim(coalesce(p_cargo, '')) <> '' then trim(p_cargo) else cargo end,
      jornada_laboral = case
        when trim(coalesce(p_jornada_laboral, '')) <> '' then trim(p_jornada_laboral)
        else jornada_laboral
      end,
      ciudad_origen = case
        when trim(coalesce(p_ciudad_origen, '')) <> '' then trim(p_ciudad_origen)
        else ciudad_origen
      end,
      asiento_habitual = case
        when trim(coalesce(p_asiento_habitual, '')) <> '' then trim(p_asiento_habitual)
        else asiento_habitual
      end,
      valor_diario_base = coalesce(nullif(p_valor_diario_base, 0), valor_diario_base),
      aportes = aportes + 1,
      ultimo_usuario_id = auth.uid()
    where id = v_row.id
    returning * into v_row;
  else
    insert into public.viaticos_manual_persona (
      apellido, nombre, dni, cargo, jornada_laboral, ciudad_origen, asiento_habitual,
      valor_diario_base, ultimo_usuario_id
    )
    values (
      v_apellido,
      v_nombre,
      v_dni,
      trim(coalesce(p_cargo, '')),
      trim(coalesce(p_jornada_laboral, '')),
      trim(coalesce(p_ciudad_origen, '')),
      trim(coalesce(p_asiento_habitual, '')),
      nullif(p_valor_diario_base, 0),
      auth.uid()
    )
    returning * into v_row;
  end if;

  if trim(coalesce(p_lugar_comision, '')) <> '' then
    perform public.viaticos_manual_upsert_localidad(p_lugar_comision);
  end if;
  if trim(coalesce(p_ciudad_origen, '')) <> '' then
    perform public.viaticos_manual_upsert_localidad(p_ciudad_origen);
  end if;

  return v_row;
end;
$$;

create or replace function public.viaticos_manual_upsert_localidad(p_nombre text)
returns public.viaticos_manual_localidad
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.viaticos_manual_localidad;
  v_nombre text := trim(coalesce(p_nombre, ''));
begin
  if v_nombre = '' then
    return null;
  end if;

  select * into v_row
  from public.viaticos_manual_localidad
  where lower(trim(nombre)) = lower(v_nombre)
  limit 1;

  if v_row.id is not null then
    update public.viaticos_manual_localidad
    set aportes = aportes + 1
    where id = v_row.id
    returning * into v_row;
  else
    insert into public.viaticos_manual_localidad (nombre)
    values (v_nombre)
    returning * into v_row;
  end if;

  return v_row;
end;
$$;

grant execute on function public.viaticos_manual_upsert_persona(
  text, text, text, text, text, text, text, numeric, text
) to authenticated;

grant execute on function public.viaticos_manual_upsert_localidad(text) to authenticated;

alter table public.viaticos_manual_persona enable row level security;
alter table public.viaticos_manual_localidad enable row level security;

drop policy if exists viaticos_manual_persona_select_public on public.viaticos_manual_persona;
create policy viaticos_manual_persona_select_public
  on public.viaticos_manual_persona
  for select
  to anon, authenticated
  using (true);

drop policy if exists viaticos_manual_localidad_select_public on public.viaticos_manual_localidad;
create policy viaticos_manual_localidad_select_public
  on public.viaticos_manual_localidad
  for select
  to anon, authenticated
  using (true);

comment on table public.viaticos_manual_persona is
  'Catálogo comunitario de personas para autocompletar viáticos/rendiciones manual.';
comment on table public.viaticos_manual_localidad is
  'Localidades sugeridas acumuladas por uso en viáticos/rendiciones manual.';
