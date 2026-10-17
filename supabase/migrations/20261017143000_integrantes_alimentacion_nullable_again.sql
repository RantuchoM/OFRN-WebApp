-- Reversa del NOT NULL/DEFAULT: alimentación puede quedar null si no se carga;
-- el indicador de GiraRoster avisa. El backfill a Estándar de la migración previa se conserva.

ALTER TABLE public.integrantes
  ALTER COLUMN alimentacion DROP NOT NULL;

ALTER TABLE public.integrantes
  ALTER COLUMN alimentacion DROP DEFAULT;
