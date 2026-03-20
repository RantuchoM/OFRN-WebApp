-- Reemplaza es_fin_linea por control_flujo (texto).
-- Migración segura si es_fin_linea ya no existe (entornos nuevos).

ALTER TABLE public.traduccion_segments
  ADD COLUMN IF NOT EXISTS control_flujo text DEFAULT 'none';

DO $migrate$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'traduccion_segments'
      AND column_name = 'es_fin_linea'
  ) THEN
    UPDATE public.traduccion_segments
    SET control_flujo = 'line'
    WHERE es_fin_linea IS TRUE
      AND (control_flujo IS NULL OR control_flujo = 'none');
  END IF;
END
$migrate$;

ALTER TABLE public.traduccion_segments
  DROP COLUMN IF EXISTS es_fin_linea;

ALTER TABLE public.traduccion_segments
  ALTER COLUMN control_flujo SET DEFAULT 'none';

COMMENT ON COLUMN public.traduccion_segments.control_flujo IS
  'none | line | paragraph | semifrase | cesura — control visual y de agrupación en el editor.';

CREATE INDEX IF NOT EXISTS idx_segment_name_prefix
  ON public.traduccion_segments (partitura_id, segment_name);
