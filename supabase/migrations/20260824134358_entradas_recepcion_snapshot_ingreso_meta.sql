-- Snapshot de recepción: incluir hora y nombre de quien ingresó cada plaza.

create or replace function public.entrada_recepcion_snapshot(p_concierto_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cid bigint := p_concierto_id;
  v_reservas jsonb;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if not public.entrada_is_recepcion(auth.uid()) then
    raise exception 'Sin permiso de recepción';
  end if;
  if v_cid is null or v_cid <= 0 then
    raise exception 'Concierto inválido';
  end if;

  if not exists (select 1 from public.entrada_concierto c where c.id = v_cid) then
    raise exception 'Concierto no encontrado';
  end if;

  select coalesce(jsonb_agg(row_data order by (row_data->>'id')::bigint), '[]'::jsonb)
  into v_reservas
  from (
    select jsonb_build_object(
      'id', r.id,
      'codigo_reserva', r.codigo_reserva,
      'qr_reserva_hash', r.qr_reserva_hash,
      'estado', r.estado,
      'cantidad_solicitada', r.cantidad_solicitada,
      'entradas', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', e.id,
            'orden', e.orden,
            'estado_ingreso', e.estado_ingreso,
            'qr_entrada_hash', e.qr_entrada_hash,
            'ingresada_at', e.ingresada_at,
            'ingresada_por_nombre', (
              select nullif(
                trim(both ' ' from concat_ws(' ', nullif(trim(u.nombre), ''), nullif(trim(u.apellido), ''))),
                ''
              )
              from public.entrada_usuario u
              where u.id = e.ingresada_por
            )
          )
          order by e.orden
        )
        from public.entrada_reserva_entrada e
        where e.reserva_id = r.id
      ), '[]'::jsonb)
    ) as row_data
    from public.entrada_reserva r
    where r.concierto_id = v_cid
  ) q;

  return jsonb_build_object(
    'ok', true,
    'concierto_id', v_cid,
    'generated_at', now(),
    'reservas', v_reservas
  );
end;
$$;

comment on function public.entrada_recepcion_snapshot(bigint) is
  'Roster de recepción (hashes QR + estados + meta de ingreso) para caché local; sin tokens en claro.';
