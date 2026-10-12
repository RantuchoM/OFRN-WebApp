-- El recálculo periódico pasa de cada 15 minutos a las 07:00 ART (10:00 UTC).
-- Una sola invocación recorre vigentes y futuros hasta agotar el tiempo de la función.

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'ofrn-organico-convocado-refresh';

SELECT cron.schedule(
  'ofrn-organico-convocado-refresh',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url := 'https://muxrbuivopnawnxlcjxq.supabase.co/functions/v1/organico-convocado-refresh',
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
      'x-db-backup-cron-secret', COALESCE(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'db_backup_cron_secret' LIMIT 1),
        ''
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  ) AS request_id;
  $$
);
