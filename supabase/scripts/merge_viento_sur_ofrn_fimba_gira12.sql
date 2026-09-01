-- Gira 12 / FIMBA edición 1: unificar grupos OFRN y migrar artista FIMBA duplicado.
--
-- Contexto (linked, 2026-09-01):
--   giras_grupos Atlas (OFRN)  id=4  → merge → Viento Sur id=5 (canónico)
--   fimba_propuestas Viento Sur id=19 → eventos pasan a eventos_grupos (grupo 5)
--
-- Dry-run previo:
--   eventos_grupos: Atlas=1 (3986), Viento Sur=2 (3986,4082) — 3986 tenía ambos
--   giras_grupos_integrantes: 6+6 mismos integrantes (duplicados)
--   eventos_fimba_propuestas propuesta 19: 5 eventos (3986,4082,4228,4229,4230)
--   fimba_propuesta_rutas/participantes/contrataciones/habitaciones: 0
--
-- Aplicar: npx supabase db query --linked -f supabase/scripts/merge_viento_sur_ofrn_fimba_gira12.sql

BEGIN;

-- ---------------------------------------------------------------------------
-- 0) Constantes (gira 12, edición 1)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_id_gira constant bigint := 12;
  v_id_grupo_atlas constant bigint := 4;
  v_id_grupo_viento_sur constant bigint := 5;
  v_id_propuesta_fimba constant bigint := 19;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM giras_grupos
    WHERE id = v_id_grupo_viento_sur AND id_gira = v_id_gira AND nombre = 'Viento Sur'
  ) THEN
    RAISE EXCEPTION 'Canonical group Viento Sur (id=%) not found on gira %', v_id_grupo_viento_sur, v_id_gira;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM giras_grupos
    WHERE id = v_id_grupo_atlas AND id_gira = v_id_gira AND nombre = 'Atlas (OFRN)'
  ) THEN
    RAISE EXCEPTION 'Source group Atlas (OFRN) (id=%) not found on gira %', v_id_grupo_atlas, v_id_gira;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM fimba_propuestas
    WHERE id = v_id_propuesta_fimba AND id_edicion = 1 AND nombre = 'Viento Sur'
  ) THEN
    RAISE EXCEPTION 'FIMBA propuesta Viento Sur (id=%) not found on edición 1', v_id_propuesta_fimba;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1) Preview counts
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  RAISE NOTICE '=== merge Viento Sur — pre counts ===';
  FOR r IN
    SELECT 'eventos_grupos_atlas' AS k, COUNT(*)::int AS n FROM eventos_grupos WHERE id_grupo = 4
    UNION ALL SELECT 'eventos_grupos_viento_sur', COUNT(*)::int FROM eventos_grupos WHERE id_grupo = 5
    UNION ALL SELECT 'giras_grupos_integrantes_atlas', COUNT(*)::int FROM giras_grupos_integrantes WHERE id_grupo = 4
    UNION ALL SELECT 'giras_grupos_integrantes_viento_sur', COUNT(*)::int FROM giras_grupos_integrantes WHERE id_grupo = 5
    UNION ALL SELECT 'eventos_fimba_propuestas_19', COUNT(*)::int FROM eventos_fimba_propuestas WHERE id_propuesta = 19
  LOOP
    RAISE NOTICE '%: %', r.k, r.n;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 2) FIMBA → OFRN: eventos taggeados a propuesta 19 → grupo Viento Sur (5)
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE _fimba_vs_events ON COMMIT DROP AS
SELECT DISTINCT efp.id_evento
FROM eventos_fimba_propuestas efp
JOIN eventos e ON e.id = efp.id_evento
WHERE efp.id_propuesta = 19
  AND e.id_gira = 12
  AND COALESCE(e.is_deleted, false) = false;

INSERT INTO public.eventos_grupos (id_evento, id_grupo)
SELECT t.id_evento, 5
FROM _fimba_vs_events t
WHERE NOT EXISTS (
  SELECT 1 FROM eventos_grupos eg
  WHERE eg.id_evento = t.id_evento AND eg.id_grupo = 5
);

UPDATE public.eventos e
SET audiencia_ofrn = 'grupos'
FROM _fimba_vs_events t
WHERE e.id = t.id_evento
  AND COALESCE(e.audiencia_ofrn, 'none') <> 'grupos';

DELETE FROM public.eventos_fimba_propuestas
WHERE id_propuesta = 19;

DELETE FROM public.fimba_propuestas
WHERE id = 19;

-- ---------------------------------------------------------------------------
-- 3) Merge Atlas (OFRN) → Viento Sur: reasignar refs y eliminar duplicado
-- ---------------------------------------------------------------------------
-- eventos_grupos: mover Atlas→Viento Sur evitando duplicados
INSERT INTO public.eventos_grupos (id_evento, id_grupo)
SELECT eg.id_evento, 5
FROM eventos_grupos eg
WHERE eg.id_grupo = 4
  AND NOT EXISTS (
    SELECT 1 FROM eventos_grupos eg2
    WHERE eg2.id_evento = eg.id_evento AND eg2.id_grupo = 5
  );

DELETE FROM public.eventos_grupos WHERE id_grupo = 4;

-- roster: integrantes ya están en Viento Sur (mismos ids); solo limpiar Atlas
DELETE FROM public.giras_grupos_integrantes WHERE id_grupo = 4;

-- repertorio / transportes grupos (vacíos en dry-run; idempotente)
UPDATE public.programas_repertorios_grupos SET id_grupo = 5 WHERE id_grupo = 4
  AND NOT EXISTS (
    SELECT 1 FROM programas_repertorios_grupos prg2
    WHERE prg2.id_repertorio = programas_repertorios_grupos.id_repertorio
      AND prg2.id_grupo = 5
  );
DELETE FROM public.programas_repertorios_grupos WHERE id_grupo = 4;

UPDATE public.giras_transportes_grupos SET id_grupo = 5 WHERE id_grupo = 4
  AND NOT EXISTS (
    SELECT 1 FROM giras_transportes_grupos gtg2
    WHERE gtg2.id_gira_transporte = giras_transportes_grupos.id_gira_transporte
      AND gtg2.id_grupo = 5
  );
DELETE FROM public.giras_transportes_grupos WHERE id_grupo = 4;

DELETE FROM public.giras_grupos WHERE id = 4 AND id_gira = 12;

-- Eventos que quedaron solo con grupo 5 deben tener audiencia grupos
UPDATE public.eventos e
SET audiencia_ofrn = 'grupos'
WHERE e.id_gira = 12
  AND EXISTS (SELECT 1 FROM eventos_grupos eg WHERE eg.id_evento = e.id AND eg.id_grupo = 5)
  AND COALESCE(e.audiencia_ofrn, 'none') = 'none';

-- ---------------------------------------------------------------------------
-- 4) Post counts
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  RAISE NOTICE '=== merge Viento Sur — post counts ===';
  FOR r IN
    SELECT 'giras_grupos_atlas' AS k, COUNT(*)::int AS n FROM giras_grupos WHERE id = 4
    UNION ALL SELECT 'giras_grupos_viento_sur', COUNT(*)::int FROM giras_grupos WHERE id = 5
    UNION ALL SELECT 'eventos_grupos_viento_sur', COUNT(*)::int FROM eventos_grupos WHERE id_grupo = 5
    UNION ALL SELECT 'eventos_fimba_propuestas_19', COUNT(*)::int FROM eventos_fimba_propuestas WHERE id_propuesta = 19
    UNION ALL SELECT 'fimba_propuestas_19', COUNT(*)::int FROM fimba_propuestas WHERE id = 19
  LOOP
    RAISE NOTICE '%: %', r.k, r.n;
  END LOOP;
END $$;

COMMIT;

-- Verify (manual):
-- SELECT id, nombre FROM giras_grupos WHERE id_gira = 12 AND nombre ILIKE '%viento%' OR nombre ILIKE '%atlas%';
-- SELECT e.id, e.descripcion, e.audiencia_ofrn, array_agg(eg.id_grupo) grupos
-- FROM eventos e LEFT JOIN eventos_grupos eg ON eg.id_evento = e.id
-- WHERE e.id IN (3986,4082,4228,4229,4230) GROUP BY e.id;
