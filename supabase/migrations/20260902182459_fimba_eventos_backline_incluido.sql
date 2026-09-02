-- Backline FIMBA: flag para incluir ensayos en la planilla (además de conciertos).
-- Conciertos (id_tipo_evento = 1) siempre aparecen; ensayos solo si backline_incluido = true.

ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS backline_incluido boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.eventos.backline_incluido IS
  'Planilla FIMBA Backline: true = el evento (típicamente un ensayo) se muestra como fila manual. Los conciertos (id_tipo_evento = 1) siempre se listan aunque el flag sea false.';

-- Conciertos existentes: marcar incluidos por claridad (la UI los muestra igual sin el flag).
UPDATE public.eventos
SET backline_incluido = true
WHERE id_tipo_evento = 1
  AND (backline_incluido IS DISTINCT FROM true);
