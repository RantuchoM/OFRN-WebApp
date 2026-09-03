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
1. Resolver bloque e índice origen/destino (fila o zona `block-*-start|end`).
2. **Preview optimista:** `computeReorderedRepertorios` + `setRepertorios` (orden final inmediato).
3. Marcar `pendingDriveSyncIds` (filas que cambiaron de posición).
4. Persistir `orden` 1..n de cada bloque afectado (`persistBlockOrden`).
5. `await autoSyncDrive()` (`sync_repertoire_shortcuts`); al terminar, limpiar highlight.

### Servicio (giraService.js)
- **normalizeRepertorioBlockOrden:** sigue usándose en otros flujos (p. ej. insertar obra).
- El drag & drop ya no depende de `updateWorkPosition` + normalize para el caso principal: escribe el orden final del preview.

### Estado de carga
- **savingPosition:** `true` mientras se persiste el orden en BD.
- **pendingDriveSyncIds:** ids de `repertorio_obras` que titilan (`animate-pulse` + anillo ámbar) en su lugar final hasta que `sync_repertoire_shortcuts` confirme.
- Banner sticky: «Guardando orden…» → «Orden aplicado — sincronizando carpetas en Drive…».

### Completado (2026-08-12) — Feedback visual de reorder + Drive
- [x] Reorder **optimista** al soltar (o con flechas): la lista queda en el orden final de inmediato (`arrayMove` / zonas inicio-fin).
- [x] Persistencia del bloque completo (`orden` 1..n) alineada con el preview (evita desfase por empates en normalize).
- [x] Filas afectadas titilan hasta que la Edge Function `manage-drive` (`sync_repertoire_shortcuts`) responde; luego se apaga el highlight.
- [x] Si falla DB/Drive, se hace `fetchFullRepertoire()` para revertir a la verdad remota.

---

## 3. Esquema de datos

- **repertorio_obras:** `id`, `id_repertorio` (FK a `programas_repertorios`), `id_obra`, `orden`, `id_arco_seleccionado`, ...
- **programas_repertorios:** Bloques de repertorio por gira (id, nombre, orden, id_programa).
- **programas_repertorios_grupos:** Grupos de convocatoria del bloque `(id_repertorio, id_grupo)` → `giras_grupos`. Vacío / sin filas = el bloque aplica a todo el roster. Misma semántica que `eventos_grupos`.
- **obras_arcos:** Sets de arcos por obra (id, id_obra, nombre, link, descripcion, id_drive_folder).

---

## 4. Filtros predeterminados por orgánico

- **Componente compartido:** `src/components/repertoire/InstrumentationFilterModal.jsx` + `RepertoireWorkPickerModal.jsx`
- **Presets:** `src/utils/instrumentationFilterPresets.js` (`buildMaxInstrumentationFilterDefaults` desde roster convocado)
- **Ubicaciones:** `RepertoireWorkPickerModal` (Agregar Obra en repertorio de gira + opciones de placeholder) y columna Orgánico en `RepertoireView.jsx`
- **Default orgánico gira:** al abrir el picker con `programId`, se precargan reglas `lte` por familia según músicos convocados (excl. ausentes)
- **Chips de un clic:** Solo cuerdas, Quinteto de maderas, Quinteto de metales, Vientos (sin cuerdas), Solo percusión
- **Comportamiento:** al elegir un preset se aplican `stringsFilter`, `strictMode` y reglas de instrumentos; el botón Orgánico muestra el nombre del preset activo
- **Modal Agregar Obra:** un preset o filtro de orgánico activo dispara la carga de la biblioteca (hasta ~2000 obras) sin exigir texto en compositor/obra/arreglador
- **Panel de filtro:** altura limitada al viewport (abre arriba del botón si no hay espacio abajo); cuerpo con scroll y footer fijo (Limpiar / Filtrar siempre visible)
- **Orgánico indeterminado:** si una obra no tiene orgánico claro (vacío, texto vago o sin notación parseable), **no se excluye** por el filtro de orgánico (`workMatchesInstrumentationFilter` en `instrumentation.js`; aplica en picker y `RepertoireView`).
- **Vista móvil del picker (2026-06-22):** tarjetas compactas al estilo `RepertoireManager`. Filtros arriba, **una línea por filtro** (etiqueta a la izquierda, campo/desplegable a la derecha): Compositor, Obra, Arreglador, Orgánico.
- **Compositor en escritorio (picker):** celda con apellido arriba y nombre debajo (hasta 2 compositores), igual que `RepertoireManager`.

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
| `src/utils/obraEstadoStyles.js` | Paleta unificada de colores/clases por `obras.estado` (filas, cards móviles, badges, tags, WorkForm). |
| `src/components/repertoire/RepertoireManager.jsx` | BowingSetManager assign, columna GripVertical, DndContext, SortableContext, SortableRepertorioRow, handleDragEnd, savingPosition, dragOverId. |
| `src/components/repertoire/InstrumentationFilterModal.jsx` | Modal compartido de filtro por orgánico con presets. |
| `src/components/repertoire/RepertoireWorkPickerModal.jsx` | Modal «Buscar Obra»; vista móvil con tarjetas al estilo RepertoireManager. |
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
- `createArrangementFromExistingWork(sourceWorkId)`: clona metadatos y relaciones de compositores/arregladores; sin Drive; estado Solicitud; dispara mail `nueva_obra` al archivista (igual que crear solicitud normal). Inserta en `arreglos_referencias` la obra origen como referencia (`seedArregloReferenciaObraOrigen`).
- **Eliminar solicitud / obra:** antes de borrar `obras`, eliminar filas en `arreglos_referencias` con `id_obra_referencia = obra.id` (FK era `ON DELETE SET NULL` y rompía `arreglos_referencias_has_target` si `link` era NULL). Migración `20260817193000` → `ON DELETE CASCADE` en `id_obra_referencia`. Fix UI: `ArreglosDashboard.deleteArregloCompleto`, `RepertoireView.confirmDeleteWork`.
- En `RepertoireManager` (`context="program"`): al crear nuevo arreglo desde `WorkForm` (botón «Nuevo Arreglo»), `handleWorkSaved` inserta la obra clonada en el mismo bloque **debajo de la fila original** (`addWorkToBlockAfter` + `normalizeRepertorioBlockOrden`).
- `RepertoireManager` ya pasa `context="program"` y `onInsertExistingWork` al modal de WorkForm.

### Completado
- [x] Desplegable contextual en título
- [x] Acciones archive vs program
- [x] Opción continuar con obra nueva

### Estado «Oficial» (`WorkForm`)
- Solo un **admin** puede pasar una obra a `Oficial`.
- Una vez en `Oficial`, **nadie** (incluido admin) puede cambiar el estado: el selector se reemplaza por etiqueta de solo lectura.
- Para otra versión instrumental o de arreglo, usar **Nuevo Arreglo** (`createArrangementFromExistingWork` / botón en footer del formulario).
- [x] Bloqueo en `updateField` y `saveFieldToDb`
- [x] UI de estado no editable cuando `estado === "Oficial"`

### Encargo «Para arreglar» (`WorkForm`)
- Al pasar a `Para arreglar` o cambiar el integrante asignado, se asigna `id_integrante_arreglador` (default `4340365` si vacío) **y** ese integrante queda como arreglador visible de la obra (`id_arreglador` + `obras_compositores.rol = 'arreglador'`). Helper: `src/utils/syncObraArreglador.js`. Mismo sync en fila rápida del dashboard de arreglos.
- Al pasar a `Para arreglar`, el guardado de estado + integrante es único — evita error de validación por estado React desactualizado tras crear un arreglo nuevo.
- El mail `encargo_arreglo` **no** se dispara automáticamente al cambiar estado ni al crear la obra.
- UI: fecha estimada + botón **«Enviar mail de asignación»** (habilitado solo con fecha y obra persistida). Tras envío exitoso: `obras.encargo_arreglo_mail_enviado_at`; reenvío con `ConfirmDialog`.
- [x] Fix validación post-creación de arreglo
- [x] Envío manual de mail con confirmación explícita
- [x] Nuevo arreglo desde programa: inserción en bloque debajo del original
- [x] **Botón «+ Encargo»** en cabecera del formulario (solo editor/admin, obra persistida): menú con **Encargar arreglo** (nueva obra `Para arreglar` + referencia a la origen + mail) y **Solicitar ajuste** (solo si la obra está `Entregado`/`Oficial`; inserta en `obras_ajustes` + mail `encargo_ajuste`). Impacta en el módulo Arreglos.
- Lógica compartida en `src/utils/encargoArregloService.js` (`createEncargoArregloObra`, `createObraAjusteSolicitud`, `sendEncargoArregloMail`, `sendEncargoAjusteMail`) — usada por `WorkForm` y `ArreglosDashboard`.
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
- [x] Estado sin selección compacto: ayuda movida a signo de pregunta junto a «Preselección desde Drive»

---

## 8. RepertoireView móvil: tarjetas compactas y filtros por chips

### Objetivo
Optimizar `src/views/Repertoire/RepertoireView.jsx` en pantallas móviles para mostrar más obras por viewport, manteniendo los colores por estado y evitando una tabla horizontal pesada.

### Comportamiento implementado (2026-06-13)
- En móvil, el listado usa **cards compactas** en lugar de la grilla desktop.
- Cada card conserva el color de estado mediante el fondo de la tarjeta; sin badge genérico de estado en móvil (excepción: chip «Para arreglar» junto al título).
- La información prioritaria entra en pocas líneas: título, compositor, estado, arreglador opcional, duración, orgánico, próxima/última gira y tags principales.
- Todas las acciones móviles son iconográficas: seleccionar, audio, partitura, Drive, asignar a gira, historial, editar y eliminar.
- Eliminar obra (desktop y móvil): `ConfirmDialog` con título de la obra antes del borrado definitivo en Supabase.
- La grilla con headers/filtros por columna permanece en desktop (`md+`) sin cambios funcionales.
- Ajuste v3: se quita el badge de estado en móvil y el estado pasa a comunicarse por un fondo de card más visible (`getEstadoMobileCardBgClass`).
- Ajuste v3: Drive/carpeta se ubica debajo del checkbox de selección, y las cuatro acciones principales (asignar, historial, editar, eliminar) se apilan verticalmente a la derecha sin aumentar el alto de la card.
- Ajuste v4: las acciones principales pasan a un menú de tres puntos (`IconMoreVertical`) a la derecha para no afectar la altura; la carpeta/Drive se desplaza levemente hacia abajo bajo el checkbox.
- **Estado «Para arreglar» (2026-06-24):** paleta naranja/marrón centralizada en `src/utils/obraEstadoStyles.js`. En `RepertoireView`, chip junto al título solo en móvil; en desktop el estado se muestra en la columna Estado. En `RepertoireManager`, tag **«Para arr.»** junto al título (móvil y escritorio) vía `getObraEstadoTitleTag`.

### Filtros móviles
- Se agrega un menú superior de filtros con `IconFilter`, siguiendo el patrón de filtros tipo chip usado en vistas compactas.
- **Búsqueda rápida (2026-06-29):** input junto al embudo de filtros. Busca en título, compositor, arreglador y país a la vez; cada palabra (separada por espacio o `+`) debe coincidir (AND), p. ej. `Beeth Sinf` → sinfonías de Beethoven. El embudo abre el panel de **filtros avanzados** (obra/compositor/país/arreglador por campo, estado, orgánico, etc.).
- Los filtros se aplican desde el menú y aparecen como **chips removibles** debajo de la barra móvil.
- Chips soportados: búsqueda rápida, obra, compositor, país, arreglador, estado, solicitante, duración, fechas, observaciones, tags, orgánico y legacy "Oficial sin Drive".
- El filtro por orgánico reutiliza `InstrumentationFilterModal` con `anchorRef` para posicionarse correctamente en viewport móvil.
- El botón de limpiar filtros se muestra como acción iconográfica cuando hay chips activos.

### Selección móvil (v2)
- El título móvil se compacta a **Archivo** y las acciones de administración del archivo quedan en la línea superior.
- La barra completa `RepertoireSelectionBar` permanece solo en desktop.
- En móvil, `RepertoireSelectionBar` usa `variant="mobile-menu"`: todas las acciones de selección se agrupan en un desplegable junto al botón de filtros.
- El menú móvil incluye selección de obras filtradas, preselección desde Drive, nombre de selección, editar orden, tags, cargar a programa, PDF, sincronizar Drive y vaciar selección.
- `RepertoireSelectionOrderModal` evita drag & drop en móvil y usa botones subir/bajar por obra; desktop conserva DnD.

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

### Nabucco IMSLP — Coro de los Esclavos (2026-08-24)
- Carpeta ARIAS [Verdi, G. - Coro de los Esclavos ('Nabucco')](https://drive.google.com/drive/folders/1JDPuJjP9-36lQ5RTOJSVq9dzFmMUCKqV): mapa IMSLP previo cicló vientos (p.ej. “Oboe 1-2” = Picc+Flauta).
- OCR → split a **25 particellas** individuales; SCORE sin portada tipográfica (21 p.).
- Obra BD **id 3548** re-sync: instrumentación `2.2.2.2 - 4.2.3.1 - Timp - Str`.

| Script | Rol |
|--------|-----|
| `scripts/lib/nabuccoCatalog.mjs` | Manifiestos split/crop + metadata obra 3548 |
| `scripts/process-nabucco-local.mjs` | Split/crop/rename en sync local ARIAS |
| `scripts/generate-nabucco-sync.mjs` | Seed `supabase/seed_nabucco_sync.sql` |

### Falla — Danza Española Nro 1 ('La Vida Breve') (2026-06-19)
- Carpeta [Para acomodar / Falla](https://drive.google.com/open?id=16TvE6QokADJSSk9gpZXpP1D8GcrngIQS): 16 PDFs IMSLP → **26 particellas** canónicas.
- Obra BD **id 3532** (`Danza Española Nro 1. 'La Vida Breve'`, Falla): sin particellas previas.
- Proceso: dividir combinados (vientos/metales/perc), recortar portadas IMSLP, renombrar `Instrumento - Título - Compositor.pdf` o `Instrumento - op.11. Título - Compositor.pdf` si hay catálogo (combinados: `1y2`, `3y4`, `1y2y3`).
- Instrumentación resultante: `3.3.3.1 - 2.1.1.1 - Timp.+2 - Hp - Key - Str`.

| Script | Rol |
|--------|-----|
| `scripts/lib/fallaCatalog.mjs` | Manifiestos de páginas + metadata obra 3532 |
| `scripts/lib/pdfPartsRenaming.mjs` | Renombrado canónico; combinados con sufijo `1y2` (no `1-2`) |
| `scripts/process-falla-local.mjs` | Split/crop/rename en sync local `H:\...\Para acomodar` |
| `scripts/generate-falla-sync.mjs` | Genera `supabase/seed_falla_sync.sql` |

- [x] PDFs procesados y sincronizados a Drive con nombres canónicos
- [x] Seed SQL generado (`seed_falla_sync.sql`) — pendiente ejecutar en Supabase

### Mendelssohn-Bartholdy — Sinfonía Nro 1 en Do Mayor, op.11 (2026-06-22)
- Carpeta [Para acomodar / Mendelssohn](https://drive.google.com/open?id=1xDSqCR9Y7NPifvrD84ZpXMi_ns6YJFqR): 12 PDFs IMSLP (PMLP18966) → **19 particellas** canónicas.
- Obra BD **id 3535** (insert nueva, Mendelssohn-Bartholdy): `2.2.2.2 - 2.2.0.0 - Timp - Str`.
- Proceso: dividir vientos combinados + cello/bass IMSLP, recortar portadas, renombrar `Instrumento - op.11. Título - Mendelssohn-Bartholdy, F.pdf`.
- Edición cello/bass: un PDF compartido para Violoncello y Contrabajo (partbook IMSLP «Cellos/Basses»).

| Script | Rol |
|--------|-----|
| `scripts/lib/mendelssohnCatalog.mjs` | Manifiestos OCR + metadata obra 3535 |
| `scripts/process-mendelssohn-local.mjs` | Split/crop/rename en sync local |
| `scripts/generate-mendelssohn-sync.mjs` | Genera `supabase/seed_mendelssohn_sync.sql` |

- [x] PDFs procesados y sincronizados a Drive con nombres canónicos
- [x] Seed ejecutado en Supabase (obra 3535, 19 particellas)

### Mendelssohn-Bartholdy — Sinfonía para Cuerdas Nro 1 en Do Mayor, MWV N 1 (2026-06-22)
- Carpeta [Para acomodar](https://drive.google.com/open?id=1tF11J6HKBGtdFjeUZL47n7ppL_f4WBRS): 6 PDFs IMSLP (PMLP207269) → **6 particellas** (solo renombrado, sin split/crop).
- Obra BD **id 3536** (insert nueva): `Str`.
- PDFs ya separados por instrumento; renombrado `Instrumento - MWV N 1. Título - Mendelssohn-Bartholdy, F.pdf`.

| Script | Rol |
|--------|-----|
| `scripts/lib/mendelssohnStringSym1Catalog.mjs` | Mapa de renombrado + metadata obra 3536 |
| `scripts/process-mendelssohn-string-sym1-local.mjs` | Renombra carpeta y PDFs en sync local |
| `scripts/generate-mendelssohn-string-sym1-sync.mjs` | Genera `supabase/seed_mendelssohn_string_sym1_sync.sql` |

- [x] PDFs renombrados y sincronizados a Drive
- [x] Seed ejecutado en Supabase (obra 3536, 6 particellas)

### Silva — Marcha de San Lorenzo [cuerdas] (2026-06-22)
- Carpeta [Para acomodar](https://drive.google.com/drive/folders/1jBCHMNcerv3K9aoq17q9V_ekoCxhFAry): 1 PDF combinado → **5 particellas** (SCORE + 4 cuerdas).
- Obra BD **id 3537** (insert nueva; distinta de **2276** versión vientos): `Str`.
- Arr. Silva/Benielli para orquesta de cuerdas; split por páginas (portada/letra excluidas).

| Script | Rol |
|--------|-----|
| `scripts/lib/sanLorenzoCuerdasCatalog.mjs` | Manifiesto split + metadata obra 3537 |
| `scripts/process-san-lorenzo-cuerdas-local.mjs` | Split/rename en sync local |
| `scripts/generate-san-lorenzo-cuerdas-sync.mjs` | Genera `supabase/seed_san_lorenzo_cuerdas_sync.sql` |

- [x] PDFs procesados y sincronizados a Drive
- [x] Seed ejecutado en Supabase (obra 3537, 5 particellas)

### Massenet — Méditation de Thaïs (2026-08-03)
- Carpeta [Para acomodar](https://drive.google.com/open?id=11dToRcA16WjUXoyGZBOOXRsIkhdh6kSC): **19 PDFs** ya canónicos → **21 particellas** (Cornos `1y2` / `3y4` expandidos).
- Obra BD **id 3559** (insert nueva, Jules Massenet): `Vn - 2.2.2.2 - 4.0.0.0 - Hp - Str + Coro`.
- Sin split/crop: nombres `Instrumento - Título - Massenet, J.pdf`; `link_drive` directo a la carpeta original.
- Incluye Violín SOLO (`es_solista`), Coro SATB, SCORE, Arpa, cuerdas y vientos dobles.

| Script | Rol |
|--------|-----|
| `scripts/lib/massenetMeditationCatalog.mjs` | Metadata + Drive folder id (obra 3559) |
| `scripts/generate-massenet-meditation-sync.mjs` | Genera `supabase/seed_massenet_meditation_sync.sql` |

- [x] Matcher: 19/19 PDFs → 21 particellas
- [x] Seed ejecutado en Supabase (obra 3559, 21 particellas)

---

## 9. Gestión de particellas en WorkForm

### Seed LEMA — Acomodar (2026-06-15)

### Política
- Carpeta Drive: [LEMA — Acomodar](https://drive.google.com/drive/folders/10JQJW7YX7UNmWciqgJ-EiqaldM_e0Tvi); sync local `H:\Mi unidad\Archivo - para organizar\LEMA - Acomodar`.
- **`link_drive`** apunta a la carpeta original en LEMA; **no** se copia al Archivo.
- Solo se renombran **carpetas** al formato `Compositor-Lema - Título` (o `Lema, G. - …` / `Capó-Lema - …`); **PDFs sin tocar**.

### Scripts
| Script | Rol |
|--------|-----|
| `scripts/lib/lemaCatalog.mjs` | Catálogo 17 obras (14 renombradas + 3 ya canónicas) |
| `scripts/process-lema-local.mjs` | Renombra carpetas en sync local |
| `scripts/generate-lema-sync.mjs` | Genera `supabase/seed_lema_sync.sql` (updates + inserts + particellas) |

### Completado
- [x] 14 carpetas renombradas localmente (Drive sync)
- [x] 6 updates (`1356`, `1357`, `1627`, `1432`, `1368`, `1578`) + 11 inserts nuevas
- [x] Particellas e instrumentación desde Drive (matcher existente, sin renombrar PDFs)
- [ ] Carpeta `REVISAR` — pendiente de catálogo

---

### Completado (2026-08-11) — Menús desplegables visibles al fondo del viewport
- [x] **Problema:** en Archivo (`RepertoireView`) los menús custom (`absolute top-full`) se recortaban por `overflow-hidden`/`overflow-auto` de la página, o se abrían siempre hacia abajo y las últimas opciones quedaban fuera del viewport (⋮ de fila, filtros móviles, tags, Columnas, selección móvil).
- [x] **Patrón:** helper `src/utils/fixedMenuPosition.js` — si no hay espacio abajo, el menú abre hacia arriba; `maxHeight` + `overflow-y:auto`; portal a `document.body` con `z-[100]` y `data-fixed-menu`.
- [x] **Aplicado en:** `WorkRowActionMenu`, `ColumnManager`, panel de filtros móviles, `TagMultiSelect`, menús de `RepertoireSelectionBar` (selección móvil + «Ordenar por»), filtro Orgánico desktop (`anchorRef` → portal/flip ya existente en `InstrumentationFilterModal`), autocompletado de instrumento y sugerencias de título en `WorkForm`.

### Completado (2026-07-03)
- [x] **Menú de acciones (⋮) en RepertoireView:** botones de fila (desktop y móvil) unificados en `WorkRowActionMenu` con Asignar, Historial, Abrir Drive / Copiar link Drive (si aplica), Copiar enlace al archivo, Nuevo arreglo, Editar y Eliminar.
- [x] **WorkForm — Nuevo arreglo en borrador:** `loadArrangementDraftFromSource` precarga datos de la obra origen sin persistir; la referencia en `arreglos_referencias` se crea al guardar (`Crear solicitud` / `Guardar y Cerrar`). Aplica desde el menú del archivo, el botón «Nuevo Arreglo» del formulario y las sugerencias de duplicados.
- [x] **Tabla de archivo:** encabezados centrados y bordes visibles en grilla desktop (`slate-300` con opacidad) para separar filas/celdas sin recargar la lectura.
- [x] **Orden por obra:** el sorter y el filtro de título usan `titulo_plain` (texto visible sin rich text, entidades HTML comunes ni comillas tipográficas) en vez de `titulo` crudo.

---

### Completado (2026-07-23) — Filtro «Ya programado»
- [x] **Toggle «Ya programado»** en toolbar desktop y filtros móviles (chip removible + Limpiar Filtros). Muestra solo obras con al menos un `programas` asociado en estado **Vigente** (pasadas y futuras).
- [x] **Columna condicional:** con el filtro activo, el slot `proxima_gira` muestra **Programas** (lista multilínea `dd/MM/yy - nomenclador. nombre_gira`, únicos por id, ordenados por fecha). Sin filtro, se mantiene **Próxima Gira**. Ordenable por `primer_programa_fecha_desde` (fecha del programa vigente más antigua).
- [x] **Select ampliado:** `programas` incluye `nomenclador` y `estado`; campos derivados `programas_vigentes` / `ya_programado` / `primer_programa_fecha_desde`.
- [x] **Orden por defecto:** `compositor_full` asc con desempate `titulo_plain` (también en `upsertWorkLocally`).
- [x] **Descargar (solo con Ya programado activo):** modal `YaProgramadoExportModal` (portal `z-[100]`) con filtro por tipo de programa (`PROGRAM_TYPES`), período (todos / solo histórico / solo futuro), orden multicriterio (añadir columnas Asc/Desc), y export Excel/PDF. Columnas visibles del Archivo **sin Estado**; Programas filtrados por tipo y período. Utils: `prepareYaProgramadoExportWorks` + `repertoireYaProgramadoExport.js`.
- [x] **Ordenar selección:** barra y modal «Editar orden» permiten reordenar por Compositor / Obra / Giras programadas (`repertoireSelectionSort.js`).

---

### Completado (2026-06-13)
- [x] Barra «Instrumento / Cant.»: input de cantidad y botón `+` agrupados con `shrink-0` para evitar desborde horizontal junto al scroll del modal.
- [x] Eliminación individual y masiva de particella con `ConfirmDialog` (estilo destructivo), alineado con el design system del proyecto.
- [x] **Ingreso por orgánico de vientos** en `WorkForm.jsx` y `DriveMatcherModal.jsx`: campo con placeholder `2.2.3.2 - 4.3.1.2` que genera particellas (Fl–Tba) vía `parseOrganicoVientosInput` (`src/utils/particellaOrganicoInput.js`) y `OrganicoVientosAddField.jsx`. Entrada solo numérica (8 dígitos) con autoformato progresivo (`22324312` → `2.2.3.2 - 4.3.1.2`).
- [x] **Matcher Drive centralizado** en `src/utils/drivePartMatcher.js`: archivos combinados (`Corno 1y2`, `1 y 2`, `1&2`, `1-2`, `1/2`) expanden a varias particellas con el mismo link; sugerencias IconBulb + «Vincular sugerencias» para placeholders sin enlace en `DriveMatcherModal.jsx`; banner «Agregar faltantes» para crear las particellas detectadas en PDFs que aún no estén cubiertas por la obra. Ver `docs/drive-algo-deep-dive.md`.
- [x] **Clarinete Bajo (`07b`):** prefijos `Clarinete Bajo` / `bass clar` / `Cl.B` ya no caen en Clarinete (`07`). Corregidas particellas gira 12: obra 3198 (ClB) y 3199 (Corno 2 + link Drive).

### Completado (2026-09-01) — Un bel di vedremo (obra 3199)
- [x] Completadas particellas faltantes desde set completo local (`Downloads/unbeldi`) → carpeta ARIAS [Puccini, G. - Un bel di vedremo [aria]](https://drive.google.com/drive/folders/1-OtkHGIVh05e4rSFqUMD2jaVPSjW_5mY).
- [x] Nuevas en Drive + BD: Clarinete 1, Clarinete Bajo (`07b`), Fagot 1/2 (PDF `1y2`), Trompeta 1, Trombón 1/2 (PDF `1y2`), Trombón Bajo. Corno 2 renombrado a canónico.
- [x] Seed: `supabase/seed_unbeldi_missing_parts.sql`. Instrumentación: `2.3.3.2 - 4.2.4.0 - Perc.x2 - Hp - Str` (29 particellas).
- Nota: en Downloads queda `Claron.pdf` (Clarín) sin incorporar; no hay instrumento Clarín en catálogo y el set numerado butterfly ya cubre Tp 1–2.

### Completado (2026-09-02) — Un bel di vedremo [recorte Eguiarte]
- [x] Nueva obra en archivo (variante de 3199): título BD `Un bel di vedremo. <i>'Madama Butterfly'</i> [recorte Eguiarte]`.
- [x] Carpeta ARIAS [Puccini, G. - Un bel di vedremo [recorte Eguiarte]](https://drive.google.com/open?id=1NGTb2jX5gGZ09qzikVJsD39Pln4q_qFy): 31 PDFs renombrados canónicamente (mapa explícito; el PDF «Fagot I» era Fagot II; eliminado `.lnk` roto).
- [x] Scripts: `unbeldiEguiarteCatalog.mjs`, `process-unbeldi-eguiarte-local.mjs`, `generate-unbeldi-eguiarte-sync.mjs` → `supabase/seed_unbeldi_eguiarte_sync.sql` (aplicado).
- [x] Obra **3625**. Instrumentación: `3.3.3.1 - 4.3.4.0 - Perc.x2 - Hp - Str` (30 particellas; SCORE+SCORE 2 fusionados en un slot; **falta Fagot 1**).

---

### Completado (2026-08-10) — DriveMatcherModal móvil
- [x] **Z-index:** overlay del portal a `z-[9999]` (alineado con `LinksManagerModal` y por encima del sidebar móvil de `App.jsx` en `z-[100]`). Confirmaciones destructivas del matcher en `z-[10050]`.
- [x] **Layout móvil:** sheet a pantalla completa (`100dvh`, sin padding del overlay); en `md+` se mantiene el modal centrado `90vh`.
- [x] **Pestañas Particellas / Drive** bajo `md` (dos columnas solo en desktop). CTA «Asignar» al seleccionar archivos en Drive; banner de instrucción en Particellas.
- [x] **Touch:** acciones editar/eliminar visibles sin hover; botón Cerrar a ancho completo en móvil; safe-area inferior.

---

## 10. Mis Partes — descarga ZIP

### Objetivo
Permitir que el músico descargue de una vez todas sus partes disponibles desde la vista `Mis Partes`.

### Implementación
- **Componente:** `src/views/Giras/MyPartsViewer.jsx`.
- Botón **«Descargar todo»** en el header junto a «Tu Asignación».
- La descarga usa `manage-drive` (`action: get_temp_token`) para obtener acceso temporal a Drive y luego baja cada `url_archivo` de las particellas asignadas.
- El ZIP se arma en el cliente con `pizzip` en una estructura plana, sin carpetas internas.
- Cada PDF usa el nombre real del archivo origen de Drive antecedido por orden correlativo (`01 - NombreOriginal.pdf`, `02 - NombreOriginal.pdf`, etc.).
- Si una parte tiene múltiples enlaces/versiones, el ZIP incluye todas las versiones disponibles.
- Si algún archivo falla pero otros descargan correctamente, el ZIP se genera igual e incluye `errores_descarga.txt` con el detalle de omitidos.

### Completado
- [x] Botón visible en Mis Partes.
- [x] Descarga autenticada de archivos Drive.
- [x] ZIP comprimido con todas las partes disponibles.
- [x] Progreso y aviso de errores parciales.

### Completado (2026-08-12) — Agrupación por bloque de repertorio
- [x] **MyPartsViewer:** divisor por bloque (`programas_repertorios`) con nombre y enlace **Carpeta Gral.** del bloque (`google_drive_folder_id`).
- [x] Obras sin parte asignada (`NO_ASSIGNED`) se muestran atenuadas (móvil y escritorio).
- [x] **ProgramSeating:** pestañas por bloque de repertorio; la grilla (móvil y escritorio) filtra columnas al bloque activo. Exportaciones PDF/Excel siguen usando el programa completo.

### Completado (2026-08-13) — Chrome de pestañas en ProgramSeating
- [x] Pestañas tipo carpeta (mismo truco que `ParticellaDownloadModal`): barra `bg-slate-100` con `border-b border-slate-300` a ancho completo; activa blanca con `border-x/t`, `border-b-white` y `-mb-px` (queda unida a la línea); inactivas con fondo semitransparente, padding y hover (no texto suelto).
- [x] Etiqueta **Bloques** compacta; badges de cantidad con más contraste (activa indigo relleno, inactiva slate).
- [x] a11y: `role="tablist"` / `role="tab"` / `aria-selected` / `tabIndex` roving; flechas ←/→, Home y End; panel `role="tabpanel"` ligado al tab activo.
- [x] Scroll horizontal si hay muchos bloques (p. ej. gira 12 con King Crimson).
- [x] Sin cambios de lógica de seating (`activeBlockId`, filtro de columnas, roster / ausencia / exportaciones).

### Completado (2026-08-13) — Grupos de convocatoria en bloques de repertorio
- [x] Tabla `programas_repertorios_grupos` (migración `20260813140000_programas_repertorios_grupos.sql`, applied linked). Vacío = todos; ≥1 grupo = solo esos miembros.
- [x] **Staff** (`RepertoireManager`): multi-select de grupos en el header del bloque, **oculto** si la gira no tiene grupos. Placeholder “Todos…”.
- [x] **Músicos**: chips de grupo en el bloque (repertorio + Mis Partes). Mis Partes omite bloques de grupos a los que no pertenece.
- [x] **Seating**: con grupo en el bloque activo, el roster visible (vientos + atriles + **panel de cuerdas**) se recorta a miembros del grupo, encima de `useGiraRoster` / ausencia / confirmado. Sin grupo = todos. PDF/Excel y descarga de particellas siguen el programa completo. Chips en las pestañas de bloque (chrome tipo carpeta intacto).
- [x] **Configs de cuerdas**: oferta «Config para este bloque» (duplica + asocia **1:1** al bloque activo) cuando la disposición es compartida. Sin chips multi-asociación.
- [x] No se inventa otro sistema de grupos: reutiliza `giras_grupos` / `giraGruposService` / chips de agenda.

### Completado (2026-08-13) — Chip de grupo compacto en pestañas inactivas de Seating
- [x] Pestaña **activa**: chip con nombre completo (mismo `GiraGrupoChips` que repertorio / Mis Partes / agenda).
- [x] Pestaña **inactiva**: `compact` → iniciales de palabras significativas (`King Crimson (OFRN)` → **KCO**, `Gala Lírica` → **GL**, `Bahiano` → **B**); color del grupo intacto; `title` / tooltip con el nombre completo.
- [x] Helper `grupoNombreInitials` en `GiraGrupoChips.jsx`. Sin cambio de filtro de seating ni de asignación de grupos.

### Completado (2026-08-15) — Stick-it de observaciones en Mis Partes
- [x] `MyPartsViewer` lee `repertorio_obras.notas_especificas` (las mismas observaciones tipo post-it de `ProgramRepertoire` / `NotasProgramaStickyCell`).
- [x] Escritorio: columna **Observaciones** con el mismo panel amarillo (sombra, rotación leve, ícono alerta).
- [x] Móvil: el stick-it aparece bajo compositor en la tarjeta compacta.
- [x] Solo lectura; vacío se muestra como raya en escritorio y se omite en móvil. No cambia asignación, ZIP ni filtros de grupo.

---

### Completado (2026-08-10) — Para acomodar: Charbonnier *Voces latinoamericanas*
- [x] Obra **3201** (`Voces latinoamericanas…`, gira 12): carpeta Drive [1O1SbcEF6V0g9F4hxdwC-Lsns9IcFJjL3](https://drive.google.com/open?id=1O1SbcEF6V0g9F4hxdwC-Lsns9IcFJjL3) renombrada a `Charbonnier, M. - Voces latinoamericanas`.
- [x] Split de PDF de partes (39 p.) + crop de score (18 p. música) → **17** PDFs canónicos.
- [x] Scripts: `scripts/lib/charbonnierVocesCatalog.mjs`, `process-charbonnier-voces-local.mjs`, `generate-charbonnier-voces-sync.mjs`.
- [x] Seed `supabase/seed_charbonnier_voces_sync.sql` aplicado en linked: particellas + `instrumentacion = S. - 2.2.2.2 - 2.0.0.0 - Str`, Soprano como solista, SCORE → Director.
- [x] Fix: `Fagot 1` / `Corno F 1` en `pdfPartsRenaming.mjs`; suffix de índices en `split_and_rename_parts.py` solo al repetir instrumento.

### Completado (2026-08-11) — Para acomodar: Mozart *Dies Irae. Requiem, K. 626*
- Carpeta [Para acomodar](https://drive.google.com/drive/folders/1tRERQ7Sb-QFYGmBcmu51T04ZSBOkpJLG): 17 PDFs del Réquiem completo (Robbins Landon / Breitkopf) → recorte **III. Sequenz / 1. Dies irae** (hasta Tuba mirum) + rename `Instrumento - Dies Irae. Requiem, K. 626 - Mozart, W.A.pdf` (**Requiem** sin tilde). `PORTADA.png` sin tocar.
- Obra BD **id 3563** (ya existía; compositor Mozart 235): se actualiza título (sin tilde), `link_drive` original, instrumentación y particellas. **No** `copiar_carpeta_a_archivo`.
- Instrumentación esperada: `0.0.2.2 - 0.2.3.0 - Timp - Key - Str + Coro` (Órgano no existe en `instrumentos`; el seed lo mapea a Piano/Key).
- Crops OCR (páginas originales → quedan): Clarinete 1y2 5–6 (2); Contrabajo 4–5 (2); Coro 15–21 (7, Klavier-Auszug Brissler); Fagot 1 3 (1); Fagot 2 3–4 (2); Perc Timbal 1 (1, compacto con Introitus/Kyrie); SCORE 27–41 (15); Trombón 1 3 (1); Trombón 2 2 (1); Trombón 3 2 (1); Trompeta 1/2 1 (1, compactos); Viola 3 (1); Vc 4–5 (2); Vn1 4–5 (2); Vn2 6–7 (2); Órgano 10–12 (3, Tuba a mitad de p.12).
- Matcher: `Clarinete 1y2` se conserva (no colapsar a `Clarinete Bb`); `Trompeta 1` / `Trombón 1` no colapsan al genérico.

| Script | Rol |
|--------|-----|
| `scripts/lib/mozartDiesIraeCatalog.mjs` | Metadata obra 3563 + manifiesto de crops |
| `scripts/process-mozart-dies-irae-local.mjs` | Crop + rename carpeta/PDFs en sync local |
| `scripts/generate-mozart-dies-irae-sync.mjs` | Genera `supabase/seed_mozart_dies_irae_sync.sql` |

- [x] PDFs recortados y renombrados en sync local (17 + PORTADA.png); Drive File Stream ya lista los nombres nuevos
- [x] Seed SQL generado (`supabase/seed_mozart_dies_irae_sync.sql`, 18 particellas, `0.0.2.2 - 0.2.3.0 - Timp - Key - Str + Coro`)
- [ ] Seed **pendiente ejecutar en Supabase** (no corrido en esta sesión)

---

### Completado (2026-08-12) — Show Invap → gira 157 (Jazz Band)
Fuente Drive: [Show Invap](https://drive.google.com/drive/folders/1JmXOBx9D9K0NNRiwdCIy4Jdk2SD5ZX45). Programa **157** / bloque repertorio **132**.

**Reutilizadas (solo a repertorio):** 3303 Almost Like…, 3317 Bernie's Tune, 3305 I Can't Get Started, 3308 If I Should Lose You, 3304 Summertime, 3306 Time After Time (todas Lema arreglador / `[bronces 2120 perc key]` salvo Bernie's).

**Altas nuevas (copia a Para acomodar + particellas + duración MP3):**

| id | Título | Rol Lema | Carpeta Para acomodar | Dur. |
|----|--------|----------|----------------------|------|
| 3566 | Cantaloupe Island | arreglador | `Hancock-Lema - Cantaloupe Island` | 73s |
| 3567 | Lester Leaps In | arreglador | `Young-Lema - Lester Leaps In` | 71s |
| 3568 | The Mexican Connection | arreglador | `Joel-Lema - The Mexican Connection` | 220s |
| 3569 | El Vuelo del Wachinango | **compositor** (sin arreglador) | `Lema, G. - El Vuelo del Wachinango` | — (sin MP3) |

- Script: `scripts/process-invap-show.mjs` (+ seeds `supabase/seed_invap_show_new.sql`, `seed_invap_gira157.sql`).
- Matcher: Órgano→Piano (id 15); tipografía `Tombón`→Trombón; strip `Copia de`; batería→Percusión.
- [x] 10 obras en `repertorio_obras` id_repertorio=132.

### Completado (2026-08-13) — LCG Dropbox vs BD + Fripp *Larks' Tongues in Aspic*

Dropbox compartido [ARREGLOS ORQUESTALES OK](https://www.dropbox.com/scl/fo/lw38wzzcpdtb2vn6g9zwr/AFwwL6pW2Y7IIfbQ1SPgvxI?rlkey=g38vwzfcpvhh0yb1besvnkfxg): 12 carpetas. Las 11 obras BD con `[The LCG]` coinciden; **Larks** estaba solo en Dropbox.

| id | Título BD | Compositor | Arr. | Dropbox |
|----|-----------|------------|------|---------|
| 1109 | 21st Century Schizoid Man [The LCG] | Fripp | Cucchiarelli&Guevara | 21st Century Schizoid Man |
| 1110 | Red [The LCG] | Fripp | Cucchiarelli&Guevara | Red |
| 1111 | Asturias [The LCG] | Lams | Cucchiarelli&Guevara | Asturias |
| 1112 | Dangerous curves [The LCG] | Fripp | Cucchiarelli&Guevara | Dangerous curves |
| 1114 | All or nothing, Part II [The LCG] | Fripp | Cucchiarelli&Guevara | All or Nothing |
| 1115 | Vroom [The LCG] | Fripp | Cucchiarelli&Guevara | VROOOM |
| 1120 | Eye of the Needle [The LCG] | Fripp | Cucchiarelli&Guevara | Eye of the needle |
| 1298 | Black Light [The LCG] | Fripp | Keeling | Black Light |
| 1300 | Pie Jesu [The LCG] | Fripp | Keeling | Pie Jesu |
| 2856 | Driving Force [The LCG] | Fripp | — | Driving Force |
| 2857 | Midnight Blue [The LCG] | Fripp | — | Midnight Blue |
| **3571** | Larks' Tongues in Aspic [The LCG] | Fripp | Cucchiarelli&Guevara | **Larks** |

- Fuente local: `c:\Users\marti\Downloads\LARKS scores` (31 PDFs, arr. CC = Cucchiarelli-Guevara, encabezado «Larks / Robert Fripp»).
- Carpeta [Para acomodar](https://drive.google.com/open?id=1DKNjjnw51jgx9TcWWskunnBlucqwqQqP): `Fripp, R. - Larks' Tongues in Aspic [The LCG]`. PDFs canónicos `Instrumento - Título - Fripp, R.pdf` (cornos `1y2` / `3y4`; sin `S/N`).
- `link_drive` apunta a esa carpeta (no copia al Archivo). Instrumentación seed: `2.2.3.2 - 4.2.3.1 - Timp.+2 - Str + Guitarra x5` (**33** particellas; SCORE → Director).

| Script | Rol |
|--------|-----|
| `scripts/lib/larksCatalog.mjs` | Metadata + mapa de renombrado (obra nueva) |
| `scripts/process-larks-local.mjs` | Copia Downloads → Para acomodar + rename |
| `scripts/generate-larks-sync.mjs` | Genera `supabase/seed_larks_sync.sql` |

- [x] PDFs copiados/renombrados en Para acomodar (31/31)
- [x] Seed SQL generado (`supabase/seed_larks_sync.sql`, 33 particellas + Drive URLs)
- [x] Seed **aplicado en linked** (2026-08-13): obra **3571**, `link_drive` [1DKNjjnw51jgx9TcWWskunnBlucqwqQqP](https://drive.google.com/open?id=1DKNjjnw51jgx9TcWWskunnBlucqwqQqP)
- Matcher: Guitarra 1–5; Trompa en Fa `1&2`/`3&4` → `Corno F 1y2`/`3y4`; tam-tam/cymbals → Perc Percusión.

### Completado (2026-08-31) — Sync particellas King Crimson (11 obras)

Las 11 obras del bloque (excepto Larks **3571**, ya OK) tenían stubs sin `url_archivo` y sin SCORE. Se re-sincronizaron desde `link_drive` con el matcher:

| Script | Rol |
|--------|-----|
| `scripts/sync-king-crimson-particellas.mjs` | Dry-run / `--apply`: genera SQL + aplica linked + snapshot seating |
| `scripts/rematch-king-crimson-seating.mjs` | Rearma seating tras CASCADE (unicidad `id_programa,id_particella`) |
| `supabase/seed_king_crimson_particellas_sync.sql` | DELETE+INSERT particellas + UPDATE instrumentacion |

- Todas con URL + SCORE (id 50) salvo que Drive no tenga el PDF.
- Seating: rematch parcial donde hay menos atriles nuevos que stubs viejos (p. ej. una sola `Viola` vs Viola 1/2).
- Unmatched intencional: `Reducido - Partitura completa` (Dangerous curves).
- Pie Jesu: nombres Drive compactos (`Violín I1`…); Black Light: SCORE vertical fusionado en la misma fila SCORE (2 URLs).

### Completado (2026-08-31) — Numeración romana → arábiga (matcher)

`arabicizeRomanPartNumbers` en `src/utils/drivePartMatcher.js`: `I/II/III/IV` → `1/2/3/4`; combinados `I y III` / `II & IV` se expanden a Corno 1+3 / 2+4. Re-sync aplicado a Asturias, Dangerous curves, Eye of the Needle, Black Light, Pie Jesu, Midnight Blue.

### Completado (2026-08-13) — Bloque **King Crimson** en gira 12 (FIMBA)

Seed `supabase/seed_gira_12_king_crimson.sql` aplicado en linked. **No** inserta obras: solo crea/reutiliza el bloque y vincula ids existentes con `[The LCG]`.

- Programa **12** / bloque **137** `King Crimson` / `orden = 2` (al final: Gala Lírica 0 → Repertorio 1 → King Crimson 2).
- 12 obras en `repertorio_obras` (Larks **3571** última). Idempotente: reutiliza el bloque por nombre; no duplica `(id_repertorio, id_obra)`.

| orden | id | Título |
|------:|---:|--------|
| 1 | 1109 | 21st Century Schizoid Man [The LCG] |
| 2 | 1110 | Red [The LCG] |
| 3 | 1111 | Asturias [The LCG] |
| 4 | 1112 | Dangerous curves [The LCG] |
| 5 | 1114 | All or nothing, Part II [The LCG] |
| 6 | 1115 | Vroom [The LCG] |
| 7 | 1120 | Eye of the Needle [The LCG] |
| 8 | 1298 | Black Light [The LCG] |
| 9 | 1300 | Pie Jesu [The LCG] |
| 10 | 2856 | Driving Force [The LCG] |
| 11 | 2857 | Midnight Blue [The LCG] |
| 12 | 3571 | Larks' Tongues in Aspic [The LCG] |

---

### Completado (2026-08-13) — Ramírez / Zigarán *Suite Mujeres Argentinas*

Procesamiento en [Para acomodar](https://drive.google.com/drive/folders/12GOBbDTk0ScrqVy_0VT72a0e7x242GOO) (sin split/crop IMSLP; **no** `copiar_carpeta_a_archivo`). PDFs Sibelius 2022–2023: **Ariel Ramírez** compositor (+ Félix Luna, letra); **Duerme Negrito** = canción tradicional de cuna; arreglo de cuerdas **Juan Cruz Zigarán** (compositor id **756**, ya existía).

- Carpetas canónicas `Ramírez-Zigarán - Título. Suite Mujeres Argentinas` (las 9, incluido Duerme Negrito: arreglo Zigarán).
- PDFs `Instrumento - Título. Suite Mujeres Argentinas - Ramírez-Zigarán.pdf` (Violín 1/2, Viola, Violoncello, SCORE).
- Audio: `AUDIO - {título}.mp3` (prefijo obligatorio; matcher excluye `AUDIO`/`PORTADA`).
- `link_drive` = carpeta de **cada canción** (IDs Drive estables).
- Año **1969** (LP *Mujeres Argentinas*, fuente conocida) en las 8 de Ramírez; Duerme **sin año** (tradicional). Duraciones desde MP3 local (ffprobe).
- Seed **aplicado en linked** (2026-08-13). No se envió mail `encargo_arreglo`.
- Encargos: estado **`Para arreglar`**, `id_integrante_arreglador = 4340365` (Lema), `id_arreglador` + `obras_compositores` **Lema, Germán** (198), `fecha_esperada = 2026-09-16`. Referencias: obra origen + Drive de la canción. Brief de #3570 replicado (contrabajo; Alfonsina soprano→flauta en Sol). Patch `supabase/patch_mujeres_argentinas_lema_arreglador.sql`.
- Placeholders previos **no tocados**: #3570 (encargo suite) y #3572 (solicitud suite).

| Script | Rol |
|--------|-----|
| `scripts/lib/ramirezZigaranCatalog.mjs` | 9 canciones + Drive IDs + metadatos |
| `scripts/process-ramirez-zigaran-local.mjs` | Rename carpetas + PDFs in place |
| `scripts/generate-ramirez-zigaran-sync.mjs` | `supabase/seed_ramirez_zigaran_sync.sql` |

### Obras archivo (Oficial, 5 particellas c/u, orgánico `Str`)

| id | Título BD | Comp. | Arr. | Año | Dur. | Drive |
|---:|-----------|-------|------|----:|-----:|-------|
| **3573** | Alfonsina y el Mar. *Suite Mujeres Argentinas* | Ramírez 277 | Zigaran 756 | 1969 | 211s | [1e0Zrqwh…](https://drive.google.com/drive/folders/1e0ZrqwhwT2qlwkMlEcdQzvAOn_yBshDz) |
| **3575** | Dorotea, La Cautiva. *Suite…* | Ramírez | Zigaran | 1969 | 168s | [12lhZCnp…](https://drive.google.com/drive/folders/12lhZCnpICbqOqVv5kuGo5CJXNM_JDCR6) |
| **3577** | Duerme Negrito. *Suite…* | Tradicional 338 | Zigaran | — | 131s | [1qImL_dI…](https://drive.google.com/drive/folders/1qImL_dIXmbThziw-QWw8bJHSfVxz-atB) |
| **3579** | En Casa de Mariquita. *Suite…* | Ramírez | Zigaran | 1969 | 153s | [1XM6yuBO…](https://drive.google.com/drive/folders/1XM6yuBOXwIU_0eLIzKeGfBoekU2Lp8DF) |
| **3581** | Gringa Chaqueña. *Suite…* | Ramírez | Zigaran | 1969 | 231s | [1hnZY9gm…](https://drive.google.com/drive/folders/1hnZY9gmJw8Ri_63ibU3ItDbujpMzuDvh) |
| **3583** | Juana Azurduy. *Suite…* | Ramírez | Zigaran | 1969 | 164s | [1qvJzlTR…](https://drive.google.com/drive/folders/1qvJzlTRqTcHQmFZ_7CdLBqwG9epCIqHR) |
| **3585** | Las Cartas de Guadalupe. *Suite…* | Ramírez | Zigaran | 1969 | 164s | [1myGKg4M…](https://drive.google.com/drive/folders/1myGKg4Mj608LiDOxD5bHzO3OfeEZYc3c) |
| **3587** | Manuela, La Tucumana. *Suite…* | Ramírez | Zigaran | 1969 | 159s | [1Yap07db…](https://drive.google.com/drive/folders/1Yap07db3fPuFW32G_Kk439jRLJduHWep) |
| **3589** | Rosarito Vera, Maestra. *Suite…* | Ramírez | Zigaran | 1969 | 220s | [1WE4K1nJ…](https://drive.google.com/drive/folders/1WE4K1nJJzGKaTrfyEiMX_9zvkNNkKhre) |

### Encargos de arreglo (Para arreglar → Lema 4340365, 16/09/2026)

| id | Origen archivo | Refs |
|---:|----------------|------|
| **3574** | 3573 Alfonsina | obra origen + Drive canción |
| **3576** | 3575 Dorotea | idem |
| **3578** | 3577 Duerme Negrito | idem |
| **3580** | 3579 Mariquita | idem |
| **3582** | 3581 Gringa | idem |
| **3584** | 3583 Juana Azurduy | idem |
| **3586** | 3585 Cartas de Guadalupe | idem |
| **3588** | 3587 Manuela | idem |
| **3590** | 3589 Rosarito Vera | idem |

- [x] 9 carpetas + 45 PDFs renombrados en Para acomodar (`Ramírez-Zigarán`, 2026-08-13)
- [x] 9 obras archivo + particellas (SCORE→Director id 50) en linked
- [x] 9 encargos sin Drive/particellas, sin mail automático
- [x] Spec viva actualizada
- [x] Audio `AUDIO - {título}.mp3` (9/9)
- [x] Gira **147** *Nuestras raices* — 9 encargos **Para arreglar** (Lema integrante 4340365 + compositor 198, ids pares 3574–3590) al bloque Repertorio (**122**), tras La Arenosa 3307. Oficiales Zigarán **no** van al programa. Seed `supabase/seed_gira_147_mujeres_argentinas.sql` (quita Oficiales si estaban; no duplica).

### Completado (2026-08-17) — Haydn Hob.VIIe1 + Bach BWV 1067 (Para acomodar)

Carpetas ya canónicas. `link_drive` = carpeta original (**no** `copiar_carpeta_a_archivo`). Seed `supabase/seed_haydn_bach_sync.sql` aplicado en linked.

| Obra | id | Drive | PDFs | Año | Dur. | Notas |
|------|---:|-------|-----:|----:|-----:|-------|
| Concierto para Trompeta en Mib M (Haydn; arr. Rondeau 485) | **3592** | [1MDj3YEC…](https://drive.google.com/open?id=1MDj3YECQ8VAMOW0b-IUw-oJIBnxQp4r3) | 17 | 1796 | 864s | Orgánico `2.2.0.2 - 2.2.0.0 - Perc - Str`. Falta trompeta **solo** (solo en score y `.MUS` del zip). |
| Suite Orquestal no. 2 en Si menor (Bach) | **3593** | [1Zikakmr…](https://drive.google.com/open?id=1Zikakmr-j9RzTHWsp9nDP8-7szJrf5NG) | 7 | 1738 | 1202s | Recorte portada Kalmus del SCORE (p.2–26). Keyboard/Cembalo → Piano. Flauta `es_solista`. Orgánico `Fl - Key - Str`. |

- PDFs: `Instrumento - Hob.VIIe1. Concierto… - Haydn, J.pdf` / `Instrumento - BWV 1067. Suite… - Bach, J.S.pdf`.
- Matcher: `keyboard`/`cembalo`/`clave` → Piano (`pdfPartsRenaming` + `drivePartMatcher`).
- Scripts: `scripts/lib/haydnBachCatalog.mjs`, `process-haydn-bach-local.mjs`, `generate-haydn-bach-sync.mjs`.

### Completado (2026-08-17) — Cielito Lindo ('Orquesta y Voz') — Mendoza y Cortés-Payán (Para acomodar)

Obra **nueva** (#**3595**), distinta de #3491 (ARIAS solo orquesta, tag `Medoza y Cortés, Q`). Carpeta [Para acomodar](https://drive.google.com/open?id=1a0uX_4JhNVCMUkwCE8W7ypgMtogHmY1f): 2 PDFs fuente → **18 particellas** canónicas (`Instrumento - Cielito Lindo ('Orquesta y Voz') - Mendoza y Cortés-Payán.pdf`).

| Obra | id | PDFs | Año | Dur. | Notas |
|------|---:|-----:|----:|-----:|-------|
| Cielito Lindo ('Orquesta y Voz') (arr. Payán) | **3595** | 18 | 1882 | 280s | Split `Set of Parts` (37 p.) + SCORE sin portada (p.2–27). Voz tenor `es_solista`. Orgánico `voz - 1.1.1.1 - 1.1.0.0 - Timp.+3 - Hp - Str`. |

- Compositor **Quirino Mendoza y Cortés**; arreglador **Oliverio Payán** (`id_arreglador`).
- Matcher: `tenor` (voz) → `Voz` en `pdfPartsRenaming.mjs`.
- Scripts: `scripts/lib/cielitoLindoCatalog.mjs`, `process-cielito-lindo-local.mjs`, `generate-cielito-lindo-sync.mjs`.
- Seed `supabase/seed_cielito_lindo_sync.sql` aplicado en linked.

### Completado (2026-08-18) — Gira 165 Feria del Libro Cipolletti (encargos cine)

10 obras **nuevas** en estado **`Para arreglar`**, arreglador predeterminado **Lema** (integrante **4340365**, compositor **198**), `fecha_esperada = 2026-09-10`, tag **Película**. Vinculadas al bloque **Repertorio** (id **142**) de la gira **165**, a continuación de Superman 3591 e Indiana Jones 3594 (ya estaban). Sin mail `encargo_arreglo`. Seed `supabase/seed_gira_165_cine_feria_libro.sql` aplicado en linked.

| id | Título | Compositor(es) | Ref. archivo |
|---:|--------|----------------|--------------|
| **3596** | Star Wars | Williams, John | 3489 Main Theme |
| **3597** | Harry Potter | Williams, John | 2349 Suite Piedra Filosofal |
| **3598** | El Señor de los Anillos | Shore, Howard | — |
| **3599** | Piratas del Caribe | Badelt + Zimmer | 3483 |
| **3600** | La misión – El oboe de Gabriel | Morricone, Ennio | 1488 |
| **3601** | Cinema Paradiso | Morricone, Ennio | 1295 Suite |
| **3602** | Shrek | Gregson-Williams + Powell | — |
| **3603** | Misión Imposible | Schifrin, Lalo | — |
| **3604** | Jurassic Park | Williams, John | 2344 |
| **3605** | El viaje de Chihiro | Hisaishi, Joe | — |

---

## Permisos — Archivo (`RepertoireView`) y rol arreglador (2026-08-17)

- [x] El rol **`arreglador`** puede abrir **Repertorio / Archivo** en **solo lectura** (menú, command palette y `?tab=repertorio`).
- [x] `canEdit` en `RepertoireView`: `isEditor || isArchivista || isManagement`. Arreglador sin esos roles ve listado, filtros, export «Ya programado», historial, links Drive y copiar enlaces; **no** puede crear/editar/eliminar obras, gestionar compositores/tags, selección masiva ni asignar a programa.
- [x] Badge **«Solo lectura»** en el encabezado cuando `!canEdit`.

---

## 11. Playlist de audio en programa (Drive + YouTube)

### Objetivo
Reproducir el programa como playlist en **Repertorio** y **Mis Partes**, con velocidad (0.5×–2×). El audio de Drive se identifica **a mano** al cargar la obra; el player no lista carpetas.

### Datos
- Columna `obras.audios` (`jsonb`, default `[]`): array ordenado `{ drive_file_id, name, url, label }` (un ítem por movimiento).
- Migración `20260819000000_obras_audios.sql`.
- Nuevo arreglo: no copia `audios` (igual que `link_drive`).

### Identificación
- **WorkForm:** lista Audios Drive (reordenar, label, quitar) + «Elegir» abre el matcher.
- **DriveMatcherModal:** archivos mp3/wav/m4a destacados; «Asignar como audio» (merge por `drive_file_id`). `list_folder_files` solo al abrir el matcher.

### Player
- `RepertoirePlaylistPlayer` al pie de `ProgramRepertoire` (oculto en Seating). **No se monta** hasta el primer Play de una fila o **Abrir Playlist** del bloque.
- Prioridad: `audios` (una pista por movimiento) → si vacío, YouTube (`link_youtube`).
- Drive: `get_temp_token` + `files/{id}?alt=media` → blob → `<audio>`. Caché IndexedDB **24 h** por `drive_file_id` (más object URL en memoria mientras el player está montado). YouTube no se cachea.
- YouTube: IFrame API. Si el dueño deshabilitó embed (códigos 101/150) **no se puede reproducir en la app**; overlay + enlace «Abrir en YouTube».
- Play por fila y **Abrir Playlist** por bloque (cabecera, a la izquierda junto al estado). La playlist del player es **solo ese bloque**; Play en otra obra cambia la lista al bloque de esa obra.
- Modal **pantalla completa** (portal a `document.body`, `z-[100]`): botón «Pantalla completa» abajo de la barra; Escape o «Cerrar pantalla completa» para volver.
- Velocidad libre (0.25×–4×; presets + input, p. ej. `0.78` / `1.8`). HTML5 usa el valor exacto; YouTube solo tasas discretas del iframe. **Pistas nunca reproducidas arrancan en 1×**; si ya se escuchó esa pista, se restaura su velocidad.
- `localStorage`:
  - `ofrn.repertoirePlaybackRate`: última velocidad global (solo historial; las pistas nuevas usan 1×).
  - `ofrn.repertoireTrackState`: `{ [trackId]: { position, rate } }` por pista.
- **Media Session** (Android / lock screen): play/pause, anterior/siguiente, seek. El tap en la tarjeta lo enfoca el SO en la **ventana que está sonando** (PWA instalada o pestaña Chrome); no hay API para abrir el icono OFRN si el audio salió de Chrome.

### Completado
- [x] Campo `obras.audios` + UI de identificación
- [x] Playlist sticky Drive/YouTube con velocidades
- [x] Sin fetch de carpeta al reproducir
- [x] Abrir Playlist por bloque (cabecera, a la izquierda)
- [x] Posición y velocidad por pista en localStorage
- [x] Velocidad personalizable (además de presets)
- [x] Modal de reproductor a pantalla completa
- [x] Feedback FAB compacto en landscape y elevado (`data-repertoire-player`) para no tapar velocidad / barra; oculto en pantalla completa
- [x] Lista del player contenida (`flex-col`, `overflow-x-hidden`); título = primera línea plana (sin `&nbsp;` ni movimientos concatenados)
- [x] Mini player respeta el sidebar (`--app-sidebar-width` medido con ResizeObserver; 0px bajo el breakpoint `lg`)
- [x] Playlist limitada al bloque activo; Play en otra obra cambia de bloque
- [x] Media Session: anterior/siguiente + metadata OFRN (el tap de la tarjeta lo resuelve Chrome/Android)
- [x] Audios Drive en IndexedDB 24 h (escritura en segundo plano; lectura con timeout para no bloquear el play)
- [x] El player arranca en `playing` si viene `playRequest` (no esperar un segundo render; eso dejaba el loader colgado)

---

## Encabezado de bloque en móvil (2026-08-19)

### Problema
En viewport estrecho, título, estado, **Abrir Playlist**, **Grupos** y el recuadro de duración competían en una sola fila (`justify-between`). El total se comprimía en una columna alta e ilegible y solapaba el dropdown de grupos.

### Solución (`RepertoireManager` cabecera de `programas_repertorios`)
- En pantallas menores a `md`: columna — (1) título + badge Definido/En definición; (2) acciones (playlist, grupos, orgánico, atril) con wrap; (3) fila propia para Total/Neto + eliminar.
- Desde `md` hacia arriba: fila única como antes (acciones a la izquierda, duración y papelera a la derecha).
- Título con `truncate`; duración en chips `whitespace-nowrap` (Total y Neto no se parten por carácter).
- **Sticky:** solo la fila del título (nombre + Definido) queda fija al scrollear las obras. Playlist, grupos, orgánico y totales se van con el scroll. El título es hijo directo del bloque para que el sticky cubra toda la lista.
- Dropdown Grupos: `flex-1` en móvil, ancho fijo `w-40` en desktop.
- **Conv/Req** en un solo recuadro apilado (`InstrumentationBadges`): dos líneas, columnas compartidas por familia (Key vacío en Conv si solo está en Req), un clic al modal.

- [x] Encabezado de bloque apilado en móvil sin solape
- [x] Badges Conv/Req unidos en un recuadro apilado
- [x] Conv/Req alineados verticalmente por instrumento
- [x] Sticky solo del título del bloque (el resto del header scrollea)

---

## 12. Bahiano — Marley sinfónico (Para acomodar, gira 12)

Set de **16** arreglos sinfónicos de **Bob Marley** en [Para acomodar / Bahiano](https://drive.google.com/open?id=16qBZqcQVQ9IF09xmB1AG_skRBpk5UfYE) (origen: carpetas `Partes` / `Scores` / `Audios Refe`).

### Local
- Unificar por obra: `scripts/process-bahiano-local.mjs` + catálogo `scripts/lib/bahianoCatalog.mjs`.
- Carpeta canónica: `Marley, B. - {Título}`.
- PDFs: `Instrumento - Título - Marley, B.pdf` (SCORE + 12–13 partes). **Is This Love** sin particella de Voz.
- Audio: `AUDIO - {Título} (Orq REFE).mp3`.
- Orgánico típico: `1.1.1.0 - 1.1.1.0 - Perc - Str + Saxofón, Voz` (sin fagot/tuba/contrabajo).

### Archivo + BD
- Copia al Archivo OFRN (`copiar_carpeta_a_archivo`); `link_drive` = carpeta copiada.
- Seed `supabase/seed_bahiano_sync.sql` (generado por `scripts/generate-bahiano-sync.mjs`): compositor Marley, tag `Bahiano`, estado **Oficial**, particellas + `obras.audios`.
- Bloque **Bahiano** al final de gira `id_programa = 12` (`programas_repertorios.orden = MAX+1`), 16 obras en el orden del set (One Drop … Jamming).
- [x] Seed **aplicado en linked** (2026-08-19).

---

## 13. Archivo: filtro y columna País del compositor (2026-08-24)

- [x] Columna opcional **País** en `ColumnManager` (apagada por defecto), con filtro por texto y orden por `pais_nombre`.
- [x] Datos ya disponibles via `compositores.paises(nombre)` → `processWork` arma `pais_nombre` (compositores del rol compositor, unidos con ` / `).
- [x] Filtro de escritorio en el header de la columna; en móvil, campo en filtros avanzados + chip removible; la búsqueda rápida también incluye país.
- [x] Export «Ya programado» incluye País cuando la columna está visible (Excel/PDF + criterio de orden).

---

## 14. ProgramSeating: editar obra + matcher combinados `1-2` (2026-08-26)

- [x] **ProgramSeating (escritorio, editores):** junto al icono de carpeta Drive, `IconEdit` abre `WorkForm` en modal (portal `z-[9999]`). Al cerrar/guardar se refrescan particellas y el bloque de repertorio.
- [x] **Matcher Drive (`drivePartMatcher.js`):** el prefijo del PDF se toma con split por ` - ` (espaciado), no por `-` suelto. Así **cualquier** instrumento con sufijo combinado (`Oboe 1-2`, `Corno 3-4`, `Flauta 1–2`, `Clarinete 1y2`, etc.) expande a las dos (o más) particellas y sugiere vínculo compartido. Equivalente a `1y2` / `1&2` / `1/2`.

### Completado (2026-08-26) — WorkForm: Editar Particellas → DriveMatcherModal
- [x] Se elimina el listado/tabla inline de particellas en `WorkForm`.
- [x] Al pie del formulario: botón **Editar Particellas** (badge con conteo) que abre `DriveMatcherModal` directamente.
- [x] Carga diferida: al abrir el form solo se pide `count` de `obras_particellas` (bloquea instrumentación); el `select *` de filas ocurre al abrir el matcher. Acelera el montaje del WorkForm.
- [x] Alta/edición/vínculos/orgánico de particellas quedan centralizados en el matcher (ya tenía esas acciones).

### Completado (2026-08-26) — Orden seating vientos con parte duplicada
- [x] `sortWindMusiciansForSeating` (`seatingWindOrder.js`): dentro del mismo `id_instr`, el número de parte se toma de la **primera obra sin duplicados** (p. ej. dos músicos con «Flauta 1» en la obra 1 → se usa la obra 2 donde uno es 1 y el otro 2). Aplica a cualquier instrumento. Fallback: primera parte disponible + apellido.
- [x] En `ProgramSeating`, el orden visible usa `displayObras` (bloque activo).

### Completado (2026-08-27) — Configs de cuerdas multi-bloque
- [x] Tabla `seating_cuerdas_configs` + `seating_contenedores.id_config` (migración `20260827221517`, applied linked). Backfill: una config «Cuerdas» por gira con atriles.
- [x] Semántica: 1 config → todos los bloques; N configs → `bloque_ids[]` + fallback global. Unicidad de músico por config.
- [x] `GlobalStringsManager`: pills, crear/duplicar/eliminar/renombrar, panel Asociar bloques.
- [x] `ProgramSeating` resuelve config por bloque activo y carga atriles filtrados.
- [x] PDF multi-sección; Mis Partes / Str labels / reports / roster usan config primaria o resolución por bloque.

### Completado (2026-08-31) — Lockhart: Montevideana + Homenaje a Piazzolla (Para acomodar)

Beatriz Lockhart — dos carpetas en [Para acomodar](https://drive.google.com/open?id=10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI) (sin `copiar_carpeta_a_archivo`).

| Obra | Carpeta Drive | Partes | Notas |
|------|---------------|--------|-------|
| **Montevideana Nro. 1** (#**3623**) | [folder](https://drive.google.com/drive/folders/1BUABC_jXBeDL-G7Z-IU4twxqEFY-icOi) | **17** | Rename canónico; SCORE + maderas + perc×2 + piano + cuerdas + bandoneón |
| **Homenaje a Astor Piazzolla** (#**3624**) | [folder](https://drive.google.com/drive/folders/1swxlkCS4aYRbyshXQQrYqmldHdheL2Kj) | **8** | Merge I–III → 1 SCORE (41p), 1 Piano (21p), 1 Bandoneón (19p); cuerdas ya unificadas. Título BD con movimientos en `<div>`: Sureño / El Emigrante / Adiós Maestro (1994) |

| Artefacto | Rol |
|-----------|-----|
| `scripts/lib/lockhartCatalog.mjs` | Catálogo + merges |
| `scripts/lib/merge_pdfs.py` | Concatenar PDFs por movimiento |
| `scripts/process-lockhart-local.mjs` | Merge + rename local (`--only=montevideana` / `piazzolla`) |
| `scripts/generate-lockhart-sync.mjs` | Seed desde Drive |
| `supabase/seed_lockhart_sync.sql` | INSERT obras + particellas + compositor Lockhart |

- [x] PDFs renombrados / merges aplicados en sync local
- [x] Seed generado y aplicado en BD linked
- [x] `pdfPartsRenaming`: Clarinete N → Bb N; Percusión I/II; Bandoneón / Band N; SCORE por título obra

### Completado (2026-08-31) — Charbonnier: Concierto para Violoncello y orquesta Nro. 1 (obra 3401)

Carpeta [Para acomodar / Drive](https://drive.google.com/drive/folders/1vFvK6DAgrMKYjd90F7sPlGoz3uR621_m): 3 PDFs de particellas (I Allegro / II Adagietto / III Prestissimo) + SCORE completo.

| Paso | Resultado |
|------|-----------|
| Split | 23 instrumentos × movimiento (manifiesto por encabezado; mov II sin Timbal/Piatti) |
| Merge | I+II+III → **1 PDF por instrumento** (Timbal/Platillo solo I+III) |
| Canon | **24 PDFs** (`Instrumento - Concierto para Violoncello y orquesta Nro. 1 - Charbonnier, M.pdf`) |
| BD | UPDATE obra **#3401** + 24 particellas; `Violoncello Solo` con `es_solista`; título con movimientos en `<div>` |
| Orgánico | `Vc - 2.2.2.2 - 2.2.2.1 - Perc.x2 - Str` |

| Artefacto | Rol |
|-----------|-----|
| `scripts/lib/charbonnierCelloCatalog.mjs` | Splits 3 movs + audios |
| `scripts/process-charbonnier-cello-local.mjs` | Split → merge → SCORE/audio rename |
| `scripts/generate-charbonnier-cello-sync.mjs` | Seed UPDATE desde Drive |
| `scripts/rename-charbonnier-cello-audio.mjs` | Reintento rename audios (Drive EBUSY frecuente) |
| `supabase/seed_charbonnier_cello_sync.sql` | Aplicado linked |

- [x] Particellas canónicas en Drive + seed aplicado
- [ ] Audios: rename `AUDIO - …` parcial (algunos EBUSY en File Stream; reintentar `node scripts/rename-charbonnier-cello-audio.mjs`)


---

### Completado (2026-09-03) — Spatocco: 3 arreglos de Piazzolla para OFRN

Origen arreglista: [Arreglos Popi Spatocco](https://drive.google.com/drive/folders/1srUOi_8mV-l0jZrFUNne6qx2JzFmv2yJ).
Obras: **Chiquilín de Bachín**, **La Arenosa**, **Sus ojos se cerraron** (arr. Spatocco, comp. Piazzolla).
Gira 12 / bloque **Alba Carmona** (id_repertorio=149).

**Estado BD:**
- Compositor Piazzolla: ya existe (id=264).
- Obras: **3626** / **3627** / **3628**.
- `link_drive` = carpetas **Archivo OFRN** (`copiar_carpeta_a_archivo` → `ARCHIVO_OBRAS_FOLDER_ID`); particellas apuntan a los PDFs de esa copia (no al origen Spatocco ni a Para acomodar).

| Artefacto | Rol |
|-----------|-----|
| `scripts/lib/spatoccoCatalog.mjs` | `sourceDriveFolderId` (origen) + `driveFolderId` (Archivo). Combinado Glockenspiel/Drum Set → Perc Glockenspiel + Perc Batería. |
| `scripts/process-spatocco-local.mjs` | Staging en Para acomodar: rename canónico + split del combinado. |
| `scripts/generate-spatocco-sync.mjs` | Seed desde Archivo; `--copy` re-ejecuta `copiar_carpeta_a_archivo`. |
| `supabase/seed_spatocco_sync.sql` | UPDATE `link_drive` Archivo + particellas backup — **aplicado linked** (2026-09-03) |

**Archivo (oficial / `link_drive`):** padre [Archivo obras](https://drive.google.com/drive/folders/10JQJW7YX7UNmWciqgJ-EiqaldM_e0Tvi)

| Obra | Archivo folder | Partes |
|------|----------------|--------|
| **3626** Chiquilín de Bachín | [16SIQQGrWBA1romVpwwUqfAvxZfb6tAZJ](https://drive.google.com/drive/folders/16SIQQGrWBA1romVpwwUqfAvxZfb6tAZJ) | **12** (Voz solista) · `voz - 1.0.0.0 - 0.1.0.0 - Perc.x3 - Str + Bandoneón, Guitarra` |
| **3627** La Arenosa | [1d62ohtPW8h9zGzKQw3w8A4nAbNXmwm4l](https://drive.google.com/drive/folders/1d62ohtPW8h9zGzKQw3w8A4nAbNXmwm4l) | **10** (Voz solista) · `voz - 1.0.0.0 - 0.1.0.0 - Perc - Str + Bandoneón, Guitarra` |
| **3628** Sus ojos se cerraron | [1foFCLsF2kHKAH2okWQ0mFt4qjE7b7dZE](https://drive.google.com/drive/folders/1foFCLsF2kHKAH2okWQ0mFt4qjE7b7dZE) | **9** (sin Voz) · `1.0.0.0 - 0.1.0.0 - Perc - Str + Bandoneón, Guitarra` |

**Staging local (Para acomodar — no es `link_drive`):**
- `H:\Mi unidad\Archivo General OFRN\Para acomodar\Piazzolla, A. - Chiquilín de Bachín (arr. Spatocco)`
- `H:\Mi unidad\Archivo General OFRN\Para acomodar\Piazzolla, A. - La Arenosa (arr. Spatocco)`
- `H:\Mi unidad\Archivo General OFRN\Para acomodar\Piazzolla, A. - Sus ojos se cerraron (arr. Spatocco)`

**Origen Spatocco (pre-copia, `sourceDriveFolderId`):**
- Chiquilín → `1Oj7_9zqhsD21WIU96cHEw9vfHpMZVo01`
- La Arenosa → `1FZShxSuESaGGLk9b8vWuU6X42rgWo8yy`
- Sus ojos → `1M7e2g1rNSdQYD0K__BQE--8rDmz_eIcD`

- [x] PDFs inspeccionados (pypdf): música en p.1, sin crop de portada
- [x] Carpetas canónicas locales + rename PDF/audio
- [x] Rename remoto en carpetas origen
- [x] Copia al Archivo (`copiar_carpeta_a_archivo`) + `link_drive` / particellas re-asociadas a PDFs backup
- [x] Seed regenerado y aplicado en linked
- [x] **Shortcuts del bloque Alba Carmona regenerados** (2026-09-03): los accesos directos en Drive seguían apuntando a carpetas origen Spatocco (`1Oj7_…`, `1FZSh…`, `1M7e2g…`) porque `sync_repertoire_shortcuts` solo renombraba shortcuts existentes (el `targetId` de un shortcut de Drive es inmutable). Fix operativo: `NULL` en `repertorio_obras.google_drive_shortcut_id` (ids 601–603) + `sync_repertoire_shortcuts` programa 12. Fix preventivo en `manage-drive`: si el target del shortcut ≠ `extractFileId(obra.link_drive)`, se borra y se recrea. `list_folder_files` ahora incluye `shortcutDetails`.

**Bloque Drive Alba Carmona:** [1s_TSmcRbv6aGC9FClkvgkmVeCluq6xaE](https://drive.google.com/drive/folders/1s_TSmcRbv6aGC9FClkvgkmVeCluq6xaE) (programa 12 / `Sinf 11/26`)

| Obra | Shortcut viejo (eliminado) | Shortcut nuevo | Target Archivo |
|------|----------------------------|----------------|----------------|
| 3626 Chiquilín | `1gwbdj1WakEpUZf1zX5Kw522Zfn-n7EAu` | `1iBu0jvwFseqVoT9oEPpiD_5Go_thPr5O` | `16SIQQGrWBA1romVpwwUqfAvxZfb6tAZJ` |
| 3627 La Arenosa | `1t7inwCv4u57-kbFN3AIupO0EXvwHi8JG` | `1ABzyB4swrVuJ5dARssKNQQgBpM3wMqzL` | `1d62ohtPW8h9zGzKQw3w8A4nAbNXmwm4l` |
| 3628 Sus ojos | `1TtaWB6XqVyDzKZ0s8tHvZLYKNTAtn4Jb` | `1KaCYOcKtzsL6wdvabX3VCNfIyEw_NOc_` | `1foFCLsF2kHKAH2okWQ0mFt4qjE7b7dZE` |

**Verificar en Drive UI:** abrir la carpeta del bloque → cada acceso directo numerado → debe abrir la carpeta Archivo (no Spatocco / Para acomodar). En detalle del shortcut, el destino debe coincidir con `obras.link_drive`.

**Nota:** en origen Chiquilín queda `Perc Batería 2` (combinado, 403 al borrar); la copia Archivo también lo incluye y el seed lo asocia como `Perc Batería 2` para `unique_part_per_work`. La carpeta Archivo puede tardar en aparecer en File Stream local bajo `H:\…\Archivo General OFRN`; la fuente de verdad es el folder Drive del Archivo.
