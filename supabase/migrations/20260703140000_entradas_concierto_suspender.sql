-- Suspender / reactivar un concierto de entradas (misma lógica que programa, alcance individual).

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
      set estado = 'cancelada', updated_at = now()
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

create or replace function public.entrada_admin_reactivar_concierto(p_concierto_id bigint)
returns public.entrada_concierto
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.entrada_concierto;
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

  return v_row;
end;
$$;

grant execute on function public.entrada_admin_suspender_concierto(bigint, boolean) to authenticated;
grant execute on function public.entrada_admin_reactivar_concierto(bigint) to authenticated;
