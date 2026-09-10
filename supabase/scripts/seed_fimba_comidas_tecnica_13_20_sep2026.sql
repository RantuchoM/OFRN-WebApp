-- =============================================================================
-- Seed: Almuerzo / Cena Técnica (OFRN) — FIMBA gira 12 — 13–20 Sep 2026
-- =============================================================================
-- IDs (proyecto linked OFRN / muxrbuivopnawnxlcjxq):
--   id_gira              = 12  (programas.nombre_gira = 'FIMBA')
--   fimba_ediciones      = id 1 «FIMBA 2026» → id_gira 12
--   id_grupo             = 7   (giras_grupos.nombre = 'Técnica (OFRN)')
--   id_tipo_evento       = 8   Almuerzo  (categorías_tipos_eventos = Comidas / 4)
--   id_tipo_evento       = 10  Cena      (categorías_tipos_eventos = Comidas / 4)
--   id_locacion          = 82  (locaciones.nombre = 'Breogan')  — verified linked
--
-- Fechas:
--   Usuario: 13–20 Sep 2026 inclusive (8 días × 2 = 16 eventos).
--   Nota: programas.fecha_desde/hasta de gira 12 = 2026-09-16 … 2026-09-20;
--   se respetan las fechas pedidas (incluye 13–15 fuera del rango formal de gira).
--
-- Patrón MealsManager / comidas OFRN por grupo:
--   - descripcion        = 'Almuerzo Técnica' / 'Cena Técnica'
--   - hora_inicio        = 12:30 / 21:30 ; hora_fin = NULL
--   - convocados         = {}  (eje vacío; filtro OFRN vía eventos_grupos)
--   - audiencia_ofrn     = 'grupos'
--   - visible_agenda     = true ; tecnica = false ; is_deleted = false
--   - eventos_grupos     → id_grupo 7 «Técnica (OFRN)»
--
-- Aplicar (linked remoto):
--   npx supabase db query --linked -f supabase/scripts/seed_fimba_comidas_tecnica_13_20_sep2026.sql
--
-- Idempotencia (re-run safe):
--   1) UPDATE locación/campos de comidas Técnica ya existentes (13–20) → Breogan
--   2) INSERT solo slots faltantes
--   3) UPSERT eventos_grupos → grupo 7 en las 16 comidas
-- =============================================================================

BEGIN;

-- 1) Corregir / alinear comidas Técnica ya insertadas (p.ej. Hotel Flamingo → Breogan)
UPDATE public.eventos e
SET
  id_locacion = 82,
  hora_fin = NULL,
  convocados = '{}'::text[],
  audiencia_ofrn = 'grupos',
  visible_agenda = true,
  tecnica = false,
  is_deleted = false
WHERE e.id_gira = 12
  AND e.fecha BETWEEN DATE '2026-09-13' AND DATE '2026-09-20'
  AND e.id_tipo_evento IN (8, 10)
  AND e.descripcion IN ('Almuerzo Técnica', 'Cena Técnica')
  AND COALESCE(e.is_deleted, false) = false;

WITH days AS (
  SELECT d::date AS fecha
  FROM generate_series(DATE '2026-09-13', DATE '2026-09-20', INTERVAL '1 day') AS d
),
slots AS (
  SELECT
    days.fecha,
    v.descripcion,
    v.id_tipo_evento,
    v.hora_inicio::time AS hora_inicio
  FROM days
  CROSS JOIN (
    VALUES
      ('Almuerzo Técnica', 8::bigint,  '12:30:00'),
      ('Cena Técnica',     10::bigint, '21:30:00')
  ) AS v(descripcion, id_tipo_evento, hora_inicio)
),
-- 2) Insertar solo slots que aún no existen (match por gira/fecha/hora/tipo/descripcion)
to_insert AS (
  SELECT s.*
  FROM slots s
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.eventos e
    WHERE e.id_gira = 12
      AND e.fecha = s.fecha
      AND e.hora_inicio = s.hora_inicio
      AND e.id_tipo_evento = s.id_tipo_evento
      AND e.descripcion = s.descripcion
      AND COALESCE(e.is_deleted, false) = false
  )
),
ins AS (
  INSERT INTO public.eventos (
    id_gira,
    id_tipo_evento,
    id_locacion,
    fecha,
    hora_inicio,
    hora_fin,
    descripcion,
    convocados,
    audiencia_ofrn,
    visible_agenda,
    tecnica,
    is_deleted
  )
  SELECT
    12,
    t.id_tipo_evento,
    82,                          -- Breogan
    t.fecha,
    t.hora_inicio,
    NULL,
    t.descripcion,
    '{}'::text[],
    'grupos',
    true,
    false,
    false
  FROM to_insert t
  RETURNING id
),
-- 3) Asegurar tag grupo Técnica (OFRN) = 7 en todas las 16 comidas (existentes + nuevas)
all_meals AS (
  SELECT e.id
  FROM public.eventos e
  WHERE e.id_gira = 12
    AND e.fecha BETWEEN DATE '2026-09-13' AND DATE '2026-09-20'
    AND e.id_tipo_evento IN (8, 10)
    AND e.descripcion IN ('Almuerzo Técnica', 'Cena Técnica')
    AND COALESCE(e.is_deleted, false) = false
  UNION
  SELECT ins.id FROM ins
)
INSERT INTO public.eventos_grupos (id_evento, id_grupo)
SELECT am.id, 7
FROM all_meals am
ON CONFLICT (id_evento, id_grupo) DO NOTHING;

COMMIT;
