# Spec: Backup OFRN (Supabase)

## Objetivo
Copia **portable** del schema `public` fuera de Supabase, para restaurar/comparar sin depender solo de los snapshots diarios del plan Pro. (`auth` / `storage` quedan fuera del dump automatizado: el rol `ofrn_backup` no tiene `USAGE` ahí; para un dump completo hace falta la password `postgres` del dashboard.)

Complementa:
- Snapshots diarios nativos de Supabase Pro (7 días; **no** es PITR).
- Cron JSON parcial `db-backup-cron` → Storage (5 tablas; legado).

## Implementación principal (off-site)

| Artefacto | Rol |
|-----------|-----|
| `.github/workflows/supabase-daily-backup.yml` | Dump completo cada **1 h** (UTC) + `workflow_dispatch` → artefacto GitHub (14 d) + Drive |
| Carpeta Drive (`OFRN_BACKUP_DRIVE_FOLDER_ID`) | Destino off-site; retención **30 días** (purge por nombre `ofrn-db-YYYY-MM-DD_HHMMSSZ.sql.gz`) |
| `scripts/backup-supabase-db.ps1` | Alternativa manual / Programador de tareas Windows |

### Flujo
1. GitHub Action (horario o manual) corre `pg_dump` (Docker `postgres:17`) como rol `ofrn_backup` vía pooler session (5432), schema `public` only.
2. Empaqueta `ofrn-db-<stamp>.sql.gz` y lo guarda como artefacto.
3. Sube a Drive con **upload resumable**:
   - Action → `manage-drive` `create_resumable_upload` (solo metadata JSON; sin body grande).
   - Action hace `PUT` de los bytes **directo a Google** (chunks de 8 MiB si hace falta).
4. Lista la carpeta Drive y borra dumps OFRN con stamp &gt; 30 días.

Rol DB: `ofrn_backup` = `SELECT` en `public` + `BYPASSRLS` (necesario para que `pg_dump` no choque con políticas RLS).

`upload_file` (base64) queda para archivos chicos de la app; **no** se usa para backups.

### Tamaño / cuota (medición 2026-11-09)
| Concepto | Valor |
|----------|-------|
| BD en disco | ~80 MB |
| Dump `public` comprimido (Action / local) | ~3.0–4.3 MB |
| Drive: 24 × 30 × ~4 MB | **~3 GB** (cuota de Google Drive, no de Supabase) |
| Impacto Supabase | Lectura breve + 1 invoke EF/`manage-drive` por hora → **despreciable** en Pro |
| GitHub Actions | Repo **público** → minutos ilimitados |

PITR de Supabase (~USD 100/mes) **no** está incluido: los dumps horarios permiten comparar/restaurar desde una foto, no “undo” al minuto en el proyecto live.

### Secrets (GitHub Actions)
| Secret | Uso |
|--------|-----|
| `SUPABASE_DB_PASSWORD` | Password del rol `ofrn_backup` (pooler) |
| `SUPABASE_DB_USER` | Default implícito `ofrn_backup` si falta |
| `SUPABASE_URL` | Invoke `manage-drive` |
| `SUPABASE_SERVICE_ROLE_KEY` | Auth de la función |
| `OFRN_BACKUP_DRIVE_FOLDER_ID` | Carpeta `OFRN-DB-Backups` (`1v3jDnO1E_81qSyQP3p9BVkWl31DuPtLQ`) |
| `SUPABASE_PROJECT_REF` / `SUPABASE_DB_REGION` | Opcionales (defaults del proyecto OFRN) |

### Activación
- [x] Carpeta Drive `OFRN-DB-Backups` + secrets en GitHub Actions.
- [x] Rol `ofrn_backup` con `BYPASSRLS` + dump `public` vía Docker `pg_dump`.
- [x] `manage-drive` con `create_resumable_upload` desplegado.
- [ ] Primera corrida verde end-to-end (dump → artefacto → Drive → purge).
- Schedule horario (`0 * * * *` UTC) activo en `main`.

### Restaurar desde dump
```bash
gunzip ofrn-db-YYYY-MM-DD_HHMMSSZ.sql.gz
psql "$DATABASE_URL" -f ofrn-db-YYYY-MM-DD_HHMMSSZ.sql
```
Preferible restaurar en un proyecto/clon, no a ciegas sobre producción.

## Legado: JSON diario en Storage

| Artefacto | Rol |
|-----------|-----|
| `supabase/functions/db-backup-cron` | Exporta 5 tablas → JSON en `ofrn-db-backups` |
| Cron `ofrn-db-backup-daily` | 09:00 UTC |

Tablas: `horas_catedra`, `integrantes`, `integrantes_ensambles`, `instrumentos`, `ensambles`. Útil como red de seguridad mínima; **no** reemplaza el dump completo a Drive.

### Invocación manual (JSON)
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

## Checklist operativo
- [x] Bucket `ofrn-db-backups` + cron JSON parcial
- [x] Workflow horario + retención Drive 30 d (código)
- [ ] Secrets GitHub cargados (`SUPABASE_DB_PASSWORD`, URL, service role, folder id)
- [ ] Carpeta Drive creada y compartida con Archivo
- [ ] Primera corrida manual OK (archivo visible en Drive)

## Deuda
- Dump oficial CLI puede diferir en tamaño/formato respecto al snapshot Python one-shot de 2026-11-09.
- PITR sigue siendo el camino correcto para “volver 1–2 h” en el proyecto live.
- Secrets GitHub + carpeta Drive aún pendientes de activación operativa.
