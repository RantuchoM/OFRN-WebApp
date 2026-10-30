# Spec: Unificación Bariloche / San Carlos de Bariloche

## Objetivo

Conservar una sola localidad canónica, **San Carlos de Bariloche (id 5)**, para que roster, logística, sedes, SCRN y viáticos no traten los alias como ciudades distintas.

## Diagnóstico

| Superficie | Riesgo |
|---|---|
| `integrantes.id_localidad` / `id_loc_viaticos` | Persona “local” o con regla de localidad distinta según id |
| `giras_localidades` / `giras_tramo_localidades` | Sede o tramo incompleto si se usaba el alias |
| `giras_logistica_*` + `target_localities` | Match de admisión/ruta por Localidad fallaba entre alias |
| `locaciones` / `hoteles` / `ensambles` | Venue/hotel/ensamble en ciudad “otra” |
| `gira_demoras_localidad` | Minutos de viaje duplicados o huérfanos al borrar el alias |
| `viaticos_recorridos_plantillas.recorridos` | Recorrido con id de alias |
| `scrn_ruta_paradas` y textos SCRN | Parada o reserva que no resolvía al id canónico |
| `viaticos_manual_localidad` / `ciudad_origen` / `lugar_comision` | Catálogo y textos con el alias |

## Decisión

- Canónica: **id 5 — San Carlos de Bariloche** (`id_provincia` 15, `id_region` 1, `alias` Bariloche, `hub` Bariloche).
- Alias fusionados:
  - id 143 `Bariloche` (2026-07-28)
  - id 147 `CEB BARILOCHE` y id 148 `Bariloche` (2026-10-30). CEB queda como locación, no como ciudad.
- Texto `Bariloche` y `CEB BARILOCHE` resuelven a id 5 (`scrn_resolve_localidad_id`, `viaticos_manual_upsert_localidad`).
- Un trigger impide volver a insertar esos dos nombres en `localidades`.

## Entregables

- [x] Migración `supabase/migrations/20260728120000_merge_bariloche.sql` (id 143)
- [x] Migración `supabase/migrations/20261030103502_merge_bariloche_aliases.sql` (ids 147 y 148)
- [x] Remap FKs / arrays / JSON / plantillas de recorridos hacia id 5 y borrado de los alias
- [x] Unificación catálogo/personas viáticos manual y textos SCRN / lugar de comisión
- [x] Normalización en `viaticos_manual_upsert_localidad` y `scrn_resolve_localidad_id`
- [x] Trigger `localidades_bloquear_alias_bariloche`
- [x] Deploy a proyecto linked + verificación `migration list`
