-- FIMBA edición 1 / gira 12: alinear locación de check-in/out con hotel del artista.
--
-- Fuente de verdad: fimba_propuestas.id_hotel → hoteles.id_locacion → eventos.id_locacion
-- (tipos 22/23). Si un evento canónico está compartido entre hoteles distintos,
-- se bifurca (mismo fecha/hora/tipo + id_locacion del hotel) y se reasignan FKs
-- de esa propuesta y de sus participantes override.
--
-- Idempotente. Aplicar:
--   npx supabase db query --linked -f supabase/scripts/fimba_sync_stay_event_locacion_from_hotel_edicion1.sql

DO $$
DECLARE
  v_edicion_id bigint := 1;
  v_gira_id bigint;
  r record;
  v_event_id bigint;
  v_new_id bigint;
  v_target_loc bigint;
  v_kind text;
  v_tipo int;
  v_hora time;
  v_desc text;
  v_updated int := 0;
  v_forked int := 0;
  v_n_prop int := 0;
  v_n_part int := 0;
  v_mismatch_before int;
  v_mismatch_after int;
BEGIN
  SELECT id_gira INTO v_gira_id
  FROM public.fimba_ediciones
  WHERE id = v_edicion_id;

  IF v_gira_id IS NULL THEN
    RAISE EXCEPTION 'fimba_ediciones id=% no encontrada', v_edicion_id;
  END IF;

  SELECT COUNT(*)::int INTO v_mismatch_before
  FROM public.fimba_propuestas p
  JOIN public.hoteles h ON h.id = p.id_hotel
  JOIN public.eventos e ON e.id IN (p.id_evento_checkin, p.id_evento_checkout)
  WHERE p.id_edicion = v_edicion_id
    AND h.id_locacion IS NOT NULL
    AND e.id_locacion IS DISTINCT FROM h.id_locacion;

  RAISE NOTICE '=== sync stay locación ← hotel (edición %, gira %) — mismatch antes=% ===',
    v_edicion_id, v_gira_id, v_mismatch_before;

  -- Por cada (evento de estadía, hotel_loc) con al menos una propuesta de la edición
  FOR r IN
    WITH stay_refs AS (
      SELECT p.id AS id_propuesta, p.id_hotel, h.id_locacion AS hotel_loc,
             p.id_evento_checkin AS id_evento, 'checkin'::text AS side
      FROM public.fimba_propuestas p
      LEFT JOIN public.hoteles h ON h.id = p.id_hotel
      WHERE p.id_edicion = v_edicion_id
        AND p.id_evento_checkin IS NOT NULL
        AND h.id_locacion IS NOT NULL
      UNION ALL
      SELECT p.id, p.id_hotel, h.id_locacion,
             p.id_evento_checkout, 'checkout'
      FROM public.fimba_propuestas p
      LEFT JOIN public.hoteles h ON h.id = p.id_hotel
      WHERE p.id_edicion = v_edicion_id
        AND p.id_evento_checkout IS NOT NULL
        AND h.id_locacion IS NOT NULL
    ),
    loc_groups AS (
      SELECT
        id_evento,
        hotel_loc,
        array_agg(DISTINCT id_propuesta ORDER BY id_propuesta) AS prop_ids,
        COUNT(DISTINCT id_propuesta) AS n_props
      FROM stay_refs
      GROUP BY id_evento, hotel_loc
    ),
    ranked AS (
      SELECT
        lg.id_evento,
        lg.hotel_loc,
        lg.prop_ids,
        lg.n_props,
        e.fecha,
        e.hora_inicio,
        e.id_tipo_evento,
        e.descripcion,
        e.id_locacion AS cur_loc,
        ROW_NUMBER() OVER (
          PARTITION BY lg.id_evento
          ORDER BY lg.n_props DESC, lg.hotel_loc ASC
        ) AS rn
      FROM loc_groups lg
      JOIN public.eventos e ON e.id = lg.id_evento
    )
    SELECT * FROM ranked
    ORDER BY id_evento, rn
  LOOP
    v_event_id := r.id_evento;
    v_target_loc := r.hotel_loc;
    v_tipo := r.id_tipo_evento;
    v_hora := r.hora_inicio;
    v_desc := CASE
      WHEN r.id_tipo_evento = 23 THEN 'Check-Out'
      ELSE 'Check-In'
    END;
    v_kind := CASE WHEN r.id_tipo_evento = 23 THEN 'checkout' ELSE 'checkin' END;

    IF r.rn = 1 THEN
      -- Grupo mayoritario (o único): actualizar el evento canónico in-place
      IF r.cur_loc IS DISTINCT FROM v_target_loc THEN
        UPDATE public.eventos e
        SET
          id_locacion = v_target_loc,
          descripcion = NULLIF(
            trim(both E'\n' FROM regexp_replace(
              coalesce(e.descripcion, ''),
              '^Destino:\s*.*$',
              '',
              'gi'
            )),
            ''
          ),
          updated_at = now()
        WHERE e.id = v_event_id;
        v_updated := v_updated + 1;
        RAISE NOTICE 'UPDATE evento % → id_locacion=% (% props)',
          v_event_id, v_target_loc, r.n_props;
      END IF;
    ELSE
      -- Conflicto de hotel: find-or-create evento con misma fecha/hora/tipo + locación
      SELECT e.id INTO v_new_id
      FROM public.eventos e
      WHERE e.id_gira = v_gira_id
        AND e.id_tipo_evento = v_tipo
        AND e.fecha = r.fecha
        AND e.hora_inicio = v_hora
        AND e.id_locacion = v_target_loc
        AND COALESCE(e.is_deleted, false) = false
      ORDER BY e.id
      LIMIT 1;

      IF v_new_id IS NULL THEN
        INSERT INTO public.eventos (
          id_gira, id_tipo_evento, fecha, hora_inicio, hora_fin,
          descripcion, id_locacion, visible_agenda, audiencia_ofrn, is_deleted
        ) VALUES (
          v_gira_id, v_tipo, r.fecha, v_hora, NULL,
          v_desc, v_target_loc, true, 'none', false
        )
        RETURNING id INTO v_new_id;
        v_forked := v_forked + 1;
        RAISE NOTICE 'FORK nuevo evento % (from %, loc=%, %)',
          v_new_id, v_event_id, v_target_loc, v_kind;
      ELSE
        RAISE NOTICE 'FORK reusa evento % (from %, loc=%)',
          v_new_id, v_event_id, v_target_loc;
      END IF;

      -- Reasignar propuestas de este grupo
      IF v_kind = 'checkin' THEN
        UPDATE public.fimba_propuestas p
        SET id_evento_checkin = v_new_id, updated_at = now()
        WHERE p.id = ANY (r.prop_ids)
          AND p.id_evento_checkin = v_event_id;
        GET DIAGNOSTICS v_n_prop = ROW_COUNT;
      ELSE
        UPDATE public.fimba_propuestas p
        SET id_evento_checkout = v_new_id, updated_at = now()
        WHERE p.id = ANY (r.prop_ids)
          AND p.id_evento_checkout = v_event_id;
        GET DIAGNOSTICS v_n_prop = ROW_COUNT;
      END IF;

      -- Participantes override de esas propuestas que apuntaban al evento viejo
      IF v_kind = 'checkin' THEN
        UPDATE public.fimba_participantes fp
        SET id_evento_checkin = v_new_id, updated_at = now()
        FROM public.fimba_propuestas p
        WHERE fp.id_propuesta = p.id
          AND p.id = ANY (r.prop_ids)
          AND fp.id_evento_checkin = v_event_id;
        GET DIAGNOSTICS v_n_part = ROW_COUNT;
      ELSE
        UPDATE public.fimba_participantes fp
        SET id_evento_checkout = v_new_id, updated_at = now()
        FROM public.fimba_propuestas p
        WHERE fp.id_propuesta = p.id
          AND p.id = ANY (r.prop_ids)
          AND fp.id_evento_checkout = v_event_id;
        GET DIAGNOSTICS v_n_part = ROW_COUNT;
      END IF;

      -- Tag opcional en agenda
      INSERT INTO public.eventos_fimba_propuestas (id_evento, id_propuesta)
      SELECT v_new_id, unnest(r.prop_ids)
      ON CONFLICT (id_evento, id_propuesta) DO NOTHING;

      RAISE NOTICE '  reasignadas prop=% part=% → evento %',
        v_n_prop, v_n_part, v_new_id;
    END IF;
  END LOOP;

  SELECT COUNT(*)::int INTO v_mismatch_after
  FROM public.fimba_propuestas p
  JOIN public.hoteles h ON h.id = p.id_hotel
  JOIN public.eventos e ON e.id IN (p.id_evento_checkin, p.id_evento_checkout)
  WHERE p.id_edicion = v_edicion_id
    AND h.id_locacion IS NOT NULL
    AND e.id_locacion IS DISTINCT FROM h.id_locacion;

  RAISE NOTICE '=== sync stay locación — updated=% forked=% mismatch después=% ===',
    v_updated, v_forked, v_mismatch_after;

  IF v_mismatch_after > 0 THEN
    RAISE WARNING 'Quedan % vínculos propuesta↔evento con locación distinta al hotel',
      v_mismatch_after;
  END IF;
END $$;

-- Verificación
SELECT
  (SELECT COUNT(*)::int
   FROM fimba_propuestas p
   JOIN hoteles h ON h.id = p.id_hotel
   JOIN eventos e ON e.id IN (p.id_evento_checkin, p.id_evento_checkout)
   WHERE p.id_edicion = 1
     AND h.id_locacion IS NOT NULL
     AND e.id_locacion IS DISTINCT FROM h.id_locacion) AS mismatch_prop_links,
  (SELECT COUNT(*)::int
   FROM fimba_propuestas p
   JOIN hoteles h ON h.id = p.id_hotel
   JOIN eventos e ON e.id IN (p.id_evento_checkin, p.id_evento_checkout)
   WHERE p.id_edicion = 1
     AND h.id_locacion IS NOT NULL
     AND e.id_locacion = h.id_locacion) AS matched_prop_links,
  (SELECT COUNT(*)::int
   FROM eventos e
   WHERE e.id_gira = 12
     AND e.id_tipo_evento IN (22, 23)
     AND COALESCE(e.is_deleted, false) = false
     AND e.hora_inicio IN (TIME '14:00', TIME '10:00')) AS stay_events_gira12;
