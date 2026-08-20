-- Quien ya tiene reserva activa puede cambiar la cantidad (1..4).
-- Al cambiar se regeneran el QR grupal y los QR de cada plaza, así los PDF
-- impresos antes dejan de valer.

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
  'Titular (o emisor de tercero) cambia la cantidad 1..4 de una reserva activa; regenera todos los QR.';
