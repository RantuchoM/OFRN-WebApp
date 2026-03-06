# Spec: Fix UX Repertorio y Bowing Sets (v1)

## 1. Drag & Drop (Multi-Container Fix)

### Problema visual
El elemento arrastrado se recortaba por el `overflow` del bloque de origen (tabla con `overflow-x-auto` y contenedores del bloque).

### Solución aplicada

- **DragOverlay** (`@dnd-kit/core`): El "shadow" del elemento arrastrado se renderiza fuera del flujo, en un overlay en la raíz del Manager. Se usa el mismo `DndContext` y se pinta una fila simplificada (handle, #, compositor, título, duración) con `activeDragItemData` obtenido por `activeDragId` y `repertorios`. Así el ghost no se recorta.
- **SortableContext**: Se añade `strategy={verticalListSortingStrategy}` para un ordenamiento vertical consistente entre bloques.
- **Contenedores durante el arrastre**:
  - El `div` de cada bloque (`key={rep.id}`) recibe `overflow-visible z-10` cuando `activeDragId` está definido.
  - El contenedor de la tabla (`overflow-x-auto`) pasa a `overflow-visible` mientras hay arrastre (`activeDragId`), y vuelve a `overflow-x-auto` al soltar.

### Persistencia (onDragEnd)

- Se detecta el **cambio de bloque** con `movedToOtherBlock = sourceRep.id !== targetRep.id`.
- Se llama a `updateWorkPosition(supabase, id_repertorio_obra, nuevoIdBloque, nuevoOrden)`, que actualiza `id_repertorio` (id_bloque) y `orden` en `repertorio_obras`.
- Se normaliza el orden del bloque de origen con `normalizeRepertorioBlockOrden(supabase, sourceRep.id)`.
- Si hubo cambio de bloque, se normaliza también el bloque destino: `normalizeRepertorioBlockOrden(supabase, targetRep.id)`.
- Se refresca la lista con `fetchFullRepertoire()`.

> Nota (multi-bloque):  
> El soporte completo de múltiples bloques de repertorio en vistas de Seating y Mis Partes se documenta en `docs/fix-multi-block-repertoire.md` y se apoya en el orden `bloque.orden` + `repertorio_obras.orden` descrito en `docs/repertoire-spec.md`.

---

## 2. Bowing Sets (Initialization Fix)

### Problema
Estado de carga infinito ("Cargando...") y chips de arcos vacíos en WorkForm y RepertoireManager.

### Solución aplicada

- **Estado inicial de carga**: En modo `edit`, `loading` solo es `true` si hay `workId`. Si no hay `workId`, se hace `setLoading(false)` y `setArcosList([])` en el `useEffect` para salir de carga de inmediato.
- **Modo assign**: En el `useEffect` se hace `setArcosList(arcos || [])` y `setLoading(false)` siempre, de modo que la lista viene de la query principal de la gira (arcos pasados por el padre). No se hace fetch propio en assign.
- **fetchArcos (edit)**:
  - Si no hay `id` o `supabase`, se hace `setLoading(false)` y return.
  - Request envuelto en `try/finally` y en `finally` se llama a `setLoading(false)` para no dejar nunca el loading colgado.
  - En caso de error se llama a `setFetchError(...)` y `setArcosList([])`.
- **Mensaje cuando no hay obra guardada**: En modo edit, si `!workId` se muestra el texto "Guarda la obra primero para gestionar sets de arcos." en lugar de spinner o lista vacía.
- **Estado de error**: Se añade `fetchError` y en edit se muestra un aviso con `IconAlertCircle` (Lucide) y el mensaje de error cuando falla el fetch.
- **Debug (solo desarrollo)**: `console.log`/`console.warn` en:
  - Fin correcto de `fetchArcos`: workId y cantidad de arcos.
  - Error en `fetchArcos`.
  - Modo assign: workId y cantidad de arcos recibidos.
  - Modo edit sin workId.

### RepertoireManager y datos de arcos

- Los chips de arcos en assign siguen usando la lista que viene de la query principal: `arcosByWork[item.obras?.id]` (derivado de `repertorio_obras` con `obras ( ..., obras_arcos (id, nombre, link, descripcion, id_drive_folder) )`). No se hace un fetch adicional en BowingSetManager en modo assign; se confía en que el padre pase `arcos` correctamente tras `fetchFullRepertoire`.

---

## 3. Iconos (Lucide)

- **Cargando**: `IconLoader` con `animate-spin` (ya existente en el proyecto vía Icons).
- **Error**: `IconAlertCircle` para el mensaje de error de carga de arcos en BowingSetManager.

---

## 4. Archivos modificados

| Archivo | Cambios |
|--------|--------|
| `src/components/repertoire/BowingSetManager.jsx` | Inicialización de loading/arcosList según mode/workId; try/finally y fetchError en fetchArcos; mensaje "Guarda la obra primero"; IconAlertCircle para error; console.log de debug en desarrollo. |
| `src/components/repertoire/RepertoireManager.jsx` | DragOverlay con fila ghost; SortableContext con verticalListSortingStrategy; activeDragId y activeDragItemData; overflow-visible/z-index en bloques y tabla durante arrastre; onDragEnd con detección explícita de cambio de bloque (movedToOtherBlock) y normalización de ambos bloques. |
