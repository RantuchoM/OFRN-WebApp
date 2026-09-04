-- Nombre y apellido de preferencia para seating e informes de seating.
-- El nombre/apellido legal (columnas existentes) se mantiene para transporte y documentos.

ALTER TABLE public.integrantes
  ADD COLUMN IF NOT EXISTS nombre_preferencia text,
  ADD COLUMN IF NOT EXISTS apellido_preferencia text;

COMMENT ON COLUMN public.integrantes.nombre_preferencia IS
  'Nombre de uso en seating e informes de seating. Si está vacío, se usa el nombre legal.';

COMMENT ON COLUMN public.integrantes.apellido_preferencia IS
  'Apellido de uso en seating e informes de seating. Si está vacío, se usa el apellido legal.';
