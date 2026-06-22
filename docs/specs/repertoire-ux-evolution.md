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
| `src/components/repertoire/RepertoireManager.jsx` | BowingSetManager assign, columna GripVertical, DndContext, SortableContext, SortableRepertorioRow, handleDragEnd, savingPosition, dragOverId, mail `nueva_obra` desde entrada rápida. |
| `src/components/repertoire/InstrumentationFilterModal.jsx` | Modal compartido de filtro por orgánico con presets. |
| `src/utils/instrumentationFilterPresets.js` | Definición de presets y helpers de etiqueta/activo. |
| `src/views/Repertoire/RepertoireView.jsx` | Usa modal compartido y presets en columna Orgánico. |
| `src/views/Repertoire/WorkForm.jsx` | Sustitución sección arcos por BowingSetManager edit; eliminación estado/handlers de arcos. **Autocomplete de título:** al escribir con compositor elegido, desplegable de obras existentes con acciones según `context` (`archive` vs `program`). |
| `src/services/giraService.js` | `updateWorkPosition`, `normalizeRepertorioBlockOrden`. |
| `supabase/seed_gira_10_fanfarrias_falla.sql` | Seed idempotente para agregar dos fanfarrias de Falla en estado `Solicitud` al bloque de gira 10. |

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
- `QuickWorkRow` en `RepertoireManager.jsx` también dispara `mails_produccion` con template `nueva_obra` al crear una obra nueva en estado `Solicitud` desde la entrada rápida del bloque.

### Completado
- [x] Desplegable contextual en título
- [x] Acciones archive vs program
- [x] Opción continuar con obra nueva
- [x] Mail al archivo para solicitudes creadas desde entrada rápida de programa

---

## 6b. Seeds de solicitudes puntuales en programas

### Gira 10 - Fanfarrias de Manuel de Falla

- **Script:** `supabase/seed_gira_10_fanfarrias_falla.sql`.
- **Destino:** primer bloque existente de `programas_repertorios` para `id_programa = 10`.
- **Obras:** `Fanfare pour une fête` y `Fanfare sobre el nombre de Enrique Fernández Arbós`.
- **Estado:** `Solicitud`.
- **Nota interna:** link IMSLP guardado en `obras.observaciones`, respetando la compatibilidad de la UI (`nota_interna` / `observaciones` / `comentarios`).
- **Idempotencia:** reutiliza a `Falla, Manuel de`; si la obra ya existe, fuerza estado `Solicitud`, conserva/agrega la nota IMSLP sin duplicarla y evita volver a vincularla al bloque.
- **Notificaciones:** las altas hechas desde la UI disparan `mails_produccion` (`nueva_obra`) desde `WorkForm` y desde `QuickWorkRow`. Los seeds SQL son de datos y no invocan Edge Functions por sí mismos.

### Completado
- [x] Seed para agregar las dos fanfarrias al bloque de gira 10
- [x] Documentada la frontera SQL vs. mail automático de frontend

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
- Cada card conserva el color de estado mediante el fondo de la tarjeta, sin badge textual de estado en móvil.
- La información prioritaria entra en pocas líneas: título, compositor, estado, arreglador opcional, duración, orgánico, próxima/última gira y tags principales.
- Todas las acciones móviles son iconográficas: seleccionar, audio, partitura, Drive, asignar a gira, historial, editar y eliminar.
- La grilla con headers/filtros por columna permanece en desktop (`md+`) sin cambios funcionales.
- Ajuste v3: se quita el badge de estado en móvil y el estado pasa a comunicarse por un fondo de card más visible (`getEstadoMobileCardBgClass`).
- Ajuste v3: Drive/carpeta se ubica debajo del checkbox de selección, y las cuatro acciones principales (asignar, historial, editar, eliminar) se apilan verticalmente a la derecha sin aumentar el alto de la card.
- Ajuste v4: las acciones principales pasan a un menú de tres puntos (`IconMoreVertical`) a la derecha para no afectar la altura; la carpeta/Drive se desplaza levemente hacia abajo bajo el checkbox.

### Filtros móviles
- Se agrega un menú superior de filtros con `IconFilter`, siguiendo el patrón de filtros tipo chip usado en vistas compactas.
- Los filtros se aplican desde el menú y aparecen como **chips removibles** debajo de la barra móvil.
- Chips soportados: obra, compositor, arreglador, estado, solicitante, duración, fechas, observaciones, tags, orgánico y legacy "Oficial sin Drive".
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

### Falla — Danza Española Nro 1 ('La Vida Breve') (2026-06-19)
- Carpeta [Para acomodar / Falla](https://drive.google.com/open?id=16TvE6QokADJSSk9gpZXpP1D8GcrngIQS): 16 PDFs IMSLP → **26 particellas** canónicas.
- Obra BD **id 3532** (`Danza Española Nro 1. 'La Vida Breve'`, Falla): sin particellas previas.
- Proceso: dividir combinados (vientos/metales/perc), recortar portadas IMSLP, renombrar `Instrumento - S-N. Título - Falla, M.pdf` (combinados: `1y2`, `3y4`, `1y2y3`).
- Instrumentación resultante: `3.3.3.1 - 2.1.1.1 - Timp.+2 - Hp - Key - Str`.

| Script | Rol |
|--------|-----|
| `scripts/lib/fallaCatalog.mjs` | Manifiestos de páginas + metadata obra 3532 |
| `scripts/lib/pdfPartsRenaming.mjs` | Renombrado canónico; combinados con sufijo `1y2` (no `1-2`) |
| `scripts/process-falla-local.mjs` | Split/crop/rename en sync local `H:\...\Para acomodar` |
| `scripts/generate-falla-sync.mjs` | Genera `supabase/seed_falla_sync.sql` |

- [x] PDFs procesados y sincronizados a Drive con nombres canónicos
- [x] Seed SQL generado (`seed_falla_sync.sql`) — pendiente ejecutar en Supabase

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

### Completado (2026-06-13)
- [x] Barra «Instrumento / Cant.»: input de cantidad y botón `+` agrupados con `shrink-0` para evitar desborde horizontal junto al scroll del modal.
- [x] Eliminación individual y masiva de particella con `ConfirmDialog` (estilo destructivo), alineado con el design system del proyecto.
- [x] **Ingreso por orgánico de vientos** en `WorkForm.jsx` y `DriveMatcherModal.jsx`: campo con placeholder `2.2.3.2 - 4.3.1.2` que genera particellas (Fl–Tba) vía `parseOrganicoVientosInput` (`src/utils/particellaOrganicoInput.js`) y `OrganicoVientosAddField.jsx`. Entrada solo numérica (8 dígitos) con autoformato progresivo (`22324312` → `2.2.3.2 - 4.3.1.2`).
- [x] **Matcher Drive centralizado** en `src/utils/drivePartMatcher.js`: archivos combinados (`Corno 1y2`, `1 y 2`, `1&2`, `1-2`, `1/2`) expanden a varias particellas con el mismo link; sugerencias IconBulb + «Vincular sugerencias» para placeholders sin enlace en `DriveMatcherModal.jsx`; banner «Agregar faltantes» para crear las particellas detectadas en PDFs que aún no estén cubiertas por la obra. Ver `docs/drive-algo-deep-dive.md`.

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
