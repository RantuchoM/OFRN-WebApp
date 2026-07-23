-- Sync vivo de conciertos (id_tipo_evento = 1) → Google Sheet.
-- Solo eventos con is_deleted = false se escriben en el Sheet (filtro en la Edge Function).

CREATE TABLE IF NOT EXISTS public.conciertos_sheet_sync (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  spreadsheet_id text,
  spreadsheet_url text,
  pending boolean NOT NULL DEFAULT false,
  syncing_at timestamptz,
  last_synced_at timestamptz,
  last_error text,
  last_row_count integer,
  year integer
);

INSERT INTO public.conciertos_sheet_sync (id, pending)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.conciertos_sheet_sync ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS conciertos_sheet_sync_select_authenticated ON public.conciertos_sheet_sync;
CREATE POLICY conciertos_sheet_sync_select_authenticated
  ON public.conciertos_sheet_sync
  FOR SELECT
  TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.request_conciertos_sheet_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_service_role text;
  v_cron_secret text;
  v_should_sync boolean := false;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_should_sync := (OLD.id_tipo_evento = 1);
  ELSIF TG_OP = 'INSERT' THEN
    v_should_sync := (NEW.id_tipo_evento = 1);
  ELSE
    -- UPDATE: dispara si era o es concierto (incluye soft-delete is_deleted)
    v_should_sync := (NEW.id_tipo_evento = 1 OR OLD.id_tipo_evento = 1);
  END IF;

  IF NOT v_should_sync THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  UPDATE public.conciertos_sheet_sync
  SET pending = true
  WHERE id = 1;

  BEGIN
    SELECT decrypted_secret INTO v_service_role
    FROM vault.decrypted_secrets
    WHERE name = 'db_backup_service_role'
    LIMIT 1;

    SELECT decrypted_secret INTO v_cron_secret
    FROM vault.decrypted_secrets
    WHERE name = 'conciertos_sheet_cron_secret'
    LIMIT 1;

    IF v_cron_secret IS NULL THEN
      SELECT decrypted_secret INTO v_cron_secret
      FROM vault.decrypted_secrets
      WHERE name = 'db_backup_cron_secret'
      LIMIT 1;
    END IF;

    IF v_service_role IS NOT NULL AND v_cron_secret IS NOT NULL THEN
      PERFORM net.http_post(
        url := 'https://muxrbuivopnawnxlcjxq.supabase.co/functions/v1/sync-conciertos-sheet',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_service_role,
          'apikey', v_service_role,
          'x-conciertos-sheet-cron-secret', v_cron_secret
        ),
        body := jsonb_build_object('force', false),
        timeout_milliseconds := 120000
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- No bloquear writes de eventos si falla el ping HTTP
    RAISE WARNING 'request_conciertos_sheet_sync: %', SQLERRM;
  END;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_conciertos_sheet_sync ON public.eventos;
CREATE TRIGGER trg_conciertos_sheet_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.eventos
  FOR EACH ROW
  EXECUTE FUNCTION public.request_conciertos_sheet_sync();

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname IN ('ofrn-conciertos-sheet-daily', 'ofrn-conciertos-sheet-pending');

-- Respaldo diario 10:00 UTC (cubre cambios de repertorio/ensambles que no tocan eventos)
SELECT cron.schedule(
  'ofrn-conciertos-sheet-daily',
  '0 10 * * *',
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
    body := '{"force":true}'::jsonb,
    timeout_milliseconds := 120000
  ) AS request_id;
  $$
);

-- Cada 2 min: si quedó pending por debounce, forzar sync
SELECT cron.schedule(
  'ofrn-conciertos-sheet-pending',
  '*/2 * * * *',
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
    body := '{"force":true}'::jsonb,
    timeout_milliseconds := 120000
  ) AS request_id
  FROM public.conciertos_sheet_sync
  WHERE id = 1 AND pending = true;
  $$
);
