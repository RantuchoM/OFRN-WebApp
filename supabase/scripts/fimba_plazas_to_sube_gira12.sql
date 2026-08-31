-- FIMBA gira 12 (edición 1): migrar legado plazas anónimas → Sube nombrado.
-- Modelo: Sube (`fimba_propuesta_rutas`) = headcount artista; plazas = solo reserva técnica.
--
-- Dry-run buckets (id_gira = 12, plazas > 0):
--   CASE_A              : 1 tag + transport tipo + plazas ≤ tope + sin Sube → INSERT Sube + plazas=0
--   OK_ZERO_PLAZAS      : plazas == Σ Sube → plazas=0 (evita residual doble)
--   SKIP_NON_TRANSPORT  : Concierto/etc. con plazas (no generan residual sintético) → plazas=0 sin Sube
--   CASE_C_NO_TAG       : plazas sin tag → NO tocar (manual)
--   CASE_B_MULTI        : multi-tag → NO tocar (manual; no hubo en gira 12)
--
-- Aplicar: npx supabase db query --linked -f supabase/scripts/fimba_plazas_to_sube_gira12.sql
-- (o MCP execute_sql). No es migración de schema.

BEGIN;

CREATE TEMP TABLE _fimba_mig_targets ON COMMIT DROP AS
WITH tagged AS (
  SELECT
    e.id AS id_evento,
    e.fecha,
    e.hora_inicio,
    e.id_tipo_evento,
    te.id_categoria,
    (e.id_tipo_evento IN (11, 12, 28, 31, 35) OR te.id_categoria = 6) AS is_transport,
    fet.id_gira_transporte,
    fet.plazas,
    COUNT(DISTINCT efp.id_propuesta)::int AS n_tags,
    MIN(p.id) AS id_propuesta,
    (
      SELECT p2.cantidad_planificada + COALESCE(p2.plazas_extra_materiales, 0)
      FROM eventos_fimba_propuestas efp2
      JOIN fimba_propuestas p2 ON p2.id = efp2.id_propuesta
      WHERE efp2.id_evento = e.id
      LIMIT 1
    )::int AS tope
  FROM eventos e
  JOIN fimba_evento_transportes fet ON fet.id_evento = e.id
  LEFT JOIN tipos_evento te ON te.id = e.id_tipo_evento
  LEFT JOIN eventos_fimba_propuestas efp ON efp.id_evento = e.id
  LEFT JOIN fimba_propuestas p ON p.id = efp.id_propuesta
  WHERE e.id_gira = 12
    AND fet.plazas > 0
    AND COALESCE(e.is_deleted, false) = false
  GROUP BY
    e.id, e.fecha, e.hora_inicio, e.id_tipo_evento, te.id_categoria,
    fet.id_gira_transporte, fet.plazas
),
sube AS (
  SELECT
    id_evento_subida AS id_evento,
    id_gira_transporte,
    COALESCE(SUM(plazas), 0)::int AS sum_sube
  FROM fimba_propuesta_rutas
  WHERE id_evento_subida IS NOT NULL
  GROUP BY 1, 2
),
classified AS (
  SELECT
    t.*,
    COALESCE(s.sum_sube, 0) AS sum_sube,
    CASE
      WHEN COALESCE(s.sum_sube, 0) > 0
        AND t.plazas = COALESCE(s.sum_sube, 0) THEN 'OK_ZERO_PLAZAS'
      WHEN COALESCE(s.sum_sube, 0) > 0
        AND t.plazas > COALESCE(s.sum_sube, 0) THEN 'OK_KEEP_RESIDUAL'
      WHEN COALESCE(s.sum_sube, 0) > 0 THEN 'HAS_SUBE_OTHER'
      WHEN t.n_tags = 1
        AND t.is_transport
        AND t.plazas <= COALESCE(t.tope, 0)
        AND COALESCE(t.tope, 0) > 0 THEN 'CASE_A'
      WHEN t.n_tags = 1
        AND t.is_transport
        AND t.plazas > COALESCE(t.tope, 0)
        AND COALESCE(t.tope, 0) > 0 THEN 'CASE_A_RESIDUAL'
      WHEN t.n_tags = 1
        AND NOT t.is_transport THEN 'SKIP_NON_TRANSPORT'
      WHEN t.n_tags > 1 THEN 'CASE_B_MULTI'
      WHEN t.n_tags = 0 THEN 'CASE_C_NO_TAG'
      ELSE 'CASE_C_AMBIG'
    END AS bucket
  FROM tagged t
  LEFT JOIN sube s
    ON s.id_evento = t.id_evento
   AND s.id_gira_transporte = t.id_gira_transporte
),
-- Siguiente parada del mismo vehículo (timeline simple por flota FIMBA).
vehicle_stops AS (
  SELECT DISTINCT
    e.id,
    e.fecha,
    e.hora_inicio,
    fet.id_gira_transporte
  FROM eventos e
  JOIN fimba_evento_transportes fet ON fet.id_evento = e.id
  WHERE e.id_gira = 12
    AND COALESCE(e.is_deleted, false) = false
),
with_next AS (
  SELECT
    c.*,
    (
      SELECT vs.id
      FROM vehicle_stops vs
      WHERE vs.id_gira_transporte = c.id_gira_transporte
        AND (
          vs.fecha > c.fecha
          OR (
            vs.fecha = c.fecha
            AND COALESCE(vs.hora_inicio, '00:00') > COALESCE(c.hora_inicio, '00:00')
          )
          OR (
            vs.fecha = c.fecha
            AND COALESCE(vs.hora_inicio, '00:00') = COALESCE(c.hora_inicio, '00:00')
            AND vs.id > c.id_evento
          )
        )
      ORDER BY vs.fecha, COALESCE(vs.hora_inicio, '00:00'), vs.id
      LIMIT 1
    ) AS id_evento_bajada_next
  FROM classified c
)
SELECT
  bucket,
  id_evento,
  id_gira_transporte,
  id_propuesta,
  plazas,
  tope,
  sum_sube,
  id_evento_bajada_next,
  CASE
    WHEN bucket = 'CASE_A' THEN LEAST(plazas, tope)
    WHEN bucket = 'CASE_A_RESIDUAL' THEN tope
    ELSE NULL
  END AS sube_cantidad,
  CASE
    WHEN bucket IN ('CASE_A', 'CASE_A_RESIDUAL') THEN GREATEST(0, plazas - LEAST(plazas, tope))
    WHEN bucket IN ('OK_ZERO_PLAZAS', 'SKIP_NON_TRANSPORT') THEN 0
    ELSE plazas
  END AS plazas_after
FROM with_next;

-- Preview counts (visible in client notices / return)
DO $$
DECLARE
  r record;
BEGIN
  RAISE NOTICE '=== FIMBA plazas→Sube dry targets (gira 12) ===';
  FOR r IN
    SELECT bucket, COUNT(*) AS n, COALESCE(SUM(plazas), 0) AS plazas_sum
    FROM _fimba_mig_targets
    GROUP BY bucket
    ORDER BY bucket
  LOOP
    RAISE NOTICE '%: % rows, plazas_sum=%', r.bucket, r.n, r.plazas_sum;
  END LOOP;
END $$;

-- 1) Case A (+ A residual): INSERT Sube nombrado
INSERT INTO public.fimba_propuesta_rutas (
  id_propuesta,
  id_gira_transporte,
  plazas,
  id_evento_subida,
  id_evento_bajada
)
SELECT
  t.id_propuesta,
  t.id_gira_transporte,
  t.sube_cantidad,
  t.id_evento,
  t.id_evento_bajada_next
FROM _fimba_mig_targets t
WHERE t.bucket IN ('CASE_A', 'CASE_A_RESIDUAL')
  AND t.id_propuesta IS NOT NULL
  AND t.sube_cantidad > 0
  AND NOT EXISTS (
    SELECT 1
    FROM fimba_propuesta_rutas r
    WHERE r.id_propuesta = t.id_propuesta
      AND r.id_gira_transporte = t.id_gira_transporte
      AND r.id_evento_subida = t.id_evento
  );

-- 2) Zero / residual plazas for applied + OK + non-transport cleanup
UPDATE public.fimba_evento_transportes fet
SET plazas = t.plazas_after
FROM _fimba_mig_targets t
WHERE fet.id_evento = t.id_evento
  AND fet.id_gira_transporte = t.id_gira_transporte
  AND t.bucket IN (
    'CASE_A',
    'CASE_A_RESIDUAL',
    'OK_ZERO_PLAZAS',
    'SKIP_NON_TRANSPORT'
  );

COMMIT;

-- Verify 3910 (Ruggiero × 4)
-- SELECT * FROM fimba_propuesta_rutas WHERE id_evento_subida = 3910;
-- SELECT * FROM fimba_evento_transportes WHERE id_evento = 3910;
