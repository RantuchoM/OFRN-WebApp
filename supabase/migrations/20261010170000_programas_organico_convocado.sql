-- Cache del orgánico convocado. El cálculo vive en la app (fetchRosterForGira
-- + computeConvoked). Se refresca al mutar el programa y por cron.

ALTER TABLE public.programas
  ADD COLUMN IF NOT EXISTS organico_convocado text,
  ADD COLUMN IF NOT EXISTS organico_convocado_map jsonb,
  ADD COLUMN IF NOT EXISTS organico_convocado_at timestamptz;

COMMENT ON COLUMN public.programas.organico_convocado IS
  'Texto estándar del orgánico convocado. Cache; el roster sigue siendo la fuente.';
COMMENT ON COLUMN public.programas.organico_convocado_map IS
  'Mapa Fl/Ob/…/Str de computeConvoked. Cache para badges e informes.';
COMMENT ON COLUMN public.programas.organico_convocado_at IS
  'Último recálculo del cache. Null = todavía no se calculó.';

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'ofrn-organico-convocado-refresh';

-- Cada 15 minutos, tanda de programas vigentes o futuros (los más viejos primero).
SELECT cron.schedule(
  'ofrn-organico-convocado-refresh',
  '*/15 * * * *',
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
