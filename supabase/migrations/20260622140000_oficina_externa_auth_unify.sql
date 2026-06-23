-- Unificar perfiles de viáticos-manual con transporte-scrn (scrn_perfiles).
-- El login OTP ya comparte auth.users vía entrada_auth_email_user; esta migración
-- alinea el perfil público en una sola tabla.

-- 1) Copiar perfiles existentes de viaticos_manual_usuario → scrn_perfiles
insert into public.scrn_perfiles (id, nombre, apellido, es_admin)
select
  v.id,
  coalesce(nullif(trim(v.nombre), ''), ''),
  coalesce(nullif(trim(v.apellido), ''), ''),
  false
from public.viaticos_manual_usuario v
where not exists (
  select 1 from public.scrn_perfiles p where p.id = v.id
);

-- Completar nombre/apellido vacíos en scrn si viaticos tenía datos
update public.scrn_perfiles p
set
  nombre = case
    when coalesce(trim(p.nombre), '') = '' then coalesce(nullif(trim(v.nombre), ''), '')
    else p.nombre
  end,
  apellido = case
    when coalesce(trim(p.apellido), '') = '' then coalesce(nullif(trim(v.apellido), ''), '')
    else p.apellido
  end
from public.viaticos_manual_usuario v
where v.id = p.id;

-- 2) RPC unificado para alta/actualización de perfil propio
create or replace function public.scrn_ensure_profile(
  p_nombre text,
  p_apellido text,
  p_dni text default null,
  p_fecha_nacimiento date default null,
  p_cargo text default null,
  p_genero text default null
)
returns public.scrn_perfiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.scrn_perfiles;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  insert into public.scrn_perfiles (
    id,
    nombre,
    apellido,
    dni,
    fecha_nacimiento,
    cargo,
    genero,
    es_admin
  )
  values (
    auth.uid(),
    coalesce(nullif(trim(p_nombre), ''), ''),
    coalesce(nullif(trim(p_apellido), ''), ''),
    nullif(trim(coalesce(p_dni, '')), ''),
    p_fecha_nacimiento,
    nullif(trim(coalesce(p_cargo, '')), ''),
    nullif(trim(coalesce(p_genero, '')), ''),
    false
  )
  on conflict (id) do update
  set
    nombre = excluded.nombre,
    apellido = excluded.apellido,
    dni = coalesce(excluded.dni, scrn_perfiles.dni),
    fecha_nacimiento = coalesce(excluded.fecha_nacimiento, scrn_perfiles.fecha_nacimiento),
    cargo = coalesce(excluded.cargo, scrn_perfiles.cargo),
    genero = coalesce(excluded.genero, scrn_perfiles.genero)
  returning * into v_profile;

  return v_profile;
end;
$$;

grant execute on function public.scrn_ensure_profile(text, text, text, date, text, text) to authenticated;

-- 3) viaticos_manual_ensure_profile delega al perfil unificado (compatibilidad)
drop function if exists public.viaticos_manual_ensure_profile(text, text);

create or replace function public.viaticos_manual_ensure_profile(
  p_nombre text,
  p_apellido text
)
returns public.scrn_perfiles
language sql
security definer
set search_path = public
as $$
  select public.scrn_ensure_profile(p_nombre, p_apellido, null, null, null, null);
$$;

grant execute on function public.viaticos_manual_ensure_profile(text, text) to authenticated;

comment on function public.scrn_ensure_profile is
  'Perfil unificado oficina externa (transporte-scrn + viáticos-manual). id = auth.uid().';

comment on table public.viaticos_manual_usuario is
  'DEPRECADO: perfiles migrados a scrn_perfiles. Se mantiene por historial; no usar en código nuevo.';
