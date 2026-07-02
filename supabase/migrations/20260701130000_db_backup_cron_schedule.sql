-- Backup diario: Edge Function db-backup-cron (09:00 UTC).
-- Antes de aplicar: cargar secrets en Vault (scripts/setup-db-backup-vault.sql).

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'ofrn-db-backup-daily';

SELECT cron.schedule(
  'ofrn-db-backup-daily',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://muxrbuivopnawnxlcjxq.supabase.co/functions/v1/db-backup-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'db_backup_service_role' LIMIT 1
      ),
      'apikey', (
        SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'db_backup_service_role' LIMIT 1
      ),
      'x-db-backup-cron-secret', (
        SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'db_backup_cron_secret' LIMIT 1
      )
    ),
    body := '{"mode":"daily"}'::jsonb,
    timeout_milliseconds := 300000
  ) AS request_id;
  $$
);
