-- Fecha programada de apertura de reservas (además del flag reservas_habilitadas).

alter table public.entrada_concierto
  add column if not exists apertura_reservas_at timestamptz;

comment on column public.entrada_concierto.apertura_reservas_at is
  'Momento en que se habilita sacar entradas. NULL = al tener reservas_habilitadas (sin espera extra).';

create or replace function public.entrada_concierto_reservas_abiertas(p_concierto public.entrada_concierto)
returns boolean
language sql
stable
as $$
  select
    p_concierto.id is not null
    and coalesce(p_concierto.activo, false) = true
    and coalesce(p_concierto.reservas_habilitadas, false) = true
    and (
      p_concierto.apertura_reservas_at is null
      or now() >= p_concierto.apertura_reservas_at
    );
$$;

create or replace function public.entrada_concierto_acepta_recordatorio(p_concierto public.entrada_concierto)
returns boolean
language sql
stable
as $$
  select
    p_concierto.id is not null
    and p_concierto.activo = true
    and p_concierto.fecha_hora > now()
    and (
      not public.entrada_concierto_reservas_abiertas(p_concierto)
      or p_concierto.fecha_hora > public.entrada_fin_ventana_catalogo_ar()
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

  v_elegible := public.entrada_concierto_acepta_recordatorio(v_concierto);

  return jsonb_build_object(
    'ok', true,
    'elegible', v_elegible,
    'concierto', jsonb_build_object(
      'id', v_concierto.id,
      'slug_publico', v_concierto.slug_publico,
      'nombre', v_concierto.nombre,
      'fecha_hora', v_concierto.fecha_hora,
      'lugar_nombre', v_concierto.lugar_nombre,
      'reservas_habilitadas', coalesce(v_concierto.reservas_habilitadas, false),
      'apertura_reservas_at', v_concierto.apertura_reservas_at,
      'reservas_abiertas', public.entrada_concierto_reservas_abiertas(v_concierto)
    ),
    'programa_nombre', coalesce(nullif(trim(v_programa.nombre), ''), 'Programa')
  );
end;
$$;

create or replace function public.entrada_crear_reserva(
  p_concierto_id bigint,
  p_cantidad integer
)
returns table(
  reserva_id bigint,
  concierto_id bigint,
  codigo_reserva text,
  qr_reserva_token text,
  qr_entrada_tokens text[]
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_concierto public.entrada_concierto;
  v_total_ocupado integer;
  v_reserva_id bigint;
  v_reserva_token text;
  v_entry_token text;
  v_tokens text[] := array[]::text[];
  i integer;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if p_cantidad < 1 or p_cantidad > 4 then
    raise exception 'Cantidad inválida (debe ser entre 1 y 4)';
  end if;

  perform 1 from public.entrada_usuario where id = auth.uid() and activo = true;
  if not found then
    raise exception 'Perfil de entradas inexistente o inactivo';
  end if;

  select * into v_concierto
  from public.entrada_concierto
  where id = p_concierto_id and activo = true
  for update;

  if v_concierto.id is null or not public.entrada_concierto_reservas_abiertas(v_concierto) then
    raise exception 'Concierto no disponible para reservas';
  end if;

  if exists (
    select 1 from public.entrada_reserva r
    where r.concierto_id = p_concierto_id
      and r.usuario_id = auth.uid()
      and r.estado = 'activa'
  ) then
    raise exception 'Ya tenés una reserva activa para este concierto.';
  end if;

  select coalesce(sum(r.cantidad_solicitada), 0)
    into v_total_ocupado
  from public.entrada_reserva r
  where r.concierto_id = p_concierto_id and r.estado = 'activa';

  if v_total_ocupado + p_cantidad > v_concierto.capacidad_maxima then
    raise exception 'No hay capacidad disponible para esa cantidad';
  end if;

  v_reserva_token := 'ENTR-RSV-' || replace(gen_random_uuid()::text, '-', '');
  insert into public.entrada_reserva (
    concierto_id,
    usuario_id,
    cantidad_solicitada,
    estado,
    codigo_reserva,
    qr_reserva_hash
  )
  values (
    p_concierto_id,
    auth.uid(),
    p_cantidad,
    'activa',
    public.entrada_generar_codigo_reserva(p_concierto_id),
    public.entrada_qr_token_hash(v_reserva_token)
  )
  returning id into v_reserva_id;

  for i in 1..p_cantidad loop
    v_entry_token := 'ENTR-TCK-' || replace(gen_random_uuid()::text, '-', '');
    insert into public.entrada_reserva_entrada (
      reserva_id,
      concierto_id,
      orden,
      qr_entrada_hash
    )
    values (
      v_reserva_id,
      p_concierto_id,
      i,
      public.entrada_qr_token_hash(v_entry_token)
    );
    v_tokens := array_append(v_tokens, v_entry_token);
  end loop;

  return query
  select r.id, r.concierto_id, r.codigo_reserva, v_reserva_token, v_tokens
  from public.entrada_reserva r
  where r.id = v_reserva_id;
end;
$$;

drop function if exists public.entrada_admin_upsert_concierto(
  bigint, bigint, text, text, text, integer, boolean, boolean, timestamptz, timestamptz, timestamptz, text
);

drop function if exists public.entrada_admin_upsert_concierto(
  bigint, bigint, text, text, text, integer, boolean, boolean, timestamptz, timestamptz, timestamptz
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
  v_lugar_nombre text;
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
      fecha_hora,
      lugar_nombre,
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
      v_fecha_hora,
      v_lugar_nombre,
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
          fecha_hora = v_fecha_hora,
          lugar_nombre = v_lugar_nombre,
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

grant execute on function public.entrada_concierto_reservas_abiertas(public.entrada_concierto) to anon, authenticated;
grant execute on function public.entrada_admin_upsert_concierto(
  bigint, bigint, text, text, text, integer, boolean, boolean, timestamptz, timestamptz, timestamptz, text, timestamptz
) to authenticated;
