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

## 4. Filtros predeterminados por orgánico

- **Componente compartido:** `src/components/repertoire/InstrumentationFilterModal.jsx`
- **Presets:** `src/utils/instrumentationFilterPresets.js`
- **Ubicaciones:** modal "Buscar Obra" / Agregar Obra en `RepertoireManager.jsx` y columna Orgánico en `RepertoireView.jsx`
- **Chips de un clic:** Solo cuerdas, Quinteto de maderas, Quinteto de metales, Vientos (sin cuerdas), Solo percusión
- **Comportamiento:** al elegir un preset se aplican `stringsFilter`, `strictMode` y reglas de instrumentos; el botón Orgánico muestra el nombre del preset activo
- **Modal Agregar Obra:** un preset o filtro de orgánico activo dispara la carga de la biblioteca (hasta ~2000 obras) sin exigir texto en compositor/obra/arreglador
- **Panel de filtro:** altura limitada al viewport (abre arriba del botón si no hay espacio abajo); cuerpo con scroll y footer fijo (Limpiar / Filtrar siempre visible)

| Preset | Cuerdas | Estricto | Reglas clave |
|--------|---------|----------|--------------|
| Solo cuerdas | Con | Sí | Sin vientos/percusión |
| Quinteto de maderas | Sin | Sí | fl/ob/cl/bn/hn = 1 |
| Quinteto de metales | Sin | Sí | hn=1, tpt=2, tbn=1, tba=1 |
| Vientos (sin cuerdas) | Sin | No | Solo excluye cuerdas |
| Solo percusión | Sin | Sí | perc ≥ 1 |

---

## 5. Archivos tocados

| Archivo | Cambios |
|--------|--------|
| `src/components/repertoire/BowingSetManager.jsx` | Nuevo: modos edit/assign, modal con portal, Tailwind. |
| `src/components/repertoire/RepertoireManager.jsx` | BowingSetManager assign, columna GripVertical, DndContext, SortableContext, SortableRepertorioRow, handleDragEnd, savingPosition, dragOverId. |
| `src/components/repertoire/InstrumentationFilterModal.jsx` | Modal compartido de filtro por orgánico con presets. |
| `src/utils/instrumentationFilterPresets.js` | Definición de presets y helpers de etiqueta/activo. |
| `src/views/Repertoire/RepertoireView.jsx` | Usa modal compartido y presets en columna Orgánico. |
| `src/views/Repertoire/WorkForm.jsx` | Sustitución sección arcos por BowingSetManager edit; eliminación estado/handlers de arcos. **Autocomplete de título:** al escribir con compositor elegido, desplegable de obras existentes con acciones según `context` (`archive` vs `program`). |

---

## 6. Autocomplete de título en WorkForm (anti-duplicados)

### Objetivo
Evitar crear obras duplicadas cuando el usuario ya eligió compositor y está escribiendo el título en una obra nueva.

### Comportamiento
- Solo aplica a **obras nuevas** (`!formData.id`), con al menos un compositor y título > 3 caracteres (texto plano).
- Búsqueda debounced (~600 ms) en `obras` filtrada por compositor(es) seleccionados; resultados ordenados por coincidencia exacta / prefijo.
- Desplegable anclado al editor de título (estilo autocomplete) mientras el campo tiene foco.
- Pie del desplegable: **Continuar con obra nueva** (cierra sugerencias y sigue el flujo normal del formulario).

### Acciones por contexto
| Origen | Prop `context` | Acciones por obra encontrada |
|--------|----------------|------------------------------|
| `RepertoireView.jsx` | `archive` (default) | **Crear nuevo arreglo** (clona en Solicitud) · **Salir** |
| `RepertoireManager.jsx` | `program` | **Agregar esta obra al programa** (`onInsertExistingWork`) · **Solicitar nuevo arreglo** |

### Implementación
- `createArrangementFromExistingWork(sourceWorkId)`: clona metadatos y relaciones de compositores/arregladores; sin Drive; estado Solicitud; dispara mail `nueva_obra` al archivista (igual que crear solicitud normal).
- `RepertoireManager` ya pasa `context="program"` y `onInsertExistingWork` al modal de WorkForm.

### Completado
- [x] Desplegable contextual en título
- [x] Acciones archive vs program
- [x] Opción continuar con obra nueva
| `src/services/giraService.js` | `updateWorkPosition`, `normalizeRepertorioBlockOrden`. |

---

## 7. Selección del archivo (PDF / Drive / preselección)

### Objetivo
Permitir armar listas de obras del catálogo, exportar PDF, sincronizar accesos directos numerados en [Misceláneos](https://drive.google.com/drive/folders/10-gPJSotDGO4yvHXo9pG_Kcg7XAMa5za) y **cargar preselecciones** desde carpetas ya existentes en esa ubicación.

### Componentes
| Archivo | Rol |
|---------|-----|
| `RepertoireSelectionBar.jsx` | Barra de acciones (orden, tags, programa, PDF, Drive, vaciar). Visible siempre; si no hay selección muestra solo «Preselección desde Drive». |
| `RepertoireSelectionDriveLoadModal.jsx` | Modal: lista carpetas de Misceláneos, preview de match, aplica preselección. |
| `repertoireSelectionDriveService.js` | `listArchivoMiscFolders`, `loadArchivoSelectionFromDrive`, `matchSelectionItemsToWorkIds`, `syncArchivoSelectionToDrive`. |
| `repertoireSelectionStorage.js` | Persistencia en `localStorage` (`orderedIds`, `name`). |

### Edge Function (`manage-drive`)
| Acción | Descripción |
|--------|-------------|
| `list_archivo_misc_folders` | Subcarpetas de `ARCHIVO_MISC_FOLDER_ID`. |
| `load_archivo_selection_from_drive` | Lee shortcuts (`shortcutDetails.targetId`) y subcarpetas numeradas; devuelve orden y `targetDriveId`. |
| `sync_archivo_selection_shortcuts` | Crea/actualiza carpeta + shortcuts numerados (flujo existente). |

### Flujo «Preselección desde Drive»
1. Usuario abre modal y elige carpeta de Misceláneos.
2. Backend lista accesos directos / subcarpetas con prefijo `N - `.
3. Frontend cruza `targetDriveId` con `extractFileId(obra.link_drive)`.
4. Se reemplaza la selección (con confirmación si ya había obras), se guarda nombre de carpeta en `selectionName`.
5. El usuario puede editar orden, agregar/quitar obras y re-sincronizar con Drive.

### Completado
- [x] Listar carpetas Misceláneos
- [x] Cargar shortcuts y mapear a obras del archivo
- [x] Botón «Preselección desde Drive» (con y sin selección activa)
- [x] Preview de obras sin match antes de aplicar

---

## 6. Seed ARIAS / Para acomodar (Drive directo, sin copias)

### Política
- **`link_drive`** apunta a la carpeta original en ARIAS o Para acomodar; **no** se usa `copiar_carpeta_a_archivo`.
- PDFs renombrados **sin prefijo `S-N`**; carpetas sin prefijo numérico (`02 -`, etc.).
- Obras duplicadas en Archivo (copias del seed anterior) eliminadas vía `scripts/delete-archivo-copies.mjs`.

### Scripts
| Script | Rol |
|--------|-----|
| `scripts/process-arias-local.mjs` | Renombra carpetas/PDFs en sync local `H:\...\ARIAS` |
| `scripts/generate-arias-sync.mjs` | Genera `supabase/seed_arias_sync.sql` (INSERT/UPDATE + particellas) |
| `scripts/lib/ariasCatalog.mjs` | Catálogo de obras ARIAS, IDs de copias a borrar |
| `scripts/delete-archivo-copies.mjs` | Borra carpetas duplicadas del Archivo en Drive |

### Completado (2026-06-13)
- [x] **A)** 5 obras ARIAS re-apuntadas a carpetas originales (3491–3493, 3495–3496); 4 Para acomodar a link original (3490, 3494, 3497–3498)
- [x] **B)** 9 obras ARIAS nuevas insertadas (3506–3514)
- [x] 10 carpetas copia eliminadas del Archivo
- [x] Dedupe de particellas por `(id_instrumento, nombre_archivo)` con merge de URLs
- [x] **E lucevan (3507) + Nabucco (3514):** PDFs renombrados; particellas e instrumentación corregidas
- [x] **Particellas ARIAS (3491–3496, 3506–3514):** re-sync desde Drive tras fix de matcher (`extractInstrumentFromExistingName` para `1-2`, Contrafagot `08b`, etc.)

### Scripts adicionales
| Script | Rol |
|--------|-----|
| `scripts/fix-arias-problem-pdfs.mjs` | Renombra PDFs Tosca/IMSLP leyendo encabezado o mapa IMSLP |
| `scripts/lib/ariasPdfFixes.mjs` | Mapa IMSLP Nabucco + parser encabezado Tosca |
| `scripts/patch-arias-lucevan-nabucco.mjs` | SQL patch obras 3507 y 3514 |
| `scripts/patch-arias-particellas.mjs` | Re-sync particellas + instrumentación desde Drive (14 obras ARIAS) |
| `scripts/verify-arias-particellas.mjs` | Auditoría BD vs Drive |
