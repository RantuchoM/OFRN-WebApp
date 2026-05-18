  -- Disponibilidad agregada por concierto (sin exponer filas de entrada_reserva vía RLS).

  create or replace function public.entrada_conciertos_disponibilidad(p_concierto_ids bigint[])
  returns table(
    concierto_id bigint,
    porcentaje_disponible smallint,
    plazas_disponibles integer
  )
  language sql
  stable
  security definer
  set search_path = public
  as $$
    select
      c.id as concierto_id,
      case
        when coalesce(c.capacidad_maxima, 0) <= 0 then 0::smallint
        else greatest(
          0::smallint,
          least(
            100::smallint,
            round(
              100.0
              * (c.capacidad_maxima - coalesce(o.ocupadas, 0))::numeric
              / c.capacidad_maxima
            )::smallint
          )
        )
      end as porcentaje_disponible,
      greatest(0, c.capacidad_maxima - coalesce(o.ocupadas, 0))::integer as plazas_disponibles
    from public.entrada_concierto c
    left join lateral (
      select coalesce(sum(r.cantidad_solicitada), 0)::integer as ocupadas
      from public.entrada_reserva r
      where r.concierto_id = c.id
        and r.estado = 'activa'
    ) o on true
    where c.activo = true
      and c.id = any(coalesce(p_concierto_ids, array[]::bigint[]));
  $$;

  comment on function public.entrada_conciertos_disponibilidad(bigint[]) is
    'Porcentaje y plazas libres por concierto; legible por cualquier usuario autenticado sin ver reservas ajenas.';

  grant execute on function public.entrada_conciertos_disponibilidad(bigint[]) to authenticated;
