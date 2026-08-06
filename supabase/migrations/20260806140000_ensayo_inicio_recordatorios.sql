-- Recordatorios de ingreso al ensayo (T−15): tipo pre_inicio + cron Edge Function.
-- Gate de prueba en la función: solo roles admin (hasta abrir a músicos).

-- Ampliar tipos de idempotencia
ALTER TABLE public.eventos_checkin_recordatorios
  DROP CONSTRAINT IF EXISTS eventos_checkin_recordatorios_tipo_check;

ALTER TABLE public.eventos_checkin_recordatorios
  ADD CONSTRAINT eventos_checkin_recordatorios_tipo_check
  CHECK (
    tipo = ANY (
      ARRAY[
        'pre_cierre'::text,
        'post_cierre'::text,
        'pre_inicio'::text
      ]
    )
  );

COMMENT ON TABLE public.eventos_checkin_recordatorios IS
  'Idempotencia de recordatorios pre_inicio / pre_cierre / post_cierre (push|email) por (evento, integrante).';

-- Cron cada 1 min → ensayo-inicio-recordatorios
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'ofrn-ensayo-inicio-recordatorios';

SELECT cron.schedule(
  'ofrn-ensayo-inicio-recordatorios',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://muxrbuivopnawnxlcjxq.supabase.co/functions/v1/ensayo-inicio-recordatorios',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'db_backup_service_role' LIMIT 1),
        ''
      ),
      'apikey', COALESCE(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'db_backup_service_role' LIMIT 1),
        ''
      ),
      'x-ensayo-inicio-cron-secret', COALESCE(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'ensayo_inicio_cron_secret' LIMIT 1),
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'ensayo_salida_cron_secret' LIMIT 1),
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'db_backup_cron_secret' LIMIT 1),
        ''
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  ) AS request_id;
  $$
);
