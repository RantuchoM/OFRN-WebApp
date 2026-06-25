-- Ausente que abona reemplazo: cuenta como servicio en resumen anual y matriz de convocatorias.
ALTER TABLE public.giras_integrantes
  ADD COLUMN IF NOT EXISTS abona_reemplazo boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.giras_integrantes.abona_reemplazo IS
  'Si true y estado=ausente: no participa en logística/roster activo pero cuenta como convocado en totales de servicios (marca R en matriz).';
