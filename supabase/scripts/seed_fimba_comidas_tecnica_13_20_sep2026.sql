-- =============================================================================
-- Seed: Almuerzo / Cena Técnica (OFRN) — FIMBA gira 12 — 13–20 Sep 2026
-- =============================================================================
-- STATUS: PREPARED ONLY — DO NOT RUN until user confirms.
--
-- IDs descubiertos (proyecto linked OFRN / muxrbuivopnawnxlcjxq):
--   id_gira              = 12  (programas.nombre_gira = 'FIMBA')
--   fimba_ediciones      = id 1 «FIMBA 2026» → id_gira 12
--   id_grupo             = 7   (giras_grupos.nombre = 'Técnica (OFRN)')
--   id_tipo_evento       = 8   Almuerzo  (categorías_tipos_eventos = Comidas / 4)
--   id_tipo_evento       = 10  Cena      (categorías_tipos_eventos = Comidas / 4)
--   id_locacion          = 170 (locaciones.nombre = 'Hotel Flamingo')
--
-- Fechas:
--   Usuario: 13–20 Sep 2026 inclusive (8 días × 2 = 16 eventos).
--   Nota: programas.fecha_desde/hasta de gira 12 = 2026-09-16 … 2026-09-20;
--   se respetan las fechas pedidas (incluye 13–15 fuera del rango formal de gira).
--
-- Patrón MealsManager / comidas OFRN por grupo (paridad con Almuerzo Crimson etc.):
--   - descripcion        = 'Almuerzo Técnica' / 'Cena Técnica'
--   - hora_inicio        = 12:30 / 21:30 ; hora_fin = NULL
--   - convocados         = {}  (eje vacío; filtro OFRN vía eventos_grupos)
--   - audiencia_ofrn     = 'grupos'
--   - visible_agenda     = true ; tecnica = false ; is_deleted = false
--   - eventos_grupos     → id_grupo 7
--
-- Cómo aplicar más tarde (linked remoto):
--   npx supabase db query --linked -f supabase/scripts/seed_fimba_comidas_tecnica_13_20_sep2026.sql
--
-- Idempotencia: no inserta si ya existe el mismo (id_gira, fecha, hora_inicio,
-- id_tipo_evento, descripcion) no borrado, ya vinculado al grupo 7.
-- =============================================================================

BEGIN;

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
to_insert AS (
  SELECT s.*
  FROM slots s
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.eventos e
    JOIN public.eventos_grupos eg ON eg.id_evento = e.id AND eg.id_grupo = 7
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
    170,                         -- Hotel Flamingo
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
  RETURNING id, fecha, hora_inicio, descripcion, id_tipo_evento
)
INSERT INTO public.eventos_grupos (id_evento, id_grupo)
SELECT ins.id, 7
FROM ins
ON CONFLICT DO NOTHING;

COMMIT;

-- Verificación (correr aparte tras aplicar):
-- SELECT e.id, e.fecha, e.hora_inicio, e.descripcion, e.id_locacion, l.nombre AS locacion,
--        e.audiencia_ofrn, e.convocados, eg.id_grupo, gg.nombre AS grupo
-- FROM eventos e
-- JOIN eventos_grupos eg ON eg.id_evento = e.id
-- JOIN giras_grupos gg ON gg.id = eg.id_grupo
-- LEFT JOIN locaciones l ON l.id = e.id_locacion
-- WHERE e.id_gira = 12
--   AND eg.id_grupo = 7
--   AND e.fecha BETWEEN '2026-09-13' AND '2026-09-20'
--   AND e.id_tipo_evento IN (8, 10)
--   AND COALESCE(e.is_deleted, false) = false
-- ORDER BY e.fecha, e.hora_inicio;
