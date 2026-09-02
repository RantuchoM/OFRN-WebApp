-- FIMBA edición 1 / gira 12: asociar estadía (fechas) → eventos Check-in/Out canónicos.
-- Idempotente: reutiliza eventos 14:00 (tipo 22) / 10:00 (tipo 23); no toca OFRN 12:00.
-- Aplicar:
--   npx supabase db query --linked -f supabase/scripts/fimba_associate_stay_events_edicion1.sql
--
-- Preferido: eventos ya creados por migración 20260902122628 (IDs ~4304–4315).

DO $$
DECLARE
  v_edicion_id bigint := 1;
  v_gira_id bigint;
  v_tipo_in int := 22;
  v_tipo_out int := 23;
  v_hora_in time := TIME '14:00';
  v_hora_out time := TIME '10:00';
  r record;
  v_eid bigint;
  v_created int := 0;
  v_prop_in int := 0;
  v_prop_out int := 0;
  v_part_in int := 0;
  v_part_out int := 0;
  v_prop_fix_in int := 0;
  v_prop_fix_out int := 0;
  v_part_fix_in int := 0;
  v_part_fix_out int := 0;
BEGIN
  SELECT id_gira INTO v_gira_id
  FROM public.fimba_ediciones
  WHERE id = v_edicion_id;

  IF v_gira_id IS NULL THEN
    RAISE EXCEPTION 'fimba_ediciones id=% no encontrada', v_edicion_id;
  END IF;

  -- Ensure Check-in events for every distinct date in play
  FOR r IN
    SELECT DISTINCT d.fecha
    FROM (
      SELECT checkin_at AS fecha
      FROM public.fimba_propuestas
      WHERE id_edicion = v_edicion_id AND checkin_at IS NOT NULL
      UNION
      SELECT fp.checkin_at
      FROM public.fimba_participantes fp
      JOIN public.fimba_propuestas p ON p.id = fp.id_propuesta
      WHERE p.id_edicion = v_edicion_id AND fp.checkin_at IS NOT NULL
    ) d
    ORDER BY 1
  LOOP
    SELECT e.id INTO v_eid
    FROM public.eventos e
    WHERE e.id_gira = v_gira_id
      AND e.id_tipo_evento = v_tipo_in
      AND e.fecha = r.fecha
      AND e.hora_inicio = v_hora_in
      AND COALESCE(e.is_deleted, false) = false
    ORDER BY e.id
    LIMIT 1;

    IF v_eid IS NULL THEN
      INSERT INTO public.eventos (
        id_gira, id_tipo_evento, fecha, hora_inicio, hora_fin,
        descripcion, visible_agenda, audiencia_ofrn, is_deleted
      ) VALUES (
        v_gira_id, v_tipo_in, r.fecha, v_hora_in, NULL,
        'Check-In', true, 'none', false
      )
      RETURNING id INTO v_eid;
      v_created := v_created + 1;
    END IF;
  END LOOP;

  -- Ensure Check-out events
  FOR r IN
    SELECT DISTINCT d.fecha
    FROM (
      SELECT checkout_at AS fecha
      FROM public.fimba_propuestas
      WHERE id_edicion = v_edicion_id AND checkout_at IS NOT NULL
      UNION
      SELECT fp.checkout_at
      FROM public.fimba_participantes fp
      JOIN public.fimba_propuestas p ON p.id = fp.id_propuesta
      WHERE p.id_edicion = v_edicion_id AND fp.checkout_at IS NOT NULL
    ) d
    ORDER BY 1
  LOOP
    SELECT e.id INTO v_eid
    FROM public.eventos e
    WHERE e.id_gira = v_gira_id
      AND e.id_tipo_evento = v_tipo_out
      AND e.fecha = r.fecha
      AND e.hora_inicio = v_hora_out
      AND COALESCE(e.is_deleted, false) = false
    ORDER BY e.id
    LIMIT 1;

    IF v_eid IS NULL THEN
      INSERT INTO public.eventos (
        id_gira, id_tipo_evento, fecha, hora_inicio, hora_fin,
        descripcion, visible_agenda, audiencia_ofrn, is_deleted
      ) VALUES (
        v_gira_id, v_tipo_out, r.fecha, v_hora_out, NULL,
        'Check-Out', true, 'none', false
      )
      RETURNING id INTO v_eid;
      v_created := v_created + 1;
    END IF;
  END LOOP;

  -- Link missing propuestas check-in
  UPDATE public.fimba_propuestas p
  SET id_evento_checkin = (
        SELECT e.id FROM public.eventos e
        WHERE e.id_gira = v_gira_id AND e.id_tipo_evento = v_tipo_in
          AND e.fecha = p.checkin_at AND e.hora_inicio = v_hora_in
          AND COALESCE(e.is_deleted, false) = false
        ORDER BY e.id LIMIT 1
      ),
      updated_at = timezone('utc'::text, now())
  WHERE p.id_edicion = v_edicion_id
    AND p.checkin_at IS NOT NULL
    AND p.id_evento_checkin IS NULL;
  GET DIAGNOSTICS v_prop_in = ROW_COUNT;

  UPDATE public.fimba_propuestas p
  SET id_evento_checkout = (
        SELECT e.id FROM public.eventos e
        WHERE e.id_gira = v_gira_id AND e.id_tipo_evento = v_tipo_out
          AND e.fecha = p.checkout_at AND e.hora_inicio = v_hora_out
          AND COALESCE(e.is_deleted, false) = false
        ORDER BY e.id LIMIT 1
      ),
      updated_at = timezone('utc'::text, now())
  WHERE p.id_edicion = v_edicion_id
    AND p.checkout_at IS NOT NULL
    AND p.id_evento_checkout IS NULL;
  GET DIAGNOSTICS v_prop_out = ROW_COUNT;

  -- Fix propuestas mismatched to wrong event date/tipo/hora
  UPDATE public.fimba_propuestas p
  SET id_evento_checkin = (
        SELECT e.id FROM public.eventos e
        WHERE e.id_gira = v_gira_id AND e.id_tipo_evento = v_tipo_in
          AND e.fecha = p.checkin_at AND e.hora_inicio = v_hora_in
          AND COALESCE(e.is_deleted, false) = false
        ORDER BY e.id LIMIT 1
      ),
      updated_at = timezone('utc'::text, now())
  FROM public.eventos cur
  WHERE p.id_edicion = v_edicion_id
    AND p.checkin_at IS NOT NULL
    AND p.id_evento_checkin IS NOT NULL
    AND cur.id = p.id_evento_checkin
    AND (
      cur.fecha IS DISTINCT FROM p.checkin_at
      OR cur.id_tipo_evento IS DISTINCT FROM v_tipo_in
      OR cur.hora_inicio IS DISTINCT FROM v_hora_in
    );
  GET DIAGNOSTICS v_prop_fix_in = ROW_COUNT;

  UPDATE public.fimba_propuestas p
  SET id_evento_checkout = (
        SELECT e.id FROM public.eventos e
        WHERE e.id_gira = v_gira_id AND e.id_tipo_evento = v_tipo_out
          AND e.fecha = p.checkout_at AND e.hora_inicio = v_hora_out
          AND COALESCE(e.is_deleted, false) = false
        ORDER BY e.id LIMIT 1
      ),
      updated_at = timezone('utc'::text, now())
  FROM public.eventos cur
  WHERE p.id_edicion = v_edicion_id
    AND p.checkout_at IS NOT NULL
    AND p.id_evento_checkout IS NOT NULL
    AND cur.id = p.id_evento_checkout
    AND (
      cur.fecha IS DISTINCT FROM p.checkout_at
      OR cur.id_tipo_evento IS DISTINCT FROM v_tipo_out
      OR cur.hora_inicio IS DISTINCT FROM v_hora_out
    );
  GET DIAGNOSTICS v_prop_fix_out = ROW_COUNT;

  -- Link missing participante overrides
  UPDATE public.fimba_participantes fp
  SET id_evento_checkin = (
        SELECT e.id FROM public.eventos e
        WHERE e.id_gira = v_gira_id AND e.id_tipo_evento = v_tipo_in
          AND e.fecha = fp.checkin_at AND e.hora_inicio = v_hora_in
          AND COALESCE(e.is_deleted, false) = false
        ORDER BY e.id LIMIT 1
      ),
      updated_at = timezone('utc'::text, now())
  FROM public.fimba_propuestas p
  WHERE fp.id_propuesta = p.id
    AND p.id_edicion = v_edicion_id
    AND fp.checkin_at IS NOT NULL
    AND fp.id_evento_checkin IS NULL;
  GET DIAGNOSTICS v_part_in = ROW_COUNT;

  UPDATE public.fimba_participantes fp
  SET id_evento_checkout = (
        SELECT e.id FROM public.eventos e
        WHERE e.id_gira = v_gira_id AND e.id_tipo_evento = v_tipo_out
          AND e.fecha = fp.checkout_at AND e.hora_inicio = v_hora_out
          AND COALESCE(e.is_deleted, false) = false
        ORDER BY e.id LIMIT 1
      ),
      updated_at = timezone('utc'::text, now())
  FROM public.fimba_propuestas p
  WHERE fp.id_propuesta = p.id
    AND p.id_edicion = v_edicion_id
    AND fp.checkout_at IS NOT NULL
    AND fp.id_evento_checkout IS NULL;
  GET DIAGNOSTICS v_part_out = ROW_COUNT;

  UPDATE public.fimba_participantes fp
  SET id_evento_checkin = (
        SELECT e.id FROM public.eventos e
        WHERE e.id_gira = v_gira_id AND e.id_tipo_evento = v_tipo_in
          AND e.fecha = fp.checkin_at AND e.hora_inicio = v_hora_in
          AND COALESCE(e.is_deleted, false) = false
        ORDER BY e.id LIMIT 1
      ),
      updated_at = timezone('utc'::text, now())
  FROM public.fimba_propuestas p, public.eventos cur
  WHERE fp.id_propuesta = p.id
    AND p.id_edicion = v_edicion_id
    AND fp.checkin_at IS NOT NULL
    AND fp.id_evento_checkin IS NOT NULL
    AND cur.id = fp.id_evento_checkin
    AND (
      cur.fecha IS DISTINCT FROM fp.checkin_at
      OR cur.id_tipo_evento IS DISTINCT FROM v_tipo_in
      OR cur.hora_inicio IS DISTINCT FROM v_hora_in
    );
  GET DIAGNOSTICS v_part_fix_in = ROW_COUNT;

  UPDATE public.fimba_participantes fp
  SET id_evento_checkout = (
        SELECT e.id FROM public.eventos e
        WHERE e.id_gira = v_gira_id AND e.id_tipo_evento = v_tipo_out
          AND e.fecha = fp.checkout_at AND e.hora_inicio = v_hora_out
          AND COALESCE(e.is_deleted, false) = false
        ORDER BY e.id LIMIT 1
      ),
      updated_at = timezone('utc'::text, now())
  FROM public.fimba_propuestas p, public.eventos cur
  WHERE fp.id_propuesta = p.id
    AND p.id_edicion = v_edicion_id
    AND fp.checkout_at IS NOT NULL
    AND fp.id_evento_checkout IS NOT NULL
    AND cur.id = fp.id_evento_checkout
    AND (
      cur.fecha IS DISTINCT FROM fp.checkout_at
      OR cur.id_tipo_evento IS DISTINCT FROM v_tipo_out
      OR cur.hora_inicio IS DISTINCT FROM v_hora_out
    );
  GET DIAGNOSTICS v_part_fix_out = ROW_COUNT;

  RAISE NOTICE
    'fimba associate stay: created=%, prop_link_in=%, prop_link_out=%, prop_fix_in=%, prop_fix_out=%, part_link_in=%, part_link_out=%, part_fix_in=%, part_fix_out=%',
    v_created, v_prop_in, v_prop_out, v_prop_fix_in, v_prop_fix_out,
    v_part_in, v_part_out, v_part_fix_in, v_part_fix_out;
END $$;

-- Resumen post-asociación
SELECT
  (SELECT count(*)::int FROM fimba_propuestas
   WHERE id_edicion = 1 AND checkin_at IS NOT NULL AND checkout_at IS NOT NULL) AS prop_with_dates,
  (SELECT count(*)::int FROM fimba_propuestas
   WHERE id_edicion = 1 AND id_evento_checkin IS NOT NULL AND id_evento_checkout IS NOT NULL) AS prop_linked_both,
  (SELECT count(*)::int FROM fimba_propuestas
   WHERE id_edicion = 1 AND checkin_at IS NOT NULL AND id_evento_checkin IS NULL) AS prop_legacy_in,
  (SELECT count(*)::int FROM fimba_propuestas
   WHERE id_edicion = 1 AND checkout_at IS NOT NULL AND id_evento_checkout IS NULL) AS prop_legacy_out,
  (SELECT count(*)::int FROM fimba_participantes fp
   JOIN fimba_propuestas p ON p.id = fp.id_propuesta
   WHERE p.id_edicion = 1 AND fp.checkin_at IS NOT NULL AND fp.id_evento_checkin IS NULL) AS part_legacy_in,
  (SELECT count(*)::int FROM fimba_participantes fp
   JOIN fimba_propuestas p ON p.id = fp.id_propuesta
   WHERE p.id_edicion = 1 AND fp.checkout_at IS NOT NULL AND fp.id_evento_checkout IS NULL) AS part_legacy_out,
  (SELECT count(*)::int FROM fimba_participantes fp
   JOIN fimba_propuestas p ON p.id = fp.id_propuesta
   WHERE p.id_edicion = 1
     AND (fp.id_evento_checkin IS NOT NULL OR fp.id_evento_checkout IS NOT NULL)) AS part_with_override_fk;
