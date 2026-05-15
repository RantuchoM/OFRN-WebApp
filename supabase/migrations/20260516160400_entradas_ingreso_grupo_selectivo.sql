-- Ingreso grupal: elegir qué plazas ingresan ahora (resto con QR individual después)

drop function if exists public.entrada_validar_y_consumir_qr(text, text, boolean, bigint);

create or replace function public.entrada_validar_y_consumir_qr(
  p_token text,
  p_modo text,
  p_confirmar_parcial boolean default false,
  p_concierto_id bigint default null,
  p_ordenes_ingresar integer[] default null
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
  v_consumidas integer;
  v_validas integer;
  v_modo_in text;
  v_target text;
  v_codigo text;
  v_ultima_ing timestamptz;
  v_ultima_por uuid;
  v_ultima_entrada_id bigint;
  v_manual_10 text;
  v_match_count integer;
  v_match_id bigint;
  v_token_trim text;
  v_row public.entrada_reserva_entrada;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if not public.entrada_is_recepcion(auth.uid()) then
    raise exception 'Sin permisos de recepción';
  end if;

  v_modo_in := lower(trim(coalesce(p_modo, 'auto')));
  v_token_trim := trim(coalesce(p_token, ''));
  v_manual_10 := public.entrada_normalizar_codigo_reserva_input(p_token);

  if v_manual_10 is null and not public.entrada_es_codigo_reserva_texto(v_token_trim) then
    v_hash := public.entrada_qr_token_hash(v_token_trim);
    if coalesce(v_hash, '') = '' then
      raise exception 'Token inválido';
    end if;
  end if;

  if v_modo_in in ('auto', '') then
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

      select * into v_reserva from public.entrada_reserva where id = v_match_id for update;
      v_target := 'reserva';
    elsif public.entrada_es_codigo_reserva_texto(v_token_trim) then
      select * into v_reserva
      from public.entrada_reserva r
      where upper(r.codigo_reserva) = upper(v_token_trim)
        and (p_concierto_id is null or r.concierto_id = p_concierto_id)
      for update;

      if v_reserva.id is null then
        return jsonb_build_object('ok', false, 'reason', 'token_no_encontrado');
      end if;
      v_target := 'reserva';
    else
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
    end if;
  elsif v_modo_in = 'entrada' then
    if v_manual_10 is not null or public.entrada_es_codigo_reserva_texto(v_token_trim) then
      return jsonb_build_object('ok', false, 'reason', 'token_no_encontrado');
    end if;
    select * into v_entrada
    from public.entrada_reserva_entrada
    where qr_entrada_hash = v_hash
    for update;
    if v_entrada.id is null then
      return jsonb_build_object('ok', false, 'reason', 'token_no_encontrado');
    end if;
    v_target := 'entrada';
  elsif v_modo_in = 'reserva' then
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

      select * into v_reserva from public.entrada_reserva where id = v_match_id for update;
    elsif public.entrada_es_codigo_reserva_texto(v_token_trim) then
      select * into v_reserva
      from public.entrada_reserva r
      where upper(r.codigo_reserva) = upper(v_token_trim)
        and (p_concierto_id is null or r.concierto_id = p_concierto_id)
      for update;
    else
      select * into v_reserva
      from public.entrada_reserva
      where qr_reserva_hash = v_hash
      for update;
    end if;
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
        'ingresada_at', v_entrada.ingresada_at,
        'ingresada_por_nombre', public.entrada_recepcionista_nombre_entrada(v_entrada.id, v_entrada.reserva_id, v_entrada.ingresada_por)
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
      select e.ingresada_at, e.ingresada_por, e.id
      into v_ultima_ing, v_ultima_por, v_ultima_entrada_id
      from public.entrada_reserva_entrada e
      where e.reserva_id = v_reserva.id and e.estado_ingreso = 'ingresada'
      order by e.ingresada_at desc nulls last
      limit 1;

      return jsonb_build_object(
        'ok', false,
        'reason', 'reserva_totalmente_usada',
        'codigo_reserva', v_reserva.codigo_reserva,
        'ultima_ingresada_at', v_ultima_ing,
        'ultima_ingresada_por_nombre', public.entrada_recepcionista_nombre_entrada(v_ultima_entrada_id, v_reserva.id, v_ultima_por)
      );
    end if;

    if p_ordenes_ingresar is not null then
      if coalesce(cardinality(p_ordenes_ingresar), 0) = 0 then
        return jsonb_build_object('ok', false, 'reason', 'sin_plazas_seleccionadas');
      end if;

      select count(*) into v_validas
      from public.entrada_reserva_entrada e
      where e.reserva_id = v_reserva.id
        and e.estado_ingreso = 'pendiente'
        and e.orden = any(p_ordenes_ingresar);

      if v_validas <> cardinality(p_ordenes_ingresar) then
        return jsonb_build_object('ok', false, 'reason', 'ordenes_invalidas');
      end if;
    elsif coalesce(v_ingresadas, 0) > 0 and not p_confirmar_parcial then
      return jsonb_build_object(
        'ok', false,
        'reason', 'reserva_uso_parcial',
        'warning', true,
        'pendientes', v_pendientes,
        'ingresadas', v_ingresadas,
        'codigo_reserva', v_reserva.codigo_reserva
      );
    end if;

    v_consumidas := 0;
    for v_row in
      select e.*
      from public.entrada_reserva_entrada e
      where e.reserva_id = v_reserva.id
        and e.estado_ingreso = 'pendiente'
        and (p_ordenes_ingresar is null or e.orden = any(p_ordenes_ingresar))
    loop
      update public.entrada_reserva_entrada
        set estado_ingreso = 'ingresada', ingresada_at = now(), ingresada_por = auth.uid()
        where id = v_row.id;

      insert into public.entrada_ingreso_evento(
        tipo_qr, reserva_id, reserva_entrada_id, concierto_id, resultado, detalle, scanner_user_id
      )
      values (
        'reserva',
        v_reserva.id,
        v_row.id,
        v_reserva.concierto_id,
        'ok',
        'Ingreso grupal plaza ' || v_row.orden::text,
        auth.uid()
      );

      v_consumidas := v_consumidas + 1;
    end loop;

    if v_consumidas = 0 then
      return jsonb_build_object('ok', false, 'reason', 'sin_plazas_seleccionadas');
    end if;

    return jsonb_build_object(
      'ok', true,
      'tipo', 'reserva',
      'reserva_id', v_reserva.id,
      'pendientes_consumidas', v_consumidas,
      'pendientes_restantes', greatest(0, v_pendientes - v_consumidas)
    );
  end if;

  return jsonb_build_object('ok', false, 'reason', 'modo_invalido');
end;
$$;

grant execute on function public.entrada_validar_y_consumir_qr(text, text, boolean, bigint, integer[]) to authenticated;
