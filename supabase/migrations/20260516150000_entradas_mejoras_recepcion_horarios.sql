-- Recepcionista en ingresos, límites editables por concierto, fix nombre programa, códigos ENTR-C{id}-10d

alter table public.entrada_concierto
  add column if not exists limite_recordatorio_at timestamptz,
  add column if not exists limite_cierre_reservas_at timestamptz,
  add column if not exists limite_encuesta_at timestamptz,
  add column if not exists recordatorio_enviado_at timestamptz,
  add column if not exists encuesta_enviada_at timestamptz;

update public.entrada_concierto c
set
  limite_recordatorio_at = coalesce(c.limite_recordatorio_at, c.fecha_hora - interval '1 day'),
  limite_cierre_reservas_at = coalesce(c.limite_cierre_reservas_at, c.fecha_hora - interval '10 minutes'),
  limite_encuesta_at = coalesce(c.limite_encuesta_at, c.fecha_hora + interval '3 hours')
where c.limite_recordatorio_at is null
   or c.limite_cierre_reservas_at is null
   or c.limite_encuesta_at is null;

create or replace function public.entrada_usuario_display_short(p_user_id uuid)
returns text
language sql
stable
set search_path = public
as $$
  select coalesce(
    (
      select trim(
        coalesce(nullif(trim(u.nombre), ''), 'Recepción')
        || case
          when nullif(trim(u.apellido), '') is not null
            then ' ' || upper(left(trim(u.apellido), 1)) || '.'
          else ''
        end
      )
      from public.entrada_usuario u
      where u.id = p_user_id
    ),
    ''
  );
$$;

create or replace function public.entrada_normalizar_codigo_reserva_input(p_input text)
returns text
language sql
immutable
as $$
  select case
    when trim(coalesce(p_input, '')) ~ '^[0-9]{10}$'
      then trim(coalesce(p_input, ''))
    when upper(trim(coalesce(p_input, ''))) ~ '^ENTR-C[0-9]+-[0-9]{10}$'
      then substring(upper(trim(coalesce(p_input, ''))) from '([0-9]{10})$')
    when upper(trim(coalesce(p_input, ''))) ~ '^ENT-RSV(?:-[A-Z0-9]+)*-[0-9]{10}$'
      then substring(upper(trim(coalesce(p_input, ''))) from '([0-9]{10})$')
    else null
  end;
$$;

create or replace function public.entrada_generar_codigo_reserva(
  p_concierto_id bigint default null
)
returns text
language plpgsql
as $$
declare
  v_candidate text;
  v_digits text;
  v_concierto_tag text;
begin
  v_concierto_tag := lpad(coalesce(p_concierto_id, 0)::text, 6, '0');
  loop
    v_digits := lpad(floor(random() * 10000000000)::bigint::text, 10, '0');
    v_candidate := 'ENTR-C' || v_concierto_tag || '-' || v_digits;
    exit when not exists (
      select 1 from public.entrada_reserva r where r.codigo_reserva = v_candidate
    );
  end loop;
  return v_candidate;
end;
$$;

drop function if exists public.entrada_admin_upsert_concierto(
  bigint, bigint, text, text, text, integer, boolean, boolean
);

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
  p_limite_encuesta_at timestamptz default null
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
  v_lugar_nombre text;
  v_fecha_hora timestamptz;
  v_limite_recordatorio timestamptz;
  v_limite_cierre timestamptz;
  v_limite_encuesta timestamptz;
  v_existing public.entrada_concierto;
begin
  if not public.entrada_is_admin(auth.uid()) then
    raise exception 'Sin permisos admin';
  end if;

  if p_capacidad_maxima < 1 then
    raise exception 'La capacidad debe ser mayor a cero';
  end if;

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

  v_fecha_hora := ((v_evento.fecha::text || ' ' || coalesce(v_evento.hora_inicio::text, '00:00:00'))::timestamp)
    at time zone 'America/Argentina/Buenos_Aires';

  select l.nombre into v_lugar_nombre
  from public.locaciones l
  where l.id = v_evento.id_locacion;

  insert into public.entrada_programa (slug_publico, nombre, detalle_richtext, activo)
  values (
    'ofrn-programa-' || v_evento.id_gira::text,
    coalesce((select p.nomenclador from public.programas p where p.id = v_evento.id_gira), 'Programa OFRN ' || v_evento.id_gira::text),
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

  if p_id is null then
    insert into public.entrada_concierto(
      programa_id,
      ofrn_programa_id,
      ofrn_evento_id,
      slug_publico,
      nombre,
      fecha_hora,
      lugar_nombre,
      detalle_richtext,
      imagen_drive_url,
      capacidad_maxima,
      reservas_habilitadas,
      activo,
      limite_recordatorio_at,
      limite_cierre_reservas_at,
      limite_encuesta_at
    )
    values (
      v_programa_row.id,
      v_evento.id_gira,
      v_evento.id,
      public.entrada_slugify(p_nombre) || '-' || substring(md5(random()::text || clock_timestamp()::text) from 1 for 4),
      trim(p_nombre),
      v_fecha_hora,
      v_lugar_nombre,
      coalesce(p_detalle_richtext, ''),
      nullif(trim(p_imagen_drive_url), ''),
      p_capacidad_maxima,
      coalesce(p_reservas_habilitadas, true),
      coalesce(p_activo, true),
      v_limite_recordatorio,
      v_limite_cierre,
      v_limite_encuesta
    )
    returning * into v_row;
  else
    update public.entrada_concierto
      set programa_id = v_programa_row.id,
          ofrn_programa_id = v_evento.id_gira,
          ofrn_evento_id = v_evento.id,
          nombre = trim(p_nombre),
          fecha_hora = v_fecha_hora,
          lugar_nombre = v_lugar_nombre,
          detalle_richtext = coalesce(p_detalle_richtext, ''),
          imagen_drive_url = nullif(trim(p_imagen_drive_url), ''),
          capacidad_maxima = p_capacidad_maxima,
          reservas_habilitadas = coalesce(p_reservas_habilitadas, true),
          activo = coalesce(p_activo, true),
          limite_recordatorio_at = v_limite_recordatorio,
          limite_cierre_reservas_at = v_limite_cierre,
          limite_encuesta_at = v_limite_encuesta
    where id = p_id
    returning * into v_row;
  end if;

  return v_row;
end;
$$;

grant execute on function public.entrada_admin_upsert_concierto(
  bigint, bigint, text, text, text, integer, boolean, boolean, timestamptz, timestamptz, timestamptz
) to authenticated;
