-- Gira 12 / FIMBA 2026: migrar `Destino:` legacy en descripcion → id_locacion.
--
-- Alcance:
--   38 eventos sin id_locacion: asignar locación según texto legacy y quitar línea Destino:
--   27 eventos con id_locacion: solo verificación (NOTICE); fix explícito 3971 si aún en La Baita 157
--
-- stripDestino: misma regla que decodeFimbaTrasladoDescripcion / encodeFimbaTrasladoDescripcion
--   (eliminar líneas cuyo trim-end coincide con ^Destino:\s*, case-insensitive).
--
-- Aplicar: npx supabase db query --linked -f supabase/scripts/fimba_legacy_destino_to_locacion_gira12.sql

BEGIN;

-- ---------------------------------------------------------------------------
-- 0) Helper: quitar línea Destino: legacy
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pg_temp.strip_fimba_destino_line(p_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(
    btrim(
      array_to_string(
        ARRAY(
          SELECT l
          FROM unnest(string_to_array(COALESCE(p_text, ''), E'\n')) AS l
          WHERE NOT (regexp_replace(l, '\s+$', '') ~* '^Destino:\s*')
        ),
        E'\n'
      ),
      E'\n'
    ),
    ''
  );
$$;

-- ---------------------------------------------------------------------------
-- 1) Constantes y mapping legacy → id_locacion
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM eventos
    WHERE id_gira = 12 AND COALESCE(is_deleted, false) = false
  ) THEN
    RAISE EXCEPTION 'No hay eventos activos en gira 12';
  END IF;

  IF (SELECT COUNT(*) FROM locaciones WHERE id IN (5, 6, 7, 50, 59, 250, 252)) <> 7 THEN
    RAISE EXCEPTION 'Faltan locaciones esperadas en catálogo (5,6,7,50,59,250,252)';
  END IF;
END $$;

CREATE TEMP TABLE _legacy_destino_map (
  legacy_destino text PRIMARY KEY,
  id_locacion bigint NOT NULL
) ON COMMIT DROP;

INSERT INTO _legacy_destino_map (legacy_destino, id_locacion) VALUES
  ('Teatro La Baita', 252),
  ('Camping Musical Campus de Artes y Música Bariloche', 7),
  ('Iglesia Catedral Nuestra Señora del Nahuel Huapi', 50),
  ('Puerto San Carlos', 59),
  ('Puesrto San Carlos', 59),
  ('Asociación Empresaria Hotelera Gastronómica de Bariloche', 5),
  ('Biblioteca Sarmiento', 6),
  ('Campus INVAP', 250);

-- ---------------------------------------------------------------------------
-- 2) Snapshot eventos gira 12 con línea Destino:
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE _destino_events ON COMMIT DROP AS
SELECT
  e.id,
  e.id_locacion,
  e.descripcion,
  l.nombre AS locacion_nombre,
  (
    SELECT trim(regexp_replace(line, '^Destino:\s*', '', 'i'))
    FROM unnest(string_to_array(e.descripcion, E'\n')) AS line
    WHERE regexp_replace(line, '\s+$', '') ~* '^Destino:\s*'
    LIMIT 1
  ) AS legacy_destino
FROM eventos e
LEFT JOIN locaciones l ON l.id = e.id_locacion
WHERE e.id_gira = 12
  AND COALESCE(e.is_deleted, false) = false
  AND e.descripcion ~* '(^|\n)Destino:\s*';

-- ---------------------------------------------------------------------------
-- 3) Pre counts
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  RAISE NOTICE '=== FIMBA legacy Destino → id_locacion — pre counts ===';
  FOR r IN
    SELECT 'total_destino_line' AS k, COUNT(*)::int AS n FROM _destino_events
    UNION ALL
    SELECT 'sin_id_locacion', COUNT(*)::int FROM _destino_events WHERE id_locacion IS NULL
    UNION ALL
    SELECT 'con_id_locacion', COUNT(*)::int FROM _destino_events WHERE id_locacion IS NOT NULL
    UNION ALL
    SELECT 'sin_map_sin_locacion', COUNT(*)::int
    FROM _destino_events d
    LEFT JOIN _legacy_destino_map m ON m.legacy_destino = d.legacy_destino
    WHERE d.id_locacion IS NULL AND m.id_locacion IS NULL
  LOOP
    RAISE NOTICE '%: %', r.k, r.n;
  END LOOP;
END $$;

-- Abortar si hay sin_locacion sin mapping (p.ej. "A definir")
DO $$
DECLARE
  v_unmapped int;
BEGIN
  SELECT COUNT(*)::int INTO v_unmapped
  FROM _destino_events d
  LEFT JOIN _legacy_destino_map m ON m.legacy_destino = d.legacy_destino
  WHERE d.id_locacion IS NULL AND m.id_locacion IS NULL;

  IF v_unmapped > 0 THEN
    RAISE EXCEPTION 'Hay % eventos sin id_locacion y sin mapping legacy (revisar manual)', v_unmapped;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4) UPDATE 38 sin id_locacion: asignar locación + strip Destino:
-- ---------------------------------------------------------------------------
UPDATE eventos e
SET
  id_locacion = m.id_locacion,
  descripcion = pg_temp.strip_fimba_destino_line(e.descripcion),
  updated_at = now()
FROM _destino_events d
JOIN _legacy_destino_map m ON m.legacy_destino = d.legacy_destino
WHERE e.id = d.id
  AND d.id_locacion IS NULL;

-- ---------------------------------------------------------------------------
-- 5) Fix explícito evento 3971 (La Baita vieja 157 → Teatro La Baita 252)
-- ---------------------------------------------------------------------------
UPDATE eventos
SET id_locacion = 252, updated_at = now()
WHERE id = 3971
  AND id_gira = 12
  AND id_locacion = 157;

-- ---------------------------------------------------------------------------
-- 6) Verificación 27 con id_locacion (solo NOTICE)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r record;
  v_mismatch int;
BEGIN
  SELECT COUNT(*)::int INTO v_mismatch
  FROM _destino_events d
  JOIN locaciones l ON l.id = d.id_locacion
  WHERE d.id_locacion IS NOT NULL
    AND trim(d.legacy_destino) <> trim(l.nombre)
    AND NOT (
      trim(d.legacy_destino) = 'A definir'
      AND trim(l.nombre) IN ('A definir', 'A definir ')
    );

  RAISE NOTICE '=== Consistencia 27 con id_locacion (mismatches=%) ===', v_mismatch;

  FOR r IN
    SELECT
      d.id,
      d.id_locacion,
      d.legacy_destino,
      l.nombre AS locacion_nombre,
      CASE
        WHEN trim(d.legacy_destino) = trim(l.nombre) THEN 'ok'
        WHEN trim(d.legacy_destino) = 'A definir'
             AND trim(l.nombre) IN ('A definir', 'A definir ') THEN 'ok_manual_a_definir'
        ELSE 'mismatch'
      END AS status
    FROM _destino_events d
    JOIN locaciones l ON l.id = d.id_locacion
    WHERE d.id_locacion IS NOT NULL
    ORDER BY status DESC, d.id
  LOOP
    IF r.status <> 'ok' THEN
      RAISE NOTICE 'evento % | id_locacion=% | legacy=% | catalogo=% | %',
        r.id, r.id_locacion, r.legacy_destino, r.locacion_nombre, r.status;
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 7) Post counts
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  RAISE NOTICE '=== FIMBA legacy Destino → id_locacion — post counts ===';
  FOR r IN
    SELECT 'destino_line_remaining_gira12' AS k, COUNT(*)::int AS n
    FROM eventos e
    WHERE e.id_gira = 12
      AND COALESCE(e.is_deleted, false) = false
      AND e.descripcion ~* '(^|\n)Destino:\s*'
    UNION ALL
    SELECT 'sin_id_locacion_con_destino_line', COUNT(*)::int
    FROM eventos e
    WHERE e.id_gira = 12
      AND COALESCE(e.is_deleted, false) = false
      AND e.descripcion ~* '(^|\n)Destino:\s*'
      AND e.id_locacion IS NULL
    UNION ALL
    SELECT 'updated_this_run', COUNT(*)::int
    FROM _destino_events d
    JOIN _legacy_destino_map m ON m.legacy_destino = d.legacy_destino
    WHERE d.id_locacion IS NULL
  LOOP
    RAISE NOTICE '%: %', r.k, r.n;
  END LOOP;
END $$;

COMMIT;
