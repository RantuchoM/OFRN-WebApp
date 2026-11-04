-- Nombre libre del expediente (además de titular / nº oficial).
ALTER TABLE public.gestion_expedientes
  ADD COLUMN IF NOT EXISTS nombre text;

COMMENT ON COLUMN public.gestion_expedientes.nombre IS
  'Nombre descriptivo del expediente (editable en Gestión).';
