# Stage Plot (Plano de escenario)

## Escala y dimensiones del lienzo

- **Escala**: `STAGE_PLOT_CM_TO_PX = 4` → 1 cm real = 4 unidades lógicas del canvas.
- **Legacy**: payloads guardados a `STAGE_PLOT_LEGACY_CM_TO_PX = 10` se migran al cargar (cm se preservan; coords/params/scale de ítems y formaciones × `4/10`).
- **Default**: 90 × 56 cm (360 × 224 px internos).
- **Máximos**: Ancho **1600 cm**, Alto **1200 cm** → canvas hasta **6400 × 4800 px** (~4× el tope anterior de 400×300 cm).
- **Persistencia**: el payload guarda `stage.widthCm`, `stage.heightCm` como fuente de verdad y deriva `stage.width` / `stage.height` al normalizar (`widthCm × STAGE_PLOT_CM_TO_PX`).
- **Compatibilidad**:
  - Si hay `widthCm`/`heightCm` → usarlos y re-derivar px con la escala actual.
  - Si solo hay `width`/`height` px (v1 a 10 px/cm) → `cm = px / 10`, luego px nuevos = `cm × 4`.
  - Si `width`/`widthCm` indican otra escala (ratio), `stagePlotLegacyScaleFactor` reescala geometría de ítems/formaciones.
- **UI Lienzo**: inputs **Ancho (cm)** / **Alto (cm)** con límites 40–1600 cm (ancho) y 30–1200 cm (alto). Hint fijo bajo los inputs: `Máx. Ancho 1600 · Alto 1200 cm`. Toast (sonner) al clampear o al live-apply OOB: `Máximo 1600 cm de ancho` / `Máximo 1200 cm de alto` (y análogo para mínimo); debounce ~2.2 s para no spamear. **Visibilidad** (fila de 4 switches `role="switch"`, ON = visible): **Cuadrícula** → `showGrid`; **Radial** → `showRadial`; **Formaciones** → `!hideFormationGuides`; **Recuadros** → `!hideChairSquares` (flags de payload sin cambio; el control invierte los `hide*`). **Radial → Líneas** (3–36, `normalizeStagePlotRadialLines`) usa el mismo patrón (`StageLienzoDimensionInput`):
  - **Draft local** mientras hay foco (no clampea mid-keystroke al mínimo).
  - **Live apply**: en `onChange`, tras debounce ~220 ms, si `Number(draft)` es finito y ya está dentro de `[min, max]`, llama `onCommit` → `patchStage` **sin cerrar el popover** (el lienzo Konva y la etiqueta `W × H cm` se actualizan en vivo). Draft vacío / parcial / fuera de rango no parchea (si OOB y hay `limitNoun`, toast).
  - **Commit final**: blur, Enter o `flushAllDrafts()` clampea (vacío → valor actual/fallback; OOB → min/max + toast) y sincroniza el string del input.
  - Al cerrar (click afuera / Escape / botón Lienzo) se llama `flushAllDrafts()` **antes** de desmontar — no confiar solo en `blur()`. Inputs `type="text"` + `inputMode="numeric"`.
  - Si el payload **ya** está en el máximo y el usuario escribe lo mismo, no hay cambio visual (esperado); si escribe por encima, sí hay toast.
- **Resize visible**: `patchStage` con `widthCm`/`heightCm` marca `userZoomedRef` para **no** re-encajar el viewport (conserva `viewport.scale` → un lienzo más grande se ve más grande y puede salir de pantalla; pan/zoom manual). `fitViewport` lee tamaño desde `payloadRef` (callback estable). Rect Konva y etiqueta bajo “FONDO / UPSTAGE” leen `payload.stage.width` / `height` / `widthCm` / `heightCm`.

## Cuadrícula

- Componente `StageCentimeterGrid` (antes “millimeter”).
- **Menor**: cada 10 cm (40 px lógicos @ 4 px/cm).
- **Mayor**: cada 50 cm (200 px); cada 5ª línea menor.
- Trazos con `strokeScaleEnabled={false}` para que sigan visibles al hacer zoom out.

## Vista (pan / zoom)

- **Zoom**: rueda del mouse sobre el lienzo (`viewport.scale`, ancla al cursor); `userZoomedRef` evita re-fit al redimensionar.
- **Pan**: arrastrar el fondo del escenario (`stage-plot-bg`); **Espacio** + arrastre en cualquier punto del lienzo; **botón central** del mouse.
- Cursor `grab` / `grabbing` sobre el fondo o con Espacio pulsado.
- **Ajustar vista** (reset zoom): botón toolbar; limpia `userZoomedRef`.

## Director (conductor)

- **Ancla de posición**: el payload guarda el **centro** del ítem (`x`, `y`); el **borde inferior visual** (pies) queda a `STAGE_PLOT_CONDUCTOR_DOWNSTAGE_CM` (3 cm) del borde downstage.
- Cálculo: `y = height − margenPx − visualHalfHeightPx(scale)` con `visualHalfHeightPx = getStagePlotItemVisualBounds(catalog).drawH × scale / 2` y escala default ≈ 40 cm (`defaultStagePlotItemScale("conductor")`).
- **Al normalizar / cargar** (`normalizeStagePlotPayload`): ítems `conductor` se re-anclan con su `scale` (`pinStagePlotConductors`).
- **Al cambiar tamaño del lienzo** (`patchStage` / `applyStagePlotStagePatch`): el director se re-ancla en el mismo `commitPayload` (undo/redo coherente). El resto de ítems conserva su `x,y`.
- **+ Director**: coloca en la posición canónica si no existe (misma fórmula con escala default).
- **No arrastrable**: el director no se puede mover manualmente (posición fija).
- **Viewport inicial / reset zoom** (`computeStagePlotViewportFit`): ancla el **borde inferior** del director (pies), no el centro del ítem, abajo-centro del viewport.
- **Radial / formaciones**: `resolveFormationFacingPoint` sigue usando el **centro** del conductor (o posición canónica de centro) como punto de mira.

## Archivos clave

| Archivo | Rol |
|---------|-----|
| `src/utils/stagePlotPdf.js` | Export PDF (hoja 1 escenario + dims; canales hoja 2) y JPG (solo escenario + dims) |
| `src/utils/stagePlotConstants.js` | Escala cm↔px, grid, offset director, clamps |
| `src/utils/stagePlotPayload.js` | Normalización `widthCm`/`heightCm`, `applyStagePlotStagePatch`, `pinStagePlotConductors` |
| `src/views/Giras/ProgramStagePlot.jsx` | Re-export → `ProgramStagePlotEditor.jsx` |
| `src/views/Giras/ProgramStagePlotEditor.jsx` | Editor Konva multi-lienzo, Asociar, Imp/Exp |
| `src/utils/stagePlotFormations.js` | Geometría de formaciones; defaults en cm→px |
| `src/services/stagePlotService.js` | CRUD multi-plot, `stage_plot_eventos`, `resolveStagePlotForEvent` |
| `src/utils/stagePlotTransfer.js` | Export/import JSON (`.ofrn-escenario.json`) |
| `src/views/Giras/StagePlotImportModal.jsx` | Import archivo / otra gira + export JSON |
| `src/views/Giras/StagePlotViewerModal.jsx` | Vista técnico solo lectura (toggles + PDF/JPG) |

## Modelo v2 — multi-lienzo por gira (implementado)

Plots son **first-class por programa** (`id_programa`), no 1:1 con bloque. Filas v1 existentes quedan como primer lienzo (`sort_order=0`, `bloque_ids={}`).

### Schema

| Pieza | Rol |
|-------|-----|
| `stage_plots` | N filas por `id_programa`. Columnas: `payload`, `nombre`, `sort_order`, `bloque_ids bigint[]` (opcional). Sin UNIQUE en `id_programa`. |
| `stage_plot_eventos` | Junction plot ↔ evento. **UNIQUE(`id_evento`)**: un evento tiene a lo sumo un plot; un plot puede cubrir varios eventos. |
| `eventos.id_repertorio` | Bloque opcional del evento (FK `programas_repertorios`, ON DELETE SET NULL). Fallback para técnicos. |

Migraciones: `20260826162040_stage_plots` → `20260827095903_stage_plots_multi_canvas` → `20260827100106_stage_plot_eventos` (aplicadas en linked).

### Dirección de asociación

1. **Plot → bloques** (`bloque_ids`): filtra **orgánico**. Vacío = roster confirmado de toda la gira. Con IDs = unión de grupos de esos bloques; bloque sin grupos aporta todo el confirmado.
2. **Plot → eventos** (`stage_plot_eventos`): qué ven técnicos en «Ver escenario» para ese ensayo/concierto.
3. **Evento → bloque** (`eventos.id_repertorio`): opcional; solo entra en resolución de fallback.

### Resolución técnico (`resolveStagePlotForEvent`)

1. Link directo en `stage_plot_eventos` para `id_evento`.
2. Si el evento tiene `id_repertorio`: primer plot del programa cuyo `bloque_ids` lo contiene.
3. Default gira: primer plot (`sort_order` / `created_at`).
4. Sin plots → vacío.

### UI

- Editor: pills de lienzos, + Lienzo, renombrar, eliminar (mín. 1), panel **Asociar**, Imp/Exp JSON + otra gira.
- Orgánico: `isConfirmedConvocadoForSeatingReports` + filtro por `bloque_ids`.
- Agenda: botón «Ver escenario» en concierto/ensayo (técnico / editor / management) → `StagePlotViewerModal` (toggles locales + PDF/JPG).

### Montaje / URLs (sin cambio)

Sub-tab Escenario en Seating; `seatingView=escenario` / `disposicion`; legacy `subTab=stage_plot` → redirect.

## Histórico — propuesta «1 plot por bloque» (superseded)

La opción 1:1 `id_repertorio` UNIQUE quedó descartada a favor de multi-lienzo + `bloque_ids[]` + eventos.

## Completado

- [x] Modelo en centímetros con escala **4 px/cm** (antes 10; max lienzo ~1600×1200 cm)
- [x] Migración legacy 10→4 px/cm (dims cm + coords/scale ítems + params formaciones)
- [x] Feedback Lienzo al tocar min/max (hint + toast sonner)
- [x] Cuadrícula en cm (10 / 50) con trazos legibles a todo zoom
- [x] Pan del lienzo (fondo / Espacio / botón central)
- [x] Lienzo UI en cm con límites
- [x] Radial Líneas: draft local + commit en blur/Enter (mismo patrón que Ancho/Alto)
- [x] Flush imperativo de drafts Lienzo al cerrar popover (fix: tamaño no se aplicaba)
- [x] Live apply Ancho/Alto/Líneas mientras el popover está abierto (debounce ~220 ms, solo si draft ∈ [min, max])
- [x] Director fijo abajo-centro al redimensionar lienzo (borde inferior a 3 cm del downstage)
- [x] Director re-anclado al normalizar/cargar payload (respeta escala del ítem)
- [x] Viewport encaja con pies del director abajo-centro (`computeStagePlotViewportFit`)
- [x] Backward compat payloads sin cm
- [x] `resolveFormationFacingPoint` usa posición canónica del director
- [x] Multi-lienzo por gira + `bloque_ids` + `stage_plot_eventos` + resolución técnico
- [x] Export/import JSON + import desde otra gira
- [x] «Ver escenario» técnico (agenda) con 4 toggles Lienzo + PDF/JPG
- [x] Orgánico filtrado por bloques asociados (roster confirmado)
- [x] Montaje en Seating (sub-tabs Disposición | Escenario)
- [x] Migración `stage_plots` v1 + deploy linked
- [x] Menú Gira: Disposición + Escenario bajo Repertorio
- [x] Exportar / Reportes unificado (dropdown en Disposición)
- [x] Iconos cuerdas FreeSVG CC0: `viola.svg` (166128 violin silhouette), `cello.svg` (150815), `bass.svg` (183100); `currentColor`, vista lateral. Violín sigue en game-icons.
- [x] Maderas Gerald_G (Openclipart PD): `flute.svg` (flauta traversa) y `oboe.svg` (silueta oboe #699) — archivos distintos; `oboe` ya no reutiliza `flute.svg`.
- [x] Borrar todo el escenario (confirmación, undo)
- [x] Tamaño default 40 cm al colocar ítems nuevos
- [x] Asas Transformer / formación: tamaño constante en pantalla (~7 px), compensando zoom y escala de ítem
- [x] Asas de formación seleccionada por encima de instrumentos (z-order + hit: Layer al final + `moveToTop`)
- [x] Tooltip de ítems: nombre + tamaño real en cm (`bounds × scale / STAGE_PLOT_CM_TO_PX`); formato `W × H cm` o `≈ N cm` si cuadrado.
- [x] Formaciones reescaladas al lienzo cm + ítems ~40 cm (defaults ~3–3.6 m; marcador 15 cm, snap 20 cm)
- [x] Copiar formación / copiar formación con instrumentos (barra + menú contextual; +40 cm; undo)
- [x] Cuadrado de silla detrás de instrumentos musicales (`ItemShape` + PDF)
- [x] Recuadro silla más violeta si magnetizado a plaza (`slotId` + formación existente; `#e0e7ff` / `#818cf8`)
- [x] Formaciones visibles (`stage.hideFormationGuides`; toggle **Formaciones** ON = guías visibles en popover Lienzo)
- [x] Recuadros visibles (`stage.hideChairSquares`; toggle **Recuadros** ON = sillas visibles; UI + PDF)
- [x] Fila de 4 toggles Lienzo (Cuadrícula / Radial / Formaciones / Recuadros; ON = mostrar)
- [x] Texto: solo tipografía (sin TT/notes) + formato enriquecido limitado (negrita, cursiva, tamaño, color, alineación; PDF)
- [x] Export PDF: hoja 1 solo escenario + dims Ancho/Profundo; channel list en hoja 2 si hay canales
- [x] Export JPG: escenario sin channels + dims Ancho/Profundo (`widthCm`/`heightCm`)
- [x] Centrar formación en eje X del director (botón deshabilitado si ya centrada; snap magnético + histeresis al arrastrar)
- [x] Flechas mueven formación seleccionada con reanchor (mismo path que drag; no demagnetiza `slotId`)
- [x] Menú contextual de ítem: «Seleccionar formación» si magnetizado (`slotId` → formación existente)
- [x] Clic derecho en vacío del lienzo: abre menú de la selección actual (formación o ítems) sin deseleccionar


## Texto (solo tipografía + formato limitado)

- **Tipo** `text` en catálogo (Marcas): etiqueta de escenario **sin** icono (`musical-notes` u otro) y **sin** silueta TT — solo Konva `Text` con `item.label` (y formato). Hit/selección = caja del texto (`getStagePlotTextLayout`); sin fondo/borde idle.
- **Paleta**: botón con el nombre «Texto» únicamente (sin pictograma TT/notes). `STAGE_PLOT_SILHOUETTES` no incluye `text`.
- **Payload** (normalizado en `normalizeStagePlotItem` / `createStagePlotItem`):
  - `fontSize` (8–48, default 14; presets 10…32)
  - `fontStyle`: `normal` | `bold` | `italic` | `bold italic`
  - `fill`: color hex (presets Negro / Pizarra / Rojo / Azul / Verde / Ámbar)
  - `align`: `left` | `center` | `right`
  - `label`: contenido; multilínea con `\n` (textarea en barra inferior)
- **UI**: al seleccionar un texto → barra inferior con edición, N/C, tamaño, colores, alineación. Floating: T / negrita / cursiva. Doble clic → foco en el editor de etiqueta (`commitPayload` / undo).
- **PDF**: `drawTextItemOnPdf` dibuja solo el string (tamaño/estilo/color/alineación/saltos); sin caja ni glifo.
- **Helpers**: `getStagePlotTextLayout`, `toggleStagePlotFontStyle`, `normalizeStagePlotTextFormat` en `stagePlotPayload.js`.


## Silla detrás de instrumentos

- **Tipos con silla:** categorías catálogo `Cuerdas`, `Maderas`, `Metales`, `Percusión`, `Teclado` (`stagePlotItemShowsChairSquare`).
- **Sin silla:** `chair` (evitar doble), `conductor`, `music_stand`, `riser`, audio (`mic`, `mic_stand`, `di`, `wedge`, `speaker`), marcas (`mark_x`, `text` — texto plano sin icono).
- **Tamaño:** lado = `max(boundsW, boundsH) × 0.6` (`stagePlotChairSquareSide` / `STAGE_PLOT_CHAIR_SQUARE_SCALE`); coords locales del ítem (el Group aplica `item.scale`).
- **Estilo idle (libre):** fill `#e2e8f0`, stroke `#94a3b8` (`STAGE_PLOT_CHAIR_SQUARE_*`).
- **Estilo magnetizado** (snap a plaza de formación): `parseSlotId(item.slotId)` válido **y** `formationId` existe en `payload.formations`. Fill `#e0e7ff`, stroke `#818cf8` (índigo lavado; más tenue que plazas/Transformer `#4f46e5`). El chrome de selección (borde ámbar del hit-box) no cambia; el recuadro violeta sigue visible seleccionado o no.
- Centrado, `listening={false}`; z-order: silla → hit/selección → icono.
- **PDF:** mismo criterio y colores (`drawChairSquareOnPdf` con flag magnetizado).
- **Recuadros** (`stage.hideChairSquares`, default `false`):
  - Toggle **Recuadros** en el popover **Lienzo** (fila con Cuadrícula / Radial / Formaciones): ON = recuadros visibles (`hideChairSquares: false`); OFF = ocultos.
  - Cuando `hideChairSquares` es `true`: no se dibuja el `Rect` de silla detrás de instrumentos (ni gris libre ni violeta magnetizado). Iconos/siluetas, hit-box de selección y Transformer siguen activos; el snap a plazas no cambia.
  - Persistido en el payload (undo/redo vía `patchStage` / `applyStagePlotStagePatch`).
  - **PDF:** respeta el mismo flag (`exportStagePlotPdf` omite `drawChairSquareOnPdf` si `hideChairSquares`).

## Formaciones (escala cm)

Parámetros en **px de escenario** (`cm × STAGE_PLOT_CM_TO_PX`). Defaults (ítems ~40 cm) @ 4 px/cm:

| Kind | Params default | ≈ cm reales |
|------|----------------|-------------|
| arc | rx 720, ry 400 | 180 × 100 cm (~3.6 m ancho) |
| horseshoe | width 1120, depth 640 | 280 × 160 cm |
| rect | width 1200, depth 600 | 300 × 150 cm |
| line | length 1440 | 360 cm |

- **Marcador de plaza**: `STAGE_PLOT_SLOT_MARKER_PX` = 15 cm (60 px @ 4 px/cm). Cuadrados de plaza: stroke **sólido continuo** (sin `dash`); `strokeWidth` **2** (idle/ocupada) / **2.25** (snap highlight); stroke idle `#334155`, filled/selected `#4f46e5`, snap `#3730a3`; fill idle `rgba(255,255,255,0.92)`, filled `0.28`, snap `0.4`. `strokeScaleEnabled={false}` para que el borde no desaparezca al zoom out.
- **Snap**: `STAGE_PLOT_SLOT_SNAP_PX` = 20 cm (80 px) (umbral un poco mayor que el marcador).
- **Línea guía**: trazo **sólido continuo** (sin `dash`) ~2–2.5 px (`selected` 2.5 / idle 2) con `strokeScaleEnabled={false}` (no se adelgaza al zoom).
- **Overflow** al redistribuir: margen 25 cm, stack 45 cm.
- **Asas de resize**: siguen ~7 px en pantalla (`/ viewport.scale` únicamente).
- Formaciones guardadas a escala 10 px/cm se reescalan al cargar junto con el lienzo (`stagePlotLegacyScaleFactor`). El lienzo default 90×56 cm queda chico frente a un arco de ~3.6 m — ampliar Ancho/Alto del Lienzo.
- **Copiar formación** (`cloneStagePlotFormation` en `stagePlotFormations.js`; UI en barra inferior + menú contextual clic derecho):
  - Offset fijo **+40 cm** en X (`STAGE_PLOT_FORMATIONATION_COPY_OFFSET_PX`).
  - **Copiar formación**: duplica geometría (kind, params, slots, rotation, facing) con **nuevo id**; plazas vacías (sin ítems). `commitPayload` (undo).
  - **Copiar formación con instrumentos**: igual + clona ítems con `slotId` de esa formación; nuevos ids de ítem, mismos índices de plaza remapeados al nuevo `formationId`, mismas posiciones relativas (mismo delta). `groupId` de clones = `null`.
  - Tras copiar: selecciona la formación nueva; si hubo instrumentos, también los clones en `selectedIds`.
- **Centrar (eje X del director)** — kinds `arc` / `horseshoe` / `rect` / `line`:
  - Botón **Centrar** deshabilitado/gris si `isFormationCenteredOnConductor` (`|formation.x − conductorX| ≤ STAGE_PLOT_FORMATIONATION_CENTER_EPSILON_PX` = 0.5 cm ≈ 2 px).
  - Snap magnético al arrastrar: `snapFormationXToConductorCenter` atrae a `conductorX` dentro de `STAGE_PLOT_FORMATIONATION_CENTER_SNAP_PX` (18 cm / 72 px); histeresis de salida `STAGE_PLOT_FORMATIONATION_CENTER_UNSNAP_PX` (28 cm / 112 px). Commit en drag end con `x` snappeado.
  - Guía vertical sutil en `conductorX` mientras la formación está snappeada al centro.
- **Mover con teclado** (formación seleccionada): flechas 12 px / Ctrl+flechas 4 px. Misma ruta que drag end (`commitFormationPosition` → `reanchorItemsToFormations` con el `formationId`): actualiza `x,y` de la formación y reposiciona ítems con ese `slotId` **sin** limpiar `slotId`. Prioridad igual que Delete: formación primero, luego ítems. Refs de selección se sincronizan al instante al seleccionar (evita que un keydown temprano mueva ítems y demagnetice).
- **Formaciones** (`stage.hideFormationGuides`, default `false`):
  - Toggle **Formaciones** **solo** en el popover **Lienzo** (fila con Cuadrícula / Radial / Recuadros): ON = guías visibles (`hideFormationGuides: false`); OFF = ocultas.
  - **No** hay control de visibilidad de guías en la barra inferior de formación (Centrar / Copiar… / Eliminar) ni en el header de la paleta Formaciones.
  - Cuando `hideFormationGuides` es `true`: no se renderizan `FormationShape` (línea guía + plazas) ni `FormationResizeHandles`. Los ítems siguen visibles; el snap magnético a slots sigue activo (slots lógicos).
  - Para editar/mover formaciones de nuevo: activar **Formaciones** en Lienzo.
  - Persistido en el payload (undo/redo vía `patchStage` / `applyStagePlotStagePatch`).
  - **PDF / JPG**: `exportStagePlotPdf` / `exportStagePlotJpg` dibujan línea guía + plazas cuando `hideFormationGuides` es `false` (mismo criterio que el lienzo).
- **Menú contextual de ítem — «Seleccionar formación»**:
  - Visible solo si el ítem bajo el clic derecho está magnetizado: `parseSlotId(item.slotId)` válido **y** ese `formationId` existe en `payload.formations` (mismo criterio que el recuadro violeta). Si no, la acción se **oculta**.
  - Multi-selección: usa siempre la formación del **ítem bajo el clic** (no exige que todos compartan la misma).
  - Al elegir: `handleSelectFormation` — selecciona esa formación, limpia `selectedIds`, cierra menús; aparecen asas y barra inferior de formación (igual que clic en el path).
  - Solo en modo edición (`canEdit`); el menú de ítem ya no abre en read-only.
- **Clic derecho en vacío (selección actual)** (`handleStageContextMenu` en `Stage`):
  - Clic derecho sobre **otro** ítem/formación seleccionable: comportamiento estándar — selecciona ese objeto y abre **su** menú (handlers de ítem/formación con `cancelBubble`).
  - Clic derecho en **vacío** / fondo (`!interactive` vía `classifyStagePlotPointerTarget`):
    - Si hay `selectedFormationId` → menú de **formación** (mismas acciones que clic derecho sobre la formación).
    - Si no hay formación pero hay `selectedIds` → menú de **ítem(s)** usando el primer id como ancla (multi-selección se conserva; «Seleccionar formación» según magnetismo de ese ancla).
    - Sin selección → no abre menú (solo `preventDefault`).
  - El menú se posiciona en el puntero (`clientX`/`clientY`).
  - **No** limpia la selección: `onMouseDown` del Stage solo deselecciona con **clic izquierdo** (`button === 0`) en vacío; el botón derecho no deselecciona.


## Navegación (2026-08)

- **Disposición:** subTab=seating&seatingView=disposicion (default al entrar a Seating)
- **Escenario:** subTab=seating&seatingView=escenario
- Deep link legacy subTab=stage_plot → redirect 301-like (replace) a escenario bajo seating
- **Lienzo:** botón interno del editor (popover toolbar), no ítem de menú principal
- **Borrar todo:** botón danger en popover Lienzo → confirmación (`useConfirmDialog` / portal `z-[100]` o `z-[10000]` en pantalla completa) → vacía `items`, `formations`, `groups`, limpia selección; `commitPayload` (undo). Oculto si `readOnly`.
- **Tamaño default ítems:** al colocar (paleta, drop, orgánico Insertar) `createStagePlotItem` → `defaultStagePlotItemScale(type)`: `scale = clamp( (STAGE_PLOT_ITEM_DEFAULT_SIZE_CM × STAGE_PLOT_CM_TO_PX) / max(drawW, drawH), 0.25…12 )` con bounds de `getStagePlotItemVisualBounds` (silueta o catálogo). Duplicar conserva `scale`. Ítems existentes sin cambios.
- **Asas de resize (Transformer):** tamaño fijo ~7 px en pantalla. Konva dibuja `anchorSize` en coords locales del nodo; compensar **zoom del Stage** (`viewport.scale`) **y escala del ítem** (`item.scale` del Group seleccionado; multi-select → máx.). Fórmula: `anchorSize = 7 / (max(viewport.scale, 0.15) × nodeScale)`; igual para `borderStrokeWidth`, `rotateAnchorOffset`, `anchorCornerRadius`, `anchorStrokeWidth`. Durante drag de resize, `onTransform` lee escala live del nodo. **Formaciones** (`FormationResizeHandles`): coords de capa sin escala de ítem → solo `/ viewport.scale`.
- **Z-order asas de formación (seleccionada):** en el `Layer` Konva el orden es guías de formación → ítems → Transformer → **asas de la formación seleccionada** (`FormationResizeHandles` al final). Además `useLayoutEffect` hace `moveToTop()` sobre `.stage-plot-formation-handles` al seleccionar/redibujar, para que peak/side no queden tapadas por sillas/iconos ni por un Transformer vacío tras `moveToTop` de ítems. Formaciones **no** seleccionadas siguen debajo de los instrumentos (solo el path/plazas; sin asas). Snap magnético / `slotId` sin cambios.
- **Floating toolbar (Copiar / Eliminar, + formato texto):** overlay HTML sobre el canvas (`pointer-events` solo en la pill). Posición en **coords de pantalla** (`viewport.x/y + stageCoord × viewport.scale`). Regla de colocación (AABB de la selección, single/multi/texto):
  1. Preferir **a la derecha** del AABB: `left = screenMaxX + 8`, `top = screenMinY` (no tapa el rotate handle centrado arriba, ~20–36 px).
  2. Si no cabe: **a la izquierda** `left = screenMinX − 8 − toolbarW`, mismo `top`.
  3. Fallback: **arriba-derecha** con holgura de rotación: `left = screenMaxX − toolbarW`, `top = screenMinY − 40 − toolbarH` (bottom del toolbar queda ≥40 px sobre el top del AABB). Clamp a bordes del canvas (±8 px).
- **Exportar / Reportes:** dropdown unificado en Disposición (PDF seating, Excel, particellas)

## Pendiente / deuda

- UI en `EventForm` para setear `eventos.id_repertorio` (hoy solo vía fallback; asociación principal es plot→eventos en editor).
- Preview Konva inline en `StagePlotViewerModal` (hoy: resumen + export PDF/JPG con toggles locales).
- Reordenar lienzos (drag sort_order) en el editor.


## Export PDF / JPG (plano de escenario)

- **Archivo**: `src/utils/stagePlotPdf.js` — `exportStagePlotPdf`, `exportStagePlotJpg`. Triggers en toolbar del editor (`ProgramStagePlotEditor.jsx`): botones **PDF** y **JPG**. También `StagePlotViewerModal` (técnicos) con toggles locales sobre el payload.
- **Dimensiones** (ambos formatos): usan `payload.stage.widthCm` / `heightCm` (mismos valores que Lienzo Ancho / Alto). En el export se etiquetan **Ancho** (widthCm) y **Profundo** (heightCm = profundidad del escenario). Texto resumen `Ancho: X cm · Profundo: Y cm` + etiquetas en bordes inferior (ancho) e izquierdo (profundo).
- **Guías de lienzo** (ambos formatos; misma semántica que toggles Lienzo, ON = visible):
  - **Cuadrícula** si `stage.showGrid !== false` (menor 10 cm / mayor 50 cm).
  - **Radial** si `stage.showRadial` — abanico desde `resolveFormationFacingPoint` con `stage.radialLines` (3–36).
  - **Formaciones** si `!stage.hideFormationGuides` — línea guía + plazas (`formationGuideLinePoints` / `computeFormationSlots`); plazas ocupadas vs vacías.
  - **Recuadros** de silla si `!stage.hideChairSquares` (sin cambio).
  - Orden de dibujo: fondo → guías → ítems (como en Konva).
- **PDF**:
  - **Hoja 1**: solo el escenario (guías según flags, ítems, sillas según `hideChairSquares`, tipografía texto, labels FONDO/PÚBLICO, dimensiones). Sin channel list en página 1.
  - **Hoja 2+**: `Channel list` (autoTable Ch / Elemento / Notas) **solo si** `deriveStagePlotChannels` tiene filas; si no hay canales, el PDF es de una sola hoja.
  - Título / nombre del plano / fecha en cabecera; atribución de iconos al pie.
- **JPG**: raster del escenario únicamente (mismas guías + ítems/sillas/texto). **No** incluye channel list. Incluye título, dims Ancho/Profundo en bordes + resumen. Calidad JPEG ~0.92; nombre `plano-escenario_{nomenclador}.jpg`.
- **Fuera de alcance del export**: channel list nunca en JPG ni en hoja 1 del PDF; asas de resize / snap preview / ejes de centrado temporales del editor.
