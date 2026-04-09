-- Datos del concierto al momento de guardar cada log (para detectar cambios posteriores en fecha/hora/locación)

ALTER TABLE public.conciertos_difusion_logs
  ADD COLUMN IF NOT EXISTS fecha_snapshot date;

ALTER TABLE public.conciertos_difusion_logs
  ADD COLUMN IF NOT EXISTS hora_snapshot text;

ALTER TABLE public.conciertos_difusion_logs
  ADD COLUMN IF NOT EXISTS locacion_snapshot text;

COMMENT ON COLUMN public.conciertos_difusion_logs.fecha_snapshot IS 'Valor de eventos.fecha al insertar el registro.';
COMMENT ON COLUMN public.conciertos_difusion_logs.hora_snapshot IS 'Valor de eventos.hora_inicio al insertar (texto, ej. HH:MM).';
COMMENT ON COLUMN public.conciertos_difusion_logs.locacion_snapshot IS 'Texto descriptivo de locación al insertar (nombre + localidad).';
