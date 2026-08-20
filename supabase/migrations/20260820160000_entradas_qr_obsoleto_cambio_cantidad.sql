-- Al cambiar la cantidad se regeneran los QR. Archivamos los hashes viejos
-- para que recepción distinga "código inexistente" de "QR reemplazado".

create table if not exists public.entrada_qr_obsoleto (
  id bigint generated always as identity primary key,
  reserva_id bigint not null references public.entrada_reserva(id) on delete cascade,
  concierto_id bigint not null references public.entrada_concierto(id) on delete restrict,
  entrada_id bigint,
  tipo public.entrada_tipo_qr not null,
  qr_hash text not null unique,
  codigo_reserva text not null,
  cantidad_anterior integer not null,
  cantidad_nueva integer not null,
  reemplazado_at timestamptz not null default now()
);

create index if not exists entrada_qr_obsoleto_reserva_idx
  on public.entrada_qr_obsoleto(reserva_id);

create index if not exists entrada_qr_obsoleto_concierto_idx
  on public.entrada_qr_obsoleto(concierto_id);

alter table public.entrada_qr_obsoleto enable row level security;

comment on table public.entrada_qr_obsoleto is
  'Hashes de QR grupal o individual reemplazados al cambiar la cantidad de una reserva.';

create or replace function public.entrada_qr_obsoleto_respuesta(p_hash text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_obs public.entrada_qr_obsoleto%rowtype;
  v_cant integer;
  v_estado public.entrada_reserva_estado;
begin
  if coalesce(p_hash, '') = '' then
    return null;
  end if;

  select * into v_obs
  from public.entrada_qr_obsoleto
  where qr_hash = p_hash
  limit 1;

  if not found then
    return null;
  end if;

  select r.cantidad_solicitada, r.estado
    into v_cant, v_estado
  from public.entrada_reserva r
  where r.id = v_obs.reserva_id;

  return jsonb_build_object(
    'ok', false,
    'reason', 'qr_obsoleto_cambio_cantidad',
    'tipo', v_obs.tipo,
    'concierto_id', v_obs.concierto_id,
    'reserva_id', v_obs.reserva_id,
    'entrada_id', v_obs.entrada_id,
    'codigo_reserva', v_obs.codigo_reserva,
    'cantidad_anterior', v_obs.cantidad_anterior,
    'cantidad_nueva', v_obs.cantidad_nueva,
    'cantidad_vigente', coalesce(v_cant, v_obs.cantidad_nueva),
    'reserva_estado', v_estado,
    'reemplazado_at', v_obs.reemplazado_at
  );
end;
$$;

create or replace function public.entrada_qr_lookup_fallo(p_hash text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_obs jsonb;
begin
  v_obs := public.entrada_qr_obsoleto_respuesta(p_hash);
  if v_obs is not null then
    return v_obs;
  end if;
  return jsonb_build_object('ok', false, 'reason', 'token_no_encontrado');
end;
$$;

create or replace function public.entrada_cambiar_cantidad_reserva(
  p_reserva_id bigint,
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
  v_reserva public.entrada_reserva;
  v_concierto public.entrada_concierto;
  v_total_ocupado integer;
  v_actual integer;
  v_reserva_token text;
  v_entry_token text;
  v_tokens text[] := array[]::text[];
  v_row public.entrada_reserva_entrada;
  i integer;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if p_reserva_id is null or p_reserva_id <= 0 then
    raise exception 'Reserva inválida';
  end if;
  if p_cantidad < 1 or p_cantidad > 4 then
    raise exception 'Cantidad inválida (debe ser entre 1 y 4)';
  end if;

  perform 1 from public.entrada_usuario where id = auth.uid() and activo = true;
  if not found then
    raise exception 'Perfil de entradas inexistente o inactivo';
  end if;

  select * into v_reserva
  from public.entrada_reserva
  where id = p_reserva_id
  for update;

  if v_reserva.id is null then
    raise exception 'Reserva no encontrada';
  end if;
  if v_reserva.estado <> 'activa' then
    raise exception 'La reserva no está activa';
  end if;

  if v_reserva.usuario_id is distinct from auth.uid()
     and not (
       v_reserva.reservada_por is not distinct from auth.uid()
       and public.entrada_can_terceros(auth.uid())
     ) then
    raise exception 'Sin permiso para cambiar esta reserva';
  end if;

  select c.* into v_concierto
  from public.entrada_concierto c
  inner join public.entrada_programa p on p.id = c.programa_id and p.activo = true
  where c.id = v_reserva.concierto_id and c.activo = true
  for update of c;

  if v_concierto.id is null or not public.entrada_concierto_reservas_abiertas(v_concierto) then
    raise exception 'Este concierto ya no admite cambios de cantidad';
  end if;

  v_actual := v_reserva.cantidad_solicitada;
  if p_cantidad = v_actual then
    raise exception 'La cantidad es la misma que ya tenés reservada';
  end if;

  perform 1
  from public.entrada_reserva_entrada e
  where e.reserva_id = v_reserva.id
  for update;

  if exists (
    select 1
    from public.entrada_reserva_entrada e
    where e.reserva_id = v_reserva.id
      and e.estado_ingreso is distinct from 'pendiente'
  ) then
    raise exception 'No se puede cambiar la cantidad porque alguna entrada ya se usó o se dio de baja.';
  end if;

  select coalesce(sum(r.cantidad_solicitada), 0)
    into v_total_ocupado
  from public.entrada_reserva r
  where r.concierto_id = v_reserva.concierto_id and r.estado = 'activa';

  if (v_total_ocupado - v_actual + p_cantidad) > v_concierto.capacidad_maxima then
    raise exception 'No hay capacidad disponible para esa cantidad';
  end if;

  -- Archivar hashes vigentes ANTES de rotar tokens / borrar plazas.
  insert into public.entrada_qr_obsoleto (
    reserva_id, concierto_id, entrada_id, tipo, qr_hash,
    codigo_reserva, cantidad_anterior, cantidad_nueva
  )
  select
    v_reserva.id,
    v_reserva.concierto_id,
    null,
    'reserva'::public.entrada_tipo_qr,
    v_reserva.qr_reserva_hash,
    v_reserva.codigo_reserva,
    v_actual,
    p_cantidad
  where coalesce(v_reserva.qr_reserva_hash, '') <> ''
  on conflict (qr_hash) do nothing;

  insert into public.entrada_qr_obsoleto (
    reserva_id, concierto_id, entrada_id, tipo, qr_hash,
    codigo_reserva, cantidad_anterior, cantidad_nueva
  )
  select
    v_reserva.id,
    e.concierto_id,
    e.id,
    'entrada'::public.entrada_tipo_qr,
    e.qr_entrada_hash,
    v_reserva.codigo_reserva,
    v_actual,
    p_cantidad
  from public.entrada_reserva_entrada e
  where e.reserva_id = v_reserva.id
    and coalesce(e.qr_entrada_hash, '') <> ''
  on conflict (qr_hash) do nothing;

  delete from public.entrada_reserva_entrada e
  where e.reserva_id = v_reserva.id
    and e.orden > p_cantidad;

  v_reserva_token := 'ENTR-RSV-' || replace(gen_random_uuid()::text, '-', '');

  for i in 1..p_cantidad loop
    v_entry_token := 'ENTR-TCK-' || replace(gen_random_uuid()::text, '-', '');
    select * into v_row
    from public.entrada_reserva_entrada e
    where e.reserva_id = v_reserva.id and e.orden = i
    for update;

    if not found then
      insert into public.entrada_reserva_entrada (
        reserva_id,
        concierto_id,
        orden,
        qr_entrada_hash,
        qr_entrada_token
      )
      values (
        v_reserva.id,
        v_reserva.concierto_id,
        i,
        public.entrada_qr_token_hash(v_entry_token),
        v_entry_token
      );
    else
      update public.entrada_reserva_entrada
      set
        qr_entrada_token = v_entry_token,
        qr_entrada_hash = public.entrada_qr_token_hash(v_entry_token),
        updated_at = now()
      where id = v_row.id;
    end if;

    v_tokens := array_append(v_tokens, v_entry_token);
  end loop;

  update public.entrada_reserva
  set
    cantidad_solicitada = p_cantidad,
    qr_reserva_token = v_reserva_token,
    qr_reserva_hash = public.entrada_qr_token_hash(v_reserva_token),
    updated_at = now()
  where id = v_reserva.id;

  return query
  select
    v_reserva.id,
    v_reserva.concierto_id,
    v_reserva.codigo_reserva,
    v_reserva_token,
    v_tokens;
end;
$$;

grant execute on function public.entrada_cambiar_cantidad_reserva(bigint, integer) to authenticated;

comment on function public.entrada_cambiar_cantidad_reserva(bigint, integer) is
  'Titular (o emisor de tercero) cambia la cantidad 1..4 de una reserva activa; archiva los QR viejos y regenera todos.';

-- Preview: si el hash no está vigente, informar QR obsoleto por cambio de cantidad.
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
    return public.entrada_qr_lookup_fallo(v_hash);
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

grant execute on function public.entrada_preview_qr(text, bigint) to authenticated;

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
  v_ordenes_ingresadas integer[] := '{}';
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
          return public.entrada_qr_lookup_fallo(v_hash);
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
      return public.entrada_qr_lookup_fallo(v_hash);
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
      return public.entrada_qr_lookup_fallo(v_hash);
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
      'entrada_orden', v_entrada.orden,
      'codigo_reserva', (select codigo_reserva from public.entrada_reserva where id = v_entrada.reserva_id),
      'ordenes_ingresadas', array[v_entrada.orden]
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

      v_ordenes_ingresadas := array_append(v_ordenes_ingresadas, v_row.orden);
      v_consumidas := v_consumidas + 1;
    end loop;

    if v_consumidas = 0 then
      return jsonb_build_object('ok', false, 'reason', 'sin_plazas_seleccionadas');
    end if;

    return jsonb_build_object(
      'ok', true,
      'tipo', 'reserva',
      'reserva_id', v_reserva.id,
      'codigo_reserva', v_reserva.codigo_reserva,
      'pendientes_consumidas', v_consumidas,
      'pendientes_restantes', greatest(0, v_pendientes - v_consumidas),
      'ordenes_ingresadas', v_ordenes_ingresadas
    );
  end if;

  return jsonb_build_object('ok', false, 'reason', 'modo_invalido');
end;
$$;

grant execute on function public.entrada_validar_y_consumir_qr(text, text, boolean, bigint, integer[]) to authenticated;
