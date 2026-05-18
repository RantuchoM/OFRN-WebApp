-- Las reservas deben persistir qr_*_token en BD (Mis entradas / PDF posterior).
-- Regresión en 20260514120000 / 20260518120000: solo se guardaba el hash.

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
  if p_cantidad < 1 or p_cantidad > 4 then
    raise exception 'Cantidad inválida (debe ser entre 1 y 4)';
  end if;

  perform 1 from public.entrada_usuario where id = auth.uid() and activo = true;
  if not found then
    raise exception 'Perfil de entradas inexistente o inactivo';
  end if;

  select * into v_concierto
  from public.entrada_concierto
  where id = p_concierto_id and activo = true
  for update;

  if v_concierto.id is null or not public.entrada_concierto_reservas_abiertas(v_concierto) then
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
    qr_reserva_hash,
    qr_reserva_token
  )
  values (
    p_concierto_id,
    auth.uid(),
    p_cantidad,
    'activa',
    public.entrada_generar_codigo_reserva(p_concierto_id),
    public.entrada_qr_token_hash(v_reserva_token),
    v_reserva_token
  )
  returning id into v_reserva_id;

  for i in 1..p_cantidad loop
    v_entry_token := 'ENTR-TCK-' || replace(gen_random_uuid()::text, '-', '');
    insert into public.entrada_reserva_entrada (
      reserva_id,
      concierto_id,
      orden,
      qr_entrada_hash,
      qr_entrada_token
    )
    values (
      v_reserva_id,
      p_concierto_id,
      i,
      public.entrada_qr_token_hash(v_entry_token),
      v_entry_token
    );
    v_tokens := array_append(v_tokens, v_entry_token);
  end loop;

  return query
  select r.id, r.concierto_id, r.codigo_reserva, v_reserva_token, v_tokens
  from public.entrada_reserva r
  where r.id = v_reserva_id;
end;
$$;

-- Repone tokens de plazas faltantes (reservas creadas sin persistir token).
-- No modifica qr_reserva_* de la fila: el QR grupal puede usar codigo_reserva en cliente.
create or replace function public.entrada_asegurar_qr_tokens(p_reserva_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reserva public.entrada_reserva;
  v_row public.entrada_reserva_entrada;
  v_token text;
  v_entradas jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  select * into v_reserva
  from public.entrada_reserva
  where id = p_reserva_id
  for update;

  if v_reserva.id is null then
    raise exception 'Reserva no encontrada';
  end if;

  if v_reserva.usuario_id is distinct from auth.uid()
     and not public.entrada_is_admin(auth.uid()) then
    raise exception 'Sin permiso para esta reserva';
  end if;

  if v_reserva.estado <> 'activa' then
    raise exception 'La reserva no está activa';
  end if;

  for v_row in
    select *
    from public.entrada_reserva_entrada
    where reserva_id = p_reserva_id
    order by orden
    for update
  loop
    v_token := nullif(trim(coalesce(v_row.qr_entrada_token, '')), '');
    if v_token is null then
      v_token := 'ENTR-TCK-' || replace(gen_random_uuid()::text, '-', '');
      update public.entrada_reserva_entrada
      set
        qr_entrada_token = v_token,
        qr_entrada_hash = public.entrada_qr_token_hash(v_token)
      where id = v_row.id;
    end if;

    v_entradas := v_entradas || jsonb_build_array(
      jsonb_build_object(
        'id', v_row.id,
        'orden', v_row.orden,
        'estado_ingreso', v_row.estado_ingreso,
        'qr_entrada_token', v_token
      )
    );
  end loop;

  return jsonb_build_object(
    'ok', true,
    'reserva_id', v_reserva.id,
    'codigo_reserva', v_reserva.codigo_reserva,
    'qr_reserva_token', v_reserva.qr_reserva_token,
    'entradas', v_entradas
  );
end;
$$;

grant execute on function public.entrada_crear_reserva(bigint, integer) to authenticated;
grant execute on function public.entrada_asegurar_qr_tokens(bigint) to authenticated;
