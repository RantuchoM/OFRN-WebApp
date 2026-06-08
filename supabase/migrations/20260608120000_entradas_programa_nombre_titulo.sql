-- Al crear `entrada_programa` desde un evento OFRN, usar el título (nombre_gira) y no el nomenclador.

create or replace function public.entrada_admin_upsert_concierto(
  p_id bigint,
  p_ofrn_evento_id bigint,
  p_nombre text,
  p_detalle_richtext text,
  p_imagen_drive_url text,
  p_capacidad_maxima integer,
  p_reservas_habilitadas boolean default true,
  p_activo boolean default true,
  p_limite_recordatorio_at timestamptz default null,
  p_limite_cierre_reservas_at timestamptz default null,
  p_limite_encuesta_at timestamptz default null,
  p_encuesta_url text default null,
  p_apertura_reservas_at timestamptz default null
)
returns public.entrada_concierto
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.entrada_concierto;
  v_evento record;
  v_programa_row public.entrada_programa;
  v_fecha_hora timestamptz;
  v_limite_recordatorio timestamptz;
  v_limite_cierre timestamptz;
  v_limite_encuesta timestamptz;
  v_encuesta_url text;
  v_apertura_reservas timestamptz;
  v_existing public.entrada_concierto;
begin
  if not public.entrada_is_admin(auth.uid()) then
    raise exception 'Sin permisos admin';
  end if;

  if p_capacidad_maxima < 1 then
    raise exception 'La capacidad debe ser mayor a cero';
  end if;

  v_encuesta_url := nullif(trim(coalesce(p_encuesta_url, '')), '');
  v_apertura_reservas := p_apertura_reservas_at;

  select
    e.id,
    e.id_gira,
    e.fecha,
    e.hora_inicio,
    e.id_locacion,
    te.nombre as tipo_evento_nombre
  into v_evento
  from public.eventos e
  left join public.tipos_evento te on te.id = e.id_tipo_evento
  where e.id = p_ofrn_evento_id
    and coalesce(e.is_deleted, false) = false
    and e.deleted_at is null;

  if v_evento.id is null then
    raise exception 'Evento OFRN no encontrado';
  end if;

  if v_evento.id_gira is null then
    raise exception 'El evento no está vinculado a un programa OFRN';
  end if;

  if coalesce(v_evento.tipo_evento_nombre, '') !~* 'concierto' then
    raise exception 'El evento seleccionado no es de tipo concierto';
  end if;

  v_fecha_hora := public.entrada_fecha_hora_desde_evento(v_evento.id);

  insert into public.entrada_programa (slug_publico, nombre, detalle_richtext, activo)
  values (
    'ofrn-programa-' || v_evento.id_gira::text,
    coalesce(
      nullif(trim((select p.nombre_gira from public.programas p where p.id = v_evento.id_gira)), ''),
      nullif(trim((select p.subtitulo from public.programas p where p.id = v_evento.id_gira)), ''),
      'Programa OFRN ' || v_evento.id_gira::text
    ),
    coalesce((select p.subtitulo from public.programas p where p.id = v_evento.id_gira), ''),
    true
  )
  on conflict (slug_publico) do update
  set
    nombre = public.entrada_programa.nombre,
    detalle_richtext = public.entrada_programa.detalle_richtext
  returning * into v_programa_row;

  v_existing := null;
  if p_id is not null then
    select * into v_existing from public.entrada_concierto where id = p_id;
  end if;

  v_limite_recordatorio := coalesce(
    p_limite_recordatorio_at,
    v_existing.limite_recordatorio_at,
    v_fecha_hora - interval '1 day'
  );
  v_limite_cierre := coalesce(
    p_limite_cierre_reservas_at,
    v_existing.limite_cierre_reservas_at,
    v_fecha_hora - interval '10 minutes'
  );
  v_limite_encuesta := coalesce(
    p_limite_encuesta_at,
    v_existing.limite_encuesta_at,
    v_fecha_hora + interval '3 hours'
  );

  if v_apertura_reservas is null and v_existing is null then
    v_apertura_reservas := (
      (
        date_trunc(
          'week',
          (v_fecha_hora at time zone 'America/Argentina/Buenos_Aires')::date
        )::timestamp
        - interval '4 days'
        + time '19:00:00'
      ) at time zone 'America/Argentina/Buenos_Aires'
    );
    if v_apertura_reservas < now() then
      v_apertura_reservas := now();
    end if;
  end if;

  if p_id is null then
    insert into public.entrada_concierto(
      programa_id,
      ofrn_programa_id,
      ofrn_evento_id,
      slug_publico,
      nombre,
      detalle_richtext,
      imagen_drive_url,
      capacidad_maxima,
      reservas_habilitadas,
      activo,
      limite_recordatorio_at,
      limite_cierre_reservas_at,
      limite_encuesta_at,
      encuesta_url,
      apertura_reservas_at
    )
    values (
      v_programa_row.id,
      v_evento.id_gira,
      v_evento.id,
      public.entrada_slugify(p_nombre) || '-' || substring(md5(random()::text || clock_timestamp()::text) from 1 for 4),
      trim(p_nombre),
      coalesce(p_detalle_richtext, ''),
      nullif(trim(p_imagen_drive_url), ''),
      p_capacidad_maxima,
      coalesce(p_reservas_habilitadas, true),
      coalesce(p_activo, true),
      v_limite_recordatorio,
      v_limite_cierre,
      v_limite_encuesta,
      v_encuesta_url,
      v_apertura_reservas
    )
    returning * into v_row;
  else
    update public.entrada_concierto
      set programa_id = v_programa_row.id,
          ofrn_programa_id = v_evento.id_gira,
          ofrn_evento_id = v_evento.id,
          nombre = trim(p_nombre),
          detalle_richtext = coalesce(p_detalle_richtext, ''),
          imagen_drive_url = nullif(trim(p_imagen_drive_url), ''),
          capacidad_maxima = p_capacidad_maxima,
          reservas_habilitadas = coalesce(p_reservas_habilitadas, true),
          activo = coalesce(p_activo, true),
          limite_recordatorio_at = v_limite_recordatorio,
          limite_cierre_reservas_at = v_limite_cierre,
          limite_encuesta_at = v_limite_encuesta,
          encuesta_url = v_encuesta_url,
          apertura_reservas_at = coalesce(v_apertura_reservas, v_existing.apertura_reservas_at)
    where id = p_id
    returning * into v_row;
  end if;

  return v_row;
end;
$$;
