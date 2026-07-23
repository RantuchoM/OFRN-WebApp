-- Pending cron: flushPending (respeta cooldown 2 min). Cada minuto.
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'ofrn-conciertos-sheet-pending';

SELECT cron.schedule(
  'ofrn-conciertos-sheet-pending',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://muxrbuivopnawnxlcjxq.supabase.co/functions/v1/sync-conciertos-sheet',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'db_backup_service_role' LIMIT 1
      ),
      'apikey', (
        SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'db_backup_service_role' LIMIT 1
      ),
      'x-conciertos-sheet-cron-secret', COALESCE(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'conciertos_sheet_cron_secret' LIMIT 1),
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'db_backup_cron_secret' LIMIT 1)
      )
    ),
    body := '{"flushPending":true}'::jsonb,
    timeout_milliseconds := 120000
  ) AS request_id
  FROM public.conciertos_sheet_sync
  WHERE id = 1 AND pending = true;
  $$
);
