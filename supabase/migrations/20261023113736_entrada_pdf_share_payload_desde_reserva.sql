-- El enlace /entradas/pdf?t= solo identifica la reserva (pdf_share_token).
-- El resto sale de las mismas tablas y FKs que la descarga logueada
-- (entrada_concierto, eventos.id_locacion → locaciones, entrada_programa, plazas).
-- La webapp arma el PDF con descargarPdfDesdeReservaRow, igual que Mis entradas.

create or replace function public.entrada_pdf_share_payload(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text := lower(btrim(coalesce(p_token, '')));
  v_reserva public.entrada_reserva;
  v_row public.entrada_reserva_entrada;
  v_entry_token text;
begin
  if v_token !~ '^[a-f0-9]{32,96}$' then
    raise exception 'Token inválido';
  end if;

  select * into v_reserva
  from public.entrada_reserva
  where pdf_share_token = v_token
    and estado = 'activa'
  for update;

  if not found then
    raise exception 'Reserva no encontrada';
  end if;

  -- Misma completitud de QR que entrada_asegurar_qr_tokens, autorizada por el token
  -- (el visitante anónimo no puede llamar esa RPC, que exige auth.uid()).
  for v_row in
    select *
    from public.entrada_reserva_entrada
    where reserva_id = v_reserva.id
    order by orden
    for update
  loop
    v_entry_token := nullif(btrim(coalesce(v_row.qr_entrada_token, '')), '');
    if v_entry_token is null then
      v_entry_token := 'ENTR-TCK-' || replace(gen_random_uuid()::text, '-', '');
      update public.entrada_reserva_entrada
      set
        qr_entrada_token = v_entry_token,
        qr_entrada_hash = public.entrada_qr_token_hash(v_entry_token)
      where id = v_row.id;
    end if;
  end loop;

  return (
    select jsonb_build_object(
      'id', r.id,
      'codigo_reserva', r.codigo_reserva,
      'cantidad_solicitada', r.cantidad_solicitada,
      'estado', r.estado,
      'created_at', r.created_at,
      'qr_reserva_token', nullif(btrim(coalesce(r.qr_reserva_token, '')), ''),
      'concierto', (
        select jsonb_build_object(
          'id', c.id,
          'nombre', c.nombre,
          'slug_publico', c.slug_publico,
          'detalle_richtext', c.detalle_richtext,
          'activo', c.activo,
          'reservas_habilitadas', c.reservas_habilitadas,
          'apertura_reservas_at', c.apertura_reservas_at,
          'ofrn_evento_id', c.ofrn_evento_id,
          'evento', (
            select jsonb_build_object(
              'id', e.id,
              'fecha', e.fecha,
              'hora_inicio', e.hora_inicio,
              'locaciones', (
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
                where l.id = e.id_locacion
              )
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
        from public.entrada_concierto c
        where c.id = r.concierto_id
      ),
      'entradas', (
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'id', ee.id,
              'orden', ee.orden,
              'estado_ingreso', ee.estado_ingreso,
              'ingresada_at', ee.ingresada_at,
              'qr_entrada_token', ee.qr_entrada_token
            )
            order by ee.orden
          ),
          '[]'::jsonb
        )
        from public.entrada_reserva_entrada ee
        where ee.reserva_id = r.id
      )
    )
    from public.entrada_reserva r
    where r.id = v_reserva.id
  );
end;
$$;

comment on function public.entrada_pdf_share_payload(text) is
  'Por pdf_share_token devuelve la reserva con concierto, evento (id_locacion), programa y plazas, la misma forma que la descarga en Mis entradas.';

revoke all on function public.entrada_pdf_share_payload(text) from public;
grant execute on function public.entrada_pdf_share_payload(text) to anon, authenticated;
