-- Máximo 4 entradas por reserva (antes 5): UI + RPC + CHECK alineados.

do $$
begin
  if exists (select 1 from public.entrada_reserva where cantidad_solicitada > 4) then
    raise exception
      'entradas_max_cuatro: hay filas en entrada_reserva con cantidad_solicitada > 4; ajustar datos antes de aplicar esta migración.';
  end if;
end $$;

do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'entrada_reserva'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%cantidad_solicitada%'
  loop
    execute format('alter table public.entrada_reserva drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.entrada_reserva
  add constraint entrada_reserva_cantidad_solicitada_check
  check (cantidad_solicitada >= 1 and cantidad_solicitada <= 4);

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
  where id = p_concierto_id and activo = true and reservas_habilitadas = true
  for update;

  if v_concierto.id is null then
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
    qr_reserva_hash
  )
  values (
    p_concierto_id,
    auth.uid(),
    p_cantidad,
    'activa',
    public.entrada_generar_codigo_reserva(p_concierto_id),
    public.entrada_qr_token_hash(v_reserva_token)
  )
  returning id into v_reserva_id;

  for i in 1..p_cantidad loop
    v_entry_token := 'ENTR-TCK-' || replace(gen_random_uuid()::text, '-', '');
    insert into public.entrada_reserva_entrada (
      reserva_id,
      concierto_id,
      orden,
      qr_entrada_hash
    )
    values (
      v_reserva_id,
      p_concierto_id,
      i,
      public.entrada_qr_token_hash(v_entry_token)
    );
    v_tokens := array_append(v_tokens, v_entry_token);
  end loop;

  return query
  select r.id, r.concierto_id, r.codigo_reserva, v_reserva_token, v_tokens
  from public.entrada_reserva r
  where r.id = v_reserva_id;
end;
$$;
