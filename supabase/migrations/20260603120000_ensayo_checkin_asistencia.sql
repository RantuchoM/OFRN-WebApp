-- Check-in de ensayos de ensamble (tipo 13) + pases QR peer + edición admin/justificado

alter table public.locaciones
  add column if not exists latitud double precision,
  add column if not exists longitud double precision;

create table if not exists public.eventos_checkin_ensayo (
  id bigint generated always as identity primary key,
  id_evento bigint not null references public.eventos(id) on delete cascade,
  id_integrante bigint not null references public.integrantes(id) on delete cascade,
  registrado_at timestamptz not null default now(),
  latitud double precision,
  longitud double precision,
  precision_m real,
  modo text not null check (modo = any (array['gps'::text, 'peer_pase'::text, 'admin'::text])),
  id_integrante_prestador bigint references public.integrantes(id) on delete set null,
  distancia_sede_m real,
  justificado boolean not null default false,
  nota_justificacion text,
  editado_por_admin boolean not null default false,
  editado_at timestamptz,
  id_editado_por bigint references public.integrantes(id) on delete set null,
  user_agent text,
  created_at timestamptz not null default now(),
  constraint eventos_checkin_ensayo_evento_integrante_key unique (id_evento, id_integrante)
);

create index if not exists eventos_checkin_ensayo_id_evento_idx
  on public.eventos_checkin_ensayo (id_evento);
create index if not exists eventos_checkin_ensayo_id_integrante_idx
  on public.eventos_checkin_ensayo (id_integrante, registrado_at desc);

create table if not exists public.eventos_checkin_pase (
  id bigint generated always as identity primary key,
  token text not null unique,
  id_evento bigint not null references public.eventos(id) on delete cascade,
  id_integrante_prestador bigint not null references public.integrantes(id) on delete cascade,
  latitud double precision not null,
  longitud double precision not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  id_integrante_usuario bigint references public.integrantes(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists eventos_checkin_pase_expires_idx
  on public.eventos_checkin_pase (expires_at);

create or replace function public.ensayo_integrante_es_admin_o_editor(p_id bigint)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.integrantes i
    where i.id = p_id
      and (
        'admin' = any (coalesce(i.rol_sistema, '{}'::text[]))
        or 'editor' = any (coalesce(i.rol_sistema, '{}'::text[]))
      )
  );
$$;

create or replace function public.ensayo_hoy_ar()
returns date
language sql
stable
as $$
  select (now() at time zone 'America/Argentina/Buenos_Aires')::date;
$$;

create or replace function public.ensayo_validar_evento_ensamble(
  p_evento_id bigint,
  p_solo_hoy boolean default false
)
returns public.eventos
language plpgsql
stable
as $$
declare
  v_evt public.eventos;
begin
  select * into v_evt
  from public.eventos e
  where e.id = p_evento_id
    and e.id_tipo_evento = 13
    and coalesce(e.is_deleted, false) = false;

  if v_evt.id is null then
    raise exception 'Ensayo no encontrado o no es tipo ensamble (13)';
  end if;

  if p_solo_hoy and v_evt.fecha is distinct from public.ensayo_hoy_ar() then
    raise exception 'El check-in solo está habilitado el día del ensayo';
  end if;

  return v_evt;
end;
$$;

create or replace function public.ensayo_distancia_sede_m(
  p_id_locacion bigint,
  p_lat double precision,
  p_lng double precision
)
returns real
language plpgsql
stable
as $$
declare
  v_lat double precision;
  v_lng double precision;
  v_r constant double precision := 6371000;
  v_dlat double precision;
  v_dlng double precision;
  v_a double precision;
begin
  if p_lat is null or p_lng is null or p_id_locacion is null then
    return null;
  end if;

  select l.latitud, l.longitud into v_lat, v_lng
  from public.locaciones l
  where l.id = p_id_locacion;

  if v_lat is null or v_lng is null then
    return null;
  end if;

  v_dlat := radians(v_lat - p_lat);
  v_dlng := radians(v_lng - p_lng);
  v_a := sin(v_dlat / 2) ^ 2
    + cos(radians(p_lat)) * cos(radians(v_lat)) * sin(v_dlng / 2) ^ 2;

  return (2 * v_r * atan2(sqrt(v_a), sqrt(1 - v_a)))::real;
end;
$$;

create or replace function public.ensayo_checkin_gps(
  p_evento_id bigint,
  p_integrante_id bigint,
  p_lat double precision default null,
  p_lng double precision default null,
  p_precision_m real default null,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_evt public.eventos;
  v_dist real;
  v_row public.eventos_checkin_ensayo;
begin
  if p_integrante_id is null or p_integrante_id <= 0 then
    raise exception 'Integrante inválido';
  end if;

  v_evt := public.ensayo_validar_evento_ensamble(p_evento_id, true);

  if exists (
    select 1 from public.eventos_checkin_ensayo c
    where c.id_evento = p_evento_id and c.id_integrante = p_integrante_id
  ) then
    select * into v_row
    from public.eventos_checkin_ensayo c
    where c.id_evento = p_evento_id and c.id_integrante = p_integrante_id;

    return jsonb_build_object(
      'ok', true,
      'ya_registrado', true,
      'registrado_at', v_row.registrado_at,
      'modo', v_row.modo
    );
  end if;

  v_dist := public.ensayo_distancia_sede_m(v_evt.id_locacion, p_lat, p_lng);

  insert into public.eventos_checkin_ensayo (
    id_evento, id_integrante, registrado_at,
    latitud, longitud, precision_m, modo, distancia_sede_m, user_agent,
    justificado, editado_por_admin
  ) values (
    p_evento_id, p_integrante_id, now(),
    p_lat, p_lng, p_precision_m, 'gps', v_dist, nullif(trim(p_user_agent), ''),
    false, false
  )
  returning * into v_row;

  return jsonb_build_object(
    'ok', true,
    'ya_registrado', false,
    'registrado_at', v_row.registrado_at,
    'modo', v_row.modo,
    'distancia_sede_m', v_row.distancia_sede_m
  );
end;
$$;

create or replace function public.ensayo_generar_pase_ubicacion(
  p_evento_id bigint,
  p_prestador_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_evt public.eventos;
  v_chk public.eventos_checkin_ensayo;
  v_token text;
  v_exp timestamptz;
begin
  v_evt := public.ensayo_validar_evento_ensamble(p_evento_id, true);

  select * into v_chk
  from public.eventos_checkin_ensayo c
  where c.id_evento = p_evento_id
    and c.id_integrante = p_prestador_id
    and c.modo = 'gps'
    and c.latitud is not null
    and c.longitud is not null;

  if v_chk.id is null then
    raise exception 'Debés registrar tu ingreso con ubicación GPS antes de generar un pase';
  end if;

  v_token := 'ENS-PASE-' || replace(gen_random_uuid()::text, '-', '');
  v_exp := now() + interval '20 seconds';

  insert into public.eventos_checkin_pase (
    token, id_evento, id_integrante_prestador,
    latitud, longitud, expires_at
  ) values (
    v_token, p_evento_id, p_prestador_id,
    v_chk.latitud, v_chk.longitud, v_exp
  );

  return jsonb_build_object(
    'ok', true,
    'token', v_token,
    'expires_at', v_exp
  );
end;
$$;

create or replace function public.ensayo_checkin_pase(
  p_token text,
  p_integrante_id bigint,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pase public.eventos_checkin_pase;
  v_evt public.eventos;
  v_dist real;
  v_row public.eventos_checkin_ensayo;
begin
  if p_integrante_id is null or p_integrante_id <= 0 then
    raise exception 'Integrante inválido';
  end if;

  select * into v_pase
  from public.eventos_checkin_pase p
  where p.token = nullif(trim(p_token), '');

  if v_pase.id is null then
    return jsonb_build_object('ok', false, 'reason', 'token_no_encontrado');
  end if;

  if v_pase.used_at is not null then
    return jsonb_build_object('ok', false, 'reason', 'pase_usado');
  end if;

  if v_pase.expires_at < now() then
    return jsonb_build_object('ok', false, 'reason', 'pase_expirado');
  end if;

  v_evt := public.ensayo_validar_evento_ensamble(v_pase.id_evento, true);

  if exists (
    select 1 from public.eventos_checkin_ensayo c
    where c.id_evento = v_pase.id_evento and c.id_integrante = p_integrante_id
  ) then
    select * into v_row
    from public.eventos_checkin_ensayo c
    where c.id_evento = v_pase.id_evento and c.id_integrante = p_integrante_id;

    return jsonb_build_object(
      'ok', true,
      'ya_registrado', true,
      'registrado_at', v_row.registrado_at,
      'modo', v_row.modo
    );
  end if;

  v_dist := public.ensayo_distancia_sede_m(
    v_evt.id_locacion, v_pase.latitud, v_pase.longitud
  );

  insert into public.eventos_checkin_ensayo (
    id_evento, id_integrante, registrado_at,
    latitud, longitud, modo,
    id_integrante_prestador, distancia_sede_m, user_agent,
    justificado, editado_por_admin
  ) values (
    v_pase.id_evento, p_integrante_id, now(),
    v_pase.latitud, v_pase.longitud, 'peer_pase',
    v_pase.id_integrante_prestador, v_dist, nullif(trim(p_user_agent), ''),
    false, false
  )
  returning * into v_row;

  update public.eventos_checkin_pase
  set used_at = now(), id_integrante_usuario = p_integrante_id
  where id = v_pase.id;

  return jsonb_build_object(
    'ok', true,
    'ya_registrado', false,
    'registrado_at', v_row.registrado_at,
    'modo', v_row.modo
  );
end;
$$;

create or replace function public.ensayo_checkin_estado(
  p_evento_ids bigint[],
  p_integrante_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_out jsonb := '{}'::jsonb;
begin
  if p_integrante_id is null or coalesce(array_length(p_evento_ids, 1), 0) = 0 then
    return v_out;
  end if;

  select coalesce(
    jsonb_object_agg(
      c.id_evento::text,
      jsonb_build_object(
        'registrado_at', c.registrado_at,
        'modo', c.modo,
        'justificado', c.justificado,
        'editado_por_admin', c.editado_por_admin
      )
    ),
    '{}'::jsonb
  )
  into v_out
  from public.eventos_checkin_ensayo c
  where c.id_integrante = p_integrante_id
    and c.id_evento = any (p_evento_ids);

  return coalesce(v_out, '{}'::jsonb);
end;
$$;

create or replace function public.ensayo_checkin_admin_upsert(
  p_evento_id bigint,
  p_integrante_id bigint,
  p_registrado_at timestamptz,
  p_editor_id bigint,
  p_justificado boolean default false,
  p_nota_justificacion text default null,
  p_lat double precision default null,
  p_lng double precision default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_evt public.eventos;
  v_dist real;
  v_row public.eventos_checkin_ensayo;
  v_just boolean := coalesce(p_justificado, false);
begin
  if not public.ensayo_integrante_es_admin_o_editor(p_editor_id) then
    raise exception 'Sin permisos de edición de asistencia';
  end if;

  v_evt := public.ensayo_validar_evento_ensamble(p_evento_id, false);

  if p_integrante_id is null or p_registrado_at is null then
    raise exception 'Datos incompletos';
  end if;

  v_dist := case
    when v_just then null
    else public.ensayo_distancia_sede_m(v_evt.id_locacion, p_lat, p_lng)
  end;

  insert into public.eventos_checkin_ensayo (
    id_evento, id_integrante, registrado_at,
    latitud, longitud, modo,
    distancia_sede_m,
    justificado, nota_justificacion,
    editado_por_admin, editado_at, id_editado_por
  ) values (
    p_evento_id, p_integrante_id, p_registrado_at,
    case when v_just then null else p_lat end,
    case when v_just then null else p_lng end,
    'admin',
    v_dist,
    v_just,
    nullif(trim(p_nota_justificacion), ''),
    not v_just,
    now(),
    p_editor_id
  )
  on conflict (id_evento, id_integrante) do update set
    registrado_at = excluded.registrado_at,
    latitud = excluded.latitud,
    longitud = excluded.longitud,
    modo = 'admin',
    distancia_sede_m = excluded.distancia_sede_m,
    justificado = excluded.justificado,
    nota_justificacion = excluded.nota_justificacion,
    editado_por_admin = excluded.editado_por_admin,
    editado_at = now(),
    id_editado_por = excluded.id_editado_por,
    id_integrante_prestador = null,
    precision_m = null,
    user_agent = null
  returning * into v_row;

  return jsonb_build_object(
    'ok', true,
    'registrado_at', v_row.registrado_at,
    'justificado', v_row.justificado,
    'editado_por_admin', v_row.editado_por_admin
  );
end;
$$;

create or replace function public.ensayo_checkin_admin_delete(
  p_evento_id bigint,
  p_integrante_id bigint,
  p_editor_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.ensayo_integrante_es_admin_o_editor(p_editor_id) then
    raise exception 'Sin permisos de edición de asistencia';
  end if;

  delete from public.eventos_checkin_ensayo
  where id_evento = p_evento_id and id_integrante = p_integrante_id;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.ensayo_integrante_es_admin_o_editor(bigint) to anon, authenticated;
grant execute on function public.ensayo_hoy_ar() to anon, authenticated;
grant execute on function public.ensayo_validar_evento_ensamble(bigint, boolean) to anon, authenticated;
grant execute on function public.ensayo_distancia_sede_m(bigint, double precision, double precision) to anon, authenticated;
grant execute on function public.ensayo_checkin_gps(bigint, bigint, double precision, double precision, real, text) to anon, authenticated;
grant execute on function public.ensayo_generar_pase_ubicacion(bigint, bigint) to anon, authenticated;
grant execute on function public.ensayo_checkin_pase(text, bigint, text) to anon, authenticated;
grant execute on function public.ensayo_checkin_estado(bigint[], bigint) to anon, authenticated;
grant execute on function public.ensayo_checkin_admin_upsert(bigint, bigint, timestamptz, bigint, boolean, text, double precision, double precision) to anon, authenticated;
grant execute on function public.ensayo_checkin_admin_delete(bigint, bigint, bigint) to anon, authenticated;

grant select, insert, update, delete on public.eventos_checkin_ensayo to anon, authenticated;
grant select, insert, update, delete on public.eventos_checkin_pase to anon, authenticated;
