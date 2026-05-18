-- Elimina fecha_hora y lugar_nombre duplicados en entrada_concierto; fuente única: eventos OFRN.

create or replace function public.entrada_concierto_fecha_hora_efectiva(p_concierto public.entrada_concierto)
returns timestamptz
language sql
stable
set search_path = public
as $$
  select public.entrada_fecha_hora_desde_evento(p_concierto.ofrn_evento_id);
$$;

create or replace function public.entrada_concierto_apertura_reservas_efectiva(p_concierto public.entrada_concierto)
returns timestamptz
language sql
stable
set search_path = public
as $$
  select coalesce(
    p_concierto.apertura_reservas_at,
    case
      when public.entrada_concierto_fecha_hora_efectiva(p_concierto) is null then null
      else (
        (
          date_trunc(
            'week',
            (public.entrada_concierto_fecha_hora_efectiva(p_concierto) at time zone 'America/Argentina/Buenos_Aires')::date
          )::timestamp
          - interval '4 days'
          + time '19:00:00'
        ) at time zone 'America/Argentina/Buenos_Aires'
      )
    end
  );
$$;

create or replace function public.entrada_concierto_acepta_recordatorio(p_concierto public.entrada_concierto)
returns boolean
language sql
stable
set search_path = public
as $$
  select
    p_concierto.id is not null
    and p_concierto.activo = true
    and public.entrada_concierto_fecha_hora_efectiva(p_concierto) > now()
    and (
      not public.entrada_concierto_reservas_abiertas(p_concierto)
      or public.entrada_concierto_fecha_hora_efectiva(p_concierto) > public.entrada_fin_ventana_catalogo_ar()
    );
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

  v_fecha_hora := public.entrada_fecha_hora_desde_evento(v_concierto.ofrn_evento_id);
  v_lugar_nombre := public.entrada_lugar_nombre_desde_evento(v_concierto.ofrn_evento_id);
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

-- Recepción: metadata de concierto desde eventos
create or replace function public.entrada_preview_qr(
  p_token text,
  p_concierto_id bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text;
  v_entrada public.entrada_reserva_entrada;
  v_reserva public.entrada_reserva;
  v_pendientes integer;
  v_ingresadas integer;
  v_entradas jsonb;
  v_con_nombre text;
  v_con_fecha timestamptz;
  v_lugar text;
  v_cod text;
  v_res_est public.entrada_reserva_estado;
  v_cant integer;
  v_puede boolean;
  v_parcial boolean;
  v_cid bigint;
  v_manual_10 text;
  v_match_count integer;
  v_match_id bigint;
  v_token_trim text;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if not public.entrada_is_recepcion(auth.uid()) then
    raise exception 'Sin permisos de recepción';
  end if;

  v_token_trim := trim(coalesce(p_token, ''));
  v_manual_10 := public.entrada_normalizar_codigo_reserva_input(p_token);

  if v_manual_10 is not null then
    select count(*), max(r.id)
    into v_match_count, v_match_id
    from public.entrada_reserva r
    where right(regexp_replace(r.codigo_reserva, '[^0-9]', '', 'g'), 10) = v_manual_10
      and (p_concierto_id is null or r.concierto_id = p_concierto_id);

    if coalesce(v_match_count, 0) = 0 then
      return jsonb_build_object('ok', false, 'reason', 'token_no_encontrado');
    end if;
    if v_match_count > 1 then
      return jsonb_build_object('ok', false, 'reason', 'codigo_ambiguo');
    end if;

    select * into v_reserva from public.entrada_reserva where id = v_match_id;
  elsif public.entrada_es_codigo_reserva_texto(v_token_trim) then
    select * into v_reserva
    from public.entrada_reserva r
    where upper(r.codigo_reserva) = upper(v_token_trim)
      and (p_concierto_id is null or r.concierto_id = p_concierto_id);

    if v_reserva.id is null then
      return jsonb_build_object('ok', false, 'reason', 'token_no_encontrado');
    end if;
  else
    v_hash := public.entrada_qr_token_hash(v_token_trim);
    if coalesce(v_hash, '') = '' then
      return jsonb_build_object('ok', false, 'reason', 'token_vacio');
    end if;

    select * into v_entrada
    from public.entrada_reserva_entrada
    where qr_entrada_hash = v_hash;

    if v_entrada.id is not null then
      v_cid := v_entrada.concierto_id;
      if p_concierto_id is not null and v_cid is distinct from p_concierto_id then
        return jsonb_build_object(
          'ok', false,
          'reason', 'concierto_distinto',
          'concierto_id_token', v_cid,
          'concierto_id_esperado', p_concierto_id
        );
      end if;

      select
        r.codigo_reserva,
        r.estado,
        r.cantidad_solicitada,
        c.nombre,
        public.entrada_fecha_hora_desde_evento(c.ofrn_evento_id),
        public.entrada_lugar_nombre_desde_evento(c.ofrn_evento_id)
      into v_cod, v_res_est, v_cant, v_con_nombre, v_con_fecha, v_lugar
      from public.entrada_reserva r
      join public.entrada_concierto c on c.id = r.concierto_id
      where r.id = v_entrada.reserva_id;

      v_puede := v_entrada.estado_ingreso = 'pendiente' and v_res_est = 'activa';

      return jsonb_build_object(
        'ok', true,
        'tipo', 'entrada',
        'puede_ingresar', v_puede,
        'concierto_id', v_cid,
        'entrada_orden', v_entrada.orden,
        'estado_ingreso', v_entrada.estado_ingreso,
        'ingresada_at', v_entrada.ingresada_at,
        'ingresada_por_nombre', public.entrada_recepcionista_nombre_entrada(v_entrada.id, v_entrada.reserva_id, v_entrada.ingresada_por),
        'codigo_reserva', coalesce(v_cod, ''),
        'reserva_estado', v_res_est,
        'cantidad_en_reserva', coalesce(v_cant, 0),
        'concierto_nombre', coalesce(v_con_nombre, ''),
        'concierto_fecha_hora', v_con_fecha,
        'lugar_nombre', coalesce(v_lugar, '')
      );
    end if;

    select * into v_reserva
    from public.entrada_reserva
    where qr_reserva_hash = v_hash;
  end if;

  if v_reserva.id is null then
    return jsonb_build_object('ok', false, 'reason', 'token_no_encontrado');
  end if;

  v_cid := v_reserva.concierto_id;
  if p_concierto_id is not null and v_cid is distinct from p_concierto_id then
    return jsonb_build_object(
      'ok', false,
      'reason', 'concierto_distinto',
      'concierto_id_token', v_cid,
      'concierto_id_esperado', p_concierto_id
    );
  end if;

  select coalesce(
    (select jsonb_agg(
      jsonb_build_object(
        'orden', e.orden,
        'estado_ingreso', e.estado_ingreso,
        'ingresada_at', e.ingresada_at,
        'ingresada_por_nombre', public.entrada_recepcionista_nombre_entrada(e.id, e.reserva_id, e.ingresada_por)
      ) order by e.orden
    )
    from public.entrada_reserva_entrada e
    where e.reserva_id = v_reserva.id
    ),
    '[]'::jsonb
  ) into v_entradas;

  select
    count(*) filter (where estado_ingreso = 'pendiente'),
    count(*) filter (where estado_ingreso = 'ingresada')
  into v_pendientes, v_ingresadas
  from public.entrada_reserva_entrada
  where reserva_id = v_reserva.id;

  v_puede := v_reserva.estado = 'activa' and coalesce(v_pendientes, 0) > 0;
  v_parcial := v_reserva.estado = 'activa'
    and coalesce(v_ingresadas, 0) > 0
    and coalesce(v_pendientes, 0) > 0;

  select
    c.nombre,
    public.entrada_fecha_hora_desde_evento(c.ofrn_evento_id),
    public.entrada_lugar_nombre_desde_evento(c.ofrn_evento_id)
  into v_con_nombre, v_con_fecha, v_lugar
  from public.entrada_concierto c
  where c.id = v_reserva.concierto_id;

  return jsonb_build_object(
    'ok', true,
    'tipo', 'reserva',
    'puede_ingresar', v_puede,
    'concierto_id', v_cid,
    'reserva_estado', v_reserva.estado,
    'codigo_reserva', v_reserva.codigo_reserva,
    'cantidad_solicitada', v_reserva.cantidad_solicitada,
    'pendientes', coalesce(v_pendientes, 0),
    'ingresadas', coalesce(v_ingresadas, 0),
    'entradas', v_entradas,
    'necesita_confirmar_parcial', v_parcial,
    'concierto_nombre', coalesce(v_con_nombre, ''),
    'concierto_fecha_hora', v_con_fecha,
    'lugar_nombre', coalesce(v_lugar, '')
  );
end;
$$;

grant execute on function public.entrada_concierto_fecha_hora_efectiva(public.entrada_concierto) to anon, authenticated;

drop index if exists public.entrada_concierto_fecha_idx;

alter table public.entrada_concierto
  drop column if exists fecha_hora,
  drop column if exists lugar_nombre;
