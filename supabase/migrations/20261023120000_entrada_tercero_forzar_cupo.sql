-- Emisión excepcional de terceros: permite superar capacidad_maxima con p_forzar_cupo.

alter table public.entrada_reserva
  add column if not exists cupo_excepcional boolean not null default false;

comment on column public.entrada_reserva.cupo_excepcional is
  'true si se emitió como tercero forzando cupo (función agotada).';

drop function if exists public.entrada_admin_crear_reserva_tercero(bigint, integer, text, text);

create or replace function public.entrada_admin_crear_reserva_tercero(
  p_concierto_id bigint,
  p_cantidad integer,
  p_email_beneficiario text default null,
  p_beneficiario_referencia text default null,
  p_forzar_cupo boolean default false
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
  email_beneficiario text,
  cupo_excepcional boolean
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
  v_forzar boolean := coalesce(p_forzar_cupo, false);
  v_excepcional boolean := false;
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
    if not v_forzar then
      raise exception 'No hay capacidad disponible para esa cantidad';
    end if;
    v_excepcional := true;
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
    beneficiario_referencia,
    cupo_excepcional
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
    v_referencia,
    v_excepcional
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
    coalesce(v_email_pendiente, v_email),
    r.cupo_excepcional
  from public.entrada_reserva r
  where r.id = v_reserva_id;
end;
$$;

revoke all on function public.entrada_admin_crear_reserva_tercero(bigint, integer, text, text, boolean) from public;
grant execute on function public.entrada_admin_crear_reserva_tercero(bigint, integer, text, text, boolean) to authenticated;
