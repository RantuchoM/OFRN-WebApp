-- Marca conciertos didácticos (medio servicio en reporte de cantidad de servicios).
ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS es_didactico boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.eventos.es_didactico IS
  'True = concierto didáctico (cuenta 1/2 servicio). Solo aplica a id_tipo_evento = Concierto.';
