-- Ejecutar en Supabase SQL Editor si no usás migraciones por CLI.
-- Idempotente: no falla si la columna ya existe (Postgres 9.1+ IF NOT EXISTS en ADD COLUMN).

ALTER TABLE public.traduccion_segments
  ADD COLUMN IF NOT EXISTS es_fin_linea boolean DEFAULT false;

ALTER TABLE public.traduccion_segments
  ADD COLUMN IF NOT EXISTS segment_english text;

COMMENT ON COLUMN public.traduccion_segments.es_fin_linea IS 'En vista estructura: tras Enter, fuerza salto de línea visual entre bloques.';
