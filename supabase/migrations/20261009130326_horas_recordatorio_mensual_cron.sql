-- Recordatorio mensual de cambios de horas (Edge Function horas-recordatorio-mensual).
-- 12:00 UTC del día 1 = 09:00 ART, mismo día calendario.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'ofrn-horas-recordatorio-mensual';

SELECT cron.schedule(
  'ofrn-horas-recordatorio-mensual',
  '0 12 1 * *',
  $$
  SELECT net.http_post(
    url := 'https://muxrbuivopnawnxlcjxq.supabase.co/functions/v1/horas-recordatorio-mensual',
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
      'x-horas-recordatorio-cron-secret', COALESCE(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'horas_recordatorio_cron_secret' LIMIT 1),
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'db_backup_cron_secret' LIMIT 1),
        ''
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  ) AS request_id;
  $$
);
