-- Reservas a terceros (solo admin): titularidad, vinculación por mail y gestión.

alter table public.entrada_reserva
  add column if not exists reservada_por uuid references public.entrada_usuario(id) on delete set null,
  add column if not exists email_beneficiario text,
  add column if not exists beneficiario_referencia text;

create index if not exists entrada_reserva_reservada_por_idx
  on public.entrada_reserva(reservada_por)
  where reservada_por is not null;

create index if not exists entrada_reserva_email_beneficiario_idx
  on public.entrada_reserva(lower(email_beneficiario))
  where email_beneficiario is not null;

create or replace function public.entrada_normalizar_email(p_email text)
returns text
language sql
immutable
as $$
  select nullif(lower(trim(coalesce(p_email, ''))), '');
$$;

-- Reserva personal activa del titular (excluye reservas a terceros en su cuenta).
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
  select r.id, r.concierto_id, r.codigo_reserva, v_reserva_token, v_tokens
  from public.entrada_reserva r
  where r.id = v_reserva_id;
end;
$$;

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
     and v_reserva.reservada_por is distinct from auth.uid()
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

create or replace function public.entrada_admin_buscar_beneficiario(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_u public.entrada_usuario;
begin
  if not public.entrada_is_admin(auth.uid()) then
    raise exception 'Sin permisos de administrador';
  end if;

  v_email := public.entrada_normalizar_email(p_email);
  if v_email is null then
    return jsonb_build_object('encontrado', false);
  end if;

  select * into v_u
  from public.entrada_usuario eu
  where lower(eu.email) = v_email and eu.activo = true
  limit 1;

  if v_u.id is null then
    return jsonb_build_object('encontrado', false, 'email', v_email);
  end if;

  return jsonb_build_object(
    'encontrado', true,
    'id', v_u.id,
    'nombre', v_u.nombre,
    'apellido', v_u.apellido,
    'email', v_u.email
  );
end;
$$;

create or replace function public.entrada_vincular_reservas_pendientes()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_count integer := 0;
  v_conflictos jsonb := '[]'::jsonb;
  r record;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  select lower(trim(email)) into v_email
  from public.entrada_usuario
  where id = auth.uid();

  if coalesce(v_email, '') = '' then
    return jsonb_build_object('vinculadas', 0, 'conflictos', v_conflictos);
  end if;

  for r in
    select er.*
    from public.entrada_reserva er
    where er.estado = 'activa'
      and er.reservada_por is not null
      and lower(coalesce(er.email_beneficiario, '')) = v_email
      and er.usuario_id is distinct from auth.uid()
  loop
    if exists (
      select 1 from public.entrada_reserva x
      where x.concierto_id = r.concierto_id
        and x.usuario_id = auth.uid()
        and x.estado = 'activa'
        and x.id <> r.id
    ) then
      v_conflictos := v_conflictos || jsonb_build_array(
        jsonb_build_object(
          'reserva_id', r.id,
          'codigo_reserva', r.codigo_reserva,
          'concierto_id', r.concierto_id,
          'motivo', 'ya_tiene_reserva_activa'
        )
      );
      continue;
    end if;

    update public.entrada_reserva
    set
      usuario_id = auth.uid(),
      email_beneficiario = null,
      updated_at = now()
    where id = r.id;

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('vinculadas', v_count, 'conflictos', v_conflictos);
end;
$$;

create or replace function public.entrada_ensure_profile(
  p_nombre text,
  p_apellido text
)
returns public.entrada_usuario
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user auth.users;
  v_profile public.entrada_usuario;
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  select * into v_user from auth.users where id = auth.uid();
  if v_user.id is null then
    raise exception 'Usuario auth no encontrado';
  end if;

  v_email := lower(trim(coalesce(v_user.email, '')));

  insert into public.entrada_usuario (id, nombre, apellido, email, rol)
  values (
    auth.uid(),
    coalesce(nullif(trim(p_nombre), ''), '—'),
    coalesce(nullif(trim(p_apellido), ''), '—'),
    v_email,
    case
      when v_email = 'ofrn.archivo@gmail.com' then 'admin'::public.entrada_rol
      else 'personal'::public.entrada_rol
    end
  )
  on conflict (id) do update
  set
    nombre = coalesce(nullif(trim(excluded.nombre), ''), nullif(trim(public.entrada_usuario.nombre), ''), '—'),
    apellido = coalesce(nullif(trim(excluded.apellido), ''), nullif(trim(public.entrada_usuario.apellido), ''), '—'),
    email = excluded.email
  returning * into v_profile;

  perform public.entrada_vincular_reservas_pendientes();

  return v_profile;
end;
$$;

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

  select * into v_concierto
  from public.entrada_concierto
  where id = p_concierto_id and activo = true
  for update;

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

create or replace function public.entrada_admin_asociar_email_tercero(
  p_reserva_id bigint,
  p_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reserva public.entrada_reserva;
  v_email text;
  v_beneficiario public.entrada_usuario;
begin
  if not public.entrada_is_admin(auth.uid()) then
    raise exception 'Sin permisos de administrador';
  end if;

  select * into v_reserva
  from public.entrada_reserva
  where id = p_reserva_id
  for update;

  if v_reserva.id is null then
    raise exception 'Reserva no encontrada';
  end if;
  if v_reserva.reservada_por is distinct from auth.uid() then
    raise exception 'Solo podés asociar mail en reservas que creaste';
  end if;
  if v_reserva.estado <> 'activa' then
    raise exception 'La reserva no está activa';
  end if;

  v_email := public.entrada_normalizar_email(p_email);
  if v_email is null then
    raise exception 'Mail inválido';
  end if;

  select * into v_beneficiario
  from public.entrada_usuario eu
  where lower(eu.email) = v_email and eu.activo = true
  limit 1;

  if v_beneficiario.id is not null then
    if exists (
      select 1 from public.entrada_reserva r
      where r.concierto_id = v_reserva.concierto_id
        and r.usuario_id = v_beneficiario.id
        and r.estado = 'activa'
        and r.id <> v_reserva.id
    ) then
      raise exception 'Esa persona ya tiene una reserva activa para este concierto.';
    end if;

    update public.entrada_reserva
    set
      usuario_id = v_beneficiario.id,
      email_beneficiario = null,
      updated_at = now()
    where id = p_reserva_id;

    return jsonb_build_object(
      'ok', true,
      'vinculado_inmediato', true,
      'beneficiario_nombre', v_beneficiario.nombre,
      'beneficiario_apellido', v_beneficiario.apellido,
      'email', v_beneficiario.email
    );
  end if;

  update public.entrada_reserva
  set
    usuario_id = auth.uid(),
    email_beneficiario = v_email,
    updated_at = now()
  where id = p_reserva_id;

  return jsonb_build_object(
    'ok', true,
    'vinculado_inmediato', false,
    'email', v_email
  );
end;
$$;

create or replace function public.entrada_admin_cancelar_reserva_tercero(p_reserva_id bigint)
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
  if not public.entrada_is_admin(auth.uid()) then
    raise exception 'Sin permisos de administrador';
  end if;

  update public.entrada_reserva r
  set estado = 'cancelada', updated_at = now()
  where r.id = p_reserva_id
    and r.reservada_por = auth.uid()
    and r.estado = 'activa';

  get diagnostics v_n = row_count;
  if v_n = 0 then
    raise exception 'Reserva no cancelable: no existe, no la creaste, o ya estaba cancelada.';
  end if;

  update public.entrada_reserva_entrada e
  set
    estado_ingreso = 'anulada',
    updated_at = now()
  where e.reserva_id = p_reserva_id
    and e.estado_ingreso = 'pendiente';
end;
$$;

grant execute on function public.entrada_admin_buscar_beneficiario(text) to authenticated;
grant execute on function public.entrada_vincular_reservas_pendientes() to authenticated;
grant execute on function public.entrada_admin_crear_reserva_tercero(bigint, integer, text, text) to authenticated;
grant execute on function public.entrada_admin_asociar_email_tercero(bigint, text) to authenticated;
grant execute on function public.entrada_admin_cancelar_reserva_tercero(bigint) to authenticated;
