-- Motivo opcional (alta manual / ausencia) en convocatoria por gira + marca temporal de última edición.
ALTER TABLE public.giras_integrantes
  ADD COLUMN IF NOT EXISTS motivo_estado text,
  ADD COLUMN IF NOT EXISTS motivo_estado_actualizado_at timestamp with time zone;

COMMENT ON COLUMN public.giras_integrantes.motivo_estado IS 'Nota interna: motivo de alta manual o de marcado ausente / convocatoria.';
COMMENT ON COLUMN public.giras_integrantes.motivo_estado_actualizado_at IS 'Última vez que se editó motivo_estado (desde la app).';
