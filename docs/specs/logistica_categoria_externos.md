# Spec: Categoría logística "EXTERNOS"

## Objetivo

Permitir que las reglas de logística (transporte, check-in/out, rutas por categoría) se apliquen de forma específica al personal adicional o músicos contratados que no pertenecen a la planta estable ni son residentes locales en las sedes de la gira.

## Lógica de clasificación

Un integrante se clasifica como `EXTERNOS` cuando cumple **todas** estas condiciones:

1. Su rol normalizado **no** es `staff`, `produccion`, `mus_prod`, `director` ni `chofer` (estos se mapean a sus categorías propias antes de evaluar EXTERNOS).
2. Su `condicion` (tabla `integrantes` o equivalente en el objeto persona) **no** es `estable` (comparación case-insensitive vía `normalize`).
3. No es local respecto a la gira: `is_local === false` (según sedes / `giras_localidades` y la lógica existente en el roster enriquecido).

## Orden de evaluación en `getCategoriaLogistica`

1. `SOLISTAS`, `DIRECTORES`, `PRODUCCION` (`produccion`, `chofer`, `mus_prod`), `STAFF`, `CHOFER` — categorías fijas por rol.
2. `EXTERNOS` — si aplica según las reglas anteriores.
3. `LOCALES` o `NO_LOCALES` — según `is_local` (flag global del roster).

## Localía en reglas `LOCALES` / `NO_LOCALES` (multi-tramo)

| Hito | Criterio de “local” |
|------|---------------------|
| Check-in / Check-out / Bus | Instantáneo del hito (`isLocalAt` en esa fecha/hora) |
| **Inicio / Fin comida** | **Tramo 0** (`isLocalForTramoIndex(..., 0)`) — sede del viaje, no el tramo del servicio |

El cuadrito Loc/Viaj del header sigue siendo **por tramo seleccionado** (preview operativo). Las reglas de cobertura de comidas con chip `Locales` aplican a quienes residen en las localidades del **primer tramo**.

## Desempate entre reglas de misma fuerza (comidas y hotelería)

Cuando dos reglas comparten el mismo nivel de `getMatchStrength` (p. ej. ambas nivel 4 por categoría), gana la de **mayor especificidad de chip**:

1. Coincidencia directa con la categoría del integrante (`PRODUCCION`, `STAFF`, `SOLISTAS`, etc.).
2. Coincidencia geográfica vía `NO_LOCALES` / `LOCALES` (incluye perfiles `PRODUCCION` no locales que también matchean `NO_LOCALES`).
3. Si persiste el empate, gana la **última** regla en el listado.

**Ejemplo:** un integrante de Producción no local puede matchear una regla `PRODUCCION` y otra `NO_LOCALES` con la misma fuerza; prevalece la de `PRODUCCION`.

Implementado en `getRuleCategoryTiebreak` y `compareLogisticsRulePrecedence` (`giraUtils.js`), usados por `calculateLogisticsSummary` y el preview de `LogisticsManager.jsx`.

## Implementación

- **Fuente de verdad:** `getCategoriaLogistica` y `ROLES_CATEGORIA_LOGISTICA_PRODUCCION` en `src/utils/giraUtils.js` (reexportadas por `src/hooks/useLogistics.js`). `RoomingManager` y el resto de vistas consumen el resumen vía `useLogistics`, sin lógica duplicada de categorías.
- **Localía por hito:** `resolveIsLocalForLogisticsCategory` en `giraUtils.js`; `calculateLogisticsSummary` pasa `field` a `getMatchStrength` en comidas.
- **Reglas y matching:** `getMatchStrength`, `matchesRule` y `calculateLogisticsSummary` usan el mismo valor devuelto para `target_categories` y alcance `Categoria` en rutas/admisión.
- **Desempate categoría:** `getRuleCategoryTiebreak` + `compareLogisticsRulePrecedence` en hotelería, hitos de comida y proveedores (`prov_*`).
- **UI:** selectores de categoría incluyen el valor exacto `EXTERNOS` (p. ej. `StopRulesManager.jsx`, `LogisticsManager.jsx`).
- **Sync roster → comidas:** `LogisticsDashboard` refresca su `useLogistics` al entrar a matriz/asistencia/reporte, y `LogisticsManager` notifica `onLogisticsChange` al guardar reglas (evita datos stale sin F5).
- **Convocados (`isUserConvoked`):** única fuente de verdad para tags `GRP:` / `LOC:` / `ENS:` / `FAM:` / ID personal. `checkIsConvoked` y Agenda delegan ahí.
  - `LOC:` = localidad de **residencia** del músico (`resolveLocalidadResidencia` / `id_localidad_residencia` / `localidades_residencia` / `_loc_residencia`), no viáticos.
  - `ENS:` = membresía en `ensambles` / `integrantes_ensambles` del roster.
  - UI Comidas→Agenda: selector searchable con pestañas Categorías / Localidades (solo residencias del roster) / Ensambles (solo ensambles del roster); cada solapa muestra badge de cantidad, abre por defecto la solapa con selección y lista primero los ítems ya seleccionados al abrir.
  - **GiraCard (indicador de comidas):** perfil alineado con el matcher — `integrantes_ensambles` vigentes al `fecha_desde` del programa (`GIRAS_LIST_SELECT` + `filterMembershipRowsForProgramDate`) y residencia explícita para `LOC:`. Si el usuario no figura en `giras_integrantes`, fallback React Query (`gira-card-convocado-profile`) con ensambles/residencia.
  - **Cobertura de slot (`isPersonEligibleForMealSlot`):** si la persona entra al evento por un tag `LOC:` (residencia), **no** se exige ventana `comida_inicio`/`comida_fin` ni ser “local” del tramo activo. Motivo: viandas/comidas de regreso post-tramo (p. ej. `LOC:5` + `LOC:23` el día después del `fecha_hasta` del segmento) contaban 0 aunque el roster tuviera residentes de esas ciudades. GRP/ENS/FAM siguen con cobertura normal.

## Base de datos

No se requieren cambios de esquema: la categoría es un **string** en reglas (`target_categories`, `target_ids` según el flujo) y en memoria en el cálculo de logística.

## Discrepancias con `schema.sql`

Ninguna: `integrantes.condicion` y el uso dinámico de `is_local` en el roster ya existen; EXTERNOS solo combina esos campos en la capa de aplicación.
