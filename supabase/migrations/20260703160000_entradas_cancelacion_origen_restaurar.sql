-- Origen de cancelación/anulación: distinguir suspensión admin vs cancelación del usuario/recepción.
-- Permite restaurar solo reservas canceladas al suspender programa/concierto.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'entrada_cancelacion_origen') then
    create type public.entrada_cancelacion_origen as enum (
      'usuario',
      'recepcion',
      'admin_suspension'
    );
  end if;
end $$;

alter table public.entrada_reserva
  add column if not exists cancelacion_origen public.entrada_cancelacion_origen;

alter table public.entrada_reserva_entrada
  add column if not exists anulacion_origen public.entrada_cancelacion_origen;

alter table public.entrada_reserva
  drop constraint if exists entrada_reserva_cancelacion_origen_check;

alter table public.entrada_reserva
  add constraint entrada_reserva_cancelacion_origen_check
  check (
    (estado = 'activa' and cancelacion_origen is null)
    or estado = 'cancelada'
  );

alter table public.entrada_reserva_entrada
  drop constraint if exists entrada_reserva_entrada_anulacion_origen_check;

alter table public.entrada_reserva_entrada
  add constraint entrada_reserva_entrada_anulacion_origen_check
  check (
    (estado_ingreso <> 'anulada' and anulacion_origen is null)
    or estado_ingreso = 'anulada'
  );

create or replace function public.entrada_admin_contar_reservas_restaurables(
  p_scope text,
  p_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_reservas integer := 0;
  v_plazas integer := 0;
begin
  if not public.entrada_is_admin(auth.uid()) then
    raise exception 'Sin permisos admin';
  end if;

  if p_scope = 'concierto' then
    select
      count(*)::integer,
      coalesce(sum(r.cantidad_solicitada), 0)::integer
    into v_reservas, v_plazas
    from public.entrada_reserva r
    where r.concierto_id = p_id
      and r.estado = 'cancelada'
      and r.cancelacion_origen = 'admin_suspension';
  elsif p_scope = 'programa' then
    select
      count(*)::integer,
      coalesce(sum(r.cantidad_solicitada), 0)::integer
    into v_reservas, v_plazas
    from public.entrada_reserva r
    inner join public.entrada_concierto c on c.id = r.concierto_id
    where c.programa_id = p_id
      and r.estado = 'cancelada'
      and r.cancelacion_origen = 'admin_suspension';
  else
    raise exception 'Alcance inválido';
  end if;

  return jsonb_build_object(
    'reservas', coalesce(v_reservas, 0),
    'plazas', coalesce(v_plazas, 0)
  );
end;
$$;

create or replace function public.entrada_admin_restaurar_reservas_suspension_concierto(p_concierto_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_concierto public.entrada_concierto;
  v_ocupado integer;
  v_restaurar integer;
  v_reservas integer := 0;
  v_plazas integer := 0;
begin
  if not public.entrada_is_admin(auth.uid()) then
    raise exception 'Sin permisos admin';
  end if;

  select * into v_concierto
  from public.entrada_concierto c
  where c.id = p_concierto_id
  for update;

  if v_concierto.id is null then
    raise exception 'Concierto no encontrado';
  end if;

  select coalesce(sum(r.cantidad_solicitada), 0)::integer
  into v_restaurar
  from public.entrada_reserva r
  where r.concierto_id = p_concierto_id
    and r.estado = 'cancelada'
    and r.cancelacion_origen = 'admin_suspension';

  if coalesce(v_restaurar, 0) = 0 then
    return jsonb_build_object('ok', true, 'reservas', 0, 'plazas', 0);
  end if;

  select coalesce(sum(r.cantidad_solicitada), 0)::integer
  into v_ocupado
  from public.entrada_reserva r
  where r.concierto_id = p_concierto_id
    and r.estado = 'activa';

  if v_ocupado + v_restaurar > v_concierto.capacidad_maxima then
    raise exception 'No hay capacidad para restaurar % plazas (ocupadas: %, máximo: %).',
      v_restaurar, v_ocupado, v_concierto.capacidad_maxima;
  end if;

  create temp table tmp_restaurar_reservas (
    reserva_id bigint primary key
  ) on commit drop;

  with restauradas as (
    update public.entrada_reserva r
    set
      estado = 'activa',
      cancelacion_origen = null,
      updated_at = now()
    where r.concierto_id = p_concierto_id
      and r.estado = 'cancelada'
      and r.cancelacion_origen = 'admin_suspension'
    returning r.id, r.cantidad_solicitada
  )
  insert into tmp_restaurar_reservas (reserva_id)
  select id from restauradas;

  get diagnostics v_reservas = row_count;

  select coalesce(sum(r.cantidad_solicitada), 0)::integer
  into v_plazas
  from public.entrada_reserva r
  inner join tmp_restaurar_reservas t on t.reserva_id = r.id;

  update public.entrada_reserva_entrada e
  set
    estado_ingreso = 'pendiente',
    anulacion_origen = null,
    updated_at = now()
  from tmp_restaurar_reservas t
  where e.reserva_id = t.reserva_id
    and e.estado_ingreso = 'anulada'
    and coalesce(e.anulacion_origen, 'admin_suspension') = 'admin_suspension';

  return jsonb_build_object(
    'ok', true,
    'reservas', v_reservas,
    'plazas', v_plazas
  );
end;
$$;

create or replace function public.entrada_admin_restaurar_reservas_suspension_programa(p_programa_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_concierto record;
  v_total_reservas integer := 0;
  v_total_plazas integer := 0;
  v_out jsonb;
begin
  if not public.entrada_is_admin(auth.uid()) then
    raise exception 'Sin permisos admin';
  end if;

  if p_programa_id is null or p_programa_id <= 0 then
    raise exception 'Programa inválido';
  end if;

  if not exists (select 1 from public.entrada_programa p where p.id = p_programa_id) then
    raise exception 'Programa no encontrado';
  end if;

  for v_concierto in
    select distinct c.id
    from public.entrada_concierto c
    inner join public.entrada_reserva r on r.concierto_id = c.id
    where c.programa_id = p_programa_id
      and r.estado = 'cancelada'
      and r.cancelacion_origen = 'admin_suspension'
    order by c.id
  loop
    v_out := public.entrada_admin_restaurar_reservas_suspension_concierto(v_concierto.id);
    v_total_reservas := v_total_reservas + coalesce((v_out->>'reservas')::integer, 0);
    v_total_plazas := v_total_plazas + coalesce((v_out->>'plazas')::integer, 0);
  end loop;

  return jsonb_build_object(
    'ok', true,
    'reservas', v_total_reservas,
    'plazas', v_total_plazas
  );
end;
$$;

-- Cancelación por titular
create or replace function public.entrada_cancelar_reserva(p_reserva_id bigint)
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

  update public.entrada_reserva r
  set
    estado = 'cancelada',
    cancelacion_origen = 'usuario',
    updated_at = now()
  where r.id = p_reserva_id
    and r.usuario_id = auth.uid()
    and r.estado = 'activa';

  get diagnostics v_n = row_count;
  if v_n = 0 then
    raise exception 'Reserva no cancelable: no existe, no es tuya, o ya estaba cancelada.';
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

-- Cancelación total en recepción
create or replace function public.entrada_recepcion_cancelar_reserva(p_reserva_id bigint)
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
  if not public.entrada_is_recepcion(auth.uid()) then
    raise exception 'Sin permisos de recepción';
  end if;

  update public.entrada_reserva r
  set
    estado = 'cancelada',
    cancelacion_origen = 'recepcion',
    updated_at = now()
  where r.id = p_reserva_id
    and r.estado = 'activa';

  get diagnostics v_n = row_count;
  if v_n = 0 then
    raise exception 'Reserva no cancelable: no existe, no está activa, o ya fue cancelada.';
  end if;

  update public.entrada_reserva_entrada e
  set
    estado_ingreso = 'anulada',
    anulacion_origen = 'recepcion',
    updated_at = now()
  where e.reserva_id = p_reserva_id
    and e.estado_ingreso = 'pendiente';
end;
$$;

-- Anulación parcial en recepción
create or replace function public.entrada_recepcion_anular_entradas(
  p_reserva_id bigint,
  p_ordenes integer[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reserva public.entrada_reserva;
  v_anuladas integer;
  v_pendientes integer;
  v_ingresadas integer;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if not public.entrada_is_recepcion(auth.uid()) then
    raise exception 'Sin permisos de recepción';
  end if;
  if coalesce(cardinality(p_ordenes), 0) = 0 then
    raise exception 'Indicá al menos una plaza para anular.';
  end if;

  select * into v_reserva
  from public.entrada_reserva
  where id = p_reserva_id
  for update;

  if v_reserva.id is null then
    raise exception 'Reserva no encontrada.';
  end if;
  if v_reserva.estado <> 'activa' then
    raise exception 'La reserva no está activa.';
  end if;

  update public.entrada_reserva_entrada e
  set
    estado_ingreso = 'anulada',
    anulacion_origen = 'recepcion',
    updated_at = now()
  where e.reserva_id = p_reserva_id
    and e.estado_ingreso = 'pendiente'
    and e.orden = any(p_ordenes);

  get diagnostics v_anuladas = row_count;
  if v_anuladas = 0 then
    raise exception 'Ninguna plaza pendiente coincide con la selección.';
  end if;
  if v_anuladas <> cardinality(p_ordenes) then
    raise exception 'Algunas plazas no están pendientes o no existen.';
  end if;

  select
    count(*) filter (where estado_ingreso = 'pendiente'),
    count(*) filter (where estado_ingreso = 'ingresada')
  into v_pendientes, v_ingresadas
  from public.entrada_reserva_entrada
  where reserva_id = p_reserva_id;

  if coalesce(v_pendientes, 0) = 0 and coalesce(v_ingresadas, 0) = 0 then
    update public.entrada_reserva
    set
      estado = 'cancelada',
      cancelacion_origen = 'recepcion',
      updated_at = now()
    where id = p_reserva_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'anuladas', v_anuladas,
    'pendientes_restantes', coalesce(v_pendientes, 0),
    'reserva_cancelada', coalesce(v_pendientes, 0) = 0 and coalesce(v_ingresadas, 0) = 0
  );
end;
$$;

-- Suspender programa (marca origen admin_suspension)
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
      set
        estado = 'cancelada',
        cancelacion_origen = 'admin_suspension',
        updated_at = now()
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
      anulacion_origen = 'admin_suspension',
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

-- Suspender concierto (marca origen admin_suspension)
create or replace function public.entrada_admin_suspender_concierto(
  p_concierto_id bigint,
  p_cancelar_reservas boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_concierto public.entrada_concierto;
  v_reservas_canceladas integer := 0;
  v_notificar jsonb := '[]'::jsonb;
begin
  if not public.entrada_is_admin(auth.uid()) then
    raise exception 'Sin permisos admin';
  end if;

  if p_concierto_id is null or p_concierto_id <= 0 then
    raise exception 'Concierto inválido';
  end if;

  select * into v_concierto
  from public.entrada_concierto c
  where c.id = p_concierto_id;

  if v_concierto.id is null then
    raise exception 'Concierto no encontrado';
  end if;

  if coalesce(p_cancelar_reservas, false) then
    create temp table tmp_suspend_concierto_canceladas (
      reserva_id bigint primary key,
      usuario_id uuid not null
    ) on commit drop;

    with canceladas as (
      update public.entrada_reserva r
      set
        estado = 'cancelada',
        cancelacion_origen = 'admin_suspension',
        updated_at = now()
      where r.concierto_id = p_concierto_id
        and r.estado = 'activa'
      returning r.id, r.usuario_id
    )
    insert into tmp_suspend_concierto_canceladas (reserva_id, usuario_id)
    select id, usuario_id from canceladas;

    get diagnostics v_reservas_canceladas = row_count;

    update public.entrada_reserva_entrada e
    set
      estado_ingreso = 'anulada',
      anulacion_origen = 'admin_suspension',
      updated_at = now()
    from tmp_suspend_concierto_canceladas ca
    where e.reserva_id = ca.reserva_id
      and e.estado_ingreso = 'pendiente';

    select coalesce(
      jsonb_build_array(
        jsonb_build_object(
          'concierto_id', v_concierto.id,
          'concierto_nombre', v_concierto.nombre,
          'fecha_hora', v_concierto.fecha_hora,
          'lugar_nombre', v_concierto.lugar_nombre,
          'emails', coalesce(sub.emails, '[]'::jsonb)
        )
      ),
      '[]'::jsonb
    )
    into v_notificar
    from (
      select coalesce(
        jsonb_agg(distinct lower(trim(u.email)) order by lower(trim(u.email)))
          filter (where nullif(trim(u.email), '') is not null),
        '[]'::jsonb
      ) as emails
      from tmp_suspend_concierto_canceladas t
      inner join public.entrada_usuario u on u.id = t.usuario_id
    ) sub
    where coalesce(jsonb_array_length(sub.emails), 0) > 0;
  end if;

  update public.entrada_concierto
  set
    activo = false,
    reservas_habilitadas = false,
    updated_at = now()
  where id = p_concierto_id;

  return jsonb_build_object(
    'ok', true,
    'concierto_id', v_concierto.id,
    'concierto_nombre', v_concierto.nombre,
    'reservas_canceladas', v_reservas_canceladas,
    'notificar', v_notificar
  );
end;
$$;

drop function if exists public.entrada_admin_reactivar_programa(bigint);
drop function if exists public.entrada_admin_reactivar_concierto(bigint);

create or replace function public.entrada_admin_reactivar_programa(
  p_programa_id bigint,
  p_restaurar_reservas_suspension boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.entrada_programa;
  v_restore jsonb;
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

  v_restore := jsonb_build_object('reservas', 0, 'plazas', 0);
  if coalesce(p_restaurar_reservas_suspension, false) then
    v_restore := public.entrada_admin_restaurar_reservas_suspension_programa(p_programa_id);
  end if;

  return jsonb_build_object(
    'programa', to_jsonb(v_row),
    'reservas_restauradas', coalesce((v_restore->>'reservas')::integer, 0),
    'plazas_restauradas', coalesce((v_restore->>'plazas')::integer, 0)
  );
end;
$$;

create or replace function public.entrada_admin_reactivar_concierto(
  p_concierto_id bigint,
  p_restaurar_reservas_suspension boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.entrada_concierto;
  v_restore jsonb;
begin
  if not public.entrada_is_admin(auth.uid()) then
    raise exception 'Sin permisos admin';
  end if;

  if p_concierto_id is null or p_concierto_id <= 0 then
    raise exception 'Concierto inválido';
  end if;

  update public.entrada_concierto
  set activo = true, updated_at = now()
  where id = p_concierto_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Concierto no encontrado';
  end if;

  v_restore := jsonb_build_object('reservas', 0, 'plazas', 0);
  if coalesce(p_restaurar_reservas_suspension, false) then
    v_restore := public.entrada_admin_restaurar_reservas_suspension_concierto(p_concierto_id);
  end if;

  return jsonb_build_object(
    'concierto', to_jsonb(v_row),
    'reservas_restauradas', coalesce((v_restore->>'reservas')::integer, 0),
    'plazas_restauradas', coalesce((v_restore->>'plazas')::integer, 0)
  );
end;
$$;

grant execute on function public.entrada_admin_contar_reservas_restaurables(text, bigint) to authenticated;
grant execute on function public.entrada_admin_restaurar_reservas_suspension_concierto(bigint) to authenticated;
grant execute on function public.entrada_admin_restaurar_reservas_suspension_programa(bigint) to authenticated;
grant execute on function public.entrada_admin_reactivar_programa(bigint, boolean) to authenticated;
grant execute on function public.entrada_admin_reactivar_concierto(bigint, boolean) to authenticated;
