# Especificación técnica: Anticipos y fechas de rendición personalizados

## 1. Objetivo

Permitir que la administración de la OFRN pueda sobrescribir el cálculo automático de anticipos para casos excepcionales y definir una fecha de rendición específica por gira, distinta a la calculada automáticamente.

## 2. Base de datos (Supabase)

### 2.1 Tabla `giras_viaticos_detalle` (uso real en la app)

La pantalla de viáticos por gira persiste filas en **`giras_viaticos_detalle`**, no en `giras_viaticos`.
**Importante:** ejecutar solo `ALTER TABLE giras_viaticos ... anticipo_custom` no es suficiente; el PATCH del front va a **`giras_viaticos_detalle`**. Sin la columna ahí, PostgREST devuelve **400**.

- **`anticipo_custom`** (`numeric`, nullable): monto manual de anticipo. Si es `null`, se usa el viático calculado (`días × valor diario efectivo`) o, en la vista, la lógica de histórico/backup cuando el toggle correspondiente está activo.

### 2.2 Tabla `giras_viaticos` (legacy / esquema)

En el esquema del repo también existe la columna homónima en `giras_viaticos` para alinear con migraciones que referencien esa tabla; la UI actual no la escribe.

### 2.3 Tabla `giras_viaticos_config`

- **`rendicion_fecha`** (`date`, nullable): fecha límite para presentar la rendición. Si es `null`, en UI y PDF se usa el **primer lunes estrictamente posterior** a `programas.fecha_hasta`.

### 2.4 SQL de migración (referencia)

```sql
ALTER TABLE public.giras_viaticos_detalle
ADD COLUMN IF NOT EXISTS anticipo_custom numeric DEFAULT NULL;

ALTER TABLE public.giras_viaticos
ADD COLUMN IF NOT EXISTS anticipo_custom numeric DEFAULT NULL;

ALTER TABLE public.giras_viaticos_config
ADD COLUMN IF NOT EXISTS rendicion_fecha date DEFAULT NULL;

COMMENT ON COLUMN public.giras_viaticos_detalle.anticipo_custom IS 'Anticipo manual que reemplaza al calculado en exportaciones y totales';
COMMENT ON COLUMN public.giras_viaticos_config.rendicion_fecha IS 'Fecha límite de rendición personalizada para la gira';
```

## 3. Lógica de negocio implementada

### 3.1 Anticipo personalizado (`useViaticosIndividuales` + `ViaticosTable`)

- **`anticipoParaTotal`** en el hook: `anticipo_custom` si viene informado; si no, `subtotal` calculado. **`totalFinal`** = anticipo efectivo + suma de gastos de la fila.
- **Visualización** con modo **Rendiciones** activo (toggle “Rendic.”):
  - Fondo **naranja** (`bg-orange-100`): valor automático (sin `anticipo_custom`).
  - Fondo **azul** (`bg-blue-100`): valor manual (`anticipo_custom` no nulo).
  - **IconEdit**: enfoca el input numérico del anticipo.
  - **IconRefresh**: solo si hay manual; guarda `anticipo_custom = null` en BD.
- Si el usuario confirma un monto igual al cálculo vigente (histórico o actual), se normaliza a `null` para no dejar override innecesario.

### 3.2 Fecha de rendición (`ViaticosManager`)

- Campo **“Rendición hasta”** junto a Motivo/Lugar, con `DateInput`.
- Valor mostrado: `config.rendicion_fecha` o, si falta, `firstMondayAfter(gira.fecha_hasta)` desde `src/utils/dates.js`.
- Persistencia: `updateConfig` → debounce → `giras_viaticos_config.rendicion_fecha`.

### 3.3 Exportación y correo

- **`getEffectiveSubtotalForExport`**: prioridad `anticipo_custom` → histórico (backup) → `subtotal` actual.
- En PDF, la fecha de rendición va en el acrofield **`lugar_y_fecha`** (pie del formulario): ciudad del integrante + fecha límite (`rendicion_fecha` o primer lunes posterior a `fecha_hasta`), mismo formato textual que antes (`"Ciudad, dd de mes de yy"`). Si no hay fecha válida, se usa la fecha de hoy como respaldo.
- [x] **Pre-check motivo / lugar de comisión** (`src/utils/viaticosExportMotivoLugar.js`): antes de exportar viático, destaque o rendición, valida con `trimOrEmpty` (null, `""` y espacios = vacío) y **la misma cadena de fallback que el PDF y la grilla**; confirmación con `z-[110]` por encima del panel bulk (`z-[60]`).
- [x] **UX del aviso de exportación (2026-09-11):** el diálogo no mezcla motivo y lugar como un solo concepto. Título según huecos del lote: solo motivo → “Falta el motivo de comisión”; solo lugar → “Falta el lugar de comisión”; ambos tipos → dos líneas (motivo y lugar por separado), con **motivo** / **lugar** resaltados en ámbar. El cuerpo agrupa personas en tres listas disjuntas: Falta **motivo**, Falta **lugar**, Faltan **ambos**. Sigue la nota de herencia (gira / destaques / paradas) y los botones **Revisar** / **Exportar igual**. UI: `MotivoLugarExportWarning.jsx`.
- [x] **Lugar de comisión individual por paradas** (`ViaticosTable` + `viaticosParadasIntegrante`): si la celda no tiene override, se muestra en **celeste** el listado único (orden de parada, unidos por coma) de localidades entre subida y bajada del transporte del integrante, **omitendo la localidad propia** (viáticos / residencia / ciudad origen); en filas desdobladas, solo el tramo. Editable; `IconRefresh` restaura el automático. Export/PDF (viático, destaque y **rendición**): override → paradas → `config.lugar_comision` (`resolveLugarViaticosIndividual` / `resolveLugarComisionPdfField`). No avisar “falta lugar” si esa cadena resuelve un valor (p. ej. Santelices Skorin, gira 12: San Antonio). El pre-check de rendición **ya no** mira solo el lugar general de la gira.
- [x] **Aclaración bajo la firma** (`aclaracion_firma` en plantillas AcroForm): viático, destaque y rendición rellenan `Apellido, Nombre` con `setText` en el campo `aclaracion_firma`; la imagen de firma sigue en `firma_link` / `firma_imagen`. Preview alineado en `ViaticosForm.jsx` y `RendicionForm.jsx`.
- [x] **Logística en tramos desdoblados** (`resolveViaticoRowLogData` en `viaticosLogisticsSchedule.js`): filas con `id_evento_parada_inicio` / `id_evento_parada_fin` conservan fechas del tramo y resuelven **patente oficial** (y etiquetas de parada salida/llegada) desde el transporte de la parada de inicio, con fallback al `logisticsMap` del integrante. Usado en `ViaticosTable` y en `buildSelectedExportData` de `ViaticosManager`.
- [x] **Vehículo oficial** (`transportes.es_oficial`): si el bus de catálogo es oficial, exportación de viáticos/destaques tilda `check_patente_oficial` (`resolveCheckPatenteOficial`). Spec: `docs/specs/transportes-es-oficial.md`.
- [x] **Wheel no cambia montos** (`src/utils/blockNumberInputWheel.js`): en inputs numéricos de Viáticos (`CurrencyInput` de tabla/destaques, panel masivo, modal valor diario) `preventDefault` en `wheel` (listener no pasivo) para que Chrome no incremente centavos al hacer hover+rueda.
- [x] **Horario por localidad con varios charters** (`findBestRouteRule`): mantiene Localidad > Región > General; a igual alcance, la subida usa el evento **más temprano** y la bajada el **más tardío** (p. ej. Villa Regina: charter 05/08 + bajada 08/08). Consumido por destaques masivos y schedules de localidad.
- [x] **Ventana individual = primera ↑ / última ↓ (2026-09-10):** para **todos** los integrantes OFRN, `fecha_salida` / `fecha_llegada` del viático salen de la logística de transporte (`giras_logistica_rutas`, IDs numéricos):
  - **Inicio:** primera subida (↑) del integrante en **cualquier** `giras_transportes` de la gira.
  - **Fin:** última bajada (↓) en cualquier transporte de la gira.
  - Implementación: `calculateLogisticsSummary` (por unidad, a igual fuerza de match: ↑ más temprana / ↓ más tardía; corrige el bug `p >=` last-wins que en hops multi-leg dejaba solo el último viaje, p. ej. Fernández gira 12: 21/09 en lugar de 13/09) → `buildPersonalLogisticsFromSummary` / `buildViaticosLogisticsMap` (min ↑ / max ↓ entre unidades).
  - `estado_gira === 'ausente'`: fuerza de match 0 → sin fechas de transporte (regla de proyecto).
  - Ejemplo gira 12 (Carla Fernández, id `8525695`): reglas Persona en unidad 226 — ↑13/09 07:00↓13/09 16:00 y ↑21/09 15:00↓21/09 23:00 → ventana viático **13/09 07:00 → 21/09 23:00**.
- [x] **Doc. vehículo y chofer (export opcional)**: la documentación del vehículo y el carnet/DNI del chofer (`collectTransportSupportDocs` en `ViaticosManager`) **ya no** se adjuntan automáticamente al marcar Doc. Común o Doc. Reducida. Checkbox explícito **«Doc. del vehículo y chofer»** (`docVehiculoChofer`) en `ViaticosBulkEditPanel` y `LocationBulkPanel`; solo se incluyen PDFs de logística si el usuario lo tilda.
- [x] **Marca de color de seguimiento (2026-09-22 / tinte de fila 2026-09-23):** `ViaticosTable` muestra y edita el mismo `giras_viaticos_detalle.seguimiento_color` que Gestión → Seguimiento viáticos (`amarillo` | `verde` | `celeste` | `rojo` | `null`). Es **por fila de detalle** (tramo/desdoble incluido), no un color global del integrante. Control compartido `SeguimientoColorSelect` (portal `z-[100]`, mismos swatches). La columna **Color** va a la **derecha** de la tabla (después de TOTAL FINAL, antes del borrar); no es sticky junto al nombre. El tinte (`seguimientoColorRowBgClass`) se aplica a **toda la fila** (checkbox, integrante, %, viático, gastos, total, color, borrar, datos/transporte si están visibles). **Quedan sin tinte** (fondo blanco, o ámbar si hay diff vs backup): **Salida**, **Llegada** y **Días**. Sin marca (`null`) no hay tinte. Selección y baja de roster siguen teniendo prioridad. Los inputs de monto pasan a fondo transparente para que el color de fila se vea (el texto naranja/verde de gasto vs rendición se mantiene).
- [x] **Color masivo como 3.ª opción al cargar el panel (2026-09-22):** al tildar filas, el sidebar (`ViaticosBulkEditPanel`) abre con **tres** acciones de primer nivel: **1. Editar Datos** (cargos, transporte, gastos, rendiciones), **2. Exportar y Comunicar**, **3. Color de seguimiento**. El desplegable y **Aplicar color** están visibles en esa tercera tarjeta (sin entrar a Editar Datos). Aplica solo `seguimiento_color` («Sin cambiar» no toca; «Sin marca» persiste `null`). El acordeón de color se mantiene dentro de Editar Datos para cambios combinados. Panel bulk sigue en `z-[60]` (aviso de export `z-[110]`); el menú del color usa portal a `document.body` `z-[100]`. No se tocó el wheel-block de inputs numéricos.
- [x] **Valor diario: editar `vigencia_desde` (2026-09-23):** el modal «Valor diario — histórico y vigencias» (portal `z-[100]`) llama `viaticos_valor_diario_update(p_vigencia_id, p_monto, p_nota, p_vigencia_desde)` (alias `…_update_vigencia`). Migración `20260923190000_…` recrea las RPC en remoto (faltaban pese a `20260609130000` marked applied), constraint de no-solape **DEFERRABLE**, `rebuild_chain` cierra franjas (hasta = siguiente desde − 1) y recarga PostgREST. Insert/delete también rearman la cadena.
- [x] **Prorrateo día a día al cruzar franjas (2026-09-23):** cada día del conteo DÍAS toma el `valor_diario` vigente esa fecha calendario (nueva franja desde su `desde` inclusive). Huecos (p. ej. 86000 hasta 15/09 y 92000 desde 01/10) se cierran en DB y, en front, se arrastra la última franja con `desde` ≤ fecha. No se usa un único valor al inicio de gira. El `?` de DÍAS explica `n días × tarifa vieja + m días × tarifa nueva` y el %. Chip BASE muestra ambas fechas/montos si la ventana de gira+viajes cruza más de una vigencia.
- [x] **PDF dos líneas al cruzar franjas (2026-09-23 / rendición 2026-09-25):** `mode=viatico` o `rendicion`/`rendición` y ≥2 segmentos. Viático: `plantilla_viaticos_multiples.pdf`. Rendición: `plantilla_rendicion_multiples.pdf`. Un solo tramo sigue la plantilla simple (`plantilla_viaticos.pdf` / `plantilla_rendicion.pdf`). Destaque no usa la múltiple. Si % = 0, tampoco (plantilla simple / renuncia). Cada vigencia dura tres meses, así que un viaje tiene un tramo o dos y no hace falta una tercera línea.
- [x] **Un solo % multiplicado en montos (2026-09-23):** hay **un** porcentaje de fila (p. ej. 80%). Bruto = `(días_viejos × valor_viejo + días_nuevos × valor_nuevo) × (porcentaje/100)` (equiv. cada línea: `días × valor × %`). La tabla ya lo hacía vía `calcValorDiarioProporcional`. El PDF dual **no** pone el oficial 86000/92000 en `valor_diario` / `valor_diario1`: misma convención que la plantilla simple (`valorDiarioCalc` ya ponderado). En **viático** múltiple: `porcentaje` y `porcentaje1` muestran el **mismo** %; `dias_computados_total` = DÍAS (vieja + nueva). En **rendición** múltiple (AcroForm 2026-09-25): no hay `dias_computados_total` ni `porcentaje`/`porcentaje1`; el % único va en `porcentaje_viatico` (como la plantilla simple). Ejemplo 2×86000 + 3×92000 al 80%: valor_diario **68800**, valor_diario1 **73600**, total **$358.400**.
- [x] **Rendición dual: campos (2026-09-25):** primer tramo (viejo) `dias_computados` + `valor_diario`; segundo (nuevo) `dias_computados1` + `valor_diario1`. Ambos `valor_diario*` × el % de la fila. El exporter también intenta `dias_computados_total` / `porcentaje` / `porcentaje1` por si la plantilla los suma después. Manual (`RendicionesManual` y `ViaticosManual`) pasa `segmentosValorDiario` al PDF y muestra los mismos rangos en pantalla. El total exportado respeta el `totalFinal` de la pantalla (no re-suma pasajes/movilidad ni omite ceremonial). Temporada alta en rendición marca `check_temporada`.
- [x] **Pantalla manual: un panel de rangos (2026-09-25):** en Viáticos y Rendiciones manuales, Valor diario calculado va arriba y Resumen (anticipo) abajo, en el mismo recuadro de la columna derecha (alineado con Lugar comisión y con la fila de cálculo). La fila de cálculo muestra solo título y control, a la misma altura. Misma data y mismas interacciones; solo layout. Detalle en `rendiciones-manual-flow.md`.
- [x] **Export por localidades = mismo PDF (2026-09-23):** `handleExportLocationBatch` (Destaques → lote por localidad, checkbox **Viáticos**) rellena con el mismo `exportViaticosToPDFForm(mode=viatico)`. Si `porcentaje_destaques` **> 0**: `calcValorDiarioProporcional` (día a día, un solo %) y, con ≥2 franjas, `plantilla_viaticos_multiples.pdf`. Si **% = 0**: sin segmentos duales (plantilla simple / renuncia); no se usa la múltiple. El payload compartido **no** se pone en $0 cuando también va destaque: el destaque se sigue a cero solo al generar ese PDF (`appendPersonToDoc`).
- [x] **Patente oficial en PDF (2026-09-25):** el AcroForm `patente` / `check_patente` de `plantilla_viaticos.pdf` (también destaque) se rellena con `resolvePatenteOficialValue`: override guardado → patente de la tabla/logística (primera ↑) → `travelData` del lote → cualquier bus del integrante (`transportes.patente` o `giras_transportes.patente`). En La Fuerza del Legado las filas de `giras_viaticos_detalle` no tenían `patente_oficial`; el PDF quedaba vacío aunque la tabla mostrara PFU470. `useLogistics` ahora también toma la patente de la unidad de gira si el catálogo viene vacío.
- [x] **Renuncia también en destaque (2026-09-25):** si % = 0 y está tildada «Marcar que renuncia viáticos», el campo `gasto_anticipo` del PDF de **destaque** (misma plantilla, `mode=destaque`) dice **RENUNCIA A VIÁTICOS** igual que el de viático. El checkbox se muestra al exportar viático **o** destaque. Los montos del destaque siguen en $0; no se vuelve a poner en cero el payload compartido del viático.
- [x] **PDF viático: casillero de movilidad en 0 (2026-09-25):** el AcroForm `gasto_movilidad` (pesos a la derecha de «Medio de movilidad» en `plantilla_viaticos.pdf`) imprime `0` si pasajes/movilidad no vienen, son null o son 0. Antes `gasto_pasajes || gastos_movilidad` trataba el 0 como vacío y, con `keep_editable`, el campo quedaba en blanco. `gasto_combustible` ya salía 0. No cambia el anticipo.
- [x] **Export con documentación no se traba al cambiar de pestaña (2026-09-25):** sí era throttling de timers. pdf-lib cede con `setTimeout(0)` cada 100 objetos al **cargar** (`ParseSpeeds.Slow`) y cada 50 al **guardar**. En pestaña oculta Chrome baja eso a ~1 s y luego ~1 min: el lote con Doc. Común / Reducida (PDFs grandes de Drive + `copyPages` + `save`) parece congelado. Fix: `parseSpeed: Fastest` y `objectsPerTick: Infinity` en plantillas (`pdfFormExporter`) y en el merge del lote (`ViaticosManager.mergeBytes` / `save`). El overlay cede el hilo con un Worker (`yieldExportLoop`), no rAF ni `setTimeout`. Con la pestaña oculta el spinner CSS puede verse quieto (Chrome pausa animaciones); el trabajo sigue. Al volver, el `[n/total]` debe haber avanzado.

## 4. Archivos tocados

| Área | Archivo |
|------|---------|
| Fechas | `src/utils/dates.js` (`firstMondayAfter`) |
| Hook | `src/hooks/viaticos/useViaticosIndividuales.js` |
| Tabla | `src/views/Giras/Viaticos/ViaticosTable.jsx` |
| Manager | `src/views/Giras/Viaticos/ViaticosManager.jsx` |
| PDF | `src/utils/pdfFormExporter.js` |
| Export pre-check | `src/utils/viaticosExportMotivoLugar.js` |
| Aviso PDF motivo/lugar | `src/views/Giras/Viaticos/MotivoLugarExportWarning.jsx` |
| Lugar comisión auto | `src/utils/viaticosParadasIntegrante.js` (`resolveLugarComisionAutoForRow`) |
| Logística tramos | `src/utils/viaticosLogisticsSchedule.js` (`resolveViaticoRowLogData`) |
| Primera ↑ / última ↓ | `src/hooks/useLogistics.js` (`calculateLogisticsSummary`) + `buildPersonalLogisticsFromSummary` |
| Esquema | `supabase/schema.sql` |
| Wheel montos | `src/utils/blockNumberInputWheel.js` |
| Color seguimiento | `src/components/viaticos/SeguimientoColorSelect.jsx` |
| Edición masiva color | `src/views/Giras/Viaticos/ViaticosBulkEditPanel.jsx` (`seguimiento_color`) |
| Valor diario vigencias | `src/services/viaticosValorDiarioService.js`, `src/utils/viaticosValorDiarioProporcional.js`, `src/components/viaticos/ValorDiarioVigenciaAdminModal.jsx`, `src/views/Giras/Viaticos/DiasComputablesHelp.jsx` |
| Migración RPC | `supabase/migrations/20260923190000_viaticos_valor_diario_update_desde.sql` |
| PDF dual franja | `public/plantillas/plantilla_viaticos_multiples.pdf`, `public/plantillas/plantilla_rendicion_multiples.pdf`, `src/utils/pdfFormExporter.js`, `valorDiarioPdfPonderado` en `viaticosValorDiarioProporcional.js` |
| Export por localidad | `ViaticosManager.handleExportLocationBatch` + `exportViaticosToPDFForm`; % = `porcentaje_destaques`; dual viático/rendición solo si % > 0 |
| PDF dual rendición | `public/plantillas/plantilla_rendicion_multiples.pdf` + `pdfFormExporter.js` (`mode=rendicion`); manual pasa `segmentosValorDiario` |
| Patente PDF | `src/utils/transporteOficial.js` (`resolvePatenteOficialValue`) + `pdfFormExporter.js` campo `patente` |
| Renuncia destaque | `pdfFormExporter.js` `mode=destaque` + `RenunciaViaticosExportOption.jsx` |
| Export pestaña oculta | `src/utils/pdfLibBackgroundSafe.js` + `ViaticosManager.processExportList` / `appendPersonToDoc` + `pdfFormExporter` load/save. El mismo helper se reutiliza en `docMerger.mergeSequential` (Descargar Particellas / por músico) y `yieldExportLoop` en esos loops + ZIP de Mis Partes. |
