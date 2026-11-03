-- Pedidos de ayuda: cancelar o cambiar de función.
-- El titular lo hace con sesión verificada por código, o lo manda como solicitud
-- y un perfil de terceros lo acepta.

alter table public.entrada_ayuda_consulta
  add column if not exists pedido text not null default 'consulta';

alter table public.entrada_ayuda_consulta
  drop constraint if exists entrada_ayuda_consulta_pedido_chk;

alter table public.entrada_ayuda_consulta
  add constraint entrada_ayuda_consulta_pedido_chk
  check (pedido = any (array['consulta'::text, 'cancelar'::text, 'cambiar_funcion'::text]));

alter table public.entrada_ayuda_consulta
  add column if not exists reserva_pedido_id bigint references public.entrada_reserva (id) on delete set null;

alter table public.entrada_ayuda_consulta
  add column if not exists concierto_destino_id bigint references public.entrada_concierto (id) on delete set null;

comment on column public.entrada_ayuda_consulta.pedido is
  'consulta = pide entradas nuevas; cancelar / cambiar_funcion = pedido sobre una reserva vigente.';
comment on column public.entrada_ayuda_consulta.reserva_pedido_id is
  'Reserva vigente que el consultante pide cancelar o mover de función.';
comment on column public.entrada_ayuda_consulta.concierto_destino_id is
  'Función destino cuando pedido = cambiar_funcion.';

create or replace function public.entrada_reserva_pertenece_a_email(
  p_reserva public.entrada_reserva,
  p_email text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_email text := public.entrada_normalizar_email(p_email);
  v_user_email text;
begin
  if v_email is null or p_reserva.id is null then
    return false;
  end if;
  if public.entrada_normalizar_email(p_reserva.email_beneficiario) = v_email then
    return true;
  end if;
  select public.entrada_normalizar_email(u.email)
    into v_user_email
  from public.entrada_usuario u
  where u.id = p_reserva.usuario_id;
  return v_user_email is not null and v_user_email = v_email;
end;
$$;

create or replace function public.entrada_aplicar_cancelacion_reserva(p_reserva_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n integer;
  v_usadas integer;
begin
  perform 1
  from public.entrada_reserva
  where id = p_reserva_id
  for update;

  select count(*)::integer
    into v_usadas
  from public.entrada_reserva_entrada
  where reserva_id = p_reserva_id
    and estado_ingreso = 'ingresada';

  if coalesce(v_usadas, 0) > 0 then
    raise exception 'Esta entrada ya tuvo un ingreso en puerta y no se puede cancelar desde acá.';
  end if;

  update public.entrada_reserva r
  set
    estado = 'cancelada',
    cancelacion_origen = 'usuario',
    updated_at = now()
  where r.id = p_reserva_id
    and r.estado = 'activa';

  get diagnostics v_n = row_count;
  if v_n = 0 then
    raise exception 'La reserva no está activa.';
  end if;

  update public.entrada_reserva_entrada e
  set
    estado_ingreso = 'anulada',
    anulacion_origen = 'usuario',
    updated_at = now()
  where e.reserva_id = p_reserva_id
    and e.estado_ingreso = 'pendiente';
end;
$$;

create or replace function public.entrada_aplicar_cambio_funcion(
  p_reserva_id bigint,
  p_concierto_destino_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reserva public.entrada_reserva;
  v_dest public.entrada_concierto;
  v_ocupadas integer;
  v_usadas integer;
  v_email_benef text;
begin
  if p_concierto_destino_id is null then
    raise exception 'Elegí la función a la que querés pasar.';
  end if;

  select *
    into v_reserva
  from public.entrada_reserva
  where id = p_reserva_id
  for update;

  if v_reserva.id is null then
    raise exception 'No encontramos esa reserva.';
  end if;
  if v_reserva.estado <> 'activa' then
    raise exception 'La reserva no está activa.';
  end if;
  if v_reserva.concierto_id = p_concierto_destino_id then
    raise exception 'Esa ya es la función de tu entrada.';
  end if;

  select count(*)::integer
    into v_usadas
  from public.entrada_reserva_entrada
  where reserva_id = p_reserva_id
    and estado_ingreso = 'ingresada';
  if coalesce(v_usadas, 0) > 0 then
    raise exception 'Esta entrada ya tuvo un ingreso en puerta y no se puede cambiar de función.';
  end if;

  select *
    into v_dest
  from public.entrada_concierto
  where id = p_concierto_destino_id
    and coalesce(activo, false) = true
  for update;

  if v_dest.id is null or not public.entrada_concierto_reservas_abiertas(v_dest) then
    raise exception 'Esa función no está abierta para reservas.';
  end if;

  select coalesce(sum(r.cantidad_solicitada), 0)::integer
    into v_ocupadas
  from public.entrada_reserva r
  where r.concierto_id = p_concierto_destino_id
    and r.estado = 'activa';

  if v_ocupadas + coalesce(v_reserva.cantidad_solicitada, 0) > coalesce(v_dest.capacidad_maxima, 0) then
    raise exception 'No hay lugares disponibles en esa función.';
  end if;

  v_email_benef := public.entrada_normalizar_email(v_reserva.email_beneficiario);

  if exists (
    select 1
    from public.entrada_reserva r
    where r.concierto_id = p_concierto_destino_id
      and r.estado = 'activa'
      and r.id <> v_reserva.id
      and (
        (
          v_reserva.reservada_por is null
          and r.reservada_por is null
          and r.usuario_id = v_reserva.usuario_id
        )
        or (
          v_email_benef is not null
          and public.entrada_normalizar_email(r.email_beneficiario) = v_email_benef
        )
      )
  ) then
    raise exception 'Ya hay una entrada activa en esa función para este mail.';
  end if;

  update public.entrada_reserva
  set
    concierto_id = p_concierto_destino_id,
    updated_at = now()
  where id = v_reserva.id;

  update public.entrada_reserva_entrada
  set
    concierto_id = p_concierto_destino_id,
    updated_at = now()
  where reserva_id = v_reserva.id;

  return jsonb_build_object(
    'ok', true,
    'reserva_id', v_reserva.id,
    'concierto_id', p_concierto_destino_id
  );
end;
$$;

create or replace function public.entrada_cancelar_reserva_verificada(p_reserva_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_verified timestamptz;
  v_reserva public.entrada_reserva;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  select u.email, u.email_verified_at
    into v_email, v_verified
  from public.entrada_usuario u
  where u.id = auth.uid()
    and coalesce(u.activo, false) = true;

  if v_email is null then
    raise exception 'No encontramos tu perfil de entradas.';
  end if;
  if v_verified is null then
    raise exception 'Tenés que verificar el mail con el código antes de cancelar.';
  end if;

  select *
    into v_reserva
  from public.entrada_reserva
  where id = p_reserva_id;

  if v_reserva.id is null then
    raise exception 'No encontramos esa reserva.';
  end if;
  if not public.entrada_reserva_pertenece_a_email(v_reserva, v_email) then
    raise exception 'Esta entrada no está a nombre de este mail.';
  end if;

  perform public.entrada_aplicar_cancelacion_reserva(p_reserva_id);
end;
$$;

create or replace function public.entrada_cambiar_funcion_reserva(
  p_reserva_id bigint,
  p_concierto_destino_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_verified timestamptz;
  v_reserva public.entrada_reserva;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  select u.email, u.email_verified_at
    into v_email, v_verified
  from public.entrada_usuario u
  where u.id = auth.uid()
    and coalesce(u.activo, false) = true;

  if v_email is null then
    raise exception 'No encontramos tu perfil de entradas.';
  end if;
  if v_verified is null then
    raise exception 'Tenés que verificar el mail con el código antes de cambiar de función.';
  end if;

  select *
    into v_reserva
  from public.entrada_reserva
  where id = p_reserva_id;

  if v_reserva.id is null then
    raise exception 'No encontramos esa reserva.';
  end if;
  if not public.entrada_reserva_pertenece_a_email(v_reserva, v_email) then
    raise exception 'Esta entrada no está a nombre de este mail.';
  end if;

  return public.entrada_aplicar_cambio_funcion(p_reserva_id, p_concierto_destino_id);
end;
$$;

create or replace function public.entrada_ayuda_aceptar_pedido(p_id uuid)
returns public.entrada_ayuda_consulta
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.entrada_ayuda_consulta;
  v_reserva public.entrada_reserva;
begin
  if not public.entrada_can_terceros(auth.uid()) then
    raise exception 'No autorizado';
  end if;

  select *
    into v_row
  from public.entrada_ayuda_consulta
  where id = p_id
  for update;

  if v_row.id is null then
    raise exception 'Consulta no encontrada';
  end if;
  if v_row.estado <> 'pendiente' then
    raise exception 'Esta consulta ya no está pendiente.';
  end if;
  if v_row.pedido not in ('cancelar', 'cambiar_funcion') then
    raise exception 'Esta consulta no es un pedido de cancelación o cambio.';
  end if;
  if v_row.reserva_pedido_id is null then
    raise exception 'El pedido no indica qué entrada hay que tocar.';
  end if;

  select *
    into v_reserva
  from public.entrada_reserva
  where id = v_row.reserva_pedido_id;

  if v_reserva.id is null or v_reserva.estado <> 'activa' then
    raise exception 'La entrada del pedido ya no está vigente.';
  end if;
  if not public.entrada_reserva_pertenece_a_email(v_reserva, v_row.email) then
    raise exception 'Esa entrada no corresponde al mail de la consulta.';
  end if;

  if v_row.pedido = 'cancelar' then
    perform public.entrada_aplicar_cancelacion_reserva(v_reserva.id);
  else
    if v_row.concierto_destino_id is null then
      raise exception 'El pedido de cambio no indica la función destino.';
    end if;
    perform public.entrada_aplicar_cambio_funcion(v_reserva.id, v_row.concierto_destino_id);
  end if;

  update public.entrada_ayuda_consulta
  set
    estado = 'resuelta',
    reserva_id = v_reserva.id,
    resolved_at = now(),
    resolved_by = auth.uid()
  where id = v_row.id
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.entrada_reserva_pertenece_a_email(public.entrada_reserva, text) from public, anon, authenticated;
revoke all on function public.entrada_aplicar_cancelacion_reserva(bigint) from public, anon, authenticated;
revoke all on function public.entrada_aplicar_cambio_funcion(bigint, bigint) from public, anon, authenticated;
revoke all on function public.entrada_cancelar_reserva_verificada(bigint) from public, anon, authenticated;
revoke all on function public.entrada_cambiar_funcion_reserva(bigint, bigint) from public, anon, authenticated;
revoke all on function public.entrada_ayuda_aceptar_pedido(uuid) from public, anon, authenticated;

grant execute on function public.entrada_cancelar_reserva_verificada(bigint) to authenticated;
grant execute on function public.entrada_cambiar_funcion_reserva(bigint, bigint) to authenticated;
grant execute on function public.entrada_ayuda_aceptar_pedido(uuid) to authenticated;

comment on function public.entrada_cancelar_reserva_verificada(bigint) is
  'Cancela una reserva propia o de beneficiario si el mail de la sesión está verificado.';
comment on function public.entrada_cambiar_funcion_reserva(bigint, bigint) is
  'Mueve una reserva vigente a otra función abierta con cupo, si el mail está verificado.';
comment on function public.entrada_ayuda_aceptar_pedido(uuid) is
  'Terceros: acepta un pedido de cancelación o cambio de función y marca la consulta resuelta.';
