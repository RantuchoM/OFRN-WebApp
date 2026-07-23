DELETE FROM vault.secrets WHERE name = 'conciertos_sheet_cron_secret';
SELECT vault.create_secret('fVCvnPj2pBW0z7xXItGSiKEdL4o9ag5cwm6AkUuFTQrh3DYZ', 'conciertos_sheet_cron_secret', 'Header x-conciertos-sheet-cron-secret');
