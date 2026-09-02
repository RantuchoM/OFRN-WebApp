-- FIMBA: check-in / check-out como asociación a eventos (paridad OFRN).
-- OFRN: giras_logistica_reglas.id_evento_checkin / id_evento_checkout
--        tipos_evento 22 = Check-in, 23 = Check-Out
-- FIMBA: mismas FKs en fimba_propuestas y fimba_participantes.
-- checkin_at / checkout_at quedan como espejo denormalizado (fecha del evento).
-- Horas canónicas FIMBA: check-in 14:00, check-out 10:00.

-- ---------------------------------------------------------------------------
-- 1) Columnas FK
-- ---------------------------------------------------------------------------
ALTER TABLE public.fimba_propuestas
  ADD COLUMN IF NOT EXISTS id_evento_checkin bigint
    REFERENCES public.eventos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS id_evento_checkout bigint
    REFERENCES public.eventos(id) ON DELETE SET NULL;

ALTER TABLE public.fimba_participantes
  ADD COLUMN IF NOT EXISTS id_evento_checkin bigint
    REFERENCES public.eventos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS id_evento_checkout bigint
    REFERENCES public.eventos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS fimba_propuestas_id_evento_checkin_idx
  ON public.fimba_propuestas (id_evento_checkin)
  WHERE id_evento_checkin IS NOT NULL;

CREATE INDEX IF NOT EXISTS fimba_propuestas_id_evento_checkout_idx
  ON public.fimba_propuestas (id_evento_checkout)
  WHERE id_evento_checkout IS NOT NULL;

CREATE INDEX IF NOT EXISTS fimba_participantes_id_evento_checkin_idx
  ON public.fimba_participantes (id_evento_checkin)
  WHERE id_evento_checkin IS NOT NULL;

CREATE INDEX IF NOT EXISTS fimba_participantes_id_evento_checkout_idx
  ON public.fimba_participantes (id_evento_checkout)
  WHERE id_evento_checkout IS NOT NULL;

COMMENT ON COLUMN public.fimba_propuestas.id_evento_checkin IS
  'Evento Check-in (tipos_evento=22). Fuente de verdad de fecha/hora; checkin_at es espejo.';
COMMENT ON COLUMN public.fimba_propuestas.id_evento_checkout IS
  'Evento Check-Out (tipos_evento=23). Fuente de verdad de fecha/hora; checkout_at es espejo.';
COMMENT ON COLUMN public.fimba_participantes.id_evento_checkin IS
  'Override check-in por persona → eventos. NULL = hereda artista.';
COMMENT ON COLUMN public.fimba_participantes.id_evento_checkout IS
  'Override check-out por persona → eventos. NULL = hereda artista.';

-- ---------------------------------------------------------------------------
-- 2) Backfill edición 1 / gira 12: eventos a 14:00 / 10:00 + FKs
--     No reutiliza Check-in/Out OFRN a las 12:00 (reglas logística).
-- ---------------------------------------------------------------------------
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
BEGIN
  SELECT id_gira INTO v_gira_id
  FROM public.fimba_ediciones
  WHERE id = v_edicion_id;

  IF v_gira_id IS NULL THEN
    RAISE NOTICE 'fimba_ediciones id=% no encontrada — skip backfill', v_edicion_id;
    RETURN;
  END IF;

  IF v_gira_id <> 12 THEN
    RAISE NOTICE 'Edición % apunta a gira % (esperado 12) — backfill igual sobre esa gira',
      v_edicion_id, v_gira_id;
  END IF;

  -- Fechas check-in únicas (propuestas + overrides participantes)
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

  -- Fechas check-out únicas
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

  -- Link propuestas → eventos (subquery evita ambigüedad si hubiera dupes)
  UPDATE public.fimba_propuestas p
  SET id_evento_checkin = (
        SELECT e.id
        FROM public.eventos e
        WHERE e.id_gira = v_gira_id
          AND e.id_tipo_evento = v_tipo_in
          AND e.fecha = p.checkin_at
          AND e.hora_inicio = v_hora_in
          AND COALESCE(e.is_deleted, false) = false
        ORDER BY e.id
        LIMIT 1
      ),
      updated_at = timezone('utc'::text, now())
  WHERE p.id_edicion = v_edicion_id
    AND p.checkin_at IS NOT NULL
    AND p.id_evento_checkin IS NULL;

  GET DIAGNOSTICS v_prop_in = ROW_COUNT;

  UPDATE public.fimba_propuestas p
  SET id_evento_checkout = (
        SELECT e.id
        FROM public.eventos e
        WHERE e.id_gira = v_gira_id
          AND e.id_tipo_evento = v_tipo_out
          AND e.fecha = p.checkout_at
          AND e.hora_inicio = v_hora_out
          AND COALESCE(e.is_deleted, false) = false
        ORDER BY e.id
        LIMIT 1
      ),
      updated_at = timezone('utc'::text, now())
  WHERE p.id_edicion = v_edicion_id
    AND p.checkout_at IS NOT NULL
    AND p.id_evento_checkout IS NULL;

  GET DIAGNOSTICS v_prop_out = ROW_COUNT;

  -- Link participantes (override) → eventos
  UPDATE public.fimba_participantes fp
  SET id_evento_checkin = (
        SELECT e.id
        FROM public.eventos e
        WHERE e.id_gira = v_gira_id
          AND e.id_tipo_evento = v_tipo_in
          AND e.fecha = fp.checkin_at
          AND e.hora_inicio = v_hora_in
          AND COALESCE(e.is_deleted, false) = false
        ORDER BY e.id
        LIMIT 1
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
        SELECT e.id
        FROM public.eventos e
        WHERE e.id_gira = v_gira_id
          AND e.id_tipo_evento = v_tipo_out
          AND e.fecha = fp.checkout_at
          AND e.hora_inicio = v_hora_out
          AND COALESCE(e.is_deleted, false) = false
        ORDER BY e.id
        LIMIT 1
      ),
      updated_at = timezone('utc'::text, now())
  FROM public.fimba_propuestas p
  WHERE fp.id_propuesta = p.id
    AND p.id_edicion = v_edicion_id
    AND fp.checkout_at IS NOT NULL
    AND fp.id_evento_checkout IS NULL;

  GET DIAGNOSTICS v_part_out = ROW_COUNT;

  RAISE NOTICE
    'FIMBA checkin/out eventos: created=%, prop_in=%, prop_out=%, part_in=%, part_out=%',
    v_created, v_prop_in, v_prop_out, v_part_in, v_part_out;
END $$;
