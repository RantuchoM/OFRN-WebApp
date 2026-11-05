-- Marca de reemisión in-place (sin historial de versiones).
ALTER TABLE public.constancias_solicitudes
  ADD COLUMN IF NOT EXISTS reemitida_at timestamptz;

COMMENT ON COLUMN public.constancias_solicitudes.reemitida_at IS
  'Última vez que se reemitió una constancia aprobada (fechas/rol editados + PDF/mail nuevo).';
