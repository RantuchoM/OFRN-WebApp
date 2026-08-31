-- Atomic merge of duplicate locaciones into a canonical one.
-- All remaps + delete run in a single transaction (one RPC call).
-- SECURITY INVOKER: same RLS as the Datos UI; no privilege escalation.

CREATE OR REPLACE FUNCTION public.merge_locaciones(
  p_source_id bigint,
  p_target_id bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_source_nombre text;
  v_target_nombre text;
  v_hoteles_source int;
  v_hoteles_target int;
  v_n int;
  v_counts jsonb := '{}'::jsonb;
  v_parts text[] := ARRAY[]::text[];
  v_k text;
  v_v text;
BEGIN
  IF p_source_id IS NULL OR p_target_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'IDs de locación inválidos.');
  END IF;

  IF p_source_id = p_target_id THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'No podés fusionar una locación consigo misma.'
    );
  END IF;

  SELECT nombre INTO v_source_nombre
  FROM public.locaciones
  WHERE id = p_source_id;

  SELECT nombre INTO v_target_nombre
  FROM public.locaciones
  WHERE id = p_target_id;

  IF v_source_nombre IS NULL OR v_target_nombre IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Una de las locaciones ya no existe.'
    );
  END IF;

  SELECT count(*)::int INTO v_hoteles_source
  FROM public.hoteles
  WHERE id_locacion = p_source_id;

  SELECT count(*)::int INTO v_hoteles_target
  FROM public.hoteles
  WHERE id_locacion = p_target_id;

  IF v_hoteles_source > 0 AND v_hoteles_target > 0 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error',
      'Ambas locaciones están vinculadas a hoteles. Unificá o eliminá el hotel duplicado en Datos → Hoteles antes de fusionar las locaciones.'
    );
  END IF;

  -- Scalar FKs
  UPDATE public.eventos
  SET id_locacion = p_target_id
  WHERE id_locacion = p_source_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('eventos.id_locacion', v_n);

  UPDATE public.programas_agenda_comidas
  SET id_locacion = p_target_id
  WHERE id_locacion = p_source_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('programas_agenda_comidas.id_locacion', v_n);

  UPDATE public.integrantes
  SET id_domicilio_laboral = p_target_id
  WHERE id_domicilio_laboral = p_source_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('integrantes.id_domicilio_laboral', v_n);

  UPDATE public.plantillas_recorridos_tramos
  SET id_locacion_origen = p_target_id
  WHERE id_locacion_origen = p_source_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('plantillas_recorridos_tramos.id_locacion_origen', v_n);

  UPDATE public.plantillas_recorridos_tramos
  SET id_locacion_destino = p_target_id
  WHERE id_locacion_destino = p_source_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('plantillas_recorridos_tramos.id_locacion_destino', v_n);

  -- Hoteles: reassign without mirror overwrite of target venue fields
  IF v_hoteles_source > 0 THEN
    PERFORM public.hotel_loc_mirror_guard_on();
    UPDATE public.hoteles
    SET id_locacion = p_target_id
    WHERE id_locacion = p_source_id;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    PERFORM public.hotel_loc_mirror_guard_off();
    v_counts := v_counts || jsonb_build_object('hoteles.id_locacion', v_n);
  END IF;

  -- fimba_venue_info: UNIQUE (id_edicion, id_locacion)
  WITH dropped AS (
    DELETE FROM public.fimba_venue_info s
    WHERE s.id_locacion = p_source_id
      AND EXISTS (
        SELECT 1
        FROM public.fimba_venue_info t
        WHERE t.id_locacion = p_target_id
          AND t.id_edicion = s.id_edicion
      )
    RETURNING s.id
  )
  SELECT count(*)::int INTO v_n FROM dropped;
  v_counts := v_counts || jsonb_build_object('fimba_venue_info.dropped_dup', v_n);

  UPDATE public.fimba_venue_info
  SET id_locacion = p_target_id
  WHERE id_locacion = p_source_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('fimba_venue_info.moved', v_n);

  DELETE FROM public.locaciones WHERE id = p_source_id;

  FOR v_k, v_v IN
    SELECT key, value #>> '{}'
    FROM jsonb_each(v_counts)
  LOOP
    IF COALESCE(v_v::int, 0) > 0 THEN
      v_parts := array_append(v_parts, v_k || ': ' || v_v);
    END IF;
  END LOOP;

  IF coalesce(array_length(v_parts, 1), 0) > 0 THEN
    RETURN jsonb_build_object(
      'ok', true,
      'counts', v_counts,
      'summary',
      format(
        '«%s» (#%s) → «%s» (#%s). %s.',
        v_source_nombre,
        p_source_id,
        v_target_nombre,
        p_target_id,
        array_to_string(v_parts, '; ')
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'counts', v_counts,
    'summary',
    format(
      '«%s» (#%s) eliminada; no había referencias. Queda «%s» (#%s).',
      v_source_nombre,
      p_source_id,
      v_target_nombre,
      p_target_id
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Ensure mirror guard is cleared if we failed mid-hotel remap
    BEGIN
      PERFORM public.hotel_loc_mirror_guard_off();
    EXCEPTION
      WHEN OTHERS THEN
        NULL;
    END;
    RETURN jsonb_build_object(
      'ok', false,
      'error', SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION public.merge_locaciones(bigint, bigint) IS
  'Fusiona locación duplicada (source) en canónica (target) en una sola transacción; remapea FKs y elimina source.';

REVOKE ALL ON FUNCTION public.merge_locaciones(bigint, bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.merge_locaciones(bigint, bigint) TO authenticated;
