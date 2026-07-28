-- Ausente en licencia: cuenta como servicio en resumen anual y matriz de convocatorias.
-- Mutuamente excluyente con abona_reemplazo.
ALTER TABLE public.giras_integrantes
  ADD COLUMN IF NOT EXISTS abona_licencia boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.giras_integrantes.abona_licencia IS
  'Si true y estado=ausente: no participa en logística/roster activo pero cuenta como convocado en totales de servicios (marca L en matriz). Mutuamente excluyente con abona_reemplazo.';

ALTER TABLE public.giras_integrantes
  DROP CONSTRAINT IF EXISTS giras_integrantes_abona_reemplazo_licencia_excl;

ALTER TABLE public.giras_integrantes
  ADD CONSTRAINT giras_integrantes_abona_reemplazo_licencia_excl
  CHECK (NOT (abona_reemplazo AND abona_licencia));
