-- Chofer por subida/trayecto (NO atributo de integrante/persona).
-- Misma semántica que fimba_propuesta_rutas.es_chofer: marca el ride de
-- boarding en este vehículo; la persona puede ser chofer en un tramo y
-- pasajero normal en otro.
ALTER TABLE public.giras_logistica_rutas
  ADD COLUMN IF NOT EXISTS es_chofer boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.giras_logistica_rutas.es_chofer IS
  'Chofer por subida/trayecto (regla de boarding), no rol permanente de la persona. '
  'Si true (típicamente alcance Persona), figura a bordo pero no cuenta plazas '
  'hacia capacidad / en_transito / libres hasta la bajada. '
  'Paridad con fimba_propuesta_rutas.es_chofer.';
