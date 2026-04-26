-- Filtro opcional por concierto (recepción) + concierto_id en preview.

drop function if exists public.entrada_preview_qr(text);
drop function if exists public.entrada_validar_y_consumir_qr(text, text, boolean);

create or replace function public.entrada_preview_qr(
  p_token text,
  p_concierto_id bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text;
  v_entrada public.entrada_reserva_entrada;
  v_reserva public.entrada_reserva;
  v_pendientes integer;
  v_ingresadas integer;
  v_entradas jsonb;
  v_con_nombre text;
  v_con_fecha timestamptz;
  v_lugar text;
  v_cod text;
  v_res_est public.entrada_reserva_estado;
  v_cant integer;
  v_puede boolean;
  v_parcial boolean;
  v_cid bigint;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if not public.entrada_is_recepcion(auth.uid()) then
    raise exception 'Sin permisos de recepción';
  end if;

  v_hash := public.entrada_qr_token_hash(coalesce(trim(p_token), ''));
  if coalesce(v_hash, '') = '' then
    return jsonb_build_object('ok', false, 'reason', 'token_vacio');
  end if;

  select * into v_entrada
  from public.entrada_reserva_entrada
  where qr_entrada_hash = v_hash;

  if v_entrada.id is not null then
    v_cid := v_entrada.concierto_id;
    if p_concierto_id is not null and v_cid is distinct from p_concierto_id then
      return jsonb_build_object(
        'ok', false,
        'reason', 'concierto_distinto',
        'concierto_id_token', v_cid,
        'concierto_id_esperado', p_concierto_id
      );
    end if;

    select
      r.codigo_reserva,
      r.estado,
      r.cantidad_solicitada,
      c.nombre,
      c.fecha_hora,
      c.lugar_nombre
    into v_cod, v_res_est, v_cant, v_con_nombre, v_con_fecha, v_lugar
    from public.entrada_reserva r
    join public.entrada_concierto c on c.id = r.concierto_id
    where r.id = v_entrada.reserva_id;

    v_puede := v_entrada.estado_ingreso = 'pendiente' and v_res_est = 'activa';

    return jsonb_build_object(
      'ok', true,
      'tipo', 'entrada',
      'puede_ingresar', v_puede,
      'concierto_id', v_cid,
      'entrada_orden', v_entrada.orden,
      'estado_ingreso', v_entrada.estado_ingreso,
      'ingresada_at', v_entrada.ingresada_at,
      'codigo_reserva', coalesce(v_cod, ''),
      'reserva_estado', v_res_est,
      'cantidad_en_reserva', coalesce(v_cant, 0),
      'concierto_nombre', coalesce(v_con_nombre, ''),
      'concierto_fecha_hora', v_con_fecha,
      'lugar_nombre', coalesce(v_lugar, '')
    );
  end if;

  select * into v_reserva
  from public.entrada_reserva
  where qr_reserva_hash = v_hash;

  if v_reserva.id is null then
    return jsonb_build_object('ok', false, 'reason', 'token_no_encontrado');
  end if;

  v_cid := v_reserva.concierto_id;
  if p_concierto_id is not null and v_cid is distinct from p_concierto_id then
    return jsonb_build_object(
      'ok', false,
      'reason', 'concierto_distinto',
      'concierto_id_token', v_cid,
      'concierto_id_esperado', p_concierto_id
    );
  end if;

  select coalesce(
    (select jsonb_agg(
      jsonb_build_object(
        'orden', e.orden,
        'estado_ingreso', e.estado_ingreso,
        'ingresada_at', e.ingresada_at
      ) order by e.orden
    )
    from public.entrada_reserva_entrada e
    where e.reserva_id = v_reserva.id
    ),
    '[]'::jsonb
  ) into v_entradas;

  select
    count(*) filter (where estado_ingreso = 'pendiente'),
    count(*) filter (where estado_ingreso = 'ingresada')
  into v_pendientes, v_ingresadas
  from public.entrada_reserva_entrada
  where reserva_id = v_reserva.id;

  v_puede := v_reserva.estado = 'activa' and coalesce(v_pendientes, 0) > 0;
  v_parcial := v_reserva.estado = 'activa'
    and coalesce(v_ingresadas, 0) > 0
    and coalesce(v_pendientes, 0) > 0;

  select c.nombre, c.fecha_hora, c.lugar_nombre
  into v_con_nombre, v_con_fecha, v_lugar
  from public.entrada_concierto c
  where c.id = v_reserva.concierto_id;

  return jsonb_build_object(
    'ok', true,
    'tipo', 'reserva',
    'puede_ingresar', v_puede,
    'concierto_id', v_cid,
    'reserva_estado', v_reserva.estado,
    'codigo_reserva', v_reserva.codigo_reserva,
    'cantidad_solicitada', v_reserva.cantidad_solicitada,
    'pendientes', coalesce(v_pendientes, 0),
    'ingresadas', coalesce(v_ingresadas, 0),
    'entradas', v_entradas,
    'necesita_confirmar_parcial', v_parcial,
    'concierto_nombre', coalesce(v_con_nombre, ''),
    'concierto_fecha_hora', v_con_fecha,
    'lugar_nombre', coalesce(v_lugar, '')
  );
end;
$$;

create or replace function public.entrada_validar_y_consumir_qr(
  p_token text,
  p_modo text,
  p_confirmar_parcial boolean default false,
  p_concierto_id bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text;
  v_reserva public.entrada_reserva;
  v_entrada public.entrada_reserva_entrada;
  v_pendientes integer;
  v_ingresadas integer;
  v_modo_in text;
  v_target text;
  v_codigo text;
  v_ultima_ing timestamptz;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if not public.entrada_is_recepcion(auth.uid()) then
    raise exception 'Sin permisos de recepción';
  end if;

  v_hash := public.entrada_qr_token_hash(coalesce(trim(p_token), ''));
  if coalesce(v_hash, '') = '' then
    raise exception 'Token inválido';
  end if;

  v_modo_in := lower(trim(coalesce(p_modo, 'auto')));

  if v_modo_in in ('auto', '') then
    select * into v_entrada
    from public.entrada_reserva_entrada
    where qr_entrada_hash = v_hash
    for update;

    if v_entrada.id is not null then
      v_target := 'entrada';
    else
      select * into v_reserva
      from public.entrada_reserva
      where qr_reserva_hash = v_hash
      for update;
      if v_reserva.id is null then
        return jsonb_build_object('ok', false, 'reason', 'token_no_encontrado');
      end if;
      v_target := 'reserva';
    end if;
  elsif v_modo_in = 'entrada' then
    select * into v_entrada
    from public.entrada_reserva_entrada
    where qr_entrada_hash = v_hash
    for update;
    if v_entrada.id is null then
      return jsonb_build_object('ok', false, 'reason', 'token_no_encontrado');
    end if;
    v_target := 'entrada';
  elsif v_modo_in = 'reserva' then
    select * into v_reserva
    from public.entrada_reserva
    where qr_reserva_hash = v_hash
    for update;
    if v_reserva.id is null then
      return jsonb_build_object('ok', false, 'reason', 'token_no_encontrado');
    end if;
    v_target := 'reserva';
  else
    return jsonb_build_object('ok', false, 'reason', 'modo_invalido');
  end if;

  if p_concierto_id is not null then
    if v_target = 'entrada' and v_entrada.concierto_id is distinct from p_concierto_id then
      return jsonb_build_object(
        'ok', false,
        'reason', 'concierto_distinto',
        'concierto_id_token', v_entrada.concierto_id,
        'concierto_id_esperado', p_concierto_id
      );
    end if;
    if v_target = 'reserva' and v_reserva.concierto_id is distinct from p_concierto_id then
      return jsonb_build_object(
        'ok', false,
        'reason', 'concierto_distinto',
        'concierto_id_token', v_reserva.concierto_id,
        'concierto_id_esperado', p_concierto_id
      );
    end if;
  end if;

  if v_target = 'entrada' then
    if v_entrada.estado_ingreso is distinct from 'pendiente' then
      select r.codigo_reserva into v_codigo
      from public.entrada_reserva r
      where r.id = v_entrada.reserva_id;

      return jsonb_build_object(
        'ok', false,
        'reason', 'entrada_ya_usada',
        'codigo_reserva', coalesce(v_codigo, ''),
        'entrada_orden', v_entrada.orden,
        'ingresada_at', v_entrada.ingresada_at
      );
    end if;

    update public.entrada_reserva_entrada
      set estado_ingreso = 'ingresada', ingresada_at = now(), ingresada_por = auth.uid()
      where id = v_entrada.id;

    insert into public.entrada_ingreso_evento(tipo_qr, reserva_id, reserva_entrada_id, concierto_id, resultado, detalle, scanner_user_id)
    values ('entrada', v_entrada.reserva_id, v_entrada.id, v_entrada.concierto_id, 'ok', 'Ingreso individual registrado', auth.uid());

    return jsonb_build_object(
      'ok', true,
      'tipo', 'entrada',
      'reserva_id', v_entrada.reserva_id,
      'entrada_id', v_entrada.id,
      'entrada_orden', v_entrada.orden
    );
  end if;

  if v_target = 'reserva' then
    if v_reserva.estado <> 'activa' then
      return jsonb_build_object(
        'ok', false,
        'reason', 'reserva_no_activa',
        'estado', v_reserva.estado,
        'codigo_reserva', v_reserva.codigo_reserva
      );
    end if;

    select
      count(*) filter (where estado_ingreso = 'pendiente'),
      count(*) filter (where estado_ingreso = 'ingresada')
    into v_pendientes, v_ingresadas
    from public.entrada_reserva_entrada
    where reserva_id = v_reserva.id;

    if coalesce(v_pendientes, 0) = 0 then
      select max(ingresada_at) into v_ultima_ing
      from public.entrada_reserva_entrada
      where reserva_id = v_reserva.id and estado_ingreso = 'ingresada';
      return jsonb_build_object(
        'ok', false,
        'reason', 'reserva_totalmente_usada',
        'codigo_reserva', v_reserva.codigo_reserva,
        'ultima_ingresada_at', v_ultima_ing
      );
    end if;

    if coalesce(v_ingresadas, 0) > 0 and not p_confirmar_parcial then
      return jsonb_build_object(
        'ok', false,
        'reason', 'reserva_uso_parcial',
        'warning', true,
        'pendientes', v_pendientes,
        'ingresadas', v_ingresadas,
        'codigo_reserva', v_reserva.codigo_reserva
      );
    end if;

    update public.entrada_reserva_entrada
      set estado_ingreso = 'ingresada', ingresada_at = now(), ingresada_por = auth.uid()
      where reserva_id = v_reserva.id and estado_ingreso = 'pendiente';

    insert into public.entrada_ingreso_evento(tipo_qr, reserva_id, concierto_id, resultado, detalle, scanner_user_id)
    values ('reserva', v_reserva.id, v_reserva.concierto_id, 'ok', 'Ingreso por reserva completa', auth.uid());

    return jsonb_build_object(
      'ok', true,
      'tipo', 'reserva',
      'reserva_id', v_reserva.id,
      'pendientes_consumidas', v_pendientes
    );
  end if;

  return jsonb_build_object('ok', false, 'reason', 'modo_invalido');
end;
$$;

grant execute on function public.entrada_preview_qr(text, bigint) to authenticated;
grant execute on function public.entrada_validar_y_consumir_qr(text, text, boolean, bigint) to authenticated;
