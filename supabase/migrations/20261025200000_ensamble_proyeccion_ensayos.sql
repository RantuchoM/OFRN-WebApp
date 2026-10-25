-- Plantilla semanal de ensayos por ensamble (proyección prestaciones / informe).
-- Slots editables; se proyectan lun 01/02 … lun 13/12 del año de proyección.

CREATE TABLE IF NOT EXISTS public.ensamble_proyeccion_ensayos (
  id bigserial PRIMARY KEY,
  id_ensamble bigint NOT NULL REFERENCES public.ensambles (id) ON DELETE CASCADE,
  iso_dow smallint NOT NULL CHECK (iso_dow BETWEEN 1 AND 7),
  hora_inicio time NOT NULL,
  hora_fin time NOT NULL,
  id_localidad bigint REFERENCES public.localidades (id) ON DELETE SET NULL,
  titulo text,
  activo boolean NOT NULL DEFAULT true,
  CONSTRAINT ensamble_proyeccion_ensayos_horas_chk CHECK (hora_fin > hora_inicio)
);

-- COALESCE: UNIQUE trata NULL como distinto; unificamos “sin localidad” = 0.
CREATE UNIQUE INDEX IF NOT EXISTS ensamble_proyeccion_ensayos_uniq
  ON public.ensamble_proyeccion_ensayos (
    id_ensamble,
    iso_dow,
    hora_inicio,
    hora_fin,
    (COALESCE(id_localidad, 0))
  );

CREATE INDEX IF NOT EXISTS ensamble_proyeccion_ensayos_ensamble_idx
  ON public.ensamble_proyeccion_ensayos (id_ensamble)
  WHERE activo = true;

COMMENT ON TABLE public.ensamble_proyeccion_ensayos IS
  'Plantilla semanal de ensayos (iso_dow 1=lunes…7=domingo; id_localidad = localidad del ensayo) para proyección PCV/prestaciones; precarga desde semana modelo oct/2026.';

COMMENT ON COLUMN public.ensamble_proyeccion_ensayos.id_localidad IS
  'Localidad del ensayo (tabla localidades). En el seed: casa del ensamble (ensambles.id_localidad), porque eventos no tiene id_localidad.';

-- Seed desde eventos tipo 13 (Ensayo Ensamble) 2026-10-26 … 2026-11-01.
-- id_localidad = localidad (casa del ensamble; eventos no tiene id_localidad).
-- Multi-ensamble: una fila por ensamble del vínculo.
INSERT INTO public.ensamble_proyeccion_ensayos (
  id_ensamble,
  iso_dow,
  hora_inicio,
  hora_fin,
  id_localidad,
  titulo,
  activo
)
SELECT DISTINCT
  ee.id_ensamble,
  EXTRACT(ISODOW FROM e.fecha::timestamp)::smallint AS iso_dow,
  e.hora_inicio::time,
  e.hora_fin::time,
  ens.id_localidad,
  NULLIF(TRIM(e.descripcion), ''),
  true
FROM public.eventos e
JOIN public.eventos_ensambles ee ON ee.id_evento = e.id
JOIN public.ensambles ens ON ens.id = ee.id_ensamble
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
      AND COALESCE(x.id_localidad, 0) = COALESCE(ens.id_localidad, 0)
  );
