-- Recepción: cancelar reserva / anular plazas pendientes + preview con ids para la UI

create or replace function public.entrada_recepcion_cancelar_reserva(p_reserva_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n integer;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if not public.entrada_is_recepcion(auth.uid()) then
    raise exception 'Sin permisos de recepción';
  end if;

  update public.entrada_reserva r
  set estado = 'cancelada', updated_at = now()
  where r.id = p_reserva_id
    and r.estado = 'activa';

  get diagnostics v_n = row_count;
  if v_n = 0 then
    raise exception 'Reserva no cancelable: no existe, no está activa, o ya fue cancelada.';
  end if;

  update public.entrada_reserva_entrada e
  set
    estado_ingreso = 'anulada',
    updated_at = now()
  where e.reserva_id = p_reserva_id
    and e.estado_ingreso = 'pendiente';
end;
$$;

create or replace function public.entrada_recepcion_anular_entradas(
  p_reserva_id bigint,
  p_ordenes integer[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reserva public.entrada_reserva;
  v_anuladas integer;
  v_pendientes integer;
  v_ingresadas integer;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if not public.entrada_is_recepcion(auth.uid()) then
    raise exception 'Sin permisos de recepción';
  end if;
  if coalesce(cardinality(p_ordenes), 0) = 0 then
    raise exception 'Indicá al menos una plaza para anular.';
  end if;

  select * into v_reserva
  from public.entrada_reserva
  where id = p_reserva_id
  for update;

  if v_reserva.id is null then
    raise exception 'Reserva no encontrada.';
  end if;
  if v_reserva.estado <> 'activa' then
    raise exception 'La reserva no está activa.';
  end if;

  update public.entrada_reserva_entrada e
  set
    estado_ingreso = 'anulada',
    updated_at = now()
  where e.reserva_id = p_reserva_id
    and e.estado_ingreso = 'pendiente'
    and e.orden = any(p_ordenes);

  get diagnostics v_anuladas = row_count;
  if v_anuladas = 0 then
    raise exception 'Ninguna plaza pendiente coincide con la selección.';
  end if;
  if v_anuladas <> cardinality(p_ordenes) then
    raise exception 'Algunas plazas no están pendientes o no existen.';
  end if;

  select
    count(*) filter (where estado_ingreso = 'pendiente'),
    count(*) filter (where estado_ingreso = 'ingresada')
  into v_pendientes, v_ingresadas
  from public.entrada_reserva_entrada
  where reserva_id = p_reserva_id;

  if coalesce(v_pendientes, 0) = 0 and coalesce(v_ingresadas, 0) = 0 then
    update public.entrada_reserva
    set estado = 'cancelada', updated_at = now()
    where id = p_reserva_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'anuladas', v_anuladas,
    'pendientes_restantes', coalesce(v_pendientes, 0),
    'reserva_cancelada', coalesce(v_pendientes, 0) = 0 and coalesce(v_ingresadas, 0) = 0
  );
end;
$$;

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
  v_manual_10 text;
  v_match_count integer;
  v_match_id bigint;
  v_token_trim text;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if not public.entrada_is_recepcion(auth.uid()) then
    raise exception 'Sin permisos de recepción';
  end if;

  v_token_trim := trim(coalesce(p_token, ''));
  v_manual_10 := public.entrada_normalizar_codigo_reserva_input(p_token);

  if v_manual_10 is not null then
    select count(*), max(r.id)
    into v_match_count, v_match_id
    from public.entrada_reserva r
    where right(regexp_replace(r.codigo_reserva, '[^0-9]', '', 'g'), 10) = v_manual_10
      and (p_concierto_id is null or r.concierto_id = p_concierto_id);

    if coalesce(v_match_count, 0) = 0 then
      return jsonb_build_object('ok', false, 'reason', 'token_no_encontrado');
    end if;
    if v_match_count > 1 then
      return jsonb_build_object('ok', false, 'reason', 'codigo_ambiguo');
    end if;

    select * into v_reserva from public.entrada_reserva where id = v_match_id;
  elsif public.entrada_es_codigo_reserva_texto(v_token_trim) then
    select * into v_reserva
    from public.entrada_reserva r
    where upper(r.codigo_reserva) = upper(v_token_trim)
      and (p_concierto_id is null or r.concierto_id = p_concierto_id);

    if v_reserva.id is null then
      return jsonb_build_object('ok', false, 'reason', 'token_no_encontrado');
    end if;
  else
    v_hash := public.entrada_qr_token_hash(v_token_trim);
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
        public.entrada_fecha_hora_desde_evento(c.ofrn_evento_id),
        public.entrada_lugar_nombre_desde_evento(c.ofrn_evento_id)
      into v_cod, v_res_est, v_cant, v_con_nombre, v_con_fecha, v_lugar
      from public.entrada_reserva r
      join public.entrada_concierto c on c.id = r.concierto_id
      where r.id = v_entrada.reserva_id;

      v_puede := v_entrada.estado_ingreso = 'pendiente' and v_res_est = 'activa';

      return jsonb_build_object(
        'ok', true,
        'tipo', 'entrada',
        'puede_ingresar', v_puede,
        'reserva_id', v_entrada.reserva_id,
        'entrada_id', v_entrada.id,
        'concierto_id', v_cid,
        'entrada_orden', v_entrada.orden,
        'estado_ingreso', v_entrada.estado_ingreso,
        'ingresada_at', v_entrada.ingresada_at,
        'ingresada_por_nombre', public.entrada_recepcionista_nombre_entrada(v_entrada.id, v_entrada.reserva_id, v_entrada.ingresada_por),
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
  end if;

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
        'id', e.id,
        'orden', e.orden,
        'estado_ingreso', e.estado_ingreso,
        'ingresada_at', e.ingresada_at,
        'ingresada_por_nombre', public.entrada_recepcionista_nombre_entrada(e.id, e.reserva_id, e.ingresada_por)
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

  select
    c.nombre,
    public.entrada_fecha_hora_desde_evento(c.ofrn_evento_id),
    public.entrada_lugar_nombre_desde_evento(c.ofrn_evento_id)
  into v_con_nombre, v_con_fecha, v_lugar
  from public.entrada_concierto c
  where c.id = v_reserva.concierto_id;

  return jsonb_build_object(
    'ok', true,
    'tipo', 'reserva',
    'puede_ingresar', v_puede,
    'reserva_id', v_reserva.id,
    'reservada_por', v_reserva.reservada_por,
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

grant execute on function public.entrada_recepcion_cancelar_reserva(bigint) to authenticated;
grant execute on function public.entrada_recepcion_anular_entradas(bigint, integer[]) to authenticated;
