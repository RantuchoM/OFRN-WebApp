# Spec: Fusionar comidas (MealsManager)

## Objetivo
Permitir unir ≥2 eventos de comida/catering del **mismo turno** (`fecha` + `servicio`) en un solo evento, combinando audiencia OFRN y tags FIMBA.

## Enablement
- Selección ≥2 filas **reales** (no `isTemp`).
- Misma `fecha` (YYYY-MM-DD) y mismo `servicio` (Desayuno / Almuerzo / Merienda / Cena / Catering).
- Deshabilitado en `readOnly`.
- UI: botón **Fusionar** en el panel flotante de edición masiva (`BulkEditPanel`).
- ConfirmDialog antes de ejecutar.

## Survivor
Se conserva el evento más “completo”:
1. Score: locación (+3), `hora_inicio` (+3), `hora_fin` (+1), descripción (+1), convocados positivos (+1), grupos (+1), artistas FIMBA (+1).
2. Empate → **menor `id` numérico**.

Locación / hora / tipo del survivor **no** se rellenan desde los otros (solo tags de audiencia).

## Merge de campos
| Campo | Regla |
| --- | --- |
| `eventos_fimba_propuestas` | Unión de `id_propuesta` → `setEventoFimbaPropuestas` |
| `eventos_grupos` / `selectedGrupos` | Unión de `id_grupo` → `setEventoGrupos` |
| `convocados` | Unión de tags positivos; si hay positivos, se **descarta** `GRP:NONE` (Nadie). Solo Nadie en todas → queda `[GRP:NONE]`. Vacío + vacío → `[]`. |
| `descripcion` | `mergeMealDescriptionWithConvocados` con convocados y siglas FIMBA fusionados |

## Borrado
Hard `DELETE` de los no-survivor (paridad `deleteRow`). Junctions `eventos_grupos` / `eventos_fimba_propuestas` CASCADE. Check-in/out logísticos: FKs `ON DELETE SET NULL`. Ventanas de comida ya no apuntan a eventos (slot día+tipo).

## Post-merge
1. Rematerializar hermanas del turno en memoria (`rematerializeTurnoSiblings`).
2. `refreshGridData()` (recalcula deducción / sobre-inclusión).
3. Limpiar selección; toast de éxito.
4. Funciona en OFRN y FIMBA (`fimbaMode`).

## Helpers
- `mergeMealConvocados`, `canMergeMealRows`, `pickMealMergeSurvivor`, `buildMergedMealState` en `src/utils/mealLogistics.js`.
- Orquestación UI en `src/views/Giras/MealsManager.jsx`.

## Checklist
- [x] Enablement misma fecha + servicio, ≥2 reales
- [x] Survivor por completitud + id
- [x] Unión artistas / grupos / convocados (Nadie cede a positivos)
- [x] Hard-delete restantes + ConfirmDialog
- [x] Recalc turno + refresh
- [x] Botón Fusionar en panel flotante
- [x] OFRN + FIMBA
