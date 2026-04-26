-- Cancelación de reserva por el titular + mensaje QR si entrada anulada

create or replace function public.entrada_cancelar_reserva(p_reserva_id bigint)
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

  update public.entrada_reserva r
  set estado = 'cancelada', updated_at = now()
  where r.id = p_reserva_id
    and r.usuario_id = auth.uid()
    and r.estado = 'activa';

  get diagnostics v_n = row_count;
  if v_n = 0 then
    raise exception 'Reserva no cancelable: no existe, no es tuya, o ya estaba cancelada.';
  end if;

  update public.entrada_reserva_entrada e
  set
    estado_ingreso = 'anulada',
    updated_at = now()
  where e.reserva_id = p_reserva_id
    and e.estado_ingreso = 'pendiente';
end;
$$;

grant execute on function public.entrada_cancelar_reserva(bigint) to authenticated;

create or replace function public.entrada_validar_y_consumir_qr(
  p_token text,
  p_modo text,
  p_confirmar_parcial boolean default false
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

  if p_modo = 'entrada' then
    select * into v_entrada
    from public.entrada_reserva_entrada
    where qr_entrada_hash = v_hash
    for update;

    if v_entrada.id is null then
      return jsonb_build_object('ok', false, 'reason', 'token_no_encontrado');
    end if;
    if v_entrada.estado_ingreso = 'anulada' then
      return jsonb_build_object('ok', false, 'reason', 'entrada_anulada');
    end if;
    if v_entrada.estado_ingreso <> 'pendiente' then
      return jsonb_build_object('ok', false, 'reason', 'entrada_ya_usada');
    end if;

    update public.entrada_reserva_entrada
      set estado_ingreso = 'ingresada', ingresada_at = now(), ingresada_por = auth.uid()
      where id = v_entrada.id;

    insert into public.entrada_ingreso_evento(tipo_qr, reserva_id, reserva_entrada_id, concierto_id, resultado, detalle, scanner_user_id)
    values ('entrada', v_entrada.reserva_id, v_entrada.id, v_entrada.concierto_id, 'ok', 'Ingreso individual registrado', auth.uid());

    return jsonb_build_object('ok', true, 'tipo', 'entrada', 'reserva_id', v_entrada.reserva_id, 'entrada_id', v_entrada.id);
  elsif p_modo = 'reserva' then
    select * into v_reserva
    from public.entrada_reserva
    where qr_reserva_hash = v_hash
    for update;

    if v_reserva.id is null then
      return jsonb_build_object('ok', false, 'reason', 'token_no_encontrado');
    end if;
    if v_reserva.estado <> 'activa' then
      return jsonb_build_object('ok', false, 'reason', 'reserva_no_activa');
    end if;

    select
      count(*) filter (where estado_ingreso = 'pendiente'),
      count(*) filter (where estado_ingreso = 'ingresada')
    into v_pendientes, v_ingresadas
    from public.entrada_reserva_entrada
    where reserva_id = v_reserva.id;

    if coalesce(v_pendientes, 0) = 0 then
      return jsonb_build_object('ok', false, 'reason', 'reserva_totalmente_usada');
    end if;

    if coalesce(v_ingresadas, 0) > 0 and not p_confirmar_parcial then
      return jsonb_build_object(
        'ok', false,
        'reason', 'reserva_uso_parcial',
        'warning', true,
        'pendientes', v_pendientes,
        'ingresadas', v_ingresadas
      );
    end if;

    update public.entrada_reserva_entrada
      set estado_ingreso = 'ingresada', ingresada_at = now(), ingresada_por = auth.uid()
      where reserva_id = v_reserva.id and estado_ingreso = 'pendiente';

    insert into public.entrada_ingreso_evento(tipo_qr, reserva_id, concierto_id, resultado, detalle, scanner_user_id)
    values ('reserva', v_reserva.id, v_reserva.concierto_id, 'ok', 'Ingreso por reserva completa', auth.uid());

    return jsonb_build_object('ok', true, 'tipo', 'reserva', 'reserva_id', v_reserva.id, 'pendientes_consumidas', v_pendientes);
  end if;

  return jsonb_build_object('ok', false, 'reason', 'modo_invalido');
end;
$$;
