# Spec: Gestión → Servicios (cantidad de servicios)

## Objetivo

Informe **Gestión → Servicios** (`/management/servicios`): servicios por integrante, con **mismas reglas de convocatoria** que **Gestión → Convocatorias** (no un matcher paralelo).

Menú: **Gestión** (staff: `isAdmin || isEditor` en `App.jsx`), mismo módulo que Convocatorias / Ensayos / Conciertos. Ctrl+K: `managementPalette.js` slug `servicios`.

## Valor de servicio

| Origen | Condición | Valor |
|--------|-----------|--------|
| Concierto (`id_tipo_evento = 1`, `es_didactico = false`) | Marca de matriz X / R / L | **1** (si dura ≤ 30 min, **0**) |
| Concierto didáctico (`id_tipo_evento = 1`, `es_didactico = true`) | Idem | **½** (si dura ≤ 30 min, **0**) |
| Ensayo de ensamble (`id_tipo_evento = 13`) | `isIntegranteConvocadoToEnsayo` | **0** si ≤ 30 min; **½** si &gt; 30 min y &lt; 2 h; **1** si ≥ 2 h |
| Ensayo de gira (`id_tipo_evento` ∈ {2 Ensayo, 3 Ensayo General}) | Marca de matriz X / R / L | Igual que ensamble |

- Exactamente 2 h = **1** (`eventDurationSeconds` ≥ `ENSAYO_FULL_SECONDS` = 7200).
- **≤ 30 min** (`ENSAYO_MIN_COUNT_SECONDS` = 1800): **0** (temperamento, afinación, bloques de 15/30). El límite es inclusivo: 30:00 no cuenta; 30:01 sí (½ si &lt; 2 h).
- Sin `hora_inicio` o `hora_fin`: el ensayo **no cuenta**. Concierto/didáctico sin horas sigue contando (1 / ½).
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
- **PDF listado** (`downloadServiciosCantidadPdf`): mismo stack que Convocatorias (`jsPDF` + `jspdf-autotable`). **A4 vertical (portrait)**. Título ASCII **Gestion Servicios** (sin flecha/`→`: Helvetica no la dibuja y queda un recuadro). Subtítulo con espacios: `Estimar futuros - promedio 10 serv./gira`. Texto PDF pasa por `toServiciosPdfText` (sin `→` `▸` `·` `–` `≥` `÷`). Encabezados `shortLabel` (`>=2h` en PDF). Separadores de ensamble: `>` + `fillColor` slate. Fila Totales; Servicios/mes del pie = `-`. Botón `IconFileText`.
- **PDF detalle persona** (`downloadServiciosCantidadDetallePdf`): A4 vertical. Encabezado (nombre, rango, instrumento) + **recuadro tipo resumen del año** (`GirasYearSummaryBar` al pie de `GirasView`): chips de `programas.tipo` en columnas (colores `PROGRAM_TYPES`) con el total de servicios; **debajo de cada columna**, lista `nomenclador` + `nombre_gira`. Arriba, chips Total y Serv/mes. Luego la tabla de eventos. Botón `IconFileText` en el modal.
- **PDF detalle lote**: un archivo, `addPage` por integrante; cada uno arranca con el mismo recuadro + detalle.
- **PDF informe de ensamble** (`downloadEnsambleServiciosPdf` / `buildEnsambleServiciosPdfDoc` en `src/utils/serviciosEnsamblePdf.js`): A4 vertical, mismo stack Helvetica + `jspdf-autotable` + `toServiciosPdfText` (sin `→` ni otros glifos faltantes; helpers en `src/utils/serviciosPdf.js`). Botón **Descargar PDF** (`IconFileText`) en `EnsambleServiciosModal`. Filas: `buildEnsambleServiciosPdfTables` (misma jerarquía que el HTML, con las filas de conflicto ya particionadas). Títulos de evento y locación pasan por `stripHtml`. Nombre `informe_ensamble_<ensamble>_<stamp>.pdf`.

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
| Categorías de detalle | Recuadro por tipo de programa + colapsables | No | Recuadro por tipo + eventos `>` |
| Informe ensamble | Giras / programas+conciertos / ensayos+conflicto | — | Mismas secciones, portrait |
| Títulos de evento | `stripHtml` | — | `stripHtml` |
| R/L | Color sky/ámbar | Texto `+n` | Letra R/L coloreada |
| Totales /mes | — | — | Tasa de esa persona |

## Filtros (paridad Convocatorias + rango de fechas)

- Árbol izquierda: **Ninguno** por defecto (como Convocatorias). Catálogo del árbol: `fetchAsistenciaMatrixBaseData` al entrar (igual que el informe de convocatoria).
- **Eventos + roster no se piden** hasta que hay integrantes seleccionados (`selectedIntegranteIds.size === 0` → empty state, sin `fetchServiciosCantidadPeriod` ni `resolveGiraRosterForMatrix`).
- Tipos de programa: `TIPOS_PROGRAMA_ASISTENCIA_MATRIZ` (Sinfónico, Camerata Filarmónica, Ensamble, Jazz Band, Comisión). Default: **todos tildados**. El usuario puede destildar.
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

- **Pisa:** conciertos, didácticos y ensayos de gira (tipos 2/3) de cada **sinfónica** futura/en curso en la que el músico está en nómina (counted / R / L). El valor real se descarta y se sustituye por **10** servicios (repartido: 1 concierto + 9 ensayos ≥2h de gira).
- **No pisa:** ensayos de ensamble (tipo 13). Extra de ensamble asociado a una gira (p. ej. Navidad Coral) **queda exacto**.
- Quién recibe el estimado: misma marca de matriz; el estimado se anota como `counted` (sin R/L).
- Varias sinfónicas futuras: `N × promedio`.

### Promedio fijo

- No se calcula la media empírica (antes ~13,26). Constante `FIXED_FUTURE_GIRA_SERVICIOS = 10`.
- UI / PDF / Excel: `promedio 10 serv./gira`.
- Mezcla interna: 1 concierto + 9 ensayos de gira ≥2h (`FIXED_FUTURE_GIRA_BY_KIND`). Los 3 bloques cortos (15/30 min) que antes iban a &lt;2h **salen**; la suma sigue siendo **10**.
- Sanity 2026: típico **9–13**, mediana **~10,5**; se eligió **10** por redondeo.

HTML, PDF (listado/detalle/lote) y Excel muestran el 10. El detalle lista filas sintéticas «Estimación» en lugar de los eventos reales de esas giras.

### Exportar y móvil

- Un solo botón **Exportar** (menú Portal `z-[100]`, mismo patrón que Gestión → Ensayos / Seating): PDF listado, PDF detalle lote, Excel. Iconos de `Icons.jsx`.
- En el teléfono el menú se abre con el ítem en el mismo toque (`pointerdown`). El cierre por fuera no usa `mousedown` sobre el portal: eso desmontaba el ítem antes del click y la descarga no arrancaba.
- La descarga no usa `file-saver`. En iPhone/iPad se abre Compartir (Guardar en Archivos). Si el gesto ya no vale después de armar el archivo, aparece **Guardar** para un segundo toque. En el resto, un `<a download>` dentro de `document.body`. El nombre lleva fecha y hora.
- **Móvil:** la página scrollea; la lista de integrantes tiene alto máximo y scroll propio (se puede ocultar). El botón Exportar está en ese encabezado. La tabla/lista de personas también scrollea. Tap abre el modal con el **recuadro de tipos de programa** (mismo layout que el PDF). El listado de eventos queda en escritorio / PDF.

## Ensayos en conflicto

Modal **«Ensayos en conflicto»** (botón en la barra de Servicios; Portal `z-[100]`, `IconAlertTriangle`). **No** espera la selección de integrantes: carga al abrir, con spinner.

**Conflicto pleno:** un ensayo de ensamble (`id_tipo_evento = 13`, no técnico, no borrado) solapa el calendario de una gira (`programOverlapsDateRange` `calendarOnly` sobre `fecha_desde`/`fecha_hasta`) **y** el ensamble **como grupo** está convocado: `classifyProgramaEnsambleConvocatoria` = `convocado` (fuente `ENSAMBLE` de ese id, o `FAMILIA` = `ensambles.id_familia`, o `CF` vía `ensambles_cf`) **sin** `EXCL_ENSAMBLE` de ese id. **No** hace falta que haya gente en el roster. Agenda/Lista lo calculan en memoria (eventos + **un** bulk de `programas`+`giras_fuentes` + catálogo ensambles/CF). **Nunca** `fetchRosterForGira` por fila ni en UnifiedAgenda.

**Tutti - N (no es conflicto pleno):** el criterio pleno es **falso**, pero hay integrantes de **ese** ensamble en el roster real de seating (`fetchRosterForGira` / `useGiraRoster`: counted / R / L; `ausente` no cuenta): (1) el ensamble **está** `EXCL_ENSAMBLE` y quedan overrides personales, o (2) **no** se convocó ni ensamble ni CF ni familia, y aun así hay gente en el roster. Universal (cualquier ensamble/gira). **UI solo en Coordinación → Lista**. Seating: **una** query por gira candidata del rango visible, **en serie** y memoizada — no por ensayo. **No** se muestra en UnifiedAgenda ni en Coordinación Calendario. No entra al modal de conflictos ni a la cantidad (Tutti-N **sí** cuenta).

En el modal Tutti-N, los checkboxes **no** marcan quién falta: tildar = **asiste igual al ensayo** pese a estar convocado a la gira. Default destildado. Persistencia: `eventos_asistencia_custom.tipo = asiste_igual`. Helper: «Tildá si asiste igual al ensayo a pesar de estar convocado a la gira.»

- Miembro: `membershipActiveOnProgramDate` en ese ensamble el día del ensayo, más invitados/adicionales de `isIntegranteConvocadoToEnsayo`.
- Roster de conflicto pleno: no se usa seating. Tutti-N (solo Lista): `fetchRosterForGira` lite, una gira a la vez. La matriz de Servicios de gira sigue usando `resolveGiraRosterForMatrix`. Ausente sin abono y pre-alta **no**. Borrador no entra.
- Ensambles: `filterEnsamblesForConvocatoriaView` (ensambles + cameratas). **Prueba** excluido.

- Agrupado por ensamble. Cada fila: a la izquierda fecha `dd/MM/yyyy, weekday` en minúsculas (`formatDdMmYyyyWeekday`, p. ej. `18/02/2026, miércoles`) + horario, título (`stripHtml`) y duración; **arriba a la derecha**, el nombre del programa/gira superpuesto en texto compacto secundario (`text-[10px]`, `nomenclador` + `nombre_gira`); debajo, los 3 botones de acción y el **número clickeable** de personas (triángulo). El número abre un segundo Portal `z-[110]` con nombre + `nomenclador` + `nombre_gira`. Si hay varias giras, se listan (la principal = más personas afectadas; el badge sigue siendo el conteo de personas).
- Pendientes arriba. Resueltos abajo, con encabezado **«Se ensayó igual»** (solo ese kind) o **«Resueltos»** (si hay borrados/reprogramados en la sesión). `ensayo_pese_conflicto` sigue viniendo del query tras recargar. «No se ensayó» / «Otro día» se guardan en estado local de sesión (`conflictoSessionByEventId` en `ServiciosCantidadReport`) y se reinsertan si el refetch ya no los trae; desaparecen al recargar la página (o al cambiar el rango de fechas).
- Rango = el mismo desde/hasta de Servicios.

**Cantidad:** un ensayo en **conflicto pleno pendiente** no suma (0) aunque dure ≥2 h. Tras **Se ensayó igual** aplica la fórmula normal (1 / ½ / 0). **No se ensayó** = 0 (borrado). **Otro día** = el evento nuevo cuenta si ya no está en conflicto pleno. Tutti-N **sí** cuenta (no es conflicto pleno). `resolveServicioForIntegrante` recibe `pendingConflictoEventIds`. El total neto del informe de ensamble (`ensayosNeto`) resta solo pendientes plenos. HTML, Excel y PDF (listado, detalle, informe ensamble) usan el mismo ctx.

**Agenda / Coordinación:** el mismo util. Tag ámbar **«Ensayo en conflicto»** (color de tarjeta distinto) + clic → `ConflictoEnsayoActions` (No se ensayó / Se ensayó igual / Otro día). Título del evento en cursiva gris **solo** si el conflicto pleno está pendiente; al lado/debajo, el nombre de gira superpuesto (`nomenclador` + `nombre_gira`, más grande que el tag). Superficies de conflicto: UnifiedAgenda (móvil y escritorio), Coordinación Lista, Coordinación Calendario + `EventQuickView`. Tutti-N **solo** Coordinación Lista, en la **fila de metadatos inferior** de la tarjeta (mismo lugar que el chip tradicional **Tutti**, junto a locación/ensamble; no junto a `ENSAYO ENSAMBLE`). Staff y coordinador del ensamble pueden actuar; el músico ve el tag de conflicto.

Modal **«Ensayos en conflicto»** (botón en la barra de Servicios; Portal `z-[100]`, `IconAlertTriangle`). **No** espera la selección de integrantes: carga al abrir, con spinner.

## Informe de un ensamble

Selector (combo en la barra / árbol + ícono en cada ensamble). Portal `z-[100]`. **Prueba** excluido. No espera tildar integrantes.

**No hay mapa estático** Cuerdas→ECAS/CAV ni CFVal→regionales. Se reutilizan las mismas fuentes que el roster:

| Fuente | Qué convoca | Función |
|--------|-------------|---------|
| `giras_fuentes.tipo = ENSAMBLE` | Miembros vigentes de ese `valor_id` | `resolveGiraRosterDetail` B |
| `giras_fuentes.tipo = FAMILIA` | Estables con `instrumentos.familia = valor_texto` (Cuerdas, Maderas, Bronces, Percusión, `-`) | `resolveGiraRosterDetail` C |
| `giras_fuentes.tipo = EXCL_ENSAMBLE` | Saca a los miembros de ese ensamble **aunque** su familia esté convocada | `resolveGiraRosterDetail` F |

Vista convocatoria: `filterEnsamblesForConvocatoriaView` / `isCfEnsambleLabel` (nombre empieza con `CF`) / `isJazzBandEnsambleLabel` / `groupRegionalEnsamblesByRegion` (`ensambles.localidades.id_region`). Cameratas **no** se expanden a ECAS/CAV.

El informe cuenta una gira **Sinfónico o Camerata Filarmónica** si: no hay `EXCL_ENSAMBLE` de ese id, y hay `ENSAMBLE` de ese id **o** `FAMILIA` = `ensambles.id_familia` (si está cargada) **o** `ENSAMBLE` de **cualquier** CF en `ensambles_cf` (Jazz Band incluida; esa CF no excluida). Un ensamble puede tener CF regional y Jazz Band a la vez. Sin familia/CF: solo convocatoria directa. Programas tipo Ensamble van al bloque 2.

Tres bloques: 1) giras Sinfónico/CF; 2) programas tipo Ensamble (Jazz Band si aplica) con **conciertos anidados** (cada ítem: fecha, hora desde, hora hasta, locación; sin chips «Ensamble» a la derecha); 3) total neto de ensayos + detalle **solo** de los que están en conflicto (pendientes) y, debajo, los resueltos. El número de cada encabezado de bloque va grande (`text-lg`). Filas de conflicto: misma fecha `dd/MM/yyyy, weekday` + horario, título y duración a la izquierda; nombre de gira/programa superpuesto compacto arriba a la derecha (varias si hay más de una); botones + badge debajo. El PDF replica esos tres bloques (más excluidos si hay) en A4 vertical; no inventa Coordinación.

**Join de conciertos al programa Ensamble:** `eventos.id_gira` y `eventos_programas_asociados` (`eventAssociatedProgramaIds`). Los conciertos VS son eventos de gira (`id_tipo_evento = 1`); **no** exigen fila en `eventos_ensambles`. Esa tabla queda para ensayos independientes (tipo 13) y para conciertos sueltos (sin programa propio de tipo Ensamble). Si el informe pedía `eventos_ensambles` para anidar, los VS salían solo como título.

### Acciones en un ensayo en conflicto

Staff (admin/editor, misma pantalla Servicios). En el modal de conflictos y en el informe de ensamble:

| Acción | Persistencia | Efecto |
|--------|--------------|--------|
| **No se ensayó** | `eventos.is_deleted` + `deleted_at` (mismo path que Agenda / `IndependentRehearsalForm`) + `notifyEnsayoEventoSoftDeleted` | En sesión queda como resuelto; al recargar desaparece (el query filtra `is_deleted`) |
| **Se ensayó igual** | `eventos.ensayo_pese_conflicto = true` **y** `ensayo_pese_conflicto_justificacion` (texto no vacío). Migraciones `20260927002345` + `20260930190100`. El trigger ignora un UPDATE **solo** del flag; flag+justificación pisa `updated_at` de **ese** evento. | El evento queda; el query de conflicto lo **incluye** con `resolvedKind = kept` y se lista bajo **«Se ensayó igual»** con la justificación. Confirmación: textarea obligatorio (`ConfirmModal` Portal `z-[110]`). |
| **Se ensayó otro día** | `IndependentRehearsalForm` (mismo save que Coordinación/Agenda: fecha, hora, locación) | En sesión queda como resuelto; al recargar, si la fecha nueva ya no solapa giras, no vuelve |

Confirmaciones Portal `z-[110]` sobre el modal `z-[100]`. No hay tabla extra: un flag por evento, como `is_deleted`.

## Archivos

| Pieza | Ruta |
|-------|------|
| UI | `ServiciosCantidadReport.jsx`, `EnsayosConflictoModal.jsx`, `EnsambleServiciosModal.jsx`, `ConflictoEnsayoActions.jsx`; agenda: `EnsayoImpactTags.jsx` / `EnsayoConflictoTag.jsx` / `EnsayoTuttiMinusTag.jsx`; Coordinación: `EnsembleCoordinatorView.jsx`, `EnsembleCalendar.jsx`, `EventQuickView.jsx` |
| Cálculo | `serviciosCantidad.js`, `serviciosEnsayosConflicto.js`, `serviciosEnsambleReport.js`, `serviciosConflictoActions.js` |
| Hook agenda/coordinación | `src/hooks/useEnsayosConflictoImpact.js` (`fetchConflictoAgendaContext`, Tutti-N serial) |
| Fetch período / Excel / PDF listado-detalle | `src/services/serviciosCantidadService.js` |
| PDF informe ensamble | `src/utils/serviciosEnsamblePdf.js` + `src/utils/serviciosPdf.js` (`toServiciosPdfText`) |
| Descarga móvil y escritorio | `src/utils/downloadBlob.js` |
| Limpieza HTML de descripciones | `src/utils/eventDisplayUtils.js` (`stripHtml`) |
| Catálogo árbol / roster | `fetchAsistenciaMatrixBaseData`, `resolveGiraRosterForMatrix` en `giraService.js` |
| Menú | `ManagementView.jsx`, `App.jsx`, `managementPalette.js`, `documentTitle.js` |

## Estado de implementación

| Requisito | Estado |
|-----------|--------|
| Spec viva | Completado (2026-09-26) |
| `es_didactico` + checkbox evento | Completado (migración previa) |
| Filtros off: sin eventos/roster hasta seleccionar personas | Completado |
| Separadores/orden = utils de Convocatorias | Completado |
| Roster R/L = `getAsistenciaMatrixCellMark` | Completado |
| Ensayo ensamble = `isIntegranteConvocadoToEnsayo` | Completado |
| Columnas + detalle colapsable + Excel + PDF listado/detalle | Completado |
| Servicios/mes (feb–dic, `fecha_alta`) | Completado |
| PDF A4 vertical + detalle persona + lote | Completado |
| Recuadro PDF/HTML = resumen del año Giras (`GirasYearSummaryBar`) | Completado |
| Tipos de programa: todos tildados por defecto | Completado |
| Estimar futuros (10 fijo, default ON) | Completado |
| Exportar un botón + resumen móvil | Completado |
| Descarga en celular (Compartir / ancla en el DOM) + scroll móvil | Completado |
| Paginación PostgREST `.range` en eventos | Completado |
| Modal Ensayos en conflicto | Completado |
| Informe de un ensamble (giras / programas / ensayos+conflicto) | Completado |
| PDF informe de ensamble (portrait, jerarquía HTML, Helvetica) | Completado (2026-09-26) |
| Familia/CF persistidos (`id_familia`, `ensambles_cf` N:N) en Ensambles | Completado |
| Acciones de ensayo en conflicto (borrar / se ensayó / otro día) | Completado |
| Fila de conflicto: fecha+weekday a la izquierda; gira superpuesta compacta arriba a la derecha; resueltos visibles | Completado |
| Pendiente pleno no suma a cantidad (HTML/PDF/Excel/informe ensamble) | Completado (2026-09-30) |
| Conflicto pleno vs Tutti-N (EXCL + overrides de roster) | Completado (2026-09-30) |
| Tag + acciones de conflicto en UnifiedAgenda y Coordinación (Lista, Calendario) | Completado (2026-09-30) |
| Tutti-N solo Coordinación → Lista (seating serial por gira, no por fila) | Completado (2026-09-30) |
| Tutti-N: tildar = asiste igual; default destildado; `asiste_igual` | Completado (2026-09-30) |
| Agenda: conflicto en memoria + 1 bulk fuentes; sin N getSession | Completado (2026-09-30) |
| Justificación obligatoria «Se ensayó igual» (`ensayo_pese_conflicto_justificacion`) | Completado (2026-09-30) |

## Deuda / abierto

- Ensayo sin horas: no cuenta (¿tratar como &lt;2 h?). Bloques ≤30 min tampoco.
- `eventos_grupos`: la matriz no recorta; si se quiere paridad agenda, habría que reutilizar el helper de visibilidad de agenda, no uno nuevo.
- Catálogo del árbol sí pega a la DB al entrar (igual Convocatorias); lo pesado (eventos/nómina) espera la selección.
- `useGiraRoster` no se usa: el informe es multi-gira, igual que Convocatorias (`resolveGiraRosterForMatrix` por programa).
- Tipos de ensayo de gira cubiertos: 2 y 3. Otros tipos de categoría Ensayos no entran.
- Vacantes `es_simulacion`: el catálogo de matriz no las filtra explícitamente aquí (misma base que Convocatorias).
- PDF listado en vertical usa `shortLabel` (Conc., >=2h) por ancho; Helvetica no dibuja `≥`. El detalle sí lleva labels largos de categoría.
- PDF detalle lote puede ser pesado con muchos integrantes y muchos eventos (un archivo; no ZIP).
- El recuadro de tipos no se repite en páginas de continuación si el detalle de una persona desborda.
- Totales de Servicios/mes no se agregan (cada fila tiene divisor propio).
- `stripHtml` ahora usa DOMParser en todo el producto (agenda, FIMBA, comidas): más agresivo que el regex viejo; títulos con `<` literales poco frecuentes.
- El 10 fijo no refleja giras cortas (p. ej. Navidad Coral); solo pisa sinfónicas futuras.
- El estimado reparte 10 en Conc./≥2h (1+9); no mete bloques de 15/30 min.
- `computeGiraServiciosAverage` queda en el util por si se vuelve a la media empírica; el informe ya no la usa.
- Ensayos en conflicto: Agenda no pide seating. El modal de Servicios arma grupos sin N `fetchRosterForGira` (pleno = classify + overlap). No cruza hora del ensayo con hora de viaje (solo calendario `fecha_desde`/`fecha_hasta`). Ensambles Prod. quedan fuera por el filtro de convocatoria.
- Informe de ensamble: familia/CF salen de `ensambles.id_familia` / `ensambles_cf` (el staff las carga; varias regionales aún sin CF). El bundle pide de nuevo nómina de giras. No se inventan membresías a Jazz Band. Conciertos de programa Ensamble se anidan por `id_gira` / `eventos_programas_asociados`; `eventos_ensambles` no los cubre (ensayos independientes). `eventos_giras_asociadas` existe en schema y no se usa. El PDF no incluye Coordinación (no está en el HTML). Helvetica dibuja acentos latinos pero no flechas; `toServiciosPdfText` sigue siendo obligatorio. El recuadro de tipos de programa del PDF persona no se replica aquí (el informe de ensamble no es por músico). En el copy «Ninguno en conflicto» usar `ensayosNeto ?? ensayosTotal ?? 0` (sin mezclar `??` con `||`: Vite/Rollup aborta el build).
- `ensayo_pese_conflicto` no tiene historial ni autor; revertir es poner el flag en false (no hay UI de deshacer).
- Tutti-N `asiste_igual` no cambia convocatoria ni cantidad: es un override de coordinación (quién asiste al ensayo pese a la gira). `IndependentRehearsalForm` preserva esas filas al guardar invitados/ausentes.
- Alta de `ensayo_pese_conflicto` (`20260927002345`): catalog-only, no pisó `updated_at`. Los triggers de agenda **ignoran** un UPDATE que solo cambia ese flag (`20260927005059`), para no marcar toda la agenda como recién editada. `ensayo_pese_conflicto_justificacion` (`20260930190100`, text NULL) **no** entra en esa lista: guardar «Se ensayó igual» (flag + texto) pulsa **ese** evento.
- «Otro día» abre el formulario completo de ensayo (ensambles/programas/asistencia), no un editor mínimo de fecha.
- Filas «No se ensayó» / «Otro día» resueltas viven solo en estado de sesión del informe (`conflictoSessionByEventId`); no hay bitácora. Cerrar el modal no las borra; recargar la página sí. Un «Se ensayó igual» de otra pestaña no aparece hasta refetch/reload.
