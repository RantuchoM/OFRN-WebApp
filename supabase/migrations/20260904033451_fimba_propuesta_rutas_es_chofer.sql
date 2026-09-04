-- Chofer: plazas a bordo que no consumen cupo del vehículo (en_transito / libres).
ALTER TABLE public.fimba_propuesta_rutas
  ADD COLUMN IF NOT EXISTS es_chofer boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.fimba_propuesta_rutas.es_chofer IS
  'Si true, el ride figura a bordo (Sube/Baja / A bordo) pero no cuenta plazas '
  'hacia capacidad / en_transito / libres hasta la bajada.';
