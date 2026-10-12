# Spec: Recordatorio mensual de cambios de horas

## Objetivo
El día 1 de cada mes, a las 09:00 ART, enviar un mail a `filarmonica.scrn@gmail.com` para que carguen los cambios de horas cátedra en Administración de Horas.

## Comportamiento
- [x] Destino fijo: `filarmonica.scrn@gmail.com`.
- [x] Enlace: `https://ofrn-web-app.vercel.app/?tab=musicos&vista=horas` (o `APP_BASE_URL` / `FRONTEND_URL` si están definidos).
- [x] Asunto: `Recordatorio: actualizar cambios de horas · {mes} {año}` (mes en español, calendario ART).
- [x] Solo envía si el día ART es 1. Con body `{"force": true}` envía igual (prueba manual).
- [x] Con `force` se puede pasar `"to": "ofrn.archivo@gmail.com"` para una vista previa. Cualquier otro destino se rechaza. El cron mensual no manda `to` y sigue yendo a filarmónica.
- [x] Cron: `0 12 1 * *` (12:00 UTC = 09:00 ART, mismo día calendario).

## Piezas
| Pieza | Rol |
|--------|-----|
| `supabase/functions/horas-recordatorio-mensual` | Arma y envía el mail (Gmail / nodemailer, mismos secrets `GMAIL_USER` / `GMAIL_PASS`) |
| `supabase/migrations/*_horas_recordatorio_mensual_cron.sql` | `pg_cron` + `pg_net` hacia la función |

## Auth
- Header `x-horas-recordatorio-cron-secret` o `x-db-backup-cron-secret`.
- Secret de la función: `HORAS_RECORDATORIO_CRON_SECRET`, o fallback `DB_BACKUP_CRON_SECRET` / `ENSAYO_DIARIO_CRON_SECRET` / `ENSAYO_SALIDA_CRON_SECRET`.
- El cron usa el valor de Vault `db_backup_cron_secret` (el mismo que ya usan los otros jobs). `verify_jwt = false`.
