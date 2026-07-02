-- Secrets en Vault para pg_cron → db-backup-cron.
-- Ejecutar una vez en SQL Editor (o: supabase db query --linked -f scripts/setup-db-backup-vault.sql)
-- Reemplazar los valores antes de ejecutar si rotás claves.

DELETE FROM vault.secrets WHERE name IN ('db_backup_cron_secret', 'db_backup_service_role');

SELECT vault.create_secret(
  'REEMPLAZAR_POR_DB_BACKUP_CRON_SECRET',
  'db_backup_cron_secret',
  'Header x-db-backup-cron-secret'
);

SELECT vault.create_secret(
  'REEMPLAZAR_POR_SERVICE_ROLE_JWT',
  'db_backup_service_role',
  'Service role JWT para db-backup-cron'
);
