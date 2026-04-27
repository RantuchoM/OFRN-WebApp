-- Código de reserva más simple para carga manual en recepción:
-- - Formato persistido: ENT-RSV-C<concierto>-##########
-- - Recepción puede ingresar solo los 10 dígitos finales.

create or replace function public.entrada_normalizar_codigo_reserva_input(p_input text)
returns text
language sql
immutable
as $$
  select case
    when trim(coalesce(p_input, '')) ~ '^[0-9]{10}$'
      then trim(coalesce(p_input, ''))
    when upper(trim(coalesce(p_input, ''))) ~ '^ENT-RSV(?:-[A-Z0-9]+)*-[0-9]{10}$'
      then substring(upper(trim(coalesce(p_input, ''))) from '([0-9]{10})$')
    else null
  end;
$$;

create or replace function public.entrada_generar_codigo_reserva(
  p_concierto_id bigint default null
)
returns text
language plpgsql
as $$
declare
  v_candidate text;
  v_digits text;
  v_concierto_tag text;
begin
  v_concierto_tag := 'C' || lpad(coalesce((p_concierto_id % 1000)::text, '000'), 3, '0');
  loop
    v_digits := lpad(floor(random() * 10000000000)::bigint::text, 10, '0');
    v_candidate := 'ENT-RSV-' || v_concierto_tag || '-' || v_digits;
    exit when not exists (
      select 1 from public.entrada_reserva r where r.codigo_reserva = v_candidate
    );
  end loop;
  return v_candidate;
end;
$$;

create or replace function public.entrada_crear_reserva(
  p_concierto_id bigint,
  p_cantidad integer
)
returns table(
  reserva_id bigint,
  concierto_id bigint,
  codigo_reserva text,
  qr_reserva_token text,
  qr_entrada_tokens text[]
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_concierto public.entrada_concierto;
  v_total_ocupado integer;
  v_reserva_id bigint;
  v_reserva_token text;
  v_entry_token text;
  v_tokens text[] := array[]::text[];
  i integer;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if p_cantidad < 1 or p_cantidad > 5 then
    raise exception 'Cantidad inválida (debe ser entre 1 y 5)';
  end if;

  perform 1 from public.entrada_usuario where id = auth.uid() and activo = true;
  if not found then
    raise exception 'Perfil de entradas inexistente o inactivo';
  end if;

  select * into v_concierto
  from public.entrada_concierto
  where id = p_concierto_id and activo = true and reservas_habilitadas = true
  for update;

  if v_concierto.id is null then
    raise exception 'Concierto no disponible para reservas';
  end if;

  if exists (
    select 1 from public.entrada_reserva r
    where r.concierto_id = p_concierto_id
      and r.usuario_id = auth.uid()
      and r.estado = 'activa'
  ) then
    raise exception 'Ya tenés una reserva activa para este concierto.';
  end if;

  select coalesce(sum(r.cantidad_solicitada), 0)
    into v_total_ocupado
  from public.entrada_reserva r
  where r.concierto_id = p_concierto_id and r.estado = 'activa';

  if v_total_ocupado + p_cantidad > v_concierto.capacidad_maxima then
    raise exception 'No hay capacidad disponible para esa cantidad';
  end if;

  v_reserva_token := 'ENTR-RSV-' || replace(gen_random_uuid()::text, '-', '');
  insert into public.entrada_reserva (
    concierto_id,
    usuario_id,
    cantidad_solicitada,
    estado,
    codigo_reserva,
    qr_reserva_hash
  )
  values (
    p_concierto_id,
    auth.uid(),
    p_cantidad,
    'activa',
    public.entrada_generar_codigo_reserva(p_concierto_id),
    public.entrada_qr_token_hash(v_reserva_token)
  )
  returning id into v_reserva_id;

  for i in 1..p_cantidad loop
    v_entry_token := 'ENTR-TCK-' || replace(gen_random_uuid()::text, '-', '');
    insert into public.entrada_reserva_entrada (
      reserva_id,
      concierto_id,
      orden,
      qr_entrada_hash
    )
    values (
      v_reserva_id,
      p_concierto_id,
      i,
      public.entrada_qr_token_hash(v_entry_token)
    );
    v_tokens := array_append(v_tokens, v_entry_token);
  end loop;

  return query
  select r.id, r.concierto_id, r.codigo_reserva, v_reserva_token, v_tokens
  from public.entrada_reserva r
  where r.id = v_reserva_id;
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
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if not public.entrada_is_recepcion(auth.uid()) then
    raise exception 'Sin permisos de recepción';
  end if;

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

    select * into v_reserva
    from public.entrada_reserva
    where id = v_match_id;
  else
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
  v_manual_10 text;
  v_match_count integer;
  v_match_id bigint;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if not public.entrada_is_recepcion(auth.uid()) then
    raise exception 'Sin permisos de recepción';
  end if;

  v_modo_in := lower(trim(coalesce(p_modo, 'auto')));
  v_manual_10 := public.entrada_normalizar_codigo_reserva_input(p_token);

  if v_manual_10 is null then
    v_hash := public.entrada_qr_token_hash(coalesce(trim(p_token), ''));
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

      select * into v_reserva
      from public.entrada_reserva
      where id = v_match_id
      for update;
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
    if v_manual_10 is not null then
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

      select * into v_reserva
      from public.entrada_reserva
      where id = v_match_id
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

grant execute on function public.entrada_normalizar_codigo_reserva_input(text) to authenticated;
grant execute on function public.entrada_generar_codigo_reserva(bigint) to authenticated;
grant execute on function public.entrada_crear_reserva(bigint, integer) to authenticated;
grant execute on function public.entrada_preview_qr(text, bigint) to authenticated;
grant execute on function public.entrada_validar_y_consumir_qr(text, text, boolean, bigint) to authenticated;
