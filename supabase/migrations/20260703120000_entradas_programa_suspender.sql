-- Suspender / reactivar programas de entradas + endurecer reservas contra programa inactivo.

create or replace function public.entrada_admin_suspender_programa(
  p_programa_id bigint,
  p_cancelar_reservas boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_programa public.entrada_programa;
  v_reservas_canceladas integer := 0;
  v_conciertos_afectados integer := 0;
  v_notificar jsonb := '[]'::jsonb;
begin
  if not public.entrada_is_admin(auth.uid()) then
    raise exception 'Sin permisos admin';
  end if;

  if p_programa_id is null or p_programa_id <= 0 then
    raise exception 'Programa inválido';
  end if;

  select * into v_programa
  from public.entrada_programa p
  where p.id = p_programa_id;

  if v_programa.id is null then
    raise exception 'Programa no encontrado';
  end if;

  if coalesce(p_cancelar_reservas, false) then
    create temp table tmp_suspend_canceladas (
      reserva_id bigint primary key,
      concierto_id bigint not null,
      usuario_id uuid not null
    ) on commit drop;

    with canceladas as (
      update public.entrada_reserva r
      set estado = 'cancelada', updated_at = now()
      from public.entrada_concierto c
      where c.id = r.concierto_id
        and c.programa_id = p_programa_id
        and r.estado = 'activa'
      returning r.id, r.concierto_id, r.usuario_id
    )
    insert into tmp_suspend_canceladas (reserva_id, concierto_id, usuario_id)
    select id, concierto_id, usuario_id from canceladas;

    get diagnostics v_reservas_canceladas = row_count;

    update public.entrada_reserva_entrada e
    set
      estado_ingreso = 'anulada',
      updated_at = now()
    from tmp_suspend_canceladas ca
    where e.reserva_id = ca.reserva_id
      and e.estado_ingreso = 'pendiente';

    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'concierto_id', sub.concierto_id,
          'concierto_nombre', sub.concierto_nombre,
          'fecha_hora', sub.fecha_hora,
          'lugar_nombre', sub.lugar_nombre,
          'emails', sub.emails
        )
        order by sub.fecha_hora nulls last, sub.concierto_id
      ),
      '[]'::jsonb
    )
    into v_notificar
    from (
      select
        c.id as concierto_id,
        c.nombre as concierto_nombre,
        c.fecha_hora,
        c.lugar_nombre,
        coalesce(
          jsonb_agg(distinct lower(trim(u.email)) order by lower(trim(u.email)))
            filter (where nullif(trim(u.email), '') is not null),
          '[]'::jsonb
        ) as emails
      from tmp_suspend_canceladas t
      inner join public.entrada_concierto c on c.id = t.concierto_id
      inner join public.entrada_usuario u on u.id = t.usuario_id
      group by c.id, c.nombre, c.fecha_hora, c.lugar_nombre
      having count(distinct lower(trim(u.email))) filter (where nullif(trim(u.email), '') is not null) > 0
    ) sub;
  end if;

  update public.entrada_programa
  set activo = false, updated_at = now()
  where id = p_programa_id;

  update public.entrada_concierto
  set
    activo = false,
    reservas_habilitadas = false,
    updated_at = now()
  where programa_id = p_programa_id;

  get diagnostics v_conciertos_afectados = row_count;

  return jsonb_build_object(
    'ok', true,
    'programa_id', p_programa_id,
    'programa_nombre', v_programa.nombre,
    'conciertos_afectados', v_conciertos_afectados,
    'reservas_canceladas', v_reservas_canceladas,
    'notificar', v_notificar
  );
end;
$$;

create or replace function public.entrada_admin_reactivar_programa(p_programa_id bigint)
returns public.entrada_programa
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.entrada_programa;
begin
  if not public.entrada_is_admin(auth.uid()) then
    raise exception 'Sin permisos admin';
  end if;

  if p_programa_id is null or p_programa_id <= 0 then
    raise exception 'Programa inválido';
  end if;

  update public.entrada_programa
  set activo = true, updated_at = now()
  where id = p_programa_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Programa no encontrado';
  end if;

  return v_row;
end;
$$;

-- Reserva personal: exige programa y concierto activos.
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

  select c.* into v_concierto
  from public.entrada_concierto c
  inner join public.entrada_programa p on p.id = c.programa_id and p.activo = true
  where c.id = p_concierto_id and c.activo = true
  for update of c;

  if v_concierto.id is null or not public.entrada_concierto_reservas_abiertas(v_concierto) then
    raise exception 'Concierto no disponible para reservas';
  end if;

  if exists (
    select 1 from public.entrada_reserva r
    where r.concierto_id = p_concierto_id
      and r.usuario_id = auth.uid()
      and r.estado = 'activa'
      and r.reservada_por is null
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
  select v_reserva_id, p_concierto_id, r.codigo_reserva, v_reserva_token, v_tokens
  from public.entrada_reserva r
  where r.id = v_reserva_id;
end;
$$;

-- Reserva a terceros (admin): mismo criterio de programa activo.
create or replace function public.entrada_admin_crear_reserva_tercero(
  p_concierto_id bigint,
  p_cantidad integer,
  p_email_beneficiario text default null,
  p_beneficiario_referencia text default null
)
returns table(
  reserva_id bigint,
  concierto_id bigint,
  codigo_reserva text,
  qr_reserva_token text,
  qr_entrada_tokens text[],
  beneficiario_nombre text,
  beneficiario_apellido text,
  vinculado_inmediato boolean,
  email_beneficiario text
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
  v_email text;
  v_beneficiario public.entrada_usuario;
  v_titular_id uuid;
  v_email_pendiente text;
  v_nombre text;
  v_apellido text;
  v_vinculado boolean := false;
  v_referencia text;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if not public.entrada_is_admin(auth.uid()) then
    raise exception 'Sin permisos de administrador';
  end if;
  if p_cantidad < 1 or p_cantidad > 4 then
    raise exception 'Cantidad inválida (debe ser entre 1 y 4)';
  end if;

  perform 1 from public.entrada_usuario where id = auth.uid() and activo = true;
  if not found then
    raise exception 'Perfil de entradas inexistente o inactivo';
  end if;

  select c.* into v_concierto
  from public.entrada_concierto c
  inner join public.entrada_programa p on p.id = c.programa_id and p.activo = true
  where c.id = p_concierto_id and c.activo = true
  for update of c;

  if v_concierto.id is null or not public.entrada_concierto_reservas_abiertas(v_concierto) then
    raise exception 'Concierto no disponible para reservas';
  end if;

  select coalesce(sum(r.cantidad_solicitada), 0)
    into v_total_ocupado
  from public.entrada_reserva r
  where r.concierto_id = p_concierto_id and r.estado = 'activa';

  if v_total_ocupado + p_cantidad > v_concierto.capacidad_maxima then
    raise exception 'No hay capacidad disponible para esa cantidad';
  end if;

  v_email := public.entrada_normalizar_email(p_email_beneficiario);
  v_referencia := nullif(trim(coalesce(p_beneficiario_referencia, '')), '');
  v_titular_id := auth.uid();
  v_email_pendiente := null;

  if v_email is not null then
    select * into v_beneficiario
    from public.entrada_usuario eu
    where lower(eu.email) = v_email and eu.activo = true
    limit 1;

    if v_beneficiario.id is not null then
      if exists (
        select 1 from public.entrada_reserva r
        where r.concierto_id = p_concierto_id
          and r.usuario_id = v_beneficiario.id
          and r.estado = 'activa'
      ) then
        raise exception 'Esa persona ya tiene una reserva activa para este concierto.';
      end if;
      v_titular_id := v_beneficiario.id;
      v_nombre := v_beneficiario.nombre;
      v_apellido := v_beneficiario.apellido;
      v_vinculado := true;
    else
      v_email_pendiente := v_email;
    end if;
  end if;

  v_reserva_token := 'ENTR-RSV-' || replace(gen_random_uuid()::text, '-', '');
  insert into public.entrada_reserva (
    concierto_id,
    usuario_id,
    cantidad_solicitada,
    estado,
    codigo_reserva,
    qr_reserva_hash,
    qr_reserva_token,
    reservada_por,
    email_beneficiario,
    beneficiario_referencia
  )
  values (
    p_concierto_id,
    v_titular_id,
    p_cantidad,
    'activa',
    public.entrada_generar_codigo_reserva(p_concierto_id),
    public.entrada_qr_token_hash(v_reserva_token),
    v_reserva_token,
    auth.uid(),
    v_email_pendiente,
    v_referencia
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
  select
    r.id,
    r.concierto_id,
    r.codigo_reserva,
    v_reserva_token,
    v_tokens,
    v_nombre,
    v_apellido,
    v_vinculado,
    coalesce(v_email_pendiente, v_email)
  from public.entrada_reserva r
  where r.id = v_reserva_id;
end;
$$;

grant execute on function public.entrada_admin_suspender_programa(bigint, boolean) to authenticated;
grant execute on function public.entrada_admin_reactivar_programa(bigint) to authenticated;
