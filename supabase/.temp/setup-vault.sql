DELETE FROM vault.secrets WHERE name IN ('db_backup_cron_secret', 'db_backup_service_role');
SELECT vault.create_secret('fVCvnPj2pBW0z7xXItGSiKEdL4o9ag5cwm6AkUuFTQrh3DYZ', 'db_backup_cron_secret', 'Header x-db-backup-cron-secret');
SELECT vault.create_secret('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11eHJidWl2b3BuYXdueGxjanhxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc4MjkzMiwiZXhwIjoyMDgwMzU4OTMyfQ.kjxVCRZ20Gp-_E0ilQf5UbWVCXNYrlLBmaID6gWsQxE', 'db_backup_service_role', 'Service role JWT para db-backup-cron');
