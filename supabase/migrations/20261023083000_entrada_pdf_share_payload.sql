-- Payload público (anon) para armar el mismo PDF en la webapp con ?t=pdf_share_token.

create or replace function public.entrada_pdf_share_payload(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text := lower(btrim(coalesce(p_token, '')));
  v_reserva public.entrada_reserva;
  v_ensured jsonb;
  v_concierto jsonb;
  v_entradas jsonb;
begin
  if v_token !~ '^[a-f0-9]{32,96}$' then
    raise exception 'Token inválido';
  end if;

  select * into v_reserva
  from public.entrada_reserva
  where pdf_share_token = v_token
    and estado = 'activa';

  if not found then
    raise exception 'Reserva no encontrada';
  end if;

  begin
    v_ensured := public.entrada_asegurar_qr_tokens(v_reserva.id);
  exception when others then
    v_ensured := null;
  end;

  if v_ensured is not null and coalesce((v_ensured ->> 'ok')::boolean, false) then
    select * into v_reserva from public.entrada_reserva where id = v_reserva.id;
  end if;

  select to_jsonb(c) || jsonb_build_object(
    'evento', (
      select jsonb_build_object(
        'id', e.id,
        'fecha', e.fecha,
        'hora_inicio', e.hora_inicio,
        'locaciones', case when e.locacion_id is null then null else (
          select jsonb_build_object(
            'id', l.id,
            'nombre', l.nombre,
            'localidades', (
              select jsonb_build_object('localidad', loc.localidad)
              from public.localidades loc
              where loc.id = l.id_localidad
            )
          )
          from public.locaciones l
          where l.id = e.locacion_id
        ) end
      )
      from public.eventos e
      where e.id = c.ofrn_evento_id
    ),
    'entrada_programa', (
      select jsonb_build_object(
        'id', p.id,
        'nombre', p.nombre,
        'detalle_richtext', p.detalle_richtext
      )
      from public.entrada_programa p
      where p.id = c.programa_id
    )
  )
  into v_concierto
  from public.entrada_concierto c
  where c.id = v_reserva.concierto_id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', ee.id,
      'orden', ee.orden,
      'estado_ingreso', ee.estado_ingreso,
      'ingresada_at', ee.ingresada_at,
      'qr_entrada_token', ee.qr_entrada_token
    )
    order by ee.orden
  ), '[]'::jsonb)
  into v_entradas
  from public.entrada_reserva_entrada ee
  where ee.reserva_id = v_reserva.id;

  return jsonb_build_object(
    'id', v_reserva.id,
    'codigo_reserva', v_reserva.codigo_reserva,
    'cantidad_solicitada', v_reserva.cantidad_solicitada,
    'estado', v_reserva.estado,
    'qr_reserva_token', coalesce(v_reserva.qr_reserva_token, v_reserva.codigo_reserva),
    'pdf_share_token', v_reserva.pdf_share_token,
    'concierto', v_concierto,
    'entradas', v_entradas
  );
end;
$$;

comment on function public.entrada_pdf_share_payload(text) is
  'Datos de reserva activa por pdf_share_token para generar el PDF en /entradas/pdf sin login.';

revoke all on function public.entrada_pdf_share_payload(text) from public;
grant execute on function public.entrada_pdf_share_payload(text) to anon, authenticated;
