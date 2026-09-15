# Spec: Fusionar comidas (MealsManager)

## Objetivo
Permitir unir ≥2 eventos de comida/catering del **mismo turno** (`fecha` + `servicio`) en un solo evento, combinando audiencia OFRN y tags FIMBA.

## Enablement
- Selección ≥2 filas **reales** (no `isTemp`).
- Misma `fecha` (YYYY-MM-DD) y mismo `servicio` (Desayuno / Almuerzo / Merienda / Cena / Catering bare). **Nota 2026-09-15:** Catering tipado (p.ej. Catering Merienda) resuelve `servicio=Merienda`, así que puede fusionarse con una Merienda de cat. Comidas del mismo día.
- Deshabilitado en `readOnly`.
- UI: botón **Fusionar** en el panel flotante de edición masiva (`BulkEditPanel`).
- ConfirmDialog antes de ejecutar.
- **Eliminar (2026-09-14):** mismo panel; borra las comidas **guardadas** seleccionadas (no vacantes). ConfirmDialog z-110 avisa el conteo. Oculto en `readOnly`. OFRN + FIMBA.
- **Dropdowns del panel (2026-09-14):** locación (`- Lugar -`) y convocados (`Seleccionar…`) portal a `document.body` `z-[110]`; si la barra está al fondo, el menú abre hacia arriba (`getFixedMenuPosition`). El panel no recorta (sin `overflow-hidden`).
- **Select-all header (2026-09-14):** el checkbox/tilde del thead opera sobre `visibleGrid` (filas tras filtros locación/artista/catering/servicio/segmento/grupos + pins de edición), no sobre el `grid` completo. Ciclo: vacantes reales visibles → todas visibles → limpiar. Checked/indeterminate según selección **dentro** del set visible.

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
- [x] Dropdowns bulk locación/convocados portal z-110 (flip up)
- [x] Select-all header acotado a `visibleGrid` (filtros + pins)
- [x] OFRN + FIMBA
