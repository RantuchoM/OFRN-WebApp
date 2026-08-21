-- Throttle de crons agresivos + apagar job roto + purge de logs (RAM/IO Micro).
-- Ranking: nomencladores off; ensayo/sheet 5 min; entradas 30 min; retención logs.

-- 1) Job roto (URL placeholder) — dejar de ejecutarlo
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'sincronizar-nomencladores-diario';

-- 2) Ensayo salida: 1 min → 5 min
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'ofrn-ensayo-salida-recordatorios';

SELECT cron.schedule(
  'ofrn-ensayo-salida-recordatorios',
  '*/5 * * * *',
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

-- 3) Ensayo inicio: 1 min → 5 min
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'ofrn-ensayo-inicio-recordatorios';

SELECT cron.schedule(
  'ofrn-ensayo-inicio-recordatorios',
  '*/5 * * * *',
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

-- 4) Sheet pending: 1 min → 5 min
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'ofrn-conciertos-sheet-pending';

SELECT cron.schedule(
  'ofrn-conciertos-sheet-pending',
  '*/5 * * * *',
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

-- 5) Entradas mails: 15 min → 30 min
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'entradas-cron-mails';

SELECT cron.schedule(
  'entradas-cron-mails',
  '*/30 * * * *',
  $$
  select
    net.http_post(
        url:='https://muxrbuivopnawnxlcjxq.supabase.co/functions/v1/entradas-cron-mails',
        headers:='{}'::jsonb,
        timeout_milliseconds:=1000
    );
  $$
);

-- 6) Purge one-shot (historial cron + respuestas pg_net)
DELETE FROM cron.job_run_details
WHERE (end_time IS NOT NULL AND end_time < now() - interval '14 days')
   OR (end_time IS NULL AND start_time < now() - interval '14 days');

DELETE FROM net._http_response
WHERE created < now() - interval '2 days';

-- 7) Retención diaria (04:30 UTC) para que no vuelva a crecer sin control
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'ofrn-cron-log-retention';

SELECT cron.schedule(
  'ofrn-cron-log-retention',
  '30 4 * * *',
  $$
  DELETE FROM cron.job_run_details
  WHERE (end_time IS NOT NULL AND end_time < now() - interval '14 days')
     OR (end_time IS NULL AND start_time < now() - interval '14 days');

  DELETE FROM net._http_response
  WHERE created < now() - interval '2 days';
  $$
);
