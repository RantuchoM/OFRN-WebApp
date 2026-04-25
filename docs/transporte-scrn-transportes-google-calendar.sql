-- Migración a evento por recorrido:
-- cada fila de scrn_viajes tiene su propio google_calendar_event_id
-- (sincronizado por la Edge Function sync-scrn-transporte-calendar con viaje_id).

ALTER TABLE public.scrn_viajes
  ADD COLUMN IF NOT EXISTS google_calendar_event_id text;

COMMENT ON COLUMN public.scrn_viajes.google_calendar_event_id IS
  'Id del evento del recorrido en Google Calendar.';

-- Limpieza opcional del modelo viejo (evento por transporte):
-- ALTER TABLE public.scrn_transportes DROP COLUMN IF EXISTS google_calendar_event_id;
