-- Estado opcional: sin valor por defecto "en_proceso" (vacío hasta que se defina)

ALTER TABLE public.conciertos_difusion_logs
  ALTER COLUMN estado DROP NOT NULL;

ALTER TABLE public.conciertos_difusion_logs
  ALTER COLUMN estado DROP DEFAULT;

ALTER TABLE public.conciertos_difusion_logs
  DROP CONSTRAINT IF EXISTS conciertos_difusion_logs_estado_check;

ALTER TABLE public.conciertos_difusion_logs
  ADD CONSTRAINT conciertos_difusion_logs_estado_check
  CHECK (estado IS NULL OR estado IN ('en_proceso', 'listo', 'compartido'));
