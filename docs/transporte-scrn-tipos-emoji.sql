-- Emoji visual para cada tipo de transporte (usado en título de evento de Google Calendar).
-- Ejemplos: 🚐, 🚌, 🚗, 🚚

ALTER TABLE public.scrn_tipos_transporte
  ADD COLUMN IF NOT EXISTS emoji text;

COMMENT ON COLUMN public.scrn_tipos_transporte.emoji IS
  'Emoji opcional del tipo (se usa en eventos de calendario SCRN).';

