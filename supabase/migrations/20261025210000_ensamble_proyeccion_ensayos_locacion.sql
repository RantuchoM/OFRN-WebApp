-- Plantilla de ensayos: localidad (ciudad) → locación (sede / venue).

DROP INDEX IF EXISTS public.ensamble_proyeccion_ensayos_uniq;

ALTER TABLE public.ensamble_proyeccion_ensayos
  ADD COLUMN IF NOT EXISTS id_locacion bigint
    REFERENCES public.locaciones (id) ON DELETE SET NULL;

-- Vaciar seed previo (era id_localidad = casa del ensamble) y volver a cargar
-- desde eventos.id_locacion de la semana modelo.
TRUNCATE public.ensamble_proyeccion_ensayos RESTART IDENTITY;

ALTER TABLE public.ensamble_proyeccion_ensayos
  DROP COLUMN IF EXISTS id_localidad;

CREATE UNIQUE INDEX IF NOT EXISTS ensamble_proyeccion_ensayos_uniq
  ON public.ensamble_proyeccion_ensayos (
    id_ensamble,
    iso_dow,
    hora_inicio,
    hora_fin,
    (COALESCE(id_locacion, 0))
  );

COMMENT ON TABLE public.ensamble_proyeccion_ensayos IS
  'Plantilla semanal de ensayos (iso_dow 1=lunes…7=domingo; id_locacion = sede) para proyección PCV/prestaciones.';

COMMENT ON COLUMN public.ensamble_proyeccion_ensayos.id_locacion IS
  'Locación (sede) del ensayo → locaciones.id. Seed: eventos.id_locacion de la semana modelo oct/2026.';

INSERT INTO public.ensamble_proyeccion_ensayos (
  id_ensamble,
  iso_dow,
  hora_inicio,
  hora_fin,
  id_locacion,
  titulo,
  activo
)
SELECT DISTINCT
  ee.id_ensamble,
  EXTRACT(ISODOW FROM e.fecha::timestamp)::smallint AS iso_dow,
  e.hora_inicio::time,
  e.hora_fin::time,
  e.id_locacion,
  NULLIF(TRIM(e.descripcion), ''),
  true
FROM public.eventos e
JOIN public.eventos_ensambles ee ON ee.id_evento = e.id
WHERE e.id_tipo_evento = 13
  AND COALESCE(e.is_deleted, false) = false
  AND e.fecha >= DATE '2026-10-26'
  AND e.fecha <= DATE '2026-11-01'
  AND e.hora_inicio IS NOT NULL
  AND e.hora_fin IS NOT NULL
  AND e.hora_fin::time > e.hora_inicio::time
  AND NOT EXISTS (
    SELECT 1
    FROM public.ensamble_proyeccion_ensayos x
    WHERE x.id_ensamble = ee.id_ensamble
      AND x.iso_dow = EXTRACT(ISODOW FROM e.fecha::timestamp)::smallint
      AND x.hora_inicio = e.hora_inicio::time
      AND x.hora_fin = e.hora_fin::time
      AND COALESCE(x.id_locacion, 0) = COALESCE(e.id_locacion, 0)
  );
