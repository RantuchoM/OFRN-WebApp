-- Hora de salida en check-in de ensayos de ensamble

alter table public.eventos_checkin_ensayo
  add column if not exists salida_at timestamptz,
  add column if not exists modo_salida text,
  add column if not exists salida_latitud double precision,
  add column if not exists salida_longitud double precision,
  add column if not exists salida_precision_m real,
  add column if not exists salida_distancia_sede_m real,
  add column if not exists id_integrante_prestador_salida bigint references public.integrantes(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'eventos_checkin_ensayo_modo_salida_check'
  ) then
    alter table public.eventos_checkin_ensayo
      add constraint eventos_checkin_ensayo_modo_salida_check
      check (
        modo_salida is null
        or modo_salida = any (array['gps'::text, 'peer_pase'::text, 'admin'::text])
      );
  end if;
end $$;

alter table public.eventos_checkin_pase
  add column if not exists proposito text not null default 'entrada';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'eventos_checkin_pase_proposito_check'
  ) then
    alter table public.eventos_checkin_pase
      add constraint eventos_checkin_pase_proposito_check
      check (proposito = any (array['entrada'::text, 'salida'::text]));
  end if;
end $$;

-- Estado: incluir salida
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
        'salida_at', c.salida_at,
        'modo_salida', c.modo_salida,
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

-- Checkout GPS
create or replace function public.ensayo_checkout_gps(
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

  select * into v_row
  from public.eventos_checkin_ensayo c
  where c.id_evento = p_evento_id and c.id_integrante = p_integrante_id;

  if v_row.id is null then
    raise exception 'Debés registrar el ingreso antes de la salida';
  end if;

  if v_row.salida_at is not null then
    return jsonb_build_object(
      'ok', true,
      'ya_registrado', true,
      'registrado_at', v_row.registrado_at,
      'salida_at', v_row.salida_at,
      'modo_salida', v_row.modo_salida
    );
  end if;

  v_dist := public.ensayo_distancia_sede_m(v_evt.id_locacion, p_lat, p_lng);

  update public.eventos_checkin_ensayo
  set
    salida_at = now(),
    modo_salida = 'gps',
    salida_latitud = p_lat,
    salida_longitud = p_lng,
    salida_precision_m = p_precision_m,
    salida_distancia_sede_m = v_dist,
    id_integrante_prestador_salida = null,
    user_agent = coalesce(nullif(trim(p_user_agent), ''), user_agent)
  where id = v_row.id
  returning * into v_row;

  return jsonb_build_object(
    'ok', true,
    'ya_registrado', false,
    'registrado_at', v_row.registrado_at,
    'salida_at', v_row.salida_at,
    'modo_salida', v_row.modo_salida,
    'salida_distancia_sede_m', v_row.salida_distancia_sede_m
  );
end;
$$;

-- Generar pase: con proposito (entrada|salida)
drop function if exists public.ensayo_generar_pase_ubicacion(bigint, bigint);

create or replace function public.ensayo_generar_pase_ubicacion(
  p_evento_id bigint,
  p_prestador_id bigint,
  p_proposito text default 'entrada'
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
  v_prop text := coalesce(nullif(trim(p_proposito), ''), 'entrada');
  v_lat double precision;
  v_lng double precision;
begin
  if v_prop not in ('entrada', 'salida') then
    raise exception 'Propósito de pase inválido';
  end if;

  v_evt := public.ensayo_validar_evento_ensamble(p_evento_id, true);

  select * into v_chk
  from public.eventos_checkin_ensayo c
  where c.id_evento = p_evento_id
    and c.id_integrante = p_prestador_id;

  if v_chk.id is null then
    raise exception 'Debés registrar tu ingreso con ubicación GPS antes de generar un pase';
  end if;

  -- Preferir coords de llegada GPS; si el prestador hizo checkout GPS, usar esas
  if v_chk.modo = 'gps' and v_chk.latitud is not null and v_chk.longitud is not null then
    v_lat := v_chk.latitud;
    v_lng := v_chk.longitud;
  elsif v_chk.modo_salida = 'gps'
    and v_chk.salida_latitud is not null
    and v_chk.salida_longitud is not null then
    v_lat := v_chk.salida_latitud;
    v_lng := v_chk.salida_longitud;
  else
    raise exception 'Debés registrar tu ingreso con ubicación GPS antes de generar un pase';
  end if;

  if v_prop = 'salida' and v_chk.salida_at is not null then
    -- Prestador ya tiene salida; igual puede prestar coords de llegada/salida GPS
    null;
  end if;

  v_token := 'ENS-PASE-' || replace(gen_random_uuid()::text, '-', '');
  v_exp := now() + interval '20 seconds';

  insert into public.eventos_checkin_pase (
    token, id_evento, id_integrante_prestador,
    latitud, longitud, expires_at, proposito
  ) values (
    v_token, p_evento_id, p_prestador_id,
    v_lat, v_lng, v_exp, v_prop
  );

  return jsonb_build_object(
    'ok', true,
    'token', v_token,
    'expires_at', v_exp,
    'proposito', v_prop
  );
end;
$$;

-- Pase: entrada (insert) o salida (update)
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
  v_prop text;
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
  v_prop := coalesce(v_pase.proposito, 'entrada');

  if v_prop = 'salida' then
    select * into v_row
    from public.eventos_checkin_ensayo c
    where c.id_evento = v_pase.id_evento and c.id_integrante = p_integrante_id;

    if v_row.id is null then
      raise exception 'Debés registrar el ingreso antes de la salida';
    end if;

    if v_row.salida_at is not null then
      return jsonb_build_object(
        'ok', true,
        'ya_registrado', true,
        'registrado_at', v_row.registrado_at,
        'salida_at', v_row.salida_at,
        'modo_salida', v_row.modo_salida,
        'proposito', 'salida'
      );
    end if;

    v_dist := public.ensayo_distancia_sede_m(
      v_evt.id_locacion, v_pase.latitud, v_pase.longitud
    );

    update public.eventos_checkin_ensayo
    set
      salida_at = now(),
      modo_salida = 'peer_pase',
      salida_latitud = v_pase.latitud,
      salida_longitud = v_pase.longitud,
      salida_distancia_sede_m = v_dist,
      id_integrante_prestador_salida = v_pase.id_integrante_prestador,
      user_agent = coalesce(nullif(trim(p_user_agent), ''), user_agent)
    where id = v_row.id
    returning * into v_row;

    update public.eventos_checkin_pase
    set used_at = now(), id_integrante_usuario = p_integrante_id
    where id = v_pase.id;

    return jsonb_build_object(
      'ok', true,
      'ya_registrado', false,
      'registrado_at', v_row.registrado_at,
      'salida_at', v_row.salida_at,
      'modo_salida', v_row.modo_salida,
      'proposito', 'salida'
    );
  end if;

  -- Entrada: si ya tiene llegada sin salida, el mismo QR de ubicación cierra la salida
  select * into v_row
  from public.eventos_checkin_ensayo c
  where c.id_evento = v_pase.id_evento and c.id_integrante = p_integrante_id;

  if v_row.id is not null then
    if v_row.salida_at is null then
      v_dist := public.ensayo_distancia_sede_m(
        v_evt.id_locacion, v_pase.latitud, v_pase.longitud
      );

      update public.eventos_checkin_ensayo
      set
        salida_at = now(),
        modo_salida = 'peer_pase',
        salida_latitud = v_pase.latitud,
        salida_longitud = v_pase.longitud,
        salida_distancia_sede_m = v_dist,
        id_integrante_prestador_salida = v_pase.id_integrante_prestador,
        user_agent = coalesce(nullif(trim(p_user_agent), ''), user_agent)
      where id = v_row.id
      returning * into v_row;

      update public.eventos_checkin_pase
      set used_at = now(), id_integrante_usuario = p_integrante_id
      where id = v_pase.id;

      return jsonb_build_object(
        'ok', true,
        'ya_registrado', false,
        'registrado_at', v_row.registrado_at,
        'salida_at', v_row.salida_at,
        'modo_salida', v_row.modo_salida,
        'proposito', 'salida'
      );
    end if;

    return jsonb_build_object(
      'ok', true,
      'ya_registrado', true,
      'registrado_at', v_row.registrado_at,
      'salida_at', v_row.salida_at,
      'modo', v_row.modo,
      'proposito', 'entrada'
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
    'modo', v_row.modo,
    'proposito', 'entrada'
  );
end;
$$;

-- Admin upsert con salida opcional
drop function if exists public.ensayo_checkin_admin_upsert(bigint, bigint, timestamptz, bigint, boolean, text, double precision, double precision);

create or replace function public.ensayo_checkin_admin_upsert(
  p_evento_id bigint,
  p_integrante_id bigint,
  p_registrado_at timestamptz,
  p_editor_id bigint,
  p_justificado boolean default false,
  p_nota_justificacion text default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_salida_at timestamptz default null
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

  if p_salida_at is not null and p_salida_at < p_registrado_at then
    raise exception 'La hora de salida no puede ser anterior a la de llegada';
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
    editado_por_admin, editado_at, id_editado_por,
    salida_at, modo_salida,
    salida_latitud, salida_longitud, salida_precision_m, salida_distancia_sede_m,
    id_integrante_prestador_salida
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
    p_editor_id,
    p_salida_at,
    case when p_salida_at is not null then 'admin' else null end,
    null, null, null, null,
    null
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
    user_agent = null,
    salida_at = excluded.salida_at,
    modo_salida = excluded.modo_salida,
    salida_latitud = null,
    salida_longitud = null,
    salida_precision_m = null,
    salida_distancia_sede_m = null,
    id_integrante_prestador_salida = null
  returning * into v_row;

  return jsonb_build_object(
    'ok', true,
    'registrado_at', v_row.registrado_at,
    'salida_at', v_row.salida_at,
    'justificado', v_row.justificado,
    'editado_por_admin', v_row.editado_por_admin
  );
end;
$$;

grant execute on function public.ensayo_checkout_gps(bigint, bigint, double precision, double precision, real, text) to anon, authenticated;
grant execute on function public.ensayo_generar_pase_ubicacion(bigint, bigint, text) to anon, authenticated;
grant execute on function public.ensayo_checkin_admin_upsert(bigint, bigint, timestamptz, bigint, boolean, text, double precision, double precision, timestamptz) to anon, authenticated;
