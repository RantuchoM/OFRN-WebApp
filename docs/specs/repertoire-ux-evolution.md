# Spec: Evolución de UX en Repertorio y Gestión de Arcos

## 1. Gestión de Arcos (Bowing Sets)

### Problema
La creación y asignación de sets de arcos estaba acoplada a `RepertoireManager`, con lógica duplicada en `WorkForm` para la edición de obras.

### Solución
- **Componente:** `src/components/repertoire/BowingSetManager.jsx`
- **Modos:**
  - **`mode="edit"`** (WorkForm): CRUD de `obras_arcos` para una obra. Lista de sets con edición inline (nombre, descripción, link) y botón "Nuevo set de arcos" que abre un modal.
  - **`mode="assign"`** (RepertoireManager): Select para elegir un set existente o "Crear Nuevo Set...". Al crear, se abre un modal (nombre); al confirmar se delega al padre (`onCreateAndAssign(workId, workTitle, nombre)`), que devuelve `{ newArcoId }` y se asigna a la fila.

### Modal de creación
- **CreateBowingSetModal:** Renderizado con `createPortal(..., document.body)` (React Portal). Estilos con Tailwind. En modo `edit` pide nombre, descripción y link; en modo `assign` solo nombre. Botones Cancelar / Crear y estado "Guardando...".

### Integración
- **WorkForm.jsx:** Se reemplazó la sección "Gestión de Arcos / Bowings" (estado `arcos`, `fetchArcos`, `handleSaveArco`, `handleDeleteArco` y la lista inline) por `<BowingSetManager mode="edit" supabase={supabase} workId={formData.id} />`.
- **RepertoireManager.jsx:** La columna de arcos usa `<BowingSetManager mode="assign" ... />` con `arcos={arcosByWork[item.obras?.id]}`, `selectedArcoId={item.id_arco_seleccionado}`, `onSelectChange={handleArcoSelectionChange}`, `onCreateAndAssign={handleCreateBowingSetForManager}`, `onAfterCreateAndAssign={fetchFullRepertoire}` para refrescar la lista tras crear y asignar.

---

## 2. Reordenamiento visual (Drag & Drop)

### Objetivo
Permitir mover obras dentro del mismo bloque y entre bloques con feedback visual, usando un handle de 6 puntos (GripVertical).

### Implementación técnica

- **Librería:** `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.
- **Handle:** Primera columna de la tabla con `IconGripVertical` (Lucide). Solo visible para editores y en vista no compacta. Atributos `{...listeners} {...attributes}` en un `div` con `cursor-grab` / `active:cursor-grabbing`.
- **SortableRepertorioRow:** Componente interno que usa `useSortable({ id: item.id, data: { id_repertorio: rep.id, index: idx } })`. Renderiza `<tr>` con la celda del handle, la celda "#" (orden + botones subir/bajar) y `children` (resto de celdas).
- **DndContext:** Envuelve todo el listado de bloques. `sensors={useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))}`, `collisionDetection={closestCenter}`, `onDragStart` (limpia `dragOverId`), `onDragOver` (guarda `over?.id` en `dragOverId`), `onDragEnd` (limpia `dragOverId` y llama a `handleDragEnd`).
- **SortableContext:** `items={allRepertorioObraIds}` (ids de todas las filas de repertorio).
- **Destino visual:** Si `dragOverId === item.id`, la fila recibe `ring-2 ring-inset ring-indigo-400 bg-indigo-50/80` para marcar el destino.

### Lógica al soltar (`handleDragEnd`)
1. Obtener `active.id` (id de `repertorio_obras`) y `over.id` (id de la fila sobre la que se suelta).
2. Resolver bloque e índice origen y destino recorriendo `repertorios`.
3. Llamar a `updateWorkPosition(supabase, id_repertorio_obra, nuevo_id_bloque, nuevo_orden)` con `nuevo_orden = targetIdx + 1`.
4. Llamar a `normalizeRepertorioBlockOrden(supabase, id_repertorio_origen)` y, si el bloque destino es distinto, `normalizeRepertorioBlockOrden(supabase, id_repertorio_destino)`.
5. `fetchFullRepertoire()` para refrescar la UI.

### Servicio (giraService.js)
- **updateWorkPosition(supabase, id_repertorio_obra, nuevo_id_bloque, nuevo_orden):** Hace `update` en `repertorio_obras` con `id_repertorio` y `orden`.
- **normalizeRepertorioBlockOrden(supabase, id_repertorio):** Lee todas las filas del bloque ordenadas por `orden` e `id`, y actualiza cada una con `orden = 1, 2, 3, ...` para evitar huecos o duplicados.

### Estado de carga
- **savingPosition:** `true` mientras se ejecutan `updateWorkPosition`, normalización y `fetchFullRepertoire`. Se muestra una barra fija superior: "Guardando orden..." con `IconLoader` y fondo ámbar (`bg-amber-100`), para evitar colisiones y doble clic.

---

## 3. Esquema de datos

- **repertorio_obras:** `id`, `id_repertorio` (FK a `programas_repertorios`), `id_obra`, `orden`, `id_arco_seleccionado`, ...
- **programas_repertorios:** Bloques de repertorio por gira (id, nombre, orden, id_programa).
- **obras_arcos:** Sets de arcos por obra (id, id_obra, nombre, link, descripcion, id_drive_folder).

---

## 4. Archivos tocados

| Archivo | Cambios |
|--------|--------|
| `src/components/repertoire/BowingSetManager.jsx` | Nuevo: modos edit/assign, modal con portal, Tailwind. |
| `src/components/repertoire/RepertoireManager.jsx` | BowingSetManager assign, columna GripVertical, DndContext, SortableContext, SortableRepertorioRow, handleDragEnd, savingPosition, dragOverId. |
| `src/views/Repertoire/WorkForm.jsx` | Sustitución sección arcos por BowingSetManager edit; eliminación estado/handlers de arcos. |
| `src/services/giraService.js` | `updateWorkPosition`, `normalizeRepertorioBlockOrden`. |
