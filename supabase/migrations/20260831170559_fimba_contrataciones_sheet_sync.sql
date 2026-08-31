-- Backup FIMBA contrataciones → Google Sheet (tab "Contrataciones").
-- Disparo: botón «Actualizar» en UI + cron diario. Sin trigger por fila (evita rate limits).

CREATE TABLE IF NOT EXISTS public.fimba_contrataciones_sheet_sync (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  spreadsheet_id text,
  spreadsheet_url text,
  sheet_tab text NOT NULL DEFAULT 'Contrataciones',
  id_edicion bigint REFERENCES public.fimba_ediciones (id) ON DELETE SET NULL,
  pending boolean NOT NULL DEFAULT false,
  syncing_at timestamptz,
  last_synced_at timestamptz,
  last_error text,
  last_row_count integer
);

INSERT INTO public.fimba_contrataciones_sheet_sync (id, pending)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE public.fimba_contrataciones_sheet_sync IS
  'Estado del backup Google Sheet de fimba_contrataciones (1 fila).';

ALTER TABLE public.fimba_contrataciones_sheet_sync ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fimba_contrataciones_sheet_sync_select_authenticated
  ON public.fimba_contrataciones_sheet_sync;
CREATE POLICY fimba_contrataciones_sheet_sync_select_authenticated
  ON public.fimba_contrataciones_sheet_sync
  FOR SELECT
  TO authenticated
  USING (true);

-- Lectura también para anon (shell FIMBA externo sin JWT OFRN; solo metadata de sync).
DROP POLICY IF EXISTS fimba_contrataciones_sheet_sync_select_anon
  ON public.fimba_contrataciones_sheet_sync;
CREATE POLICY fimba_contrataciones_sheet_sync_select_anon
  ON public.fimba_contrataciones_sheet_sync
  FOR SELECT
  TO anon
  USING (true);

GRANT SELECT ON public.fimba_contrataciones_sheet_sync TO anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname IN ('ofrn-fimba-contrataciones-sheet-daily');

-- Diario 11:00 UTC (08:00 ART) — backup full replace del tab Contrataciones
SELECT cron.schedule(
  'ofrn-fimba-contrataciones-sheet-daily',
  '0 11 * * *',
  $$
  SELECT net.http_post(
    url := 'https://muxrbuivopnawnxlcjxq.supabase.co/functions/v1/sync-fimba-contrataciones-sheet',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'db_backup_service_role' LIMIT 1
      ),
      'apikey', (
        SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'db_backup_service_role' LIMIT 1
      ),
      'x-fimba-contrataciones-sheet-cron-secret', COALESCE(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'fimba_contrataciones_sheet_cron_secret' LIMIT 1),
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'db_backup_cron_secret' LIMIT 1),
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'conciertos_sheet_cron_secret' LIMIT 1)
      )
    ),
    body := '{"force":true}'::jsonb,
    timeout_milliseconds := 120000
  ) AS request_id;
  $$
);
