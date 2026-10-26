-- Proyección sin hardcodes:
-- 1) ensambles.es_ensamble_local (dominio: informes / convocatoria / proyección)
-- 2) ensamble_proyeccion_config (tramos + servicios_por_gira por año)
-- 3) localidades.alias (nombre corto para informes)

-- ---------------------------------------------------------------------------
-- ensambles.es_ensamble_local
-- ---------------------------------------------------------------------------
ALTER TABLE public.ensambles
  ADD COLUMN IF NOT EXISTS es_ensamble_local boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.ensambles.es_ensamble_local IS
  'True = ensamble local/regional (informes, convocatoria, proyección). False = CF, Jazz Band, Prod., Prueba, etc.';

UPDATE public.ensambles
SET es_ensamble_local = false
WHERE
  upper(trim(ensamble)) LIKE 'CF%'
  OR lower(
    translate(
      trim(ensamble),
      'ÁÉÍÓÚÜÑáéíóúüñ',
      'AEIOUUNaeiouun'
    )
  ) IN ('jazz band', 'prod', 'prod.', 'produccion', 'prueba');

-- ---------------------------------------------------------------------------
-- ensamble_proyeccion_config
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ensamble_proyeccion_config (
  anio smallint NOT NULL,
  servicios_por_gira numeric(6, 2) NOT NULL DEFAULT 7,
  tramos jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ensamble_proyeccion_config_pkey PRIMARY KEY (anio),
  CONSTRAINT ensamble_proyeccion_config_servicios_chk CHECK (servicios_por_gira >= 0)
);

COMMENT ON TABLE public.ensamble_proyeccion_config IS
  'Config anual de proyección de prestaciones: servicios estimados por gira y tramos (lunes desde/hasta) de ensayos.';

COMMENT ON COLUMN public.ensamble_proyeccion_config.tramos IS
  'Array JSON: [{ "desde": "YYYY-MM-DD", "hasta": "YYYY-MM-DD", "nota": "opcional" }]. desde/hasta = lunes inclusivos.';

INSERT INTO public.ensamble_proyeccion_config (anio, servicios_por_gira, tramos)
VALUES (
  2027,
  7,
  '[
    {"desde":"2027-02-01","hasta":"2027-12-13","nota":null}
  ]'::jsonb
)
ON CONFLICT (anio) DO NOTHING;

-- ---------------------------------------------------------------------------
-- localidades.alias
-- ---------------------------------------------------------------------------
ALTER TABLE public.localidades
  ADD COLUMN IF NOT EXISTS alias text;

COMMENT ON COLUMN public.localidades.alias IS
  'Nombre corto para informes densos (p. ej. Bariloche, SAO, Regina).';

UPDATE public.localidades SET alias = 'Bariloche'
WHERE localidad = 'San Carlos de Bariloche' AND (alias IS NULL OR alias = '');

UPDATE public.localidades SET alias = 'SAO'
WHERE localidad = 'San Antonio Oeste' AND (alias IS NULL OR alias = '');

UPDATE public.localidades SET alias = 'Regina'
WHERE localidad = 'Villa Regina' AND (alias IS NULL OR alias = '');
