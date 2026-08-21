# Spec: Google Sheet vivo de conciertos del año

## Objetivo
Mantener un Google Sheet actualizado con los conciertos del año calendario, en Drive (cuenta Archivo), reescribiendo la hoja completa cuando cambia un evento de tipo Concierto.

## Criterios de inclusión (filas en el Sheet)
- `eventos.id_tipo_evento = 1` (Concierto)
- `eventos.is_deleted = false` (soft-deleted **nunca** aparecen)
- `fecha` entre `YYYY-01-01` y `YYYY-12-31` del año actual (o el `year` pasado en el body)

## Disparo
- Trigger `trg_conciertos_sheet_sync` en `eventos` si NEW/OLD es tipo 1 (incluye soft-delete).
- Cron diario 10:00 UTC (cubre cambios de repertorio/ensambles/locaciones).
- Cron cada **5 min** en franja **08:00–22:59 ART** (`*/5 11-23,0-1 * * *` UTC; `20260820190000`) si `pending = true` (solo si un sync coincidió con otro en curso).
- Botón «Sincronizar Sheet» en Gestión → Conciertos (`force: true`).

## Rate limit
- **Sin cooldown** entre syncs: cada cambio de concierto reescribe el Sheet.
- Solo se encola `pending` si ya hay un sync en curso (lock ~90s); el cron lo flushea.
- Sin `mergeCells`.
- Botón manual siempre fuerza sync inmediato.

## Comportamiento al soft-delete
El UPDATE con `is_deleted = true` dispara el sync; la query excluye ese evento, así que **desaparece del Sheet**.

## Componentes
- Edge Function: `supabase/functions/sync-conciertos-sheet`
- Tabla estado: `public.conciertos_sheet_sync`
- Migración: `20260722160000_conciertos_sheet_sync.sql`
- Auth cron: secret `CONCIERTOS_SHEET_CRON_SECRET` (+ Vault `conciertos_sheet_cron_secret` o fallback `db_backup_cron_secret`)
- Auth Google: `G_CLIENT_ID` / `G_CLIENT_SECRET` / `G_REFRESH_TOKEN` (misma cuenta Archivo que `manage-drive`)
- **Sheet fijado (no recrear):** `1Mkc-vPhOCQlxia6n-LdqKp5limVEXyWSh-khv8gDeJg`
- URL canónica: `https://docs.google.com/spreadsheets/d/1Mkc-vPhOCQlxia6n-LdqKp5limVEXyWSh-khv8gDeJg/edit?gid=0#gid=0`
- Secret opcional: `CONCIERTOS_SHEET_ID` (si se setea, debe ser ese mismo ID)

## Columnas del Sheet
Fecha (formato largo es-AR) | Hora | Locación | Localidad | Tipo de programa | Programa

### Formato visual (Edge Function)
- Anchos fijos (px, tomados del ajuste manual): `199, 58, 254, 161, 122, 339`
- Fila meta (última sync) en A1, sin fusionar celdas
- Header congelado, fondo oscuro, texto blanco centrado
- Bordes + wrap + zebra en datos; Hora y Tipo centrados
## Checklist
- [x] Edge Function con rewrite completo + create Sheet si no existe
- [x] Filtro `is_deleted = false`
- [x] Trigger solo tipo concierto (= 1)
- [x] Cron diario + pending
- [x] Botón sync en ConciertosView
- [x] Tabla estado con `spreadsheet_url`
