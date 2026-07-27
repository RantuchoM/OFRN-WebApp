-- Check-in ensayos: persistir hora de pared Argentina como timestamptz UTC
-- (evita doble resta UTC−3 al formatear en cliente con cara UTC).

create or replace function public.ensayo_ahora_pared_ar()
returns timestamptz
language sql
stable
as $$
  -- now() → pared AR (timestamp sin tz) → reinterpreta como UTC
  select timezone('America/Argentina/Buenos_Aires', now());
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
    p_evento_id, p_integrante_id, public.ensayo_ahora_pared_ar(),
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
    salida_at = public.ensayo_ahora_pared_ar(),
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
  v_ahora timestamptz := public.ensayo_ahora_pared_ar();
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
      salida_at = v_ahora,
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
        salida_at = v_ahora,
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
    v_pase.id_evento, p_integrante_id, v_ahora,
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

grant execute on function public.ensayo_ahora_pared_ar() to anon, authenticated;
