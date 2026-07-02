# Spec: Backup diario OFRN (Supabase)

## Objetivo
Copia diaria de tablas críticas para restauraciones futuras (incluye `horas_catedra`), complementando los snapshots nativos de Supabase Pro.

## Implementación principal (producción)

| Artefacto | Rol |
|-----------|-----|
| `supabase/functions/db-backup-cron` | Edge Function: exporta tablas → JSON.gz en Storage |
| Bucket `ofrn-db-backups` | Destino privado (migración `20260701140000`) |
| `supabase/migrations/20260701130000_db_backup_cron_schedule.sql` | pg_cron 09:00 UTC → POST a la función |
| `scripts/setup-db-backup-vault.sql` | Secrets en Vault para el cron (`db_backup_cron_secret`, `db_backup_service_role`) |

### Tablas (modo `daily`)
`horas_catedra`, `integrantes`, `integrantes_ensambles`, `instrumentos`, `ensambles`.

### Flujo
1. pg_cron dispara `db-backup-cron` a las **09:00 UTC** con header `x-db-backup-cron-secret`.
2. La función lee filas vía Supabase JS (service role), serializa JSON y sube vía Storage REST a `ofrn-db-backups/daily/YYYY-MM-DD/`.
3. Incluye `manifest.json` con metadatos por tabla.

### Secrets
- **Edge Function:** `DB_BACKUP_CRON_SECRET` (Supabase secrets).
- **Vault (cron):** `db_backup_cron_secret`, `db_backup_service_role` — ver `scripts/setup-db-backup-vault.sql`.

### Invocación manual
```powershell
$secret = (Get-Content "supabase\.temp\db-backup-cron-secret.txt" -Raw).Trim()
$sr = $env:SUPABASE_SERVICE_ROLE_KEY
$headers = @{
  "x-db-backup-cron-secret" = $secret
  "Authorization" = "Bearer $sr"
  "apikey" = $sr
}
Invoke-RestMethod -Uri "https://muxrbuivopnawnxlcjxq.supabase.co/functions/v1/db-backup-cron" `
  -Method Post -Headers $headers -Body '{"mode":"daily"}' -ContentType "application/json"
```

### Verificar en Storage
```sql
SELECT name, created_at, metadata->>'size' AS bytes
FROM storage.objects
WHERE bucket_id = 'ofrn-db-backups'
ORDER BY created_at DESC
LIMIT 20;
```

## Implementación alternativa (pg_dump completo)

| Artefacto | Rol |
|-----------|-----|
| `scripts/backup-supabase-db.ps1` | Manual o Programador de tareas (Windows) |
| `.github/workflows/supabase-daily-backup.yml` | Cron 08:15 UTC + `workflow_dispatch` |

Requiere `SUPABASE_DB_PASSWORD` en GitHub Secrets (aún no configurado).

## Restaurar desde JSON (Storage)
1. Descargar `daily/YYYY-MM-DD/horas_catedra.json` desde Dashboard → Storage.
2. Parsear JSON (`rows`).
3. `INSERT ... ON CONFLICT` o import selectivo en proyecto clonado.

## Restaurar desde pg_dump
```bash
gunzip ofrn-db-YYYY-MM-DD.sql.gz
psql "$DATABASE_URL" -f ofrn-db-YYYY-MM-DD.sql
```

## Nómina — mes de baja visible
- [x] Integrantes con baja (0 hs vs mes anterior > 0) permanecen en la nómina **solo el mes del cambio** (`hasNews`).
- [x] Celdas muestran `0` en rojo suave; etiqueta **Baja** en fila.
- [x] `collectNovedadesMesDocJobs` genera nota aunque el registro vigente sea 0 hs.

## Checklist operativo
- [x] Bucket `ofrn-db-backups` creado
- [x] Edge Function `db-backup-cron` desplegada
- [x] Secret `DB_BACKUP_CRON_SECRET` en Supabase
- [x] Vault + cron `ofrn-db-backup-daily` aplicados en remoto (09:00 UTC)
- [ ] GitHub Action (opcional) con `SUPABASE_DB_PASSWORD`

## Deuda
- Modo `critical` (más tablas) puede acercarse al timeout de Edge Functions; usar pg_dump o GitHub Action para dump completo.
- Copia a Google Drive descartada por timeouts en payloads grandes.
