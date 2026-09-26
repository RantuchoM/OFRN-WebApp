# Spec: Gestión → Servicios (cantidad de servicios)

## Objetivo

Informe **Gestión → Servicios** (`/management/servicios`): servicios por integrante, con **mismas reglas de convocatoria** que **Gestión → Convocatorias** (no un matcher paralelo).

Menú: **Gestión** (staff: `isAdmin || isEditor` en `App.jsx`), mismo módulo que Convocatorias / Ensayos / Conciertos. Ctrl+K: `managementPalette.js` slug `servicios`.

## Valor de servicio

| Origen | Condición | Valor |
|--------|-----------|--------|
| Concierto (`id_tipo_evento = 1`, `es_didactico = false`) | Marca de matriz X / R / L | **1** |
| Concierto didáctico (`id_tipo_evento = 1`, `es_didactico = true`) | Idem | **½** |
| Ensayo de ensamble (`id_tipo_evento = 13`) | `isIntegranteConvocadoToEnsayo` | **1** si duración ≥ 2 h; **½** si &lt; 2 h |
| Ensayo de gira (`id_tipo_evento` ∈ {2 Ensayo, 3 Ensayo General}) | Marca de matriz X / R / L | **1** si ≥ 2 h; **½** si &lt; 2 h |

- Exactamente 2 h = **1** (`eventDurationSeconds` ≥ `ENSAYO_FULL_SECONDS` = 7200; `hora_inicio`/`hora_fin` → minutos × 60).
- Sin `hora_inicio` o `hora_fin`: el ensayo **no cuenta**.
- `tecnica = true` o `is_deleted = true`: no cuenta.
- Programas **Borrador** (`isProgramBorrador`): eventos de gira no cuentan.
- Didáctico: flag real `eventos.es_didactico` (no `PROGRAM_TYPES`). `PROGRAM_TYPES` / `TIPOS_PROGRAMA_ASISTENCIA_MATRIZ` solo filtran programas como en Convocatorias.

## Quién cuenta (reuso, no invención)

- **Gira (conciertos + ensayos 2/3):** `resolveGiraRosterForMatrix` (`giraService.js` = `resolveGiraRosterDetail`) + `getAsistenciaMatrixCellMark` (`asistenciaMatrixExport.js`). Incluye `ausente` + `abona_reemplazo` / `abona_licencia` (R/L). `ausente` sin abono **no** cuenta. Pre-alta no cuenta.
- **Ensayo ensamble:** `isIntegranteConvocadoToEnsayo` (`girasYearSummary.js`). El mapa custom multi-persona se adapta con `customMapForIntegrante` (mismo shape evento → fila).
- **No** se usa un matcher propio de `eventos_grupos` (la matriz de convocatorias tampoco recorta por grupo de evento).

## Listado y detalle

- Filas = integrante (IDs numéricos). Columnas: Conciertos | Didácticos | Ensayos ≥2h | Ensayos &lt;2h | Ensamble | Gira | Total | **Servicios/mes**. Ensamble/Gira y ≥2h/&lt;2h se solapan; el total suma átomos (sin doble conteo). 0,5 en es-AR. R celeste / L ámbar.
- **Servicios/mes** = `Total ÷ meses feb–dic de presencia` que solapan el rango filtrado. Enero **no** cuenta (divisor máximo 11 en un año). Campo real: `integrantes.fecha_alta` (y `fecha_baja`). Sin `fecha_alta` = presente desde el inicio del rango. Alta en marzo → 10 meses; abril → 9; etc. Pie de tabla: **—** (no se promedia entre músicos). Celda: `1,23 (10)` (tasa y meses).
- Clic en fila → modal Portal `z-[100]`, colapsable por categoría (conciertos, didácticos, ensamble, gira).
- **Orden / separadores:** `compareInstrumentIds` (mismo sort que Convocatorias). Con «Agrupar por ensambles»: `buildAsistenciaMatrixRowGroups` (encabezados de ensamble tildado completo + «Otros»). Vista Ensambles/Cameratas/Regiones: `filterEnsamblesForConvocatoriaView` / `groupRegionalEnsamblesByRegion`.

## Exportes

- **Excel** (`downloadServiciosCantidadExcel`): mismas columnas de tipos + Total + Servicios/mes; grupos si está tildado Agrupar.
- **PDF listado** (`downloadServiciosCantidadPdf`): mismo stack que Convocatorias (`jsPDF` + `jspdf-autotable`). **A4 vertical (portrait)**. Encabezados `shortLabel` (espacio). Separadores de ensamble idénticos a la matriz (`▸` + `fillColor` slate). Fila Totales; Servicios/mes del pie = —. Botón `IconFileText`.
- **PDF detalle persona** (`downloadServiciosCantidadDetallePdf`): A4 vertical. Encabezado (nombre, rango, instrumento) + **tabla de resumen** (filas Categoría | Valor: Conc., Didác., ≥2h, &lt;2h, Ensam., Gira, Total, Serv/mes; mismo `theme: grid` que la tabla de eventos) y debajo los eventos. Botón `IconFileText` en el modal.
- **PDF detalle lote**: un archivo, `addPage` por integrante; cada uno arranca con la misma tabla de resumen + detalle.

### Texto de eventos

- Fuente del leak (PDF Montani 2026-09-26): `eventos.descripcion` con HTML del editor (`<div>`, `<b>`, `<u>`, `<p>`, `<br>`) y `<span style="--tw-scale-x:…; font-weight: bolder;">` (Tailwind inline). El regex `<[^>]*>` se corta en el primer `>` y deja CSS/`</span>`.
- PDF y modal: `stripHtml` (`eventDisplayUtils.js`, el de agenda). Extra: **DOMParser** (como `htmlToPlainText` de transporte) + borrar `style`/`script`; fallback quote-aware; barrido `--tw-*` residual. Segunda pasada sobre el subtítulo completo.

### PDF vs HTML

| | HTML | PDF listado | PDF detalle |
|--|------|-------------|-------------|
| Orientación | — | A4 vertical | A4 vertical |
| Tipos + Total + Serv/mes | Sí | Sí | Resumen en encabezado |
| Sort / separadores convocatoria | Sí | Sí (`rowGroups`) | Orden de `visibleRows` |
| Integrante | 1 col (nombre + instrumento) | Integrante + Instrumento | Encabezado de página |
| Categorías de detalle | Tabla resumen (Categoría \| Valor) + colapsables | No | Tabla resumen + eventos `>` |
| Títulos de evento | `stripHtml` | — | `stripHtml` |
| R/L | Color sky/ámbar | Texto `+n` | Letra R/L coloreada |
| Totales /mes | — | — | Tasa de esa persona |

## Filtros (paridad Convocatorias + rango de fechas)

- Árbol izquierda: **Ninguno** por defecto (como Convocatorias). Catálogo del árbol: `fetchAsistenciaMatrixBaseData` al entrar (igual que el informe de convocatoria).
- **Eventos + roster no se piden** hasta que hay integrantes seleccionados (`selectedIntegranteIds.size === 0` → empty state, sin `fetchServiciosCantidadPeriod` ni `resolveGiraRosterForMatrix`).
- Tipos de programa: `TIPOS_PROGRAMA_ASISTENCIA_MATRIZ`; default **Sinfónico + Camerata Filarmónica** (igual Convocatorias).
- Rango **desde/hasta**: default año calendario (`currentYearBounds`) **cuando corre** el cálculo; el usuario puede cambiarlo. No dispara eventos si nadie está tildado.
- Gira opcional: combo sobre programas del catálogo que solapan el rango (`programOverlapsDateRange` `calendarOnly`).
- Familia de instrumento: join `instrumentos`, no columna en `integrantes`.

## Estimar futuros

Toggle **«Estimar futuros»** (`IconCalculator`, default **ON**). El usuario puede destildar. OFF = todo exacto (giras futuras vacías quedan en 0).

### Pasado vs futuro (calendario del programa)

- **Pasada:** `programas.fecha_hasta` &lt; hoy (`toLocalDateString`). Siempre exacta.
- **A estimar (toggle ON):** solo programas **`tipo = Sinfónico`** con `fecha_hasta >= hoy` (o sin fin). Incluye giras **en curso y con cronograma ya cargado**: se reemplaza el **bucket entero** de esa gira (ensayos 2/3 + conciertos/didácticos). No se limita a giras sin agenda.
- **Borrador / CF / jazz / ensamble-gira:** no se estima.

### Qué pisa el toggle

- **Pisa:** conciertos, didácticos y ensayos de gira (tipos 2/3) de cada **sinfónica** futura/en curso en la que el músico está en nómina (counted / R / L). El valor real se descarta y se sustituye por el promedio (repartido en concierto / didáctico / ensayo_gira full / half).
- **No pisa:** ensayos de ensamble (tipo 13). Extra de ensamble asociado a una gira (p. ej. Navidad Coral) **queda exacto**.
- Quién recibe el estimado: misma marca de matriz; el estimado se anota como `counted` (sin R/L).
- Varias sinfónicas futuras: `N × promedio`.

### Cómo se calcula el promedio

- Fuente: **sinfónicas pasadas** que solapan el rango (no el combo Gira; no CF/jazz).
- Si el rango no tiene ninguna sinfónica pasada: año calendario anterior a `fechaDesde`.
- Por cada par (gira pasada, músico en nómina no ausente): suma exacta de servicios de gira (ensayos 2/3 + conciertos/didácticos; **sin** ensamble). Giras sin ningún servicio de gira no entran.
- `promedio` = media de esas observaciones. Se muestra: `promedio 10,5 serv./gira (N sinfónicas rango|año anterior)`.
- Sanity 2026 (9 giras): típico **9–13**, mediana **~10,5** (Legado ≈ 10; Arquitectos ≈ 12,5).
- Si no hay muestra: no se pisa nada; el label dice `sin promedio`.

HTML, PDF (listado/detalle/lote) y Excel muestran el número usado. El detalle lista filas sintéticas «Estimación» en lugar de los eventos reales de esas giras.

### Exportar y móvil

- Un solo botón **Exportar** (menú Portal `z-[100]`, mismo patrón que Gestión → Ensayos / Seating): PDF listado, PDF detalle lote, Excel. Iconos de `Icons.jsx`.
- En el teléfono el menú se abre con el ítem en el mismo toque (`pointerdown`). El cierre por fuera no usa `mousedown` sobre el portal: eso desmontaba el ítem antes del click y la descarga no arrancaba.
- La descarga no usa `file-saver`. En iPhone/iPad se abre Compartir (Guardar en Archivos). Si el gesto ya no vale después de armar el archivo, aparece **Guardar** para un segundo toque. En el resto, un `<a download>` dentro de `document.body`. El nombre lleva fecha y hora.
- **Móvil:** la página scrollea; la lista de integrantes tiene alto máximo y scroll propio (se puede ocultar). El botón Exportar está en ese encabezado. La tabla/lista de personas también scrollea. Tap abre el modal con la **tabla resumen** Categoría|Valor, y el modal scrollea. El listado de eventos queda en escritorio / PDF.

## Archivos

| Pieza | Ruta |
|-------|------|
| UI | `src/views/Management/ServiciosCantidadReport.jsx` |
| Cálculo | `src/utils/serviciosCantidad.js` |
| Fetch período / Excel / PDF | `src/services/serviciosCantidadService.js` |
| Descarga móvil y escritorio | `src/utils/downloadBlob.js` |
| Limpieza HTML de descripciones | `src/utils/eventDisplayUtils.js` (`stripHtml`) |
| Catálogo árbol / roster | `fetchAsistenciaMatrixBaseData`, `resolveGiraRosterForMatrix` en `giraService.js` |
| Menú | `ManagementView.jsx`, `App.jsx`, `managementPalette.js`, `documentTitle.js` |

## Estado de implementación

| Requisito | Estado |
|-----------|--------|
| Spec viva | Completado (2026-09-25) |
| `es_didactico` + checkbox evento | Completado (migración previa) |
| Filtros off: sin eventos/roster hasta seleccionar personas | Completado |
| Separadores/orden = utils de Convocatorias | Completado |
| Roster R/L = `getAsistenciaMatrixCellMark` | Completado |
| Ensayo ensamble = `isIntegranteConvocadoToEnsayo` | Completado |
| Columnas + detalle colapsable + Excel + PDF listado/detalle | Completado |
| Servicios/mes (feb–dic, `fecha_alta`) | Completado |
| PDF A4 vertical + detalle persona + lote | Completado |
| Títulos sin HTML/CSS + resumen tabla Categoría/Valor | Completado |
| Estimar futuros (promedio sinfónicas pasadas, default ON) | Completado |
| Exportar un botón + resumen móvil | Completado |
| Descarga en celular (Compartir / ancla en el DOM) + scroll móvil | Completado |
| Paginación PostgREST `.range` en eventos | Completado |

## Deuda / abierto

- Ensayo sin horas: no cuenta (¿tratar como &lt;2 h?).
- `eventos_grupos`: la matriz no recorta; si se quiere paridad agenda, habría que reutilizar el helper de visibilidad de agenda, no uno nuevo.
- Catálogo del árbol sí pega a la DB al entrar (igual Convocatorias); lo pesado (eventos/nómina) espera la selección.
- `useGiraRoster` no se usa: el informe es multi-gira, igual que Convocatorias (`resolveGiraRosterForMatrix` por programa).
- Tipos de ensayo de gira cubiertos: 2 y 3. Otros tipos de categoría Ensayos no entran.
- Vacantes `es_simulacion`: el catálogo de matriz no las filtra explícitamente aquí (misma base que Convocatorias).
- PDF listado en vertical usa `shortLabel` (Conc., ≥2h) por ancho; el detalle sí lleva labels largos de categoría.
- PDF detalle lote puede ser pesado con muchos integrantes y muchos eventos (un archivo; no ZIP).
- El resumen por categoría no se repite en páginas de continuación si el detalle de una persona desborda.
- Totales de Servicios/mes no se agregan (cada fila tiene divisor propio).
- `stripHtml` ahora usa DOMParser en todo el producto (agenda, FIMBA, comidas): más agresivo que el regex viejo; títulos con `<` literales poco frecuentes.
- Giras cortas / solo calendario (p. ej. Navidad Coral ≈ 2 serv.) entran al promedio si son pasadas del tipo tildado y bajan la media respecto del ~10,5 típico sinfónico.
- El estimado reparte el promedio en Conc./Didác./≥2h/&lt;2h/Gira según la mezcla de las giras pasadas; no es un único chip «Gira».
