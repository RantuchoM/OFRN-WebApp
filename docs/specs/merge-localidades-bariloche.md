# Spec: Unificación Bariloche / San Carlos de Bariloche

## Objetivo

Eliminar la localidad duplicada `Bariloche` (id 143) y conservar la canónica `San Carlos de Bariloche` (id 5), para que roster, logística, sedes, SCRN y viáticos manual no traten dos ciudades distintas.

## Diagnóstico (pre-merge)

| Superficie | Riesgo |
|---|---|
| `integrantes.id_localidad` / `id_loc_viaticos` | Persona “local” o con regla de localidad distinta según id |
| `giras_localidades` / `giras_tramo_localidades` | Sede o tramo incompleto si se usaba 143 |
| `giras_logistica_*` + `target_localities` | Match de admisión/ruta por Localidad fallaba entre alias |
| `locaciones` / `hoteles` / `ensambles` | Venue/hotel/ensamble en ciudad “otra” |
| `scrn_ruta_paradas` | Paradas SCRN; el alias textual ya estaba en `scrn_resolve_localidad_id` |
| `viaticos_manual_localidad` / `ciudad_origen` | Catálogo y personas con `BARILOCHE` vs nombre oficial |

## Decisión

- Canónica: **id 5 — San Carlos de Bariloche** (con `id_provincia` / `id_region`).
- Alias textual: `Bariloche` → id 5 (`scrn_resolve_localidad_id` + `viaticos_manual_upsert_localidad`).

## Entregables

- [x] Migración `supabase/migrations/20260728120000_merge_bariloche.sql`
- [x] Remap FKs / arrays / JSON personalizados `143` → `5` y borrado de id 143
- [x] Unificación catálogo/personas viáticos manual
- [x] Normalización en `viaticos_manual_upsert_localidad` para no reintroducir el alias
- [x] Deploy a proyecto linked + verificación `migration list`
