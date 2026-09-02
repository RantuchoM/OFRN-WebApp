-- Backline FIMBA: estado de color por fila (planilla Backline).
-- Valores: verde | celeste | amarillo | naranja | NULL

ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS backline_estado text;

ALTER TABLE public.eventos
  DROP CONSTRAINT IF EXISTS eventos_backline_estado_check;

ALTER TABLE public.eventos
  ADD CONSTRAINT eventos_backline_estado_check
  CHECK (
    backline_estado IS NULL
    OR backline_estado IN ('verde', 'celeste', 'amarillo', 'naranja')
  );

COMMENT ON COLUMN public.eventos.backline_estado IS
  'Estado visual Backline (verde|celeste|amarillo|naranja). Color de fila en planilla FIMBA; nullable = sin marcar.';
