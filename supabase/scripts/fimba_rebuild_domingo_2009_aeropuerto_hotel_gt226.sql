-- FIMBA edición 1 / gira 12 — rebuild Domingo 2026-09-20 airport→hotel
-- for Guillo Espel (4), Raúl Traver (2), Sol Liebeskind (2) on Camioneta CHEVROLET (gt 226).
--
-- Context:
--   Correct Saturday 19/09 Espel block (keep): eventos 4411 → 3950 → 4412
--     · 4411 Salida Aeropuerto Espel @ 01:00 loc 263 (M383) + fet 226
--     · 3950 Traslado Aeropuerto a Hotel @ 01:30 loc 2 (Aeropuerto) + Subida Espel 4
--     · 4412 Deja a Espel @ 02:00 loc 93 (A definir) + Bajada Espel 4
--     · ruta id 12: subida 3950 → bajada 4412, plazas 4, gt 226
--
--   Wrong Sunday 20/09 Hotel→Aeropuerto (delete):
--     · 3951 Guillo Espel (ruta 28 subida abierta)
--     · 3953 Raúl Traver (ruta 14 subida → bajada 3903)
--     · 3903 Sol Liebeskind (ruta 16 subida abierta) + vuelo JA3040
--
-- Apply:
--   npx supabase db query --linked -f supabase/scripts/fimba_rebuild_domingo_2009_aeropuerto_hotel_gt226.sql
--
-- Idempotent guard: aborts if wrong events already gone / new blocks already present.

BEGIN;

DO $$
DECLARE
  v_gt constant bigint := 226;
  v_gira constant bigint := 12;
  v_fecha constant date := '2026-09-20';
  v_loc_salida constant bigint := 263; -- M383 (Saturday template)
  v_loc_aero constant bigint := 2;     -- Aeropuerto Bariloche
  v_loc_hotel constant bigint := 93;   -- A definir
  v_wrong bigint[];
  v_existing_new int;
  -- propuestas
  v_espel constant bigint := 2;
  v_traver constant bigint := 12;
  v_sol constant bigint := 1;
  -- new event ids
  e_espel_s bigint; e_espel_t bigint; e_espel_d bigint;
  e_trav_s bigint;  e_trav_t bigint;  e_trav_d bigint;
  e_sol_s bigint;   e_sol_t bigint;   e_sol_d bigint;
BEGIN
  SELECT array_agg(id ORDER BY id)
  INTO v_wrong
  FROM eventos
  WHERE id IN (3903, 3951, 3953)
    AND id_gira = v_gira
    AND COALESCE(is_deleted, false) = false;

  IF v_wrong IS NULL OR cardinality(v_wrong) <> 3 THEN
    RAISE EXCEPTION
      'Abort: expected wrong Sunday events {3903,3951,3953} active on gira 12; found %',
      COALESCE(v_wrong::text, '{}');
  END IF;

  SELECT count(*)::int INTO v_existing_new
  FROM eventos
  WHERE id_gira = v_gira
    AND fecha = v_fecha
    AND COALESCE(is_deleted, false) = false
    AND descripcion IN (
      'Salida Aeropuerto Espel',
      'Salida Aeropuerto Traver',
      'Salida Aeropuerto Liebeskind',
      'Deja a Traver',
      'Deja a Liebeskind'
    )
    AND id IN (
      SELECT fet.id_evento FROM fimba_evento_transportes fet WHERE fet.id_gira_transporte = v_gt
    );

  IF v_existing_new > 0 THEN
    RAISE EXCEPTION
      'Abort: looks like rebuild already applied (% matching new salida/deja on gt 226)',
      v_existing_new;
  END IF;

  -- 1) Boarding rules that reference the wrong Sunday stops
  DELETE FROM fimba_propuesta_rutas
  WHERE id IN (14, 16, 28)
     OR id_evento_subida IN (3903, 3951, 3953)
     OR id_evento_bajada IN (3903, 3951, 3953);

  -- 2) Hard-delete wrong events (CASCADE tags + fimba_evento_transportes)
  DELETE FROM eventos
  WHERE id IN (3903, 3951, 3953)
    AND id_gira = v_gira;

  RAISE NOTICE 'Deleted wrong Sunday events: 3903, 3951, 3953 (rutas 14, 16, 28)';

  -- ========== Block 1 — Guillo Espel 4 @ 01:00 ==========
  INSERT INTO eventos (
    id_gira, id_tipo_evento, id_locacion, fecha, hora_inicio, hora_fin,
    descripcion, audiencia_ofrn, asientos_equipaje, audiencia,
    visible_agenda, is_deleted, tecnica
  ) VALUES (
    v_gira, 11, v_loc_salida, v_fecha, '01:00:00', NULL,
    'Salida Aeropuerto Espel', 'none', NULL, NULL,
    true, false, false
  ) RETURNING id INTO e_espel_s;

  INSERT INTO eventos (
    id_gira, id_tipo_evento, id_locacion, fecha, hora_inicio, hora_fin,
    descripcion, audiencia_ofrn, asientos_equipaje, audiencia,
    visible_agenda, is_deleted, tecnica
  ) VALUES (
    v_gira, 11, v_loc_aero, v_fecha, '01:30:00', NULL,
    'Traslado Aeropuerto a Hotel', 'none', 4, 4,
    true, false, false
  ) RETURNING id INTO e_espel_t;

  INSERT INTO eventos (
    id_gira, id_tipo_evento, id_locacion, fecha, hora_inicio, hora_fin,
    descripcion, audiencia_ofrn, asientos_equipaje, audiencia,
    visible_agenda, is_deleted, tecnica
  ) VALUES (
    v_gira, 11, v_loc_hotel, v_fecha, '02:00:00', NULL,
    'Deja a Espel', 'none', NULL, NULL,
    true, false, false
  ) RETURNING id INTO e_espel_d;

  -- ========== Block 2 — Raúl Traver 2 @ 03:00 ==========
  INSERT INTO eventos (
    id_gira, id_tipo_evento, id_locacion, fecha, hora_inicio, hora_fin,
    descripcion, audiencia_ofrn, asientos_equipaje, audiencia,
    visible_agenda, is_deleted, tecnica
  ) VALUES (
    v_gira, 11, v_loc_salida, v_fecha, '03:00:00', NULL,
    'Salida Aeropuerto Traver', 'none', NULL, NULL,
    true, false, false
  ) RETURNING id INTO e_trav_s;

  INSERT INTO eventos (
    id_gira, id_tipo_evento, id_locacion, fecha, hora_inicio, hora_fin,
    descripcion, audiencia_ofrn, asientos_equipaje, audiencia,
    visible_agenda, is_deleted, tecnica
  ) VALUES (
    v_gira, 11, v_loc_aero, v_fecha, '03:30:00', NULL,
    'Traslado Aeropuerto a Hotel', 'none', 2, 2,
    true, false, false
  ) RETURNING id INTO e_trav_t;

  INSERT INTO eventos (
    id_gira, id_tipo_evento, id_locacion, fecha, hora_inicio, hora_fin,
    descripcion, audiencia_ofrn, asientos_equipaje, audiencia,
    visible_agenda, is_deleted, tecnica
  ) VALUES (
    v_gira, 11, v_loc_hotel, v_fecha, '04:00:00', NULL,
    'Deja a Traver', 'none', NULL, NULL,
    true, false, false
  ) RETURNING id INTO e_trav_d;

  -- ========== Block 3 — Sol Liebeskind 2 @ 05:00 ==========
  INSERT INTO eventos (
    id_gira, id_tipo_evento, id_locacion, fecha, hora_inicio, hora_fin,
    descripcion, audiencia_ofrn, asientos_equipaje, audiencia,
    visible_agenda, is_deleted, tecnica
  ) VALUES (
    v_gira, 11, v_loc_salida, v_fecha, '05:00:00', NULL,
    'Salida Aeropuerto Liebeskind', 'none', NULL, NULL,
    true, false, false
  ) RETURNING id INTO e_sol_s;

  INSERT INTO eventos (
    id_gira, id_tipo_evento, id_locacion, fecha, hora_inicio, hora_fin,
    descripcion, audiencia_ofrn, asientos_equipaje, audiencia,
    visible_agenda, is_deleted, tecnica
  ) VALUES (
    v_gira, 11, v_loc_aero, v_fecha, '05:30:00', NULL,
    'Traslado Aeropuerto a Hotel', 'none', 2, 2,
    true, false, false
  ) RETURNING id INTO e_sol_t;

  INSERT INTO eventos (
    id_gira, id_tipo_evento, id_locacion, fecha, hora_inicio, hora_fin,
    descripcion, audiencia_ofrn, asientos_equipaje, audiencia,
    visible_agenda, is_deleted, tecnica
  ) VALUES (
    v_gira, 11, v_loc_hotel, v_fecha, '06:00:00', NULL,
    'Deja a Liebeskind', 'none', NULL, NULL,
    true, false, false
  ) RETURNING id INTO e_sol_d;

  -- Vehicle assignment (reserva técnica 0 — same as Saturday)
  INSERT INTO fimba_evento_transportes (id_evento, id_gira_transporte, plazas)
  VALUES
    (e_espel_s, v_gt, 0), (e_espel_t, v_gt, 0), (e_espel_d, v_gt, 0),
    (e_trav_s,  v_gt, 0), (e_trav_t,  v_gt, 0), (e_trav_d,  v_gt, 0),
    (e_sol_s,   v_gt, 0), (e_sol_t,   v_gt, 0), (e_sol_d,   v_gt, 0);

  -- Artist tags on traslado + deja (Saturday: not on salida wait)
  INSERT INTO eventos_fimba_propuestas (id_evento, id_propuesta)
  VALUES
    (e_espel_t, v_espel), (e_espel_d, v_espel),
    (e_trav_t,  v_traver), (e_trav_d,  v_traver),
    (e_sol_t,   v_sol),    (e_sol_d,   v_sol);

  -- Boarding: Subida on traslado → Bajada on deja
  INSERT INTO fimba_propuesta_rutas (
    id_propuesta, id_gira_transporte, plazas,
    id_evento_subida, id_evento_bajada, es_chofer
  ) VALUES
    (v_espel,  v_gt, 4, e_espel_t, e_espel_d, false),
    (v_traver, v_gt, 2, e_trav_t,  e_trav_d,  false),
    (v_sol,    v_gt, 2, e_sol_t,   e_sol_d,   false);

  RAISE NOTICE 'Created Espel block:   %, %, %', e_espel_s, e_espel_t, e_espel_d;
  RAISE NOTICE 'Created Traver block:  %, %, %', e_trav_s, e_trav_t, e_trav_d;
  RAISE NOTICE 'Created Liebeskind:    %, %, %', e_sol_s, e_sol_t, e_sol_d;
END $$;

COMMIT;

-- Verification (post-commit)
SELECT e.id, e.hora_inicio, e.descripcion, l.nombre AS locacion,
       (SELECT string_agg(p.nombre || ':' || efp.id_propuesta::text, ', ')
          FROM eventos_fimba_propuestas efp
          JOIN fimba_propuestas p ON p.id = efp.id_propuesta
         WHERE efp.id_evento = e.id) AS tags,
       (SELECT string_agg(
            CASE
              WHEN r.id_evento_subida = e.id THEN 'SUB ' || p.nombre || ' ' || r.plazas
              WHEN r.id_evento_bajada = e.id THEN 'BAJ ' || p.nombre || ' ' || r.plazas
            END, ' | ')
          FROM fimba_propuesta_rutas r
          JOIN fimba_propuestas p ON p.id = r.id_propuesta
         WHERE r.id_evento_subida = e.id OR r.id_evento_bajada = e.id) AS boarding,
       (SELECT fet.plazas FROM fimba_evento_transportes fet
         WHERE fet.id_evento = e.id AND fet.id_gira_transporte = 226) AS fet_plazas
FROM eventos e
LEFT JOIN locaciones l ON l.id = e.id_locacion
WHERE e.id_gira = 12
  AND e.fecha = '2026-09-20'
  AND COALESCE(e.is_deleted, false) = false
  AND e.id IN (
    SELECT fet.id_evento FROM fimba_evento_transportes fet WHERE fet.id_gira_transporte = 226
  )
ORDER BY e.hora_inicio NULLS LAST, e.id;
