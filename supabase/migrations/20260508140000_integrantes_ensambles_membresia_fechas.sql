-- Membresías a ensamble por períodos (fecha_desde / fecha_hasta, tipo date).
-- PK surrogate `id`; varias filas por (id_ensamble, id_integrante) permitidas.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Corregir drift: id_ensamble no debe ser identity en una tabla puente.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'integrantes_ensambles'
      AND a.attname = 'id_ensamble'
      AND a.attidentity <> ''
  ) THEN
    EXECUTE 'ALTER TABLE public.integrantes_ensambles ALTER COLUMN id_ensamble DROP IDENTITY IF EXISTS';
  END IF;
END $$;

ALTER TABLE public.integrantes_ensambles
  ADD COLUMN IF NOT EXISTS fecha_desde date,
  ADD COLUMN IF NOT EXISTS fecha_hasta date;

UPDATE public.integrantes_ensambles ie
SET
  fecha_desde = COALESCE(i.fecha_alta, DATE '2026-01-01'),
  fecha_hasta = NULL
FROM public.integrantes i
WHERE i.id = ie.id_integrante
  AND ie.fecha_desde IS NULL;

ALTER TABLE public.integrantes_ensambles
  ALTER COLUMN fecha_desde SET NOT NULL;

ALTER TABLE public.integrantes_ensambles
  DROP CONSTRAINT IF EXISTS integrantes_ensambles_pkey;

ALTER TABLE public.integrantes_ensambles
  ADD COLUMN id bigint GENERATED ALWAYS AS IDENTITY NOT NULL;

ALTER TABLE public.integrantes_ensambles
  ADD CONSTRAINT integrantes_ensambles_pkey PRIMARY KEY (id);

CREATE INDEX IF NOT EXISTS idx_integrantes_ensambles_ensamble_integrante
  ON public.integrantes_ensambles (id_ensamble, id_integrante);

CREATE INDEX IF NOT EXISTS idx_integrantes_ensambles_integrante
  ON public.integrantes_ensambles (id_integrante);

ALTER TABLE public.integrantes_ensambles DROP CONSTRAINT IF EXISTS integrantes_ensambles_no_overlap;

-- Rangos [fecha_desde, fecha_hasta] inclusivos a nivel día: representación como daterange '[)'.
ALTER TABLE public.integrantes_ensambles
  ADD CONSTRAINT integrantes_ensambles_no_overlap EXCLUDE USING gist (
    id_ensamble WITH =,
    id_integrante WITH =,
    daterange(
      fecha_desde,
      CASE WHEN fecha_hasta IS NULL THEN 'infinity'::date ELSE fecha_hasta + 1 END,
      '[)'
    ) WITH &&
  );
