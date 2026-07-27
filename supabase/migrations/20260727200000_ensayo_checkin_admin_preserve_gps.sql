-- Preservar GPS de llegada al editar asistencia (p. ej. solo cargar salida) desde admin.

create or replace function public.ensayo_checkin_admin_upsert(
  p_evento_id bigint,
  p_integrante_id bigint,
  p_registrado_at timestamptz,
  p_editor_id bigint,
  p_justificado boolean default false,
  p_nota_justificacion text default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_salida_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_evt public.eventos;
  v_dist real;
  v_row public.eventos_checkin_ensayo;
  v_just boolean := coalesce(p_justificado, false);
  v_prev public.eventos_checkin_ensayo;
begin
  if not public.ensayo_integrante_es_admin_o_editor(p_editor_id) then
    raise exception 'Sin permisos de edición de asistencia';
  end if;

  v_evt := public.ensayo_validar_evento_ensamble(p_evento_id, false);

  if p_integrante_id is null or p_registrado_at is null then
    raise exception 'Datos incompletos';
  end if;

  if p_salida_at is not null and p_salida_at < p_registrado_at then
    raise exception 'La hora de salida no puede ser anterior a la de llegada';
  end if;

  select * into v_prev
  from public.eventos_checkin_ensayo c
  where c.id_evento = p_evento_id and c.id_integrante = p_integrante_id;

  v_dist := case
    when v_just then null
    when p_lat is not null and p_lng is not null then
      public.ensayo_distancia_sede_m(v_evt.id_locacion, p_lat, p_lng)
    else null
  end;

  insert into public.eventos_checkin_ensayo (
    id_evento, id_integrante, registrado_at,
    latitud, longitud, modo,
    distancia_sede_m,
    justificado, nota_justificacion,
    editado_por_admin, editado_at, id_editado_por,
    salida_at, modo_salida,
    salida_latitud, salida_longitud, salida_precision_m, salida_distancia_sede_m,
    id_integrante_prestador_salida
  ) values (
    p_evento_id, p_integrante_id, p_registrado_at,
    case when v_just then null else p_lat end,
    case when v_just then null else p_lng end,
    'admin',
    v_dist,
    v_just,
    nullif(trim(p_nota_justificacion), ''),
    not v_just,
    now(),
    p_editor_id,
    p_salida_at,
    case when p_salida_at is not null then 'admin' else null end,
    null, null, null, null,
    null
  )
  on conflict (id_evento, id_integrante) do update set
    registrado_at = excluded.registrado_at,
    -- Justificado: sin presencia → limpia geo de llegada.
    -- Si admin no manda coords nuevas, conserva GPS/QR de llegada.
    latitud = case
      when excluded.justificado then null
      when excluded.latitud is not null then excluded.latitud
      else eventos_checkin_ensayo.latitud
    end,
    longitud = case
      when excluded.justificado then null
      when excluded.longitud is not null then excluded.longitud
      else eventos_checkin_ensayo.longitud
    end,
    precision_m = case
      when excluded.justificado then null
      when excluded.latitud is not null then null
      else eventos_checkin_ensayo.precision_m
    end,
    distancia_sede_m = case
      when excluded.justificado then null
      when excluded.latitud is not null then excluded.distancia_sede_m
      else eventos_checkin_ensayo.distancia_sede_m
    end,
    modo = case
      when excluded.justificado then 'admin'
      when excluded.latitud is not null then 'admin'
      when eventos_checkin_ensayo.modo in ('gps', 'peer_pase') then eventos_checkin_ensayo.modo
      else 'admin'
    end,
    id_integrante_prestador = case
      when excluded.justificado then null
      when excluded.latitud is not null then null
      else eventos_checkin_ensayo.id_integrante_prestador
    end,
    user_agent = case
      when excluded.justificado then null
      when excluded.latitud is not null then null
      else eventos_checkin_ensayo.user_agent
    end,
    justificado = excluded.justificado,
    nota_justificacion = excluded.nota_justificacion,
    editado_por_admin = excluded.editado_por_admin,
    editado_at = now(),
    id_editado_por = excluded.id_editado_por,
    salida_at = excluded.salida_at,
    modo_salida = excluded.modo_salida,
    -- Salida cargada por admin: sin geo de salida (la de llegada no se toca arriba).
    salida_latitud = null,
    salida_longitud = null,
    salida_precision_m = null,
    salida_distancia_sede_m = null,
    id_integrante_prestador_salida = null
  returning * into v_row;

  return jsonb_build_object(
    'ok', true,
    'registrado_at', v_row.registrado_at,
    'salida_at', v_row.salida_at,
    'justificado', v_row.justificado,
    'editado_por_admin', v_row.editado_por_admin,
    'modo', v_row.modo,
    'latitud', v_row.latitud,
    'longitud', v_row.longitud
  );
end;
$$;
