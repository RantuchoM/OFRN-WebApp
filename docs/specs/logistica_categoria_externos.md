# Spec: Categoría logística "EXTERNOS"

## Objetivo

Permitir que las reglas de logística (transporte, check-in/out, rutas por categoría) se apliquen de forma específica al personal adicional o músicos contratados que no pertenecen a la planta estable ni son residentes locales en las sedes de la gira.

## Lógica de clasificación

Un integrante se clasifica como `EXTERNOS` cuando cumple **todas** estas condiciones:

1. Su rol normalizado **no** es `staff`, `produccion`, `director` ni `chofer` (estos se mapean a sus categorías propias antes de evaluar EXTERNOS).
2. Su `condicion` (tabla `integrantes` o equivalente en el objeto persona) **no** es `estable` (comparación case-insensitive vía `normalize`).
3. No es local respecto a la gira: `is_local === false` (según sedes / `giras_localidades` y la lógica existente en el roster enriquecido).

## Orden de evaluación en `getCategoriaLogistica`

1. `SOLISTAS`, `DIRECTORES`, `PRODUCCION`, `STAFF`, `CHOFER` — categorías fijas por rol.
2. `EXTERNOS` — si aplica según las reglas anteriores.
3. `LOCALES` o `NO_LOCALES` — según `is_local` (flag global del roster).

## Localía en reglas `LOCALES` / `NO_LOCALES` (multi-tramo)

| Hito | Criterio de “local” |
|------|---------------------|
| Check-in / Check-out / Bus | Instantáneo del hito (`isLocalAt` en esa fecha/hora) |
| **Inicio / Fin comida** | **Tramo 0** (`isLocalForTramoIndex(..., 0)`) — sede del viaje, no el tramo del servicio |

El cuadrito Loc/Viaj del header sigue siendo **por tramo seleccionado** (preview operativo). Las reglas de cobertura de comidas con chip `Locales` aplican a quienes residen en las localidades del **primer tramo**.

## Implementación

- **Fuente de verdad:** `getCategoriaLogistica` en `src/utils/giraUtils.js` (reexportada por `src/hooks/useLogistics.js`).
- **Localía por hito:** `resolveIsLocalForLogisticsCategory` en `giraUtils.js`; `calculateLogisticsSummary` pasa `field` a `getMatchStrength` en comidas.
- **Reglas y matching:** `getMatchStrength`, `matchesRule` y `calculateLogisticsSummary` usan el mismo valor devuelto para `target_categories` y alcance `Categoria` en rutas/admisión.
- **UI:** selectores de categoría incluyen el valor exacto `EXTERNOS` (p. ej. `StopRulesManager.jsx`, `LogisticsManager.jsx`).

## Base de datos

No se requieren cambios de esquema: la categoría es un **string** en reglas (`target_categories`, `target_ids` según el flujo) y en memoria en el cálculo de logística.

## Discrepancias con `schema.sql`

Ninguna: `integrantes.condicion` y el uso dinámico de `is_local` en el roster ya existen; EXTERNOS solo combina esos campos en la capa de aplicación.
