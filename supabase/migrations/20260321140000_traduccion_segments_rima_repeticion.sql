-- Análisis poético: esquema de rima (A–F) y marcas de repetición (R1–R4)

ALTER TABLE public.traduccion_segments
  ADD COLUMN IF NOT EXISTS rima text,
  ADD COLUMN IF NOT EXISTS repeticion text;

COMMENT ON COLUMN public.traduccion_segments.rima IS 'Esquema de rima por segmento: A–F (TEXT).';
COMMENT ON COLUMN public.traduccion_segments.repeticion IS 'Marca de repetición: R1–R4 (TEXT).';
