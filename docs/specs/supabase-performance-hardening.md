# Spec: Hardening de performance Supabase (post-incidente RAM)

## Contexto
Tras bloqueo por presión de memoria/SWAP en **Nano**, el proyecto se subió a **Micro**. Esta spec registra las mitigaciones aplicadas para que no vuelva a saturar por crons, Auth pool fijo, RLS InitPlan e índices FK.

## Completado

| Ítem | Estado | Detalle |
|------|--------|---------|
| Compute Nano → Micro | ✅ | Manual en Dashboard (mismo precio Pro) |
| Auth DB pool → % | ✅ | `db_max_pool_size=15`, `db_max_pool_size_unit=percent` (Management API) |
| Crons alta frecuencia | ✅ | ensayo inicio/salida + sheet pending: `*/5` → `*/15` (misma franja UTC 11–01); `entradas-cron-mails` `*/30` → `*/45` |
| RLS InitPlan hot | ✅ | Policies Entradas / SCRN / Viáticos manual: `auth.*()` → `(select auth.*())` |
| Índices FK hot | ✅ | Entradas, eventos, giras_integrantes / admision / reglas |
| Índice duplicado | ✅ | Drop `giras_integrantes_gira_integrante_uidx` (queda el UNIQUE constraint) |

Migración: `supabase/migrations/20261104003559_perf_memory_rls_cron_indexes.sql` (applied remoto).

## Inventario de deuda (estudiado 2026-11-04)

### D1 — Migraciones huérfanas solo en Remote (media)
5 versiones en `schema_migrations` sin archivo en `supabase/migrations/`:

| Version | Name | Notas |
|---------|------|-------|
| `20261103232424` | `entrada_staff_historial_reservas_persona` | Placeholder (`-- placeholder will be replaced`) |
| `20261103233818` | `entrada_staff_cancelar_reserva_fn` | CREATE OR REPLACE (MCP/Dashboard) |
| `20261103234023` | `entrada_staff_listar_reservas_persona_fn` | CREATE OR REPLACE |
| `20261103234042` | `entrada_cambiar_cantidad_reserva_staff` | CREATE OR REPLACE |
| `20261103234102` | `entrada_staff_cambiar_concierto_reserva_fn` | CREATE OR REPLACE |

Local ya tiene el paquete en `20261103210000_entrada_staff_historial_reservas_persona.sql`. Las huérfanas son iteraciones posteriores aplicadas fuera del repo. **Riesgo:** `db push` confuso; re-aplicar local no refleja 1:1 el remoto. **Acción:** volcar SQL remoto a archivos locales (o `migration repair` + consolidar) y alinear funciones.

### D2 — Advisors residuales

| Lint | Count | Severidad real | Lectura |
|------|------:|----------------|---------|
| Auth RLS InitPlan | 3 | Baja | Solo `familysearch_edel` (profiles/people/cards). Schema ajeno a OFRN app; 8 tablas, sin refs en `src/`. |
| Multiple Permissive Policies | 112 | Media en hot | Peor: `scrn_reserva_pasajeros` (24), `scrn_perfiles` (12), entradas/giras. Patrón admin\|\|owner como policies separadas → OR costoso. |
| Unindexed FKs | 138 | Media selectiva | Dominios: giras_ 36, eventos 13, gestion_ 11, scrn_ 6, resto “other”. Entradas hot ya cubiertas. |
| Unused Index | 199 | Baja / ruido | Incluye índices nuevos post-hardening (aún sin `pg_stat` hits). No dropear a ciegas. |
| No Primary Key | 3 | Baja | Backups/temps (`giras_logistica_reglas_backup_*`, `temp_*`). |

### D3 — Payloads frontend (alta en Entradas admin)

Volúmenes actuales: `entrada_usuario` **1856**, `entrada_reserva` **2386**, `eventos` **3992**, `giras_integrantes` **512**. SCRN chico (`scrn_perfiles` 27).

| Hotspot | Problema |
|---------|----------|
| `entradaService.listAdminData()` | `select('*')` de **todos** programas + usuarios + nest pesado de conciertos + reservas solo para localidades. Escala mal con ~2k usuarios. |
| `entradaService` varios `entrada_usuario.select('*')` | Perfil/sesión: innecesario full row. |
| `AdminSCRNPanel.jsx` | Varios `select('*')`; impacto bajo hoy por poca data. |
| `useAgendaData.js` | Mezcla `EVENT_SELECT` (bien) con `select('*')` en reglas/hospedaje/feriados/admisión. |

### D4 — Schema huésped `familysearch_edel` (baja)
Presente en la misma instancia, no usado por OFRN WebApp. Aporta ruido a advisors (InitPlan, FKs, índices). Valorar mover a otro proyecto o archivar.

### Prioridad sugerida → ejecutado (2026-11-04)
1. **D3** ✅ `listAdminData` / perfil: columnas mínimas + RPC `entrada_admin_usuarios_localidades` (sin nest de ~2k reservas). `src/services/entradaService.js`.
2. **D1** ✅ Archivos locales para las 5 versiones huérfanas; `migration list` Local=Remote.
3. **D2 policies** ✅ `scrn_reserva_pasajeros` 10→4; `entrada_usuario` SELECT unificado; admin ALL de programa/concierto partido en write + un SELECT.
4. **D2 FK** ✅ Índices check-in / venue / logs / `giras_logistica_*` restantes.
5. Ignorar unused indexes nuevos + `familysearch_edel` (sin cambio).

Migración: `supabase/migrations/20261104005211_debt_listadmin_rls_fk_align.sql` (applied remoto).

## Verificación rápida

```sql
select jobname, schedule from cron.job
where jobname in (
  'ofrn-ensayo-salida-recordatorios',
  'ofrn-ensayo-inicio-recordatorios',
  'ofrn-conciertos-sheet-pending',
  'entradas-cron-mails'
);
```

Auth: Dashboard → Authentication → Performance (pool unit = percent, 15%).
