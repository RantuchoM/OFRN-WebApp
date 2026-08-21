-- Franja operativa ART 08:00–22:59 → UTC 11:00–01:59 (cron en UTC).
-- Solo jobs de alta frecuencia: ensayo inicio/salida + sheet pending.

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'ofrn-ensayo-salida-recordatorios';

SELECT cron.schedule(
  'ofrn-ensayo-salida-recordatorios',
  '*/5 11-23,0-1 * * *',
  $$
  SELECT net.http_post(
    url := 'https://muxrbuivopnawnxlcjxq.supabase.co/functions/v1/ensayo-salida-recordatorios',
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
      'x-ensayo-salida-cron-secret', COALESCE(
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

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'ofrn-ensayo-inicio-recordatorios';

SELECT cron.schedule(
  'ofrn-ensayo-inicio-recordatorios',
  '*/5 11-23,0-1 * * *',
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

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'ofrn-conciertos-sheet-pending';

SELECT cron.schedule(
  'ofrn-conciertos-sheet-pending',
  '*/5 11-23,0-1 * * *',
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
