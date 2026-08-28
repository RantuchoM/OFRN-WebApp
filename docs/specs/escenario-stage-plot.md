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
- **Pan**: **Espacio** + arrastre en cualquier punto del lienzo; **botón central** del mouse. (El arrastre en vacío ya no pannea: es marquee **solo en herramienta Seleccionar**.)
- Cursor `grab` / `grabbing` con Espacio pulsado o mientras se pannea; `default` en Seleccionar; `move` en Mover; `crosshair` durante marquee. Sobre **asas** (Transformer, formación, plazas libres): cursor de resize (`ew`/`ns`/`nwse`/`nesw`) o `grab`/`grabbing` según el asa; la asa gana sobre el cursor de herramienta vía `style.cursor` inline en el wrap del Stage.
- **Ajustar vista** (reset zoom): botón toolbar; limpia `userZoomedRef`.

## Herramientas Seleccionar / Mover

Toggle en la toolbar del editor (junto a Lienzo / Zoom), solo si `canEdit`. Estado de sesión: `canvasTool` (`"select"` | `"move"`); default **Seleccionar**. Atajos: **V** = Seleccionar, **M** = Mover (sin modificadores; no en inputs). Iconos: `IconMousePointer` / `IconMove` en `Icons.jsx`.

| Gestos | **Seleccionar** | **Mover** |
|--------|-----------------|-----------|
| Clic en ítem (incl. **director**) / formación | Selecciona (Ctrl/⌘/Shift = aditivo en ítems) | Selecciona (igual); luego se puede arrastrar |
| Arrastrar ítem / formación **no seleccionado(a)** | Solo selecciona (no mueve hasta el siguiente gesto) | Mueve sin pre-selección |
| Arrastrar ítem / formación **ya seleccionado(a)** | Mueve (multi-move / formación + reanchor; un paso undo grupal) | Mueve (multi-move / formación + reanchor existentes) |
| Arrastrar vacío | Marquee (rectángulo) | Sin marquee; clic vacío sin modificador **limpia** selección |
| Espacio / rueda central | Pan (igual) | Pan (igual) |
| Asas Transformer / formación / plazas libres | Siguen editables si hay selección; cursor de asa al hover | Igual |
| Flechas teclado | Nudge (sin cambio) | Nudge (sin cambio) |

**Hit de formación**: guía (línea hit transparente) **y plazas** siempre `listening` para clic/tap → `handleSelectFormation` en Seleccionar y Mover. `draggable` de la formación en Seleccionar solo si `selectedFormationId === id`; en Mover siempre (salvo preview de asa/plaza). `draggable` de plazas solo si la formación está seleccionada y `slotMode !== "fixed"`. Ítems: `draggable` en Seleccionar solo si `selectedIds` incluye el id; en Mover siempre. El clic en no-seleccionado no arrastra en el mismo gesto porque `draggable` pasa a true recién tras el render post-selección.

**Decoración del lienzo** (textos FONDO/PÚBLICO, línea downstage, dims): `listening={false}` para no robar hits al director u otros ítems cerca del borde.

Hint del canvas cambia según la herramienta activa.

## Selección marquee (rectángulo)

- **Activación**: solo con herramienta **Seleccionar** — clic/arrastre **izquierdo en vacío** del lienzo (fondo u área no interactiva).
- **No inicia** sobre ítem, formación, asa de formación ni Transformer (`classifyStagePlotPointerTarget` → `interactive`).
- En **Mover**, el vacío no inicia marquee (clic limpia selección si no hay modificador aditivo).
- Mientras se arrastra (≥ ~4 px pantalla): rectángulo translúcido índigo en **coords de escenario** (`clientToStagePlotPoint` invierte el transform del Stage → correcto con pan/zoom).
- **Criterio**: **intersección** AABB (no contención estricta).
  - Ítems (incl. **director/conductor**): AABB del hit/visual box (huella / texto / catálogo) **con rotación**.
  - Formaciones: AABB de la guía + plazas (pad ½ marcador), solo si `!hideFormationGuides`.
- **Al soltar**:
  1. Todos los **ítems** que intersectan → `selectedIds` (prioridad; el director cuenta como ítem).
  2. Si **ningún** ítem y **al menos una** formación intersecta → `selectedFormationId` (modelo singular: si hay varias, la primera).
  3. Si nada intersecta (sin modificadores) → limpia selección.
- **Modificadores** (igual que clic en ítem): **Ctrl / ⌘ / Shift** = aditivo (unión de ítems; no limpia al activar el marquee). Sin modificador: reemplaza selección al activar el drag (o limpia en clic sin drag).
- **Pan** sigue con Espacio / botón central (no compite con el marquee).
- Hint (Seleccionar): «Seleccionar: clic / arrastrar vacío = marquee · seleccionado = arrastrar para mover · … · V/M = herramientas».

## Director (conductor)

- **Ancla de posición**: el payload guarda el **centro** del ítem (`x`, `y`). Al **colocar** (+ Director) o al **pin** por resize, el **borde inferior visual** (pies) queda a `STAGE_PLOT_CONDUCTOR_DOWNSTAGE_CM` (3 cm) del borde downstage.
- Cálculo canónico: `y = height − margenPx − visualHalfHeightPx(scale)` con `visualHalfHeightPx = getStagePlotItemVisualBounds(catalog).drawH × scale / 2` y escala default ≈ 40 cm (`defaultStagePlotItemScale("conductor")`).
- **Arrastrable**: en edición, el director se mueve como cualquier ítem **en Mover** o **en Seleccionar si ya está seleccionado** (`itemIsDraggable`); clic sin selección previa solo selecciona. Clamp dentro del lienzo, margen 8 px. **No** magnetiza a plazas de formación.
- **Selección**: mismo path que otros ítems (`handleSelectItem` / marquee AABB); etiquetas decorativas del lienzo no escuchan eventos para no tapar el hit cerca de downstage.
- **Persistencia**: `normalizeStagePlotPayload` **conserva** `x,y` del conductor (no re-pinea). Así sobrevive load / undo / autosave / export.
- **Al cambiar tamaño del lienzo** (`patchStage` / `applyStagePlotStagePatch` / preset locación): el director se re-ancla con `pinStagePlotConductors` (undo/redo coherente). Después el usuario puede volver a moverlo.
- **+ Director**: coloca en la posición canónica si no existe (misma fórmula con escala default).
- **Viewport inicial / reset zoom** (`computeStagePlotViewportFit`): ancla el **borde inferior** del director (pies), no el centro del ítem, abajo-centro del viewport.
- **Radial / formaciones**: `resolveFormationFacingPoint` usa el **centro** del conductor (o posición canónica si no hay ítem) como punto de mira y origen del abanico radial (lienzo + PDF/JPG). Durante el drag del director, el radial usa un override en vivo (`conductorDragOrigin`) hasta el commit.

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
- **FIMBA Venues** (`/fimba/edicion/:id/venues`): listado por locación de conciertos (`id_tipo_evento = 1`) de la gira enlazada a la edición. Metadata operativa en `fimba_venue_info` (referente, rider, sillas, agua, observaciones); nombre/dirección desde `locaciones`. Espectáculos: artistas taggeados, grupos OFRN, bloque repertorio. Acciones: **Ver escenario** (`StagePlotViewerModal`); enlace al editor OFRN (Seating → Escenario) solo staff `isManagement`; edición de evento vía `FimbaEventoFormModal` (staff no RO). Link **Agenda** filtrada por locación. **Sin** estado de venue OFRN. Consulta / token `/c`: lectura + Ver escenario.

### Montaje / URLs (sin cambio)

Sub-tab Escenario en Seating; `seatingView=escenario` / `disposicion`; legacy `subTab=stage_plot` → redirect.

## Histórico — propuesta «1 plot por bloque» (superseded)

La opción 1:1 `id_repertorio` UNIQUE quedó descartada a favor de multi-lienzo + `bloque_ids[]` + eventos.

## Completado

- [x] Modelo en centímetros con escala **4 px/cm** (antes 10; max lienzo ~1600×1200 cm)
- [x] Migración legacy 10→4 px/cm (dims cm + coords/scale ítems + params formaciones)
- [x] Feedback Lienzo al tocar min/max (hint + toast sonner)
- [x] Cuadrícula en cm (10 / 50) con trazos legibles a todo zoom
- [x] Pan del lienzo (Espacio / botón central; arrastre en vacío = marquee **solo en Seleccionar**)
- [x] Selección marquee (rectángulo; intersección AABB; ítems prioritarios incl. director; formación si no hay ítems)
- [x] Herramientas **Seleccionar** / **Mover** (toolbar + V/M; marquee solo en select; drag en move o select si ya seleccionado; cursor hint + asas)
- [x] Clic en formación (guía + plazas always-listening) y en director selecciona en ambas herramientas
- [x] Lienzo UI en cm con límites
- [x] Radial Líneas: draft local + commit en blur/Enter (mismo patrón que Ancho/Alto)
- [x] Flush imperativo de drafts Lienzo al cerrar popover (fix: tamaño no se aplicaba)
- [x] Live apply Ancho/Alto/Líneas mientras el popover está abierto (debounce ~220 ms, solo si draft ∈ [min, max])
- [x] Director re-anclado al **resize** de lienzo / preset locación (`pinStagePlotConductors`); posición libre persistida al normalizar
- [x] Director **arrastrable**; radial (lienzo + PDF/JPG) origen = `resolveFormationFacingPoint` (centro del conductor), con override en vivo durante el drag
- [x] Viewport encaja con pies del director abajo-centro (`computeStagePlotViewportFit`)
- [x] Backward compat payloads sin cm
- [x] `resolveFormationFacingPoint` usa posición del director (o canónica si no hay ítem)
- [x] Multi-lienzo por gira + `bloque_ids` + `stage_plot_eventos` + resolución técnico
- [x] Export/import JSON + import desde otra gira
- [x] «Ver escenario» técnico (agenda + FIMBA Espacios) con 4 toggles Lienzo + PDF/JPG
- [x] Orgánico filtrado por bloques asociados (roster confirmado)
- [x] Montaje en Seating (sub-tabs Disposición | Escenario)
- [x] Migración `stage_plots` v1 + deploy linked
- [x] Menú Gira: Disposición + Escenario bajo Repertorio
- [x] Exportar / Reportes unificado (dropdown en Disposición)
- [x] Iconos cuerdas FreeSVG CC0 (colores de origen): `violin.svg` ([175059](https://freesvg.org/publicdomainq-0008893doscnq)), `viola.svg` ([179008](https://freesvg.org/publicdomainq-violin2)), `cello.svg` ([3882](https://freesvg.org/cello-vector-image) papapishu), `bass.svg` ([183100](https://freesvg.org/double-bass-3253216)).
- [x] Maderas Gerald_G (Openclipart PD): `flute.svg` (colores de origen) y `oboe.svg` (silueta mono `currentColor`) — archivos distintos; `oboe` ya no reutiliza `flute.svg`.
- [x] Borrar todo el escenario (confirmación, undo)
- [x] Tamaño default 40 cm al colocar ítems nuevos
- [x] Asas Transformer / formación: tamaño constante en pantalla (~7 px); Transformer en px pantalla (sin /zoom); formaciones compensan `viewport.scale`
- [x] Asas de formación seleccionada por encima de instrumentos (z-order + hit: Layer al final + `moveToTop`)
- [x] Tooltip de ítems: nombre + tamaño real en cm (`bounds × scale / STAGE_PLOT_CM_TO_PX`); formato `W × H cm` o `≈ N cm` si cuadrado.
- [x] Formaciones reescaladas al lienzo cm + ítems ~40 cm (defaults ~3–3.6 m; marcador 15 cm, snap 20 cm)
- [x] Copiar formación / copiar formación con instrumentos (barra + menú contextual; +40 cm; undo)
- [x] Huella instrumento 50×50 cm + icono contain en 50×50 + atril 35 cm en borde frontal (canvas + PDF/JPG; hit = huella; scale default 1; layout `stagePlotInstrumentFootprintLayout`)
- [x] Huella 50×50 **invisible** (sin stroke/fill); atril + icono visibles; hit/Transformer = huella
- [x] Atril stand-alone: `music-stand.svg` OFRN (plato + 3 palitos 120°) + marca frontal alineada en huellas
- [x] Migración one-shot `stage.instrumentFootprintMigrated`: scales pre-huella ≫ 1 → 1 (evita ítems 2–5× inflados sobre la huella física)
- [x] Orientación default base hacia director al crear/magnetizar (`rotationInstrumentBaseFacingPoint`); sin `slot.rotation` en ítems
- [x] Mobiliario orgánico: sillas / banquetas (bass auto + `banqueta` manual) / atriles ceil(n/2) vn·va·vc·bass
- [x] Catálogo `banqueta` + silueta; locaciones `escenario_ancho_cm`/`escenario_profundo_cm` + picker
- [x] Magnetizado: ya no pinta el rect de huella (invisible); hit/slotId sin cambio
- [x] Formaciones visibles (`stage.hideFormationGuides`; toggle **Formaciones** ON = guías visibles en popover Lienzo)
- [x] Recuadros visibles (`stage.hideChairSquares`; toggle **Recuadros** — legacy; huella de instrumento no depende de él)
- [x] Fila de 4 toggles Lienzo (Cuadrícula / Radial / Formaciones / Recuadros; ON = mostrar)
- [x] Texto: solo tipografía (sin TT/notes) + formato enriquecido limitado (negrita, cursiva, tamaño, color, alineación; PDF)
- [x] Export PDF: hoja 1 solo escenario + dims Ancho/Profundo; channel list en hoja 2 si hay canales
- [x] Export JPG: escenario sin channels + dims Ancho/Profundo (`widthCm`/`heightCm`)
- [x] Centrar formación en eje X del director (botón deshabilitado si ya centrada; snap magnético + histeresis al arrastrar)
- [x] Formación **semi-arco** (ala–arco–ala, `wingLength`/`wingAngle` simétricos, asas tip_l/tip_r)
- [x] Semi-arco: plazas laterales (`wingSlots`) + plazas en arco (`arcSlots`); fijo paramétrico por segmento; UI dual + migración desde `slots`
- [x] Modos de plaza **fijo / libre / simétrico** (`slotMode` + `slotTs`; UI barra inferior)
- [x] Flechas mueven formación seleccionada con reanchor (mismo path que drag; no demagnetiza `slotId`)
- [x] Menú contextual de ítem: «Seleccionar formación» si magnetizado (`slotId` → formación existente)
- [x] SVG en `instrumentos` (`svg_icon` + `stage_plot_type`) + seed 21 filas + guitarra papapishu (`21` / `guitar`) + bandoneón FreeSVG (`22b` / `bandoneon`)
- [x] Clic derecho en vacío del lienzo: abre menú de la selección actual (formación o ítems) sin deseleccionar
- [x] Undo/redo de movimiento grupal = **una** entrada: multi-selección / grupo explícito / formación+reanchor; rafaga de flechas coalescida
- [x] Recuadro gris de selección en formación + asas `box_*` (8) para **escala uniforme** (params lineales + traslación anclada); convive con asas paramétricas; undo en drag end + reanchor
- [x] **Vista Venues** (`/management/venues`): locaciones con conciertos programados agrupadas; eventos con fecha, programa, grupos, estado venue; medidas de escenario de la locación; «Ver escenario» (`StagePlotViewerModal`) y enlace al editor Escenario de la gira


## Undo / redo (historial)

- Stack de snapshots en `historyRef` vía `commitPayload` (no en cada `mousemove`).
- **Ctrl+Z** undo · **Ctrl+Y** / **Ctrl+Shift+Z** redo.
- **Una sola entrada** cuando:
  1. Se arrastra un **grupo explícito** o una **multi-selección** (marquee/recorte incluido): Konva Transformer `_proxyDrag` dispara `dragEnd` en cada nodo; solo el **leader** hace `commitPayload` con todas las posiciones; los followers se ignoran (`dragGroupRef` + `suppressItemDragEndIdsRef`).
  2. Se mueve una **formación**: `commitFormationPosition` actualiza formación + `reanchorItemsToFormations` en el mismo commit.
  3. **Transform** multi-nodo: `pendingTransformRef` agrupa los `transformend` en un microtask.
  4. **Flechas** (ítems o formación): el primer keydown empuja historial; el key-repeat actualiza con `skipHistoryRef` hasta `keyup`/`blur` (`keyboardNudgeBurstRef`).
- Autosave / load de plot resetea el stack (sin undo hacia vacío).


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

- **Deprecado para instrumentos musicales:** el recuadro-silla genérico ya no se dibuja (`stagePlotItemShowsChairSquare` → siempre `false`). Reemplazado por **huella 50×50 + atril** (ver abajo).
- Toggle **Recuadros** (`stage.hideChairSquares`) se conserva en payload/UI por compat; no afecta la huella de instrumentos.
- Tipo catálogo `chair` (silla suelta) sigue disponible en paleta Escenario.


## Huella de instrumento + atril satélite (50×50 / icono 50×50 / atril 29 cm @ 40 cm)

- Constantes (`stagePlotConstants.js` + `stagePlotAtril.js`):
  - `STAGE_PLOT_INSTRUMENT_FOOTPRINT_WIDTH_CM=50`, `DEPTH_CM=50` (cuadrado)
  - `STAGE_PLOT_INSTRUMENT_ICON_BOX_CM=50` (caja del SVG/icono = huella)
  - `STAGE_PLOT_ATRIL_DISTANCE_CM=40` — distancia del **centro del atril** hacia el director desde el centro del ítem (o midpoint del par)
  - `STAGE_PLOT_ATRIL_LINE_CM=29` — ancho del plato (antes 35 cm en borde frontal)
  - `STAGE_PLOT_ATRIL_SHAFT_CM=9.1`, `STAGE_PLOT_ATRIL_LEG_CM=10.5` — longitudes ×0.7 vs base 13/15 cm
  - `STAGE_PLOT_ATRIL_PLATE_THICKNESS_CM=1.05` — grosor del plato ×1.4 (solo borde del atril; patas sin cambio de trazo)
  - Orientación patas (local, tras rotación conductor→atril): **1** pata −Y (músico/upstage) + **2** patas hacia +Y (director/downstage, ±30°/150°)
  - Rotación del plato: `atan2(atril − conductor) + 90°` (no usar conductor − ancla, evita invertir 180°)
  - Helper `stagePlotInstrumentFootprintLayout()` → px @ `STAGE_PLOT_CM_TO_PX` (=4): huella 200×200, icono centrado
  - Helper `stagePlotSatelliteAtrilGeometry()` → plato horizontal + 3 palitos 120° (mástil −Y hacia instrumento)
  - Helper `computeSatelliteAtrilPlacement(anchorX, anchorY, conductorX, conductorY)` → `{ x, y, rotationDeg }` con plato **perpendicular** al rayo director→atril (`rotation = atan2(dy,dx) + 90°`)
  - Helper `collectStagePlotSatelliteAtrils(payload)` → lista de atriles derivados para canvas/PDF
- Aplica a categorías musicales (Cuerdas/Maderas/Metales/Percusión/Teclado) vía `stagePlotItemHasInstrumentFootprint`.
- **Local:** ancho = X; profundo = Y; **+Y local** = cuello/mástil del SVG. **Orientación de ítems:** `rotationInstrumentBaseFacingPoint` → base (−Y) hacia director.
- **Atril satélite:** ya **no** se dibuja dentro del Group del instrumento ni en el borde +Y de la huella. Se renderiza como entidad separada (`SatelliteAtrilShape` en editor; paso dedicado en PDF/JPG) en coords de escena, 40 cm hacia el director desde el centro del ítem.
- **Hit / Transformer:** solo la huella 50×50 del instrumento. El atril satélite `listening={false}` (sigue al ítem al soltar; durante drag puede rezagarse hasta commit).
- **Icono:** `object-fit: contain` en caja 50×50; escala default = `1`.
- **Dibujo:** rectángulo de huella invisible; icono + atril satélite visibles.
- Legacy: flag `stage.instrumentFootprintMigrated` sin cambio.
- Magnetizado: sin cambio de `slotId` / reanchor.
- **Orientación del atril:** independiente de `item.rotation`; siempre hacia el director actual (o override en vivo al arrastrar director).

### Pares de cuerdas con atril compartido (`string_pair`)

- Tipos: `violin`, `viola`, `cello`, `bass`.
- Payload grupo (`stagePlotGroups.js`):
  ```json
  { "id": "…", "kind": "string_pair", "instrumentType": "violin", "itemIds": ["id1", "id2"] }
  ```
  Ítems llevan `groupId` común; drag grupal vía lógica existente de `groupId`.
- Layout default (`insertStagePlotStringPair`): dos huellas separadas **50 cm** (`STAGE_PLOT_STRING_PAIR_SPACING_CM`) en tangente al rayo hacia director; base de cada una hacia director; atril en **midpoint** + 40 cm hacia director.
- UI insert:
  - Panel orgánico: botón **Insertar par** (vn/va/vc/bass; requiere Δ ≥ 2).
  - Paleta Cuerdas: botón **Par** bajo cada tipo admitido.
- Conteo orgánico atriles dibujados (`countStagePlotDrawnAtriles`): 1 por par + ceil(sueltos/2) por tipo cuerda + 1:1 resto + ítems `music_stand` manuales.
- Atril stand-alone (`music_stand` en paleta): sigue colocable a mano (perc, etc.); no genera satélite derivado.


## Mobiliario: sillas / banquetas / atriles (panel Orgánico)

- **Sillas needed:** 1 × instrumentista convocado que no es contrabajo ni percusión.
- **Sillas drawn:** ítems con huella que no son tipos banqueta (bass/perc familia catálogo).
- **Banquetas needed:** `#contrabajo + #percusionistas` (timpani+perc + familia perc del roster).
- **Banquetas drawn:** cada ítem `bass` cuenta **1 auto** + cada ítem paleta `banqueta` (manual, p.ej. perc). Los iconos de perc **no** implican banqueta.
- Catálogo: tipo `banqueta` en Escenario (silueta propia).
- Catálogo: tipo `music_stand` («Atril») en Escenario — SVG OFRN `public/stage-plot/icons/music-stand.svg` (plato `#1e293b` + patas `#64748b`; esquema rectángulo + 3 palitos 120°); cableado en `STAGE_PLOT_ICON_FILES`; silueta fallback alineada. **No** suma al conteo orgánico de atriles (ese conteo sigue siendo por ítems con huella / ceil(n/2) cuerdas).
- **Atriles needed/drawn:**
  - Default **1:1** por instrumentista / ítem con huella (contado vía `countStagePlotDrawnAtriles`).
  - Excepción compartida **ceil(n/2)** para **violín, viola, cello y contrabajo** sueltos (no en par).
  - **Pares** (`kind: string_pair`): **1 atril** por par en el conteo dibujado.
  - Ítems paleta `music_stand`: +1 cada uno (manual; no satélite derivado).
  - Helpers: `computeStagePlotFurnitureSummary` / `atrilesFromOrganicoCounts` / `countStagePlotDrawnAtriles` en `stagePlotOrganico.js` + `stagePlotAtril.js`.


## Presets de locación (ancho × profundo)

- Columnas en `locaciones`: `escenario_ancho_cm`, `escenario_profundo_cm` (nullable; checks 40–1600 / 30–1200). Migración `20260827123445_locaciones_escenario_dims` (aplicada en linked OFRN).
- Editables en Datos → Locaciones (`DataView.jsx`).
- Payload: `stage.id_locacion` opcional (recordatorio del preset aplicado).
- **UI picker** (`SearchableSelect`): searchable por nombre y ciudad (`localidades.localidad` en subLabel). Label: `Nombre · Ancho × Profundo cm` (o `· sin medida` si faltan dims; opción deshabilitada).
- **+ Lienzo:** diálogo nombre + combobox de locación → crea payload con `widthCm`/`heightCm` + pin director. Opción vacía = default 90×56 cm.
- **Lienzo popover:** combobox «Preset de locación» aplica tamaño vía `applyStagePlotStagePatch` (director recentrado; resto de ítems como al cambiar Ancho/Alto). El click-outside del popover ignora `.searchable-portal` para no cerrar al elegir.

## Formaciones (escala cm)

Parámetros en **px de escenario** (`cm × STAGE_PLOT_CM_TO_PX`). Defaults (ítems ~40 cm) @ 4 px/cm:

| Kind | Params default | ≈ cm reales |
|------|----------------|-------------|
| arc | rx 720, ry 400 | 180 × 100 cm (~3.6 m ancho) |
| semi_arc | rx/ry 720×400, wingLength 320, wingAngle 15° | arco ~3.6×2 m + alas ~80 cm |
| horseshoe | width 1120, depth 640 | 280 × 160 cm |
| rect | width 1200, depth 600 | 300 × 150 cm |
| line | length 1440 | 360 cm |

- **Marcador de plaza**: `STAGE_PLOT_SLOT_MARKER_PX` = 15 cm (60 px @ 4 px/cm). Cuadrados de plaza: stroke **sólido continuo** (sin `dash`); `strokeWidth` **2** (idle/ocupada) / **2.25** (snap highlight); stroke idle `#334155`, filled/selected `#4f46e5`, snap `#3730a3`; fill idle `rgba(255,255,255,0.92)`, filled `0.28`, snap `0.4`. `strokeScaleEnabled={false}` para que el borde no desaparezca al zoom out.
- **Snap**: `STAGE_PLOT_SLOT_SNAP_PX` = 20 cm (80 px) (umbral un poco mayor que el marcador).
- **Línea guía**: trazo **sólido continuo** (sin `dash`) ~2–2.5 px (`selected` 2.5 / idle 2) con `strokeScaleEnabled={false}` (no se adelgaza al zoom).
- **Semi-arco** (`kind: "semi_arc"`): polilínea **ala recta → arco → ala recta**, simétrica respecto al eje de mira (director). Params: `rx`/`ry`/`startAngle`/`endAngle` (arco elíptico como `arc`), `wingLength` (px, simétrico), `wingAngle` (grados; positivo = alas abiertas hacia afuera respecto a la tangente en el extremo del arco). Asas: `w`/`e`/`n` (radio) + `tip_l`/`tip_r` (longitud y ángulo simétricos al arrastrar cualquiera). Paleta: **Semi-arco**. Centrar / copiar / guías / PDF-JPG / orgánico: igual que otras formaciones (`STAGE_PLOT_CENTERABLE_FORMATION_KINDS`).
- **Plazas semi-arco (laterales ≠ arco)**:
  - Campos: `wingSlots` (L, alias legacy de lectura `lateralSlots`) + `arcSlots` (A). `slots` = **2·L + A** (sincronizado en normalize / UI).
  - Defaults al crear: L=2, A=4 → total 8. Migración de plots viejos con solo `slots`: L=`min(2, floor((N−1)/2))`, A=`max(1, N−2L)`.
  - UI (barra inferior, solo `semi_arc`): **Plazas laterales** + **Plazas en arco** (+ hint Σ total). Otras formaciones siguen con un solo **Plazas**.
  - **Fijo** (`evenSemiArcFixedSlotTs`): no equiespacia en toda la polilínea.
    - Ala izq: L plazas en u=`0, 1/L, …, (L−1)/L` desde el **extremo** hacia el arco (**excluye** la juntura).
    - Arco: A plazas; si A≥2 incluye **ambas junturas** (primera = inicio de arco / “el tercero” tras L=2); si A=1 → centro del arco.
    - Ala der: espejo, u=`1/L … 1` desde la juntura hacia el extremo (excluye juntura).
    - Ej. L=2, A=5 → índices `0` extremo izq, `1` mitad ala izq, `2` juntura izq (=1ª del arco), `3–5` arco interior, `6` juntura der (=última del arco), `7` mitad ala der, `8` extremo der. Total 9.
  - Libre / simétrico: `slotTs` sobre t∈[0,1] de la guía completa; al cambiar L/A se redimensiona N (`applySemiArcSlotCounts`). Snap / reanchor / PDF usan `computeFormationSlots` (mismo layout).
- **Modo de plazas** (`slotMode`: `"fixed"` | `"free"` | `"symmetric"`; default `fixed`):
  - **Fijo**: plazas equiespaciadas en t∈[0,1] a lo largo de la guía (**excepto** `semi_arc`, ver arriba); ignora `slotTs`; al cambiar N redistribuye. Sin arrastre de marcadores.
  - **Libre**: `slotTs[]` por plaza; marcadores arrastrables sobre la guía (proyecta al t más cercano). Ítems magnetizados siguen en reanchor. Al cambiar N: conserva t existentes (best-effort) e inserta nuevas en los huecos más grandes (`resizeFormationSlotTs`).
  - **Simétrico**: igual que libre, pero al editar la plaza *i* se espeja a *n−1−i* (`t[j]=1−t[i]`); centro (N impar) queda en t=0.5. Al pasar a simétrico se fuerza espejo desde índices bajos (`enforceSymmetricSlotTs`).
  - UI: barra inferior de formación (junto a Plazas / laterales+arco) — botones **Fijo / Libre / Simétrico**. Cambiar a fijo limpia `slotTs` y redistribuye (undo vía `commitPayload` / `patchFormationsAndReanchor`).
  - Helpers: `applyFormationSlotMode`, `applySemiArcSlotCounts`, `evenSemiArcFixedSlotTs`, `resolveSemiArcSlotCounts`, `setFormationSlotT`, `resolveFormationSlotTs`, `projectWorldPointToFormationT` en `stagePlotFormations.js`.
- **Overflow** al redistribuir: margen 25 cm, stack 45 cm.
- **Asas de resize**: siguen ~7 px en pantalla (`/ viewport.scale` únicamente).
- **Recuadro gris (escala uniforme)** — formación **seleccionada**:
  - **Bounds**: AABB local de guía + puntas de ala (`semi_arc`) + plazas (`computeFormationSlots`) + padding `FORMATION_BOUNDS_BOX_PADDING_PX` (≈½ marcador). Dibujo: `Line` cerrada bajo marcadores de plaza, stroke `#94a3b8`, fill `rgba(148,163,184,0.07)`, `strokeScaleEnabled={false}`.
  - **Asas `box_nw|ne|sw|se|n|s|e|w`**: 8 asas en el Layer superior (junto a asas paramétricas); fill `#f8fafc`, stroke `#94a3b8`; cursor resize según rotación (misma tabla que rect/horseshoe).
  - **Drag**: snapshot al `dragStart`; factor de escala desde esquina/borde opuesto (`formationFromBoundsBoxHandleDrag` → `scaleFormationUniform`). **Un solo factor** para todos los params lineales; `slotTs` / ángulos (`startAngle`, `endAngle`, `wingAngle`) sin cambio. Recentra `x,y` para fijar el ancla opuesta.
  - **Por kind** (multiplican × `s`, respetando mínimos):
    - `arc`: `rx`, `ry`
    - `semi_arc`: `rx`, `ry`, `wingLength`
    - `line`: `length`
    - `rect` / `horseshoe`: `width`, `depth`
  - Las asas paramétricas (`w`/`e`/`n`, `tip_*`, esquinas rect…) siguen activas para deformar un eje o alas; el recuadro es **adicional**.
  - Preview en vivo (`formationResizePreview` incluye `x,y` si box); commit en `dragEnd` vía `patchFormationsAndReanchor` (una entrada undo).
  - **PDF/JPG**: fuera de alcance v1 (no se exportan asas ni recuadro de edición).
- Formaciones guardadas a escala 10 px/cm se reescalan al cargar junto con el lienzo (`stagePlotLegacyScaleFactor`). El lienzo default 90×56 cm queda chico frente a un arco de ~3.6 m — ampliar Ancho/Alto del Lienzo.
- **Copiar formación** (`cloneStagePlotFormation` en `stagePlotFormations.js`; UI en barra inferior + menú contextual clic derecho):
  - Offset fijo **+40 cm** en X (`STAGE_PLOT_FORMATIONATION_COPY_OFFSET_PX`).
  - **Copiar formación**: duplica geometría (kind, params, slots, wingSlots/arcSlots si semi_arc, slotMode, slotTs, rotation, facing) con **nuevo id**; plazas vacías (sin ítems). `commitPayload` (undo).
  - **Copiar formación con instrumentos**: igual + clona ítems con `slotId` de esa formación; nuevos ids de ítem, mismos índices de plaza remapeados al nuevo `formationId`, mismas posiciones relativas (mismo delta). `groupId` de clones = `null`.
  - Tras copiar: selecciona la formación nueva; si hubo instrumentos, también los clones en `selectedIds`.
- **Centrar (eje X del director)** — kinds `arc` / `semi_arc` / `horseshoe` / `rect` / `line` (`STAGE_PLOT_CENTERABLE_FORMATION_KINDS`):
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
  - **No** limpia la selección: `onMouseDown` del Stage solo inicia marquee/deselección con **clic izquierdo** (`button === 0`) en vacío **en herramienta Seleccionar** (o limpia selección en Mover); el botón derecho no deselecciona.


## Navegación (2026-08)

- **Disposición:** subTab=seating&seatingView=disposicion (default al entrar a Seating)
- **Escenario:** subTab=seating&seatingView=escenario
- **Venues (Gestión):** `/management/venues` — Espacios con conciertos; escenario por evento vía modal técnico o editor de gira
- Deep link legacy subTab=stage_plot → redirect 301-like (replace) a escenario bajo seating
- **Lienzo:** botón interno del editor (popover toolbar), no ítem de menú principal
- **Borrar todo:** botón danger en popover Lienzo → confirmación (`useConfirmDialog` / portal `z-[100]` o `z-[10000]` en pantalla completa) → vacía `items`, `formations`, `groups`, limpia selección; `commitPayload` (undo). Oculto si `readOnly`.
- **Tamaño default ítems:** al colocar (paleta, drop, orgánico Insertar) `createStagePlotItem` → `defaultStagePlotItemScale(type)`: `scale = clamp( (STAGE_PLOT_ITEM_DEFAULT_SIZE_CM × STAGE_PLOT_CM_TO_PX) / max(drawW, drawH), 0.25…12 )` con bounds de `getStagePlotItemVisualBounds` (silueta o catálogo). Duplicar conserva `scale`. Ítems existentes sin cambios.
- **Asas de resize (Transformer):** tamaño fijo ~7 px en pantalla. Konva `Transformer` overridea `getAbsoluteTransform()` (ignora scale del Stage) y toma el box de nodos en coords absolutas → `anchorSize` / `borderStrokeWidth` / `rotateAnchorOffset` / `anchorCornerRadius` / `anchorStrokeWidth` son **px de pantalla constantes** (no dividir por `viewport.scale` ni `item.scale`; eso agrandaba las asas al zoom out). **Formaciones** (`FormationResizeHandles`): Circles normales bajo Stage → `handleSize = 7 / max(viewport.scale, 0.15)`.
- **Z-order asas de formación (seleccionada):** en el `Layer` Konva el orden es guías de formación → ítems → Transformer → **asas de la formación seleccionada** (`FormationResizeHandles` al final). Además `useLayoutEffect` hace `moveToTop()` sobre `.stage-plot-formation-handles` al seleccionar/redibujar, para que peak/side no queden tapadas por sillas/iconos ni por un Transformer vacío tras `moveToTop` de ítems. Formaciones **no** seleccionadas siguen debajo de los instrumentos (solo el path/plazas; sin asas). Snap magnético / `slotId` sin cambios.
- **Floating toolbar (Copiar / Eliminar, + formato texto):** overlay HTML sobre el canvas (`pointer-events` solo en la pill). Posición en **coords de pantalla** (`viewport.x/y + stageCoord × viewport.scale`). Regla de colocación (AABB de la selección, single/multi/texto):
  1. Preferir **a la derecha** del AABB: `left = screenMaxX + 8`, `top = screenMinY` (no tapa el rotate handle centrado arriba, ~20–36 px).
  2. Si no cabe: **a la izquierda** `left = screenMinX − 8 − toolbarW`, mismo `top`.
  3. Fallback: **arriba-derecha** con holgura de rotación: `left = screenMaxX − toolbarW`, `top = screenMinY − 40 − toolbarH` (bottom del toolbar queda ≥40 px sobre el top del AABB). Clamp a bordes del canvas (±8 px).
- **Exportar / Reportes:** dropdown unificado en Disposición (PDF seating, Excel, particellas)

## Pendiente / deuda

- UI en `EventForm` para setear `eventos.id_repertorio` (hoy solo vía fallback; asociación principal es plot→eventos en editor).
- Preview Konva inline en `StagePlotViewerModal` y en vista Venues (hoy: resumen + export PDF/JPG con toggles locales).
- Reordenar lienzos (drag sort_order) en el editor.
- Editor SVG avanzado (dibujo); hoy: upload/paste en Datos → Instrumentos (`svg_icon`).
- Plots ya migrados (`instrumentFootprintMigrated`): escalas custom del Transformer se conservan. Si un plot se veía enorme **antes** del one-shot, al reabrir/autosave queda a 50×50 cm reales; reescalar a mano solo si se quiere otro tamaño físico.
- `cat.w`/`cat.h` del catálogo siguen siendo aspect/fallback de paleta; ya no definen el tamaño en escena de instrumentos con huella.

## Iconos SVG en `instrumentos` (2026-08)

- **Columnas**: `svg_icon text` + `stage_plot_type text` (migración `20260827123803`, aplicada en linked).
- **Cadena**: DB → `public/stage-plot/icons/` → silueta (`stagePlotIconAssets.js`).
- **Admin**: Datos → Instrumentos (Tipo Escenario + SVG file/paste + preview); sanitizado (`stagePlotSvgSanitize.js`).
- **Colores**:
  - Uploads / FreeSVG multi-color: **se conservan fills/strokes/gradients del autor**. Sanitize quita script/eventos/`use` pero **no** reescribe paints a `currentColor`.
  - Tint de tema (`item` color / palette) **solo** si el markup ya usa `currentColor` (game-icons mono, siluetas OFRN, oboe Gerald_G).
  - Konva/PDF: `prepareStagePlotSvgMarkupForRaster` / `loadStagePlotIconImage` — sin override de fill vía padre salvo silueta mono.
- **Seed**: 21+ filas precargadas; regenerar `node scripts/seed-instrumentos-stage-plot-svg.mjs`. Force overwrite cuerdas/flauta/guitarra/bandoneón: `node scripts/force-seed-string-svgs.mjs` + `npx supabase db query --linked -f temp_freesvg/force_seed_strings.sql`.
- **Guitarra**: catálogo `guitar`; icono `public/stage-plot/icons/guitar.svg` (papapishu, colores de origen); `instrumentos.id` **`21`** / Guitarra; orgánico `idInstr: ["21"]`.
- **Bandoneón**: catálogo `bandoneon` (Cuerdas); icono `public/stage-plot/icons/bandoneon.svg` ([FreeSVG 50642](https://freesvg.org/bandone%C3%A3%C2%B3n) / OpenClipart 216369, CC0, colores de origen); `instrumentos.id` **`22b`**; orgánico `idInstr: ["22b"]`.
- **Seguridad**: sin script/eventos/`use`; Blob→Image (no `innerHTML`); límite 100k chars.

## Export PDF / JPG (plano de escenario)

- **Archivo**: `src/utils/stagePlotPdf.js` — `exportStagePlotPdf`, `exportStagePlotJpg`. Triggers en toolbar del editor (`ProgramStagePlotEditor.jsx`): botones **PDF** y **JPG**. También `StagePlotViewerModal` (técnicos) con toggles locales sobre el payload.
- **Dimensiones** (ambos formatos): usan `payload.stage.widthCm` / `heightCm` (mismos valores que Lienzo Ancho / Alto). En el export se etiquetan **Ancho** (widthCm) y **Profundo** (heightCm = profundidad del escenario). Texto resumen `Ancho: X cm · Profundo: Y cm` + etiquetas en bordes inferior (ancho) e izquierdo (profundo).
- **Guías de lienzo** (ambos formatos; misma semántica que toggles Lienzo, ON = visible):
  - **Cuadrícula** si `stage.showGrid !== false` (menor 10 cm / mayor 50 cm).
  - **Radial** si `stage.showRadial` — abanico desde el centro del conductor (`resolveFormationFacingPoint`; canónico si no hay ítem) con `stage.radialLines` (3–36).
  - **Formaciones** si `!stage.hideFormationGuides` — línea guía + plazas (`formationGuideLinePoints` / `computeFormationSlots`); plazas ocupadas vs vacías.
  - **Recuadros** de silla si `!stage.hideChairSquares` (sin cambio).
  - Orden de dibujo: fondo → guías → ítems (como en Konva).
- **PDF**:
  - **Hoja 1**: solo el escenario (guías según flags, ítems, sillas según `hideChairSquares`, tipografía texto, labels FONDO/PÚBLICO, dimensiones). Sin channel list en página 1.
  - **Hoja 2+**: `Channel list` (autoTable Ch / Elemento / Notas) **solo si** `deriveStagePlotChannels` tiene filas; si no hay canales, el PDF es de una sola hoja.
  - Título / nombre del plano / fecha en cabecera; atribución de iconos al pie.
- **JPG**: raster del escenario únicamente (mismas guías + ítems/sillas/texto). **No** incluye channel list. Incluye título, dims Ancho/Profundo en bordes + resumen. Calidad JPEG ~0.92; nombre `plano-escenario_{nomenclador}.jpg`.
- **Fuera de alcance del export**: channel list nunca en JPG ni en hoja 1 del PDF; asas de resize / snap preview / ejes de centrado temporales del editor.
