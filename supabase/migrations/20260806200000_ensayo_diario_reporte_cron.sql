-- Reporte diario de asistencia a ensayos (Edge Function ensayo-diario-reporte).
-- 01:00 UTC = 22:00 ART → resume los ensayos del día calendario ART vigente.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'ofrn-ensayo-diario-reporte';

SELECT cron.schedule(
  'ofrn-ensayo-diario-reporte',
  '0 1 * * *',
  $$
  SELECT net.http_post(
    url := 'https://muxrbuivopnawnxlcjxq.supabase.co/functions/v1/ensayo-diario-reporte',
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
      'x-ensayo-diario-cron-secret', COALESCE(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'ensayo_diario_cron_secret' LIMIT 1),
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'ensayo_salida_cron_secret' LIMIT 1),
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'db_backup_cron_secret' LIMIT 1),
        ''
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 180000
  ) AS request_id;
  $$
);
