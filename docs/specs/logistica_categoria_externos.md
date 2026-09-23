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

## Fuerza de match (default, 2026-09-23)

Un solo motor: `getMatchStrength` + `pickWinningLogisticsRule` + `matchesRule` en `src/utils/giraUtils.js`. Cobertura, comidas, hotel (`roomingInitialOrder` solo adapta el hito check-in) y admisión de bus delegan ahí. No hay un segundo “quién gana Viedma vs No Locales”.

| Nivel | Alcance | Notas |
|------:|---------|-------|
| **5** | Persona (ID) | Siempre el más específico. |
| **4** | **Ensamble** | `target_ensambles` (checklist propio, no dentro de No Locales). Membresía = convocatoria `ENS:` (refuerzo/vacante **sí** si están en el ensamble). |
| **3** | Categoría/rol/familia/grupo **específica** | `PRODUCCION`, `SOLISTAS`, `EXTERNOS`, familia, `giras_grupos`. **No** incluye cubos `LOCALES`/`NO_LOCALES`. Queda bajo Ensamble; el producto ya tenía rol > localidad. |
| **2** | **Localidad** | Solo `condicion === 'estable'`. **Gana a No Locales** (gira 13: Viedma cena sábado > merienda No Locales). |
| **1** | Catch-all | Región, general, `LOCALES`, **`NO_LOCALES`**. |

Si más adelante Ensamble debe quedar bajo Localidad, basta un swap de constantes en `LOGISTICS_MATCH_STRENGTH`.

**UI Reglas logísticas:** tipo **Ensamble** hermano de Región / Localidad / Categoría / Persona (`MultiSelectCell` portal `z-[100]`, chips teal). No se mete como sub-ítem de No Locales.

## Localía en reglas `LOCALES` / `NO_LOCALES` (multi-tramo)

| Hito | Criterio de “local” |
|------|---------------------|
| Check-in / Check-out / Bus | Instantáneo del hito (`isLocalAt` en esa fecha/hora) |
| **Inicio / Fin comida** | **Tramo 0** (`isLocalForTramoIndex(..., 0)`) — sede del viaje, no el tramo del servicio |

El cuadrito Loc/Viaj del header sigue siendo **por tramo seleccionado** (preview operativo). Las reglas de cobertura de comidas con chip `Locales` aplican a quienes residen en las localidades del **primer tramo**.

## Desempate entre reglas de misma fuerza (comidas y hotelería)

Cuando dos reglas comparten el mismo nivel, gana la de **mayor especificidad de chip de rol** (`PRODUCCION` > `SOLISTAS` > …). `LOCALES`/`NO_LOCALES` ya no empatan con rol (van a nivel 1); a igual catch-all gana la **última** regla del listado.

**Ejemplo gira 13:** No Locales (merienda sábado, fuerza 1) vs Viedma (cena sábado, fuerza 2) → gana Viedma. Un bloque Ensamble (fuerza 4) ganaría a Viedma.

Implementado en `getRuleCategoryTiebreak`, `compareLogisticsRulePrecedence` y `pickWinningLogisticsRule` (`giraUtils.js`). `calculateLogisticsSummary` y el preview de `LogisticsManager.jsx` solo consumen ese resultado.

**UI chip `?` (preview de criterio, 2026-09-23):** si la persona queda en ámbar, el texto dice que el criterio está **superado por una regla de {tipo + alcance}** (`Localidad Viedma`, `Ensamble Prod.`, `Categoría Producción`). Nunca `regla #12` ni el id de la fila. `resolveLogisticsRuleCharacteristic` nombra el match que ganó (misma fuerza que `getMatchStrength`); las etiquetas salen de los catálogos del preview.

## Implementación

- **Fuente de verdad:** `getCategoriaLogistica` y `ROLES_CATEGORIA_LOGISTICA_PRODUCCION` en `src/utils/giraUtils.js` (reexportadas por `src/hooks/useLogistics.js`). `RoomingManager` y el resto de vistas consumen el resumen vía `useLogistics`, sin lógica duplicada de categorías.
- **Localía por hito:** `resolveIsLocalForLogisticsCategory` en `giraUtils.js`; `calculateLogisticsSummary` pasa `field` a `getMatchStrength` en comidas.
- **Reglas y matching:** `getMatchStrength`, `matchesRule` y `pickWinningLogisticsRule` son la única fuente; `calculateLogisticsSummary` / rooming / admisión de bus solo consumen.
- **Ensamble:** columna `giras_logistica_reglas.target_ensambles` (`bigint[]`).
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

- Categoría logística: **string** en `target_categories` / `target_ids` (rutas).
- Ensambles: `giras_logistica_reglas.target_ensambles bigint[]` (migración `20260923151000_logistica_target_ensambles`).

## Discrepancias con `schema.sql`

Ninguna relativa a esta spec: `target_ensambles` está en schema + migración.

## Checklist

- [x] `NO_LOCALES` catch-all (fuerza 1) por debajo de localidad (2)
- [x] Ensamble (4) > localidad (2) > No Locales (1)
- [x] Picker Ensamble en reglas logísticas (no sub-ítem de No Locales)
- [x] Un solo calculador (`pickWinningLogisticsRule`)
- [x] Vacantes/refuerzo: localidad/región/general solo estable; ensamble por membresía `ENS:`; No Locales sigue cubriendo EXTERNOS
- [x] Preview `?` del chip: copy por tipo+alcance de la regla ganadora, sin `#id`

