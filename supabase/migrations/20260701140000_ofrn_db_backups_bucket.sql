-- Bucket privado para backups diarios (Edge Function db-backup-cron).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ofrn-db-backups',
  'ofrn-db-backups',
  false,
  52428800,
  ARRAY['application/gzip', 'application/json']
)
ON CONFLICT (id) DO NOTHING;

-- Solo service_role escribe/lee (RLS por defecto en storage.objects para service role bypass)
