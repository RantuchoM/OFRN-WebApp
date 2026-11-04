-- Mirrored from remote schema_migrations 20261103234102 (already applied).
-- Source snapshot from local 20261103210000; live DB is source of truth if they diverge.

create or replace function public.entrada_staff_cambiar_concierto_reserva(
  p_reserva_id bigint,
  p_nuevo_concierto_id bigint,
  p_forzar_cupo boolean default false
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
  v_destino public.entrada_concierto;
  v_total_ocupado integer;
  v_cantidad integer;
  v_codigo text;
  v_reserva_token text;
  v_entry_token text;
  v_tokens text[] := array[]::text[];
  v_row public.entrada_reserva_entrada;
  v_forzar boolean := coalesce(p_forzar_cupo, false);
  v_excepcional boolean := false;
  i integer;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if not public.entrada_can_terceros(auth.uid()) then
    raise exception 'Sin permiso';
  end if;
  if p_reserva_id is null or p_reserva_id <= 0 then
    raise exception 'Reserva inválida';
  end if;
  if p_nuevo_concierto_id is null or p_nuevo_concierto_id <= 0 then
    raise exception 'Concierto inválido';
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
  if v_reserva.concierto_id is not distinct from p_nuevo_concierto_id then
    raise exception 'La reserva ya está en esa función';
  end if;

  if exists (
    select 1
    from public.entrada_reserva_entrada e
    where e.reserva_id = v_reserva.id
      and e.estado_ingreso is distinct from 'pendiente'
  ) then
    raise exception 'No se puede cambiar de función: alguna entrada ya se usó o se dio de baja.';
  end if;

  select c.* into v_destino
  from public.entrada_concierto c
  inner join public.entrada_programa p on p.id = c.programa_id and p.activo = true
  where c.id = p_nuevo_concierto_id and c.activo = true
  for update of c;

  if v_destino.id is null or not public.entrada_concierto_reservas_abiertas(v_destino) then
    raise exception 'El concierto destino no admite reservas';
  end if;

  -- Una activa por titular en el destino (mismo criterio que crear tercero).
  if exists (
    select 1
    from public.entrada_reserva r
    where r.concierto_id = p_nuevo_concierto_id
      and r.usuario_id = v_reserva.usuario_id
      and r.estado = 'activa'
      and r.id is distinct from v_reserva.id
  ) then
    raise exception 'Esa persona ya tiene una reserva activa para el concierto destino.';
  end if;

  v_cantidad := v_reserva.cantidad_solicitada;

  select coalesce(sum(r.cantidad_solicitada), 0)
    into v_total_ocupado
  from public.entrada_reserva r
  where r.concierto_id = p_nuevo_concierto_id and r.estado = 'activa';

  if v_total_ocupado + v_cantidad > v_destino.capacidad_maxima then
    if not v_forzar then
      raise exception 'No hay capacidad disponible en el concierto destino';
    end if;
    v_excepcional := true;
  end if;

  -- Archivar QR del concierto origen.
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
    v_cantidad,
    v_cantidad
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
    v_cantidad,
    v_cantidad
  from public.entrada_reserva_entrada e
  where e.reserva_id = v_reserva.id
    and coalesce(e.qr_entrada_hash, '') <> ''
  on conflict (qr_hash) do nothing;

  v_codigo := public.entrada_generar_codigo_reserva(p_nuevo_concierto_id);
  v_reserva_token := 'ENTR-RSV-' || replace(gen_random_uuid()::text, '-', '');

  for i in 1..v_cantidad loop
    v_entry_token := 'ENTR-TCK-' || replace(gen_random_uuid()::text, '-', '');
    select * into v_row
    from public.entrada_reserva_entrada e
    where e.reserva_id = v_reserva.id and e.orden = i
    for update;

    if not found then
      insert into public.entrada_reserva_entrada (
        reserva_id, concierto_id, orden, qr_entrada_hash, qr_entrada_token
      ) values (
        v_reserva.id,
        p_nuevo_concierto_id,
        i,
        public.entrada_qr_token_hash(v_entry_token),
        v_entry_token
      );
    else
      update public.entrada_reserva_entrada
      set
        concierto_id = p_nuevo_concierto_id,
        qr_entrada_token = v_entry_token,
        qr_entrada_hash = public.entrada_qr_token_hash(v_entry_token),
        updated_at = now()
      where id = v_row.id;
    end if;

    v_tokens := array_append(v_tokens, v_entry_token);
  end loop;

  update public.entrada_reserva
  set
    concierto_id = p_nuevo_concierto_id,
    codigo_reserva = v_codigo,
    qr_reserva_token = v_reserva_token,
    qr_reserva_hash = public.entrada_qr_token_hash(v_reserva_token),
    cupo_excepcional = case when v_excepcional then true else cupo_excepcional end,
    pdf_share_token = public.entrada_new_pdf_share_token(),
    updated_at = now()
  where id = v_reserva.id;

  return query
  select
    v_reserva.id,
    p_nuevo_concierto_id,
    v_codigo,
    v_reserva_token,
    v_tokens;
end;
$$;

comment on function public.entrada_staff_cambiar_concierto_reserva(bigint, bigint, boolean) is
  'Staff: mueve una reserva activa no usada a otro concierto abierto; regenera código y QR.';

revoke all on function public.entrada_staff_cambiar_concierto_reserva(bigint, bigint, boolean) from public;
grant execute on function public.entrada_staff_cambiar_concierto_reserva(bigint, bigint, boolean) to authenticated;

-- 4) Cancelar activa (staff terceros, no solo admin).
