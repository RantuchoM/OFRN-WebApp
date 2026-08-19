-- Roles Boletos y Boletos+Recepc: reservas a terceros (y recepción en el combinado).
-- Admin sigue pudiendo todo. Boletos no entra al menú Admin.

alter type public.entrada_rol add value if not exists 'boletos';
alter type public.entrada_rol add value if not exists 'boletos_recep';

create or replace function public.entrada_can_terceros(check_user uuid default auth.uid())
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.entrada_usuario eu
    where eu.id = check_user
      and eu.activo = true
      and eu.rol in ('admin', 'boletos', 'boletos_recep')
  );
$$;

create or replace function public.entrada_is_recepcion(check_user uuid default auth.uid())
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.entrada_usuario eu
    where eu.id = check_user
      and eu.activo = true
      and eu.rol in ('admin', 'recepcionista', 'boletos_recep')
  );
$$;

create or replace function public.entrada_usuario_es_titular_de_tercero_propio(p_usuario_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.entrada_reserva r
    where r.reservada_por = auth.uid()
      and r.usuario_id = p_usuario_id
  );
$$;

grant execute on function public.entrada_can_terceros(uuid) to authenticated;
grant execute on function public.entrada_usuario_es_titular_de_tercero_propio(uuid) to authenticated;

-- El creador de una reserva a tercero debe poder leerla aunque el titular sea otra persona.
drop policy if exists "entrada reservas select propias" on public.entrada_reserva;
create policy "entrada reservas select propias"
on public.entrada_reserva
for select
using (
  usuario_id = auth.uid()
  or reservada_por = auth.uid()
  or public.entrada_is_admin(auth.uid())
  or public.entrada_is_recepcion(auth.uid())
);

drop policy if exists "entrada reserva entrada select" on public.entrada_reserva_entrada;
create policy "entrada reserva entrada select"
on public.entrada_reserva_entrada
for select
using (
  exists (
    select 1 from public.entrada_reserva r
    where r.id = reserva_id
      and (
        r.usuario_id = auth.uid()
        or r.reservada_por = auth.uid()
        or public.entrada_is_admin(auth.uid())
        or public.entrada_is_recepcion(auth.uid())
      )
  )
);

drop policy if exists "entrada usuario lee titular tercero" on public.entrada_usuario;
create policy "entrada usuario lee titular tercero"
on public.entrada_usuario
for select
using (public.entrada_usuario_es_titular_de_tercero_propio(id));

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
  if not public.entrada_can_terceros(auth.uid()) then
    raise exception 'Sin permisos para reservas a terceros';
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
  if not public.entrada_can_terceros(auth.uid()) then
    raise exception 'Sin permisos para reservas a terceros';
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
  if not public.entrada_can_terceros(auth.uid()) then
    raise exception 'Sin permisos para reservas a terceros';
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
  if not public.entrada_can_terceros(auth.uid()) then
    raise exception 'Sin permisos para reservas a terceros';
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

create or replace function public.entrada_actualizar_referencia_tercero(
  p_reserva_id bigint,
  p_referencia text
)
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
    raise exception 'Sin permisos para reservas a terceros';
  end if;

  update public.entrada_reserva r
  set
    beneficiario_referencia = nullif(trim(coalesce(p_referencia, '')), ''),
    updated_at = now()
  where r.id = p_reserva_id
    and r.reservada_por = auth.uid()
    and r.estado = 'activa';

  get diagnostics v_n = row_count;
  if v_n = 0 then
    raise exception 'No se pudo actualizar la referencia.';
  end if;
end;
$$;

grant execute on function public.entrada_admin_buscar_beneficiario(text) to authenticated;
grant execute on function public.entrada_admin_crear_reserva_tercero(bigint, integer, text, text) to authenticated;
grant execute on function public.entrada_admin_asociar_email_tercero(bigint, text) to authenticated;
grant execute on function public.entrada_admin_cancelar_reserva_tercero(bigint) to authenticated;
grant execute on function public.entrada_actualizar_referencia_tercero(bigint, text) to authenticated;
