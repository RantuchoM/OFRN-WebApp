-- Corrige creación de conciertos: `entrada_admin_upsert_concierto` ya no escribe
-- `fecha_hora`/`lugar_nombre` (fuente = eventos OFRN), pero en remoto esas columnas
-- residuales con NOT NULL seguían existiendo → insert fallaba.
-- Completa el drop de `20260521120000` y alinea RPCs de suspensión que aún leían esas columnas.

-- Suspender programa: fecha/lugar desde evento OFRN
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
        public.entrada_fecha_hora_desde_evento(c.ofrn_evento_id) as fecha_hora,
        public.entrada_lugar_nombre_desde_evento(c.ofrn_evento_id) as lugar_nombre,
        coalesce(
          jsonb_agg(distinct lower(trim(u.email)) order by lower(trim(u.email)))
            filter (where nullif(trim(u.email), '') is not null),
          '[]'::jsonb
        ) as emails
      from tmp_suspend_canceladas t
      inner join public.entrada_concierto c on c.id = t.concierto_id
      inner join public.entrada_usuario u on u.id = t.usuario_id
      group by c.id, c.nombre, c.ofrn_evento_id
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

-- Suspender concierto: fecha/lugar desde evento OFRN
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
          'fecha_hora', public.entrada_fecha_hora_desde_evento(v_concierto.ofrn_evento_id),
          'lugar_nombre', public.entrada_lugar_nombre_desde_evento(v_concierto.ofrn_evento_id),
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

-- Validar fecha del evento OFRN al crear/editar concierto de entradas
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
  v_programa_nombre text;
  v_programa_detalle text;
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

  if v_evento.fecha is null then
    raise exception 'El evento OFRN no tiene fecha; completá la fecha del evento antes de crear el concierto de entradas';
  end if;

  v_fecha_hora := public.entrada_fecha_hora_desde_evento(v_evento.id);

  if v_fecha_hora is null then
    raise exception 'No se pudo obtener fecha/hora del evento OFRN';
  end if;

  select
    coalesce(
      nullif(trim(p.nombre_gira), ''),
      nullif(trim(p.subtitulo), ''),
      'Programa OFRN ' || v_evento.id_gira::text
    ),
    coalesce(p.subtitulo, '')
  into v_programa_nombre, v_programa_detalle
  from public.programas p
  where p.id = v_evento.id_gira;

  insert into public.entrada_programa (slug_publico, nombre, detalle_richtext, activo)
  values (
    'ofrn-programa-' || v_evento.id_gira::text,
    v_programa_nombre,
    v_programa_detalle,
    true
  )
  on conflict (slug_publico) do update
  set
    nombre = case
      when trim(coalesce(public.entrada_programa.nombre, '')) = ''
        or trim(public.entrada_programa.nombre) = trim(coalesce((
          select p.nomenclador from public.programas p where p.id = v_evento.id_gira
        ), ''))
        or trim(public.entrada_programa.nombre) = trim(coalesce((
          select p.mes_letra from public.programas p where p.id = v_evento.id_gira
        ), ''))
      then excluded.nombre
      else public.entrada_programa.nombre
    end,
    detalle_richtext = coalesce(
      nullif(trim(excluded.detalle_richtext), ''),
      public.entrada_programa.detalle_richtext
    )
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

drop index if exists public.entrada_concierto_fecha_idx;

alter table public.entrada_concierto
  drop column if exists fecha_hora,
  drop column if exists lugar_nombre;
