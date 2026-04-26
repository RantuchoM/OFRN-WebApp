-- Consulta sin consumo: diagnóstico de QR (individual vs reserva, uso, fechas) para recepción.

create or replace function public.entrada_preview_qr(p_token text)
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

grant execute on function public.entrada_preview_qr(text) to authenticated;
