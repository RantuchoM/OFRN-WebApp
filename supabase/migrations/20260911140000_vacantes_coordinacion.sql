-- Coordinación de vacantes de gira: crear / asignar / eliminar en una transacción.
-- Reemplaza materializar_reemplazo (estaba solo en remoto) y desactiva
-- liberar_plaza_generar_vacante (SECURITY DEFINER + columna id_integrante muerta).

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.vacantes_should_inherit_room(
  p_genero_vacante text,
  p_genero_titular text
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN nullif(btrim(p_genero_vacante), '') IS NULL
     AND nullif(btrim(p_genero_titular), '') IS NULL THEN true
    WHEN nullif(btrim(p_genero_vacante), '') IS NULL
      OR nullif(btrim(p_genero_titular), '') IS NULL THEN false
    WHEN btrim(p_genero_vacante) = btrim(p_genero_titular) THEN true
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION public.vacantes_remap_bigint_array(
  arr bigint[],
  p_from bigint,
  p_to bigint
)
RETURNS bigint[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    ARRAY(
      SELECT DISTINCT CASE WHEN x = p_from THEN p_to ELSE x END
      FROM unnest(COALESCE(arr, '{}'::bigint[])) AS x
    ),
    '{}'::bigint[]
  );
$$;

CREATE OR REPLACE FUNCTION public.vacantes_remove_bigint_array(
  arr bigint[],
  p_id bigint
)
RETURNS bigint[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    ARRAY(
      SELECT x FROM unnest(COALESCE(arr, '{}'::bigint[])) AS x
      WHERE x IS DISTINCT FROM p_id
    ),
    '{}'::bigint[]
  );
$$;

CREATE OR REPLACE FUNCTION public.vacantes_remap_text_id_array(
  arr text[],
  p_from bigint,
  p_to bigint
)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    ARRAY(
      SELECT DISTINCT CASE
        WHEN x = p_from::text THEN p_to::text
        ELSE x
      END
      FROM unnest(COALESCE(arr, '{}'::text[])) AS x
    ),
    '{}'::text[]
  );
$$;

CREATE OR REPLACE FUNCTION public.vacantes_remove_text_id_array(
  arr text[],
  p_id bigint
)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    ARRAY(
      SELECT x FROM unnest(COALESCE(arr, '{}'::text[])) AS x
      WHERE x IS DISTINCT FROM p_id::text
    ),
    '{}'::text[]
  );
$$;

CREATE OR REPLACE FUNCTION public.vacantes_remap_asignaciones_config(
  p_cfg jsonb,
  p_from bigint,
  p_to bigint,
  p_inherit boolean
)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_out jsonb := '[]'::jsonb;
  v_el jsonb;
  v_id bigint;
  v_seen bigint[] := '{}';
BEGIN
  IF p_cfg IS NULL OR jsonb_typeof(p_cfg) <> 'array' THEN
    RETURN COALESCE(p_cfg, '[]'::jsonb);
  END IF;

  FOR v_el IN SELECT value FROM jsonb_array_elements(p_cfg)
  LOOP
    BEGIN
      v_id := NULLIF(v_el->>'id', '')::bigint;
    EXCEPTION WHEN others THEN
      v_id := NULL;
    END;
    IF v_id IS NULL THEN
      CONTINUE;
    END IF;
    IF v_id = p_from THEN
      IF NOT p_inherit THEN
        CONTINUE;
      END IF;
      v_id := p_to;
      v_el := v_el || jsonb_build_object('id', p_to);
    END IF;
    IF v_id = ANY (v_seen) THEN
      CONTINUE;
    END IF;
    v_seen := v_seen || v_id;
    v_out := v_out || jsonb_build_array(v_el);
  END LOOP;

  RETURN v_out;
END;
$$;

-- ---------------------------------------------------------------------------
-- crear_vacante
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.crear_vacante(
  p_id_gira bigint,
  p_etiqueta text,
  p_id_localidad bigint,
  p_id_instr text DEFAULT NULL,
  p_genero text DEFAULT NULL,
  p_nomenclador text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_etiqueta text := btrim(COALESCE(p_etiqueta, ''));
  v_nom text := btrim(COALESCE(p_nomenclador, ''));
  v_apellido text;
  v_genero public.genero;
  v_token text;
  v_id bigint;
BEGIN
  IF p_id_gira IS NULL THEN
    RAISE EXCEPTION 'Falta id de gira';
  END IF;
  IF v_etiqueta = '' THEN
    RAISE EXCEPTION 'La etiqueta / rol de la vacante es obligatorio';
  END IF;
  IF p_id_localidad IS NULL THEN
    RAISE EXCEPTION 'La localidad de origen es obligatoria';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.programas WHERE id = p_id_gira) THEN
    RAISE EXCEPTION 'La gira no existe';
  END IF;

  IF v_nom <> '' THEN
    v_apellido := v_etiqueta || ' (' || v_nom || ')';
  ELSE
    v_apellido := v_etiqueta;
  END IF;

  IF nullif(btrim(COALESCE(p_genero, '')), '') IS NULL THEN
    v_genero := NULL;
  ELSIF btrim(p_genero) IN ('F', 'M', '-') THEN
    v_genero := btrim(p_genero)::public.genero;
  ELSE
    RAISE EXCEPTION 'Género inválido';
  END IF;

  v_token := replace(gen_random_uuid()::text, '-', '');

  INSERT INTO public.integrantes (
    nombre, apellido, es_simulacion, genero,
    id_localidad, id_instr, dni, mail, condicion
  ) VALUES (
    'Vacante',
    v_apellido,
    true,
    v_genero,
    p_id_localidad,
    NULLIF(p_id_instr, ''),
    'SIM-' || substr(v_token, 1, 12),
    'vacante-' || substr(v_token, 1, 12) || '@placeholder.system',
    'Refuerzo'
  )
  RETURNING id INTO v_id;

  INSERT INTO public.giras_integrantes (id_gira, id_integrante, rol, estado)
  VALUES (p_id_gira, v_id, 'musico', 'confirmado');

  RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- materializar_reemplazo (asignar titular)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.materializar_reemplazo(
  p_id_gira bigint,
  p_id_placeholder bigint,
  p_id_real bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_ph record;
  v_real record;
  v_real_gi record;
  v_inherit boolean;
  v_alerta boolean := false;
BEGIN
  IF p_id_gira IS NULL OR p_id_placeholder IS NULL OR p_id_real IS NULL THEN
    RAISE EXCEPTION 'Parámetros inválidos';
  END IF;
  IF p_id_placeholder = p_id_real THEN
    RAISE EXCEPTION 'La vacante y el titular no pueden ser la misma persona';
  END IF;

  SELECT id, es_simulacion, genero::text AS genero
  INTO v_ph
  FROM public.integrantes
  WHERE id = p_id_placeholder;
  IF v_ph.id IS NULL THEN
    RAISE EXCEPTION 'La vacante no existe';
  END IF;
  IF v_ph.es_simulacion IS NOT TRUE THEN
    RAISE EXCEPTION 'Solo se puede asignar un titular sobre una vacante (integrante simulado)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.giras_integrantes
    WHERE id_gira = p_id_gira AND id_integrante = p_id_placeholder
  ) THEN
    RAISE EXCEPTION 'La vacante no está en esta gira';
  END IF;

  SELECT id, es_simulacion, genero::text AS genero
  INTO v_real
  FROM public.integrantes
  WHERE id = p_id_real;
  IF v_real.id IS NULL THEN
    RAISE EXCEPTION 'El titular no existe';
  END IF;
  IF v_real.es_simulacion IS TRUE THEN
    RAISE EXCEPTION 'No se puede asignar otra vacante como titular';
  END IF;

  SELECT * INTO v_real_gi
  FROM public.giras_integrantes
  WHERE id_gira = p_id_gira AND id_integrante = p_id_real;

  IF v_real_gi.id IS NOT NULL AND lower(COALESCE(v_real_gi.estado, '')) = 'ausente' THEN
    RAISE EXCEPTION 'No se puede asignar un titular marcado como ausente en esta gira';
  END IF;

  v_inherit := public.vacantes_should_inherit_room(v_ph.genero, v_real.genero);
  v_alerta := NOT v_inherit;

  -- Nómina
  IF v_real_gi.id IS NOT NULL THEN
    DELETE FROM public.giras_integrantes
    WHERE id_gira = p_id_gira AND id_integrante = p_id_placeholder;
  ELSE
    UPDATE public.giras_integrantes
    SET id_integrante = p_id_real,
        estado = 'confirmado'
    WHERE id_gira = p_id_gira AND id_integrante = p_id_placeholder;
  END IF;

  -- Reglas logísticas generales (target_ids bigint[])
  UPDATE public.giras_logistica_reglas
  SET target_ids = public.vacantes_remap_bigint_array(target_ids, p_id_placeholder, p_id_real)
  WHERE id_gira = p_id_gira
    AND target_ids IS NOT NULL
    AND p_id_placeholder = ANY (target_ids);

  -- RSVP comidas legacy
  DELETE FROM public.giras_comidas_rsvp r
  WHERE r.id_integrante = p_id_placeholder
    AND r.id_comida IN (
      SELECT id FROM public.programas_agenda_comidas WHERE id_gira = p_id_gira
    )
    AND EXISTS (
      SELECT 1 FROM public.giras_comidas_rsvp x
      WHERE x.id_comida = r.id_comida AND x.id_integrante = p_id_real
    );
  UPDATE public.giras_comidas_rsvp
  SET id_integrante = p_id_real
  WHERE id_integrante = p_id_placeholder
    AND id_comida IN (
      SELECT id FROM public.programas_agenda_comidas WHERE id_gira = p_id_gira
    );

  -- Viáticos
  DELETE FROM public.giras_viaticos
  WHERE id_gira = p_id_gira AND id_integrante = p_id_placeholder
    AND EXISTS (
      SELECT 1 FROM public.giras_viaticos x
      WHERE x.id_gira = p_id_gira AND x.id_integrante = p_id_real
    );
  UPDATE public.giras_viaticos
  SET id_integrante = p_id_real
  WHERE id_gira = p_id_gira AND id_integrante = p_id_placeholder;

  DELETE FROM public.giras_viaticos_detalle
  WHERE id_gira = p_id_gira AND id_integrante = p_id_placeholder
    AND EXISTS (
      SELECT 1 FROM public.giras_viaticos_detalle x
      WHERE x.id_gira = p_id_gira AND x.id_integrante = p_id_real
    );
  UPDATE public.giras_viaticos_detalle
  SET id_integrante = p_id_real
  WHERE id_gira = p_id_gira AND id_integrante = p_id_placeholder;

  -- Transporte / admisión / rutas (id_integrante + target_ids text[])
  UPDATE public.giras_logistica_reglas_transportes
  SET id_integrante = CASE WHEN id_integrante = p_id_placeholder THEN p_id_real ELSE id_integrante END,
      target_ids = public.vacantes_remap_text_id_array(target_ids, p_id_placeholder, p_id_real)
  WHERE id_gira_transporte IN (
      SELECT id FROM public.giras_transportes WHERE id_gira = p_id_gira
    )
    AND (
      id_integrante = p_id_placeholder
      OR p_id_placeholder::text = ANY (COALESCE(target_ids, '{}'::text[]))
    );

  UPDATE public.giras_logistica_admision
  SET id_integrante = CASE WHEN id_integrante = p_id_placeholder THEN p_id_real ELSE id_integrante END,
      target_ids = public.vacantes_remap_text_id_array(target_ids, p_id_placeholder, p_id_real)
  WHERE id_gira = p_id_gira
    AND (
      id_integrante = p_id_placeholder
      OR p_id_placeholder::text = ANY (COALESCE(target_ids, '{}'::text[]))
    );

  UPDATE public.giras_logistica_rutas
  SET id_integrante = CASE WHEN id_integrante = p_id_placeholder THEN p_id_real ELSE id_integrante END,
      target_ids = public.vacantes_remap_text_id_array(target_ids, p_id_placeholder, p_id_real)
  WHERE id_gira = p_id_gira
    AND (
      id_integrante = p_id_placeholder
      OR p_id_placeholder::text = ANY (COALESCE(target_ids, '{}'::text[]))
    );

  -- Hotelería
  IF v_inherit THEN
    -- El titular no puede quedar en dos habitaciones de la gira
    UPDATE public.hospedaje_habitaciones h
    SET id_integrantes_asignados = public.vacantes_remove_bigint_array(
          h.id_integrantes_asignados, p_id_real
        ),
        asignaciones_config = public.vacantes_remap_asignaciones_config(
          h.asignaciones_config, p_id_real, p_id_real, false
        )
    WHERE h.id_hospedaje IN (
            SELECT id FROM public.programas_hospedajes WHERE id_programa = p_id_gira
          )
      AND (
        p_id_real = ANY (COALESCE(h.id_integrantes_asignados, '{}'::bigint[]))
        OR COALESCE(h.asignaciones_config, '[]'::jsonb) @> jsonb_build_array(jsonb_build_object('id', p_id_real))
        OR COALESCE(h.asignaciones_config::text, '') LIKE '%"id": ' || p_id_real::text || '%'
        OR COALESCE(h.asignaciones_config::text, '') LIKE '%"id":' || p_id_real::text || '%'
      )
      AND p_id_placeholder <> ALL (COALESCE(h.id_integrantes_asignados, '{}'::bigint[]));

    UPDATE public.hospedaje_habitaciones h
    SET id_integrantes_asignados = public.vacantes_remap_bigint_array(
          h.id_integrantes_asignados, p_id_placeholder, p_id_real
        ),
        asignaciones_config = public.vacantes_remap_asignaciones_config(
          h.asignaciones_config, p_id_placeholder, p_id_real, true
        )
    WHERE h.id_hospedaje IN (
            SELECT id FROM public.programas_hospedajes WHERE id_programa = p_id_gira
          )
      AND (
        p_id_placeholder = ANY (COALESCE(h.id_integrantes_asignados, '{}'::bigint[]))
        OR COALESCE(h.asignaciones_config::text, '') LIKE '%"id": ' || p_id_placeholder::text || '%'
        OR COALESCE(h.asignaciones_config::text, '') LIKE '%"id":' || p_id_placeholder::text || '%'
      );
  ELSE
    UPDATE public.hospedaje_habitaciones h
    SET id_integrantes_asignados = public.vacantes_remove_bigint_array(
          h.id_integrantes_asignados, p_id_placeholder
        ),
        asignaciones_config = public.vacantes_remap_asignaciones_config(
          h.asignaciones_config, p_id_placeholder, p_id_real, false
        )
    WHERE h.id_hospedaje IN (
            SELECT id FROM public.programas_hospedajes WHERE id_programa = p_id_gira
          )
      AND (
        p_id_placeholder = ANY (COALESCE(h.id_integrantes_asignados, '{}'::bigint[]))
        OR COALESCE(h.asignaciones_config::text, '') LIKE '%"id": ' || p_id_placeholder::text || '%'
        OR COALESCE(h.asignaciones_config::text, '') LIKE '%"id":' || p_id_placeholder::text || '%'
      );
  END IF;

  -- Seating vientos (array, sin FK)
  UPDATE public.seating_asignaciones
  SET id_musicos_asignados = public.vacantes_remap_bigint_array(
        id_musicos_asignados, p_id_placeholder, p_id_real
      )
  WHERE id_programa = p_id_gira
    AND p_id_placeholder = ANY (COALESCE(id_musicos_asignados, '{}'::bigint[]));

  -- Seating cuerdas: heredar atril (no CASCADE-borrar)
  DELETE FROM public.seating_contenedores_items i
  USING public.seating_contenedores c
  WHERE i.id_contenedor = c.id
    AND c.id_programa = p_id_gira
    AND i.id_musico = p_id_placeholder
    AND EXISTS (
      SELECT 1 FROM public.seating_contenedores_items x
      WHERE x.id_contenedor = i.id_contenedor AND x.id_musico = p_id_real
    );
  UPDATE public.seating_contenedores_items i
  SET id_musico = p_id_real
  FROM public.seating_contenedores c
  WHERE i.id_contenedor = c.id
    AND c.id_programa = p_id_gira
    AND i.id_musico = p_id_placeholder;

  -- Grupos: la plaza (vacante) es la verdad. Si la vacante está en grupo(s),
  -- el titular hereda esos y sale de cualquier otro grupo de esta gira.
  -- No hay columna de orden de membresía (solo orden del grupo).
  IF EXISTS (
    SELECT 1
    FROM public.giras_grupos_integrantes ggi
    JOIN public.giras_grupos gg ON gg.id = ggi.id_grupo
    WHERE gg.id_gira = p_id_gira
      AND ggi.id_integrante = p_id_placeholder
  ) THEN
    DELETE FROM public.giras_grupos_integrantes ggi
    USING public.giras_grupos gg
    WHERE ggi.id_grupo = gg.id
      AND gg.id_gira = p_id_gira
      AND ggi.id_integrante = p_id_real
      AND NOT EXISTS (
        SELECT 1
        FROM public.giras_grupos_integrantes vac
        JOIN public.giras_grupos vg ON vg.id = vac.id_grupo
        WHERE vg.id_gira = p_id_gira
          AND vac.id_integrante = p_id_placeholder
          AND vac.id_grupo = ggi.id_grupo
      );
  END IF;

  DELETE FROM public.giras_grupos_integrantes ggi
  USING public.giras_grupos gg
  WHERE ggi.id_grupo = gg.id
    AND gg.id_gira = p_id_gira
    AND ggi.id_integrante = p_id_placeholder
    AND EXISTS (
      SELECT 1 FROM public.giras_grupos_integrantes x
      WHERE x.id_grupo = ggi.id_grupo AND x.id_integrante = p_id_real
    );
  UPDATE public.giras_grupos_integrantes ggi
  SET id_integrante = p_id_real
  FROM public.giras_grupos gg
  WHERE ggi.id_grupo = gg.id
    AND gg.id_gira = p_id_gira
    AND ggi.id_integrante = p_id_placeholder;

  -- Asistencia / check-in (eventos de la gira)
  DELETE FROM public.eventos_asistencia ea
  USING public.eventos e
  WHERE ea.id_evento = e.id
    AND e.id_gira = p_id_gira
    AND ea.id_integrante = p_id_placeholder
    AND EXISTS (
      SELECT 1 FROM public.eventos_asistencia x
      WHERE x.id_evento = ea.id_evento AND x.id_integrante = p_id_real
    );
  UPDATE public.eventos_asistencia ea
  SET id_integrante = p_id_real
  FROM public.eventos e
  WHERE ea.id_evento = e.id
    AND e.id_gira = p_id_gira
    AND ea.id_integrante = p_id_placeholder;

  UPDATE public.eventos_asistencia_custom eac
  SET id_integrante = p_id_real
  FROM public.eventos e
  WHERE eac.id_evento = e.id
    AND e.id_gira = p_id_gira
    AND eac.id_integrante = p_id_placeholder;

  DELETE FROM public.eventos_checkin_ensayo ce
  USING public.eventos e
  WHERE ce.id_evento = e.id
    AND e.id_gira = p_id_gira
    AND ce.id_integrante = p_id_placeholder
    AND EXISTS (
      SELECT 1 FROM public.eventos_checkin_ensayo x
      WHERE x.id_evento = ce.id_evento AND x.id_integrante = p_id_real
    );
  UPDATE public.eventos_checkin_ensayo ce
  SET id_integrante = p_id_real
  FROM public.eventos e
  WHERE ce.id_evento = e.id
    AND e.id_gira = p_id_gira
    AND ce.id_integrante = p_id_placeholder;

  UPDATE public.eventos_checkin_ensayo ce
  SET id_integrante_prestador = p_id_real
  FROM public.eventos e
  WHERE ce.id_evento = e.id
    AND e.id_gira = p_id_gira
    AND ce.id_integrante_prestador = p_id_placeholder;

  UPDATE public.eventos_checkin_ensayo ce
  SET id_integrante_prestador_salida = p_id_real
  FROM public.eventos e
  WHERE ce.id_evento = e.id
    AND e.id_gira = p_id_gira
    AND ce.id_integrante_prestador_salida = p_id_placeholder;

  DELETE FROM public.eventos_checkin_recordatorios cr
  USING public.eventos e
  WHERE cr.id_evento = e.id
    AND e.id_gira = p_id_gira
    AND cr.id_integrante = p_id_placeholder
    AND EXISTS (
      SELECT 1 FROM public.eventos_checkin_recordatorios x
      WHERE x.id_evento = cr.id_evento
        AND x.id_integrante = p_id_real
        AND x.tipo IS NOT DISTINCT FROM cr.tipo
        AND x.canal IS NOT DISTINCT FROM cr.canal
    );
  UPDATE public.eventos_checkin_recordatorios cr
  SET id_integrante = p_id_real
  FROM public.eventos e
  WHERE cr.id_evento = e.id
    AND e.id_gira = p_id_gira
    AND cr.id_integrante = p_id_placeholder;

  UPDATE public.eventos_checkin_pase cp
  SET id_integrante_prestador = p_id_real
  FROM public.eventos e
  WHERE cp.id_evento = e.id
    AND e.id_gira = p_id_gira
    AND cp.id_integrante_prestador = p_id_placeholder;

  UPDATE public.eventos_checkin_pase cp
  SET id_integrante_usuario = p_id_real
  FROM public.eventos e
  WHERE cp.id_evento = e.id
    AND e.id_gira = p_id_gira
    AND cp.id_integrante_usuario = p_id_placeholder;

  -- Accesos / exclusiones hotel
  DELETE FROM public.giras_accesos
  WHERE id_gira = p_id_gira AND id_integrante = p_id_placeholder
    AND EXISTS (
      SELECT 1 FROM public.giras_accesos x
      WHERE x.id_gira = p_id_gira AND x.id_integrante = p_id_real
    );
  UPDATE public.giras_accesos
  SET id_integrante = p_id_real
  WHERE id_gira = p_id_gira AND id_integrante = p_id_placeholder;

  DELETE FROM public.giras_hospedajes_excluidos
  WHERE id_programa = p_id_gira AND id_integrante = p_id_placeholder
    AND EXISTS (
      SELECT 1 FROM public.giras_hospedajes_excluidos x
      WHERE x.id_programa = p_id_gira AND x.id_integrante = p_id_real
    );
  UPDATE public.giras_hospedajes_excluidos
  SET id_integrante = p_id_real
  WHERE id_programa = p_id_gira AND id_integrante = p_id_placeholder;

  DELETE FROM public.integrantes
  WHERE id = p_id_placeholder AND es_simulacion IS TRUE;

  RETURN jsonb_build_object(
    'success', true,
    'alerta_alojamiento', v_alerta
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- eliminar_vacante
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.eliminar_vacante(
  p_id_gira bigint,
  p_id_vacante bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_sim boolean;
BEGIN
  IF p_id_gira IS NULL OR p_id_vacante IS NULL THEN
    RAISE EXCEPTION 'Parámetros inválidos';
  END IF;

  SELECT es_simulacion INTO v_sim
  FROM public.integrantes
  WHERE id = p_id_vacante;
  IF v_sim IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'Solo se pueden eliminar vacantes (integrantes simulados)';
  END IF;

  UPDATE public.hospedaje_habitaciones h
  SET id_integrantes_asignados = public.vacantes_remove_bigint_array(
        h.id_integrantes_asignados, p_id_vacante
      ),
      asignaciones_config = public.vacantes_remap_asignaciones_config(
        h.asignaciones_config, p_id_vacante, p_id_vacante, false
      )
  WHERE h.id_hospedaje IN (
          SELECT id FROM public.programas_hospedajes WHERE id_programa = p_id_gira
        );

  UPDATE public.seating_asignaciones
  SET id_musicos_asignados = public.vacantes_remove_bigint_array(
        id_musicos_asignados, p_id_vacante
      )
  WHERE id_programa = p_id_gira;

  DELETE FROM public.seating_contenedores_items i
  USING public.seating_contenedores c
  WHERE i.id_contenedor = c.id
    AND c.id_programa = p_id_gira
    AND i.id_musico = p_id_vacante;

  UPDATE public.giras_logistica_reglas
  SET target_ids = public.vacantes_remove_bigint_array(target_ids, p_id_vacante)
  WHERE id_gira = p_id_gira
    AND target_ids IS NOT NULL
    AND p_id_vacante = ANY (target_ids);

  UPDATE public.giras_logistica_reglas_transportes
  SET id_integrante = CASE WHEN id_integrante = p_id_vacante THEN NULL ELSE id_integrante END,
      target_ids = public.vacantes_remove_text_id_array(target_ids, p_id_vacante)
  WHERE id_gira_transporte IN (
      SELECT id FROM public.giras_transportes WHERE id_gira = p_id_gira
    )
    AND (
      id_integrante = p_id_vacante
      OR p_id_vacante::text = ANY (COALESCE(target_ids, '{}'::text[]))
    );

  UPDATE public.giras_logistica_admision
  SET id_integrante = CASE WHEN id_integrante = p_id_vacante THEN NULL ELSE id_integrante END,
      target_ids = public.vacantes_remove_text_id_array(target_ids, p_id_vacante)
  WHERE id_gira = p_id_gira
    AND (
      id_integrante = p_id_vacante
      OR p_id_vacante::text = ANY (COALESCE(target_ids, '{}'::text[]))
    );

  UPDATE public.giras_logistica_rutas
  SET id_integrante = CASE WHEN id_integrante = p_id_vacante THEN NULL ELSE id_integrante END,
      target_ids = public.vacantes_remove_text_id_array(target_ids, p_id_vacante)
  WHERE id_gira = p_id_gira
    AND (
      id_integrante = p_id_vacante
      OR p_id_vacante::text = ANY (COALESCE(target_ids, '{}'::text[]))
    );

  DELETE FROM public.giras_viaticos
  WHERE id_gira = p_id_gira AND id_integrante = p_id_vacante;
  DELETE FROM public.giras_viaticos_detalle
  WHERE id_gira = p_id_gira AND id_integrante = p_id_vacante;

  DELETE FROM public.giras_comidas_rsvp
  WHERE id_integrante = p_id_vacante
    AND id_comida IN (
      SELECT id FROM public.programas_agenda_comidas WHERE id_gira = p_id_gira
    );

  DELETE FROM public.giras_accesos
  WHERE id_gira = p_id_gira AND id_integrante = p_id_vacante;
  DELETE FROM public.giras_hospedajes_excluidos
  WHERE id_programa = p_id_gira AND id_integrante = p_id_vacante;

  DELETE FROM public.giras_grupos_integrantes ggi
  USING public.giras_grupos gg
  WHERE ggi.id_grupo = gg.id
    AND gg.id_gira = p_id_gira
    AND ggi.id_integrante = p_id_vacante;

  DELETE FROM public.eventos_asistencia ea
  USING public.eventos e
  WHERE ea.id_evento = e.id AND e.id_gira = p_id_gira AND ea.id_integrante = p_id_vacante;

  DELETE FROM public.eventos_asistencia_custom eac
  USING public.eventos e
  WHERE eac.id_evento = e.id AND e.id_gira = p_id_gira AND eac.id_integrante = p_id_vacante;

  DELETE FROM public.eventos_checkin_ensayo ce
  USING public.eventos e
  WHERE ce.id_evento = e.id AND e.id_gira = p_id_gira AND ce.id_integrante = p_id_vacante;

  DELETE FROM public.eventos_checkin_recordatorios cr
  USING public.eventos e
  WHERE cr.id_evento = e.id AND e.id_gira = p_id_gira AND cr.id_integrante = p_id_vacante;

  DELETE FROM public.giras_integrantes
  WHERE id_gira = p_id_gira AND id_integrante = p_id_vacante;

  DELETE FROM public.integrantes
  WHERE id = p_id_vacante AND es_simulacion IS TRUE;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ---------------------------------------------------------------------------
-- Desactivar liberar_plaza (agujero SECURITY DEFINER + schema viejo)
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.liberar_plaza_generar_vacante(bigint, bigint) FROM PUBLIC;
DROP FUNCTION IF EXISTS public.liberar_plaza_generar_vacante(bigint, bigint);

-- ---------------------------------------------------------------------------
-- Huérfanos claros (nombre Vacante + placeholder), no “Sosa / Invitado”
-- ---------------------------------------------------------------------------

DELETE FROM public.integrantes i
WHERE i.es_simulacion IS TRUE
  AND NOT EXISTS (
    SELECT 1 FROM public.giras_integrantes gi WHERE gi.id_integrante = i.id
  )
  AND i.nombre ILIKE 'Vacante'
  AND (
    COALESCE(i.dni, '') ILIKE 'SIM-%'
    OR COALESCE(i.mail, '') ILIKE 'vacante-%@placeholder.system'
    OR COALESCE(i.mail, '') ILIKE 'vacante-%@sistema.local'
  );

-- ---------------------------------------------------------------------------
-- Grants (misma superficie que el resto de la app / RPC previa PUBLIC)
-- ---------------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION public.vacantes_should_inherit_room(text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.vacantes_remap_bigint_array(bigint[], bigint, bigint) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.vacantes_remove_bigint_array(bigint[], bigint) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.vacantes_remap_text_id_array(text[], bigint, bigint) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.vacantes_remove_text_id_array(text[], bigint) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.vacantes_remap_asignaciones_config(jsonb, bigint, bigint, boolean) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.crear_vacante(bigint, text, bigint, text, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.materializar_reemplazo(bigint, bigint, bigint) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.eliminar_vacante(bigint, bigint) TO anon, authenticated, service_role;
