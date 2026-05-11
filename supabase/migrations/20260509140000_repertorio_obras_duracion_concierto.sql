-- Duración opcional por fila de programa (override del catálogo `obras.duracion_segundos`).
ALTER TABLE public.repertorio_obras
  ADD COLUMN IF NOT EXISTS duracion_segundos_concierto integer;

COMMENT ON COLUMN public.repertorio_obras.duracion_segundos_concierto IS
  'Segundos de esta obra solo en este bloque/programa; NULL = usar obra.duracion_segundos.';
