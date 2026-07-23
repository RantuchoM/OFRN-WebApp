-- Secret Vault para sync-conciertos-sheet (reutiliza el mismo valor que db_backup_cron_secret si no rotás).
-- Ejecutar una vez tras deploy, o dejar que el trigger caiga al fallback db_backup_cron_secret.

DELETE FROM vault.secrets WHERE name = 'conciertos_sheet_cron_secret';

SELECT vault.create_secret(
  'REEMPLAZAR_POR_CONCIERTOS_SHEET_CRON_SECRET',
  'conciertos_sheet_cron_secret',
  'Header x-conciertos-sheet-cron-secret'
);
