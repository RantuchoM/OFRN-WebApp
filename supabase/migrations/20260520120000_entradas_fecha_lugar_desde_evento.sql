-- Fecha/hora y lugar de cartel desde `eventos` (fuente OFRN), no columnas duplicadas en respuestas públicas.

create or replace function public.entrada_fecha_hora_desde_evento(p_evento_id bigint)
returns timestamptz
language sql
stable
set search_path = public
as $$
  select ((e.fecha::text || ' ' || coalesce(e.hora_inicio::text, '00:00:00'))::timestamp)
    at time zone 'America/Argentina/Buenos_Aires'
  from public.eventos e
  where e.id = p_evento_id
    and coalesce(e.is_deleted, false) = false
    and e.deleted_at is null;
$$;

create or replace function public.entrada_lugar_nombre_desde_evento(p_evento_id bigint)
returns text
language sql
stable
set search_path = public
as $$
  select l.nombre
  from public.eventos e
  left join public.locaciones l on l.id = e.id_locacion
  where e.id = p_evento_id
    and coalesce(e.is_deleted, false) = false
    and e.deleted_at is null;
$$;

create or replace function public.entrada_recordatorio_apertura_info(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text := lower(trim(coalesce(p_slug, '')));
  v_concierto public.entrada_concierto;
  v_programa public.entrada_programa;
  v_elegible boolean;
  v_fecha_hora timestamptz;
  v_lugar_nombre text;
begin
  if v_slug = '' then
    return jsonb_build_object('ok', false, 'error', 'Falta el concierto.');
  end if;

  select * into v_concierto
  from public.entrada_concierto c
  where lower(c.slug_publico) = v_slug
    and c.activo = true
  limit 1;

  if v_concierto.id is null then
    return jsonb_build_object('ok', false, 'error', 'No encontramos ese concierto.');
  end if;

  select * into v_programa from public.entrada_programa p where p.id = v_concierto.programa_id;

  v_fecha_hora := coalesce(
    public.entrada_fecha_hora_desde_evento(v_concierto.ofrn_evento_id),
    v_concierto.fecha_hora
  );
  v_lugar_nombre := coalesce(
    nullif(trim(public.entrada_lugar_nombre_desde_evento(v_concierto.ofrn_evento_id)), ''),
    nullif(trim(v_concierto.lugar_nombre), '')
  );

  v_elegible := public.entrada_concierto_acepta_recordatorio(v_concierto);

  return jsonb_build_object(
    'ok', true,
    'elegible', v_elegible,
    'concierto', jsonb_build_object(
      'id', v_concierto.id,
      'slug_publico', v_concierto.slug_publico,
      'nombre', v_concierto.nombre,
      'fecha_hora', v_fecha_hora,
      'lugar_nombre', v_lugar_nombre,
      'reservas_habilitadas', coalesce(v_concierto.reservas_habilitadas, false),
      'apertura_reservas_at', v_concierto.apertura_reservas_at,
      'reservas_abiertas', public.entrada_concierto_reservas_abiertas(v_concierto)
    ),
    'programa_nombre', coalesce(nullif(trim(v_programa.nombre), ''), 'Programa')
  );
end;
$$;

grant execute on function public.entrada_fecha_hora_desde_evento(bigint) to anon, authenticated;
grant execute on function public.entrada_lugar_nombre_desde_evento(bigint) to anon, authenticated;
