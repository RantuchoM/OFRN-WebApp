-- Historial de reservas por persona (staff) + editar no usadas (cantidad / función / cancelar).

-- 1) Listar historial por mail (titular o beneficiario de tercero).
create or replace function public.entrada_staff_listar_reservas_persona(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := public.entrada_normalizar_email(p_email);
  v_out jsonb;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if not public.entrada_can_terceros(auth.uid()) then
    raise exception 'Sin permiso';
  end if;
  if v_email is null or position('@' in v_email) = 0 then
    raise exception 'Mail inválido';
  end if;

  select coalesce(jsonb_agg(row_data order by sort_key desc, id desc), '[]'::jsonb)
  into v_out
  from (
    select
      r.id,
      (
        case
          when r.estado = 'activa' then 2
          else 0
        end
      )::int as sort_key,
      jsonb_build_object(
        'id', r.id,
        'codigo_reserva', r.codigo_reserva,
        'cantidad_solicitada', r.cantidad_solicitada,
        'estado', r.estado,
        'created_at', r.created_at,
        'cancelacion_origen', r.cancelacion_origen,
        'cupo_excepcional', r.cupo_excepcional,
        'usuario_id', r.usuario_id,
        'reservada_por', r.reservada_por,
        'email_beneficiario', r.email_beneficiario,
        'beneficiario_referencia', r.beneficiario_referencia,
        'qr_reserva_token', r.qr_reserva_token,
        'concierto_id', r.concierto_id,
        'concierto', jsonb_build_object(
          'id', c.id,
          'nombre', c.nombre,
          'slug_publico', c.slug_publico,
          'activo', c.activo,
          'reservas_habilitadas', c.reservas_habilitadas,
          'apertura_reservas_at', c.apertura_reservas_at,
          'capacidad_maxima', c.capacidad_maxima,
          'ofrn_evento_id', c.ofrn_evento_id,
          'evento', case
            when ev.id is null then null
            else jsonb_build_object(
              'id', ev.id,
              'fecha', ev.fecha,
              'hora_inicio', ev.hora_inicio,
              'id_locacion', ev.id_locacion
            )
          end
        ),
        'entradas', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', e.id,
              'orden', e.orden,
              'estado_ingreso', e.estado_ingreso,
              'ingresada_at', e.ingresada_at,
              'qr_entrada_token', e.qr_entrada_token
            )
            order by e.orden
          )
          from public.entrada_reserva_entrada e
          where e.reserva_id = r.id
        ), '[]'::jsonb),
        'titular', case
          when u.id is null then null
          else jsonb_build_object(
            'id', u.id,
            'nombre', u.nombre,
            'apellido', u.apellido,
            'email', u.email
          )
        end
      ) as row_data
    from public.entrada_reserva r
    left join public.entrada_usuario u on u.id = r.usuario_id
    left join public.entrada_concierto c on c.id = r.concierto_id
    left join public.eventos ev on ev.id = c.ofrn_evento_id
    where (
      public.entrada_normalizar_email(u.email) = v_email
      or public.entrada_normalizar_email(r.email_beneficiario) = v_email
    )
  ) q;

  return coalesce(v_out, '[]'::jsonb);
end;
$$;

comment on function public.entrada_staff_listar_reservas_persona(text) is
  'Staff (entrada_can_terceros): historial de reservas de un mail (titular o beneficiario).';

revoke all on function public.entrada_staff_listar_reservas_persona(text) from public;
grant execute on function public.entrada_staff_listar_reservas_persona(text) to authenticated;

-- 2) Ampliar permiso de cambio de cantidad a todo staff con terceros.
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
     and v_reserva.reservada_por is distinct from auth.uid()
     and not public.entrada_can_terceros(auth.uid()) then
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

comment on function public.entrada_cambiar_cantidad_reserva(bigint, integer) is
  'Titular, emisor de tercero o staff (entrada_can_terceros) cambia cantidad 1..4 de reserva activa no usada; regenera QR.';

-- 3) Cambiar de función/concierto (solo no usadas).
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
create or replace function public.entrada_staff_cancelar_reserva(p_reserva_id bigint)
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
  if not public.entrada_can_terceros(auth.uid()) then
    raise exception 'Sin permiso';
  end if;

  update public.entrada_reserva r
  set
    estado = 'cancelada',
    cancelacion_origen = 'admin_suspension',
    updated_at = now()
  where r.id = p_reserva_id
    and r.estado = 'activa';

  get diagnostics v_n = row_count;
  if v_n = 0 then
    raise exception 'Reserva no cancelable: no existe o ya estaba cancelada.';
  end if;

  update public.entrada_reserva_entrada e
  set
    estado_ingreso = 'anulada',
    anulacion_origen = 'admin_suspension',
    updated_at = now()
  where e.reserva_id = p_reserva_id
    and e.estado_ingreso = 'pendiente';
end;
$$;

comment on function public.entrada_staff_cancelar_reserva(bigint) is
  'Staff (entrada_can_terceros): cancela reserva activa y anula plazas pendientes.';

revoke all on function public.entrada_staff_cancelar_reserva(bigint) from public;
grant execute on function public.entrada_staff_cancelar_reserva(bigint) to authenticated;
