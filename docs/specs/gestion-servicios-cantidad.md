# Spec: Gestión → Prestaciones (cantidad de prestaciones)

## Objetivo

Informe **Gestión → Prestaciones** (`/management/servicios`): prestaciones por integrante, con **mismas reglas de convocatoria** que **Gestión → Convocatorias** (no un matcher paralelo). El slug de ruta sigue siendo `servicios` (código interno); el nombre visible es **Prestaciones**.

Menú: **Gestión** (staff: `isAdmin || isEditor` en `App.jsx`), mismo módulo que Convocatorias / Ensayos / Conciertos. Ctrl+K: `managementPalette.js` slug `servicios` → label «Gestión: Prestaciones».

## Valor de prestación

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

- **Gira (conciertos + ensayos 2/3):** `resolveGiraRosterForMatrix` (`giraService.js` = `resolveGiraRosterDetail`) + `getAsistenciaMatrixCellMark` (`asistenciaMatrixExport.js`). Incluye `ausente` + `abona_reemplazo` / `abona_licencia` (R/L). `ausente` sin abono **no** cuenta. **Fila personal presente** (`giras_integrantes.estado` distinto de `ausente`) **sí cuenta** (X), aunque su ensamble esté en `EXCL_ENSAMBLE` y aunque `fecha_alta` / `fecha_baja` no cubran el programa. Misma regla que Convocatorias (`rosterMatrixIds.js`). Pre-alta sin esa fila no cuenta.
- **Ensayo ensamble:** `isIntegranteConvocadoToEnsayo` (`girasYearSummary.js`). El mapa custom multi-persona se adapta con `customMapForIntegrante` (mismo shape evento → fila).
- **Grupos de gira (`eventos_grupos`):** en conciertos y ensayos, si el evento tiene tags de grupo (p. ej. FIMBA id 12), solo cuenta para integrantes miembros de alguno de esos `giras_grupos`. Sin tags = Tutti (cuenta para todo el roster / convocatoria). Helpers: `personPassesEventoGrupos` + `fetchIntegranteGrupoIdsByGiraId`.

## Listado y detalle

- Filas = integrante (IDs numéricos). Columnas: **Giras fuera de casa** (naranja) | **Giras en casa** (celeste) | **Conciertos de ensamble** (violeta) | **Prestaciones conciertos** (índigo) | **Ensayos** (dos columnas, esmeralda) | **PCV** (teal) | Total | **Prestaciones/mes**. Orden: fuera → en casa → conc. ensamble → prest. conc. → ensayos → PCV → Total.
- **Fuera / En casa:** conteo de giras Sinfónico, Camerata Filarmónica y Jazz Band con pesos por tramo (`giraTramoPesos`) según localidad efectiva de viáticos; **no** suman al Total. Entre paréntesis: **cantidad de conciertos** de esas giras (incluye didácticos; 1 evento = 1). Atribución fuera/casa por fecha del concierto vs tramos (`concertIsFueraDeCasa` en `serviciosPcv.js`). Programas tipo Ensamble / Comisión **no** entran en Fuera/En casa ni en PCV.
- **Conciertos de ensamble:** cantidad de conciertos/didácticos de programas `tipo = Ensamble`. No suma al Total.
- **Prestaciones conciertos:** suma de valores de prestación (1 o ½) de conciertos y didácticos (gira + ensamble). **Sí** suma al Total.
- **PCV** = días computables (`calculateDaysDiff`) por tramo fuera; con 2+ tramos, uno a la vez. Horarios: transporte de la gira en el tramo o mediodía.
- **Total** = prestaciones de conciertos + ensayos + PCV (sin conteos de giras ni Conc.ens.).
- **Prestaciones/mes** = `Total ÷ meses feb–dic de presencia` que solapan el rango filtrado. Enero **no** cuenta. Pie: **—**. Celda: `1,23 (10)`.
- Clic en fila → modal Portal `z-[100]` con los **mismos chips** que el listado (Fuera / En casa / Conc.ens. / Prest.conc. / Ensayos / PCV / Total / Prest/mes), más desglose de giras, desglose PCV y ensayos.
- **Ensayos en conflicto en el detalle:** la fila del ensayo lleva color y etiqueta. Pleno pendiente = ámbar «En conflicto» (valor 0, «no suma»; si el conteo lo había omitido, igual aparece en el listado). «Se ensayó igual» = verde. Tutti-N = celeste, solo si esa persona está en el roster de la gira. El PDF de detalle (persona y lote) pinta la fila del mismo color y agrega la etiqueta al texto del evento. El total del resumen no cambia.
- **Orden / separadores:** `compareInstrumentIds` (mismo sort que Convocatorias). Con «Agrupar por ensambles»: `buildAsistenciaMatrixRowGroups` (encabezados de ensamble tildado completo + «Otros»). Vista Ensambles/Cameratas/Regiones: `filterEnsamblesForConvocatoriaView` / `groupRegionalEnsamblesByRegion`.
- **Barra superior (escritorio):** pestañas Listado | Proyección (default Listado). Primera línea: período (Desde, Hasta, Año siguiente) en un recuadro, Gira, Buscar y Exportar. Segunda línea: Agrupar por ensambles y Estimar futuros. Franja índigo: combo ensamble / Ensayos en conflicto.

## Exportes

- **Excel** (`downloadServiciosCantidadExcel`): dos filas de encabezado. Integrante, Instrumento, Familia, columnas leading (Fuera, En casa, Conc.ens., Prest.conc.), Total, PCV y Prestaciones/mes ocupan las dos filas según corresponda. Hoja **Prestaciones**. El par visible va unido en la fila 1 bajo **Ensayos** (fondo esmeralda) y la fila 2 lleva las etiquetas del corte. Grupos si está tildado Agrupar. Los datos empiezan en la fila 3.
- **PDF listado** (`downloadServiciosCantidadPdf`): mismo stack que Convocatorias (`jsPDF` + `jspdf-autotable`). **A4 vertical (portrait)**. Título ASCII **Gestion Prestaciones**. Encabezado de dos filas: `rowSpan` 2 en integrante, instrumento, leading (Fuera…Prest.conc.), PCV, Total y Prest/mes; `colSpan` del par bajo **Ensayos**. Subencabezados `shortLabel`. Separadores de ensamble: `>` + `fillColor` slate. Fila Totales; Prestaciones/mes del pie = `-`. Botón `IconFileText`.
- **PDF detalle persona** (`downloadServiciosCantidadDetallePdf`): A4 vertical. Encabezado (nombre, rango, instrumento) + **recuadro tipo resumen del año** (`GirasYearSummaryBar` al pie de `GirasView`): chips de `programas.tipo` en columnas (colores `PROGRAM_TYPES`) con el total de prestaciones; **debajo de cada columna**, lista `nomenclador` + `nombre_gira`. Arriba, chips Total y Prest/mes. Luego la tabla de eventos. Botón `IconFileText` en el modal.
- **PDF detalle lote**: un archivo, `addPage` por integrante; cada uno arranca con el mismo recuadro + detalle.
- **PDF informe de ensamble** (`downloadEnsambleServiciosPdf` / `buildEnsambleServiciosPdfDoc` en `src/utils/serviciosEnsamblePdf.js`): A4 vertical, mismo stack Helvetica + `jspdf-autotable` + `toServiciosPdfText` (sin `→` ni otros glifos faltantes; helpers en `src/utils/serviciosPdf.js`). Botón **Descargar PDF** (`IconFileText`) en `EnsambleServiciosModal`. Filas: `buildEnsambleServiciosPdfTables` (misma jerarquía que el HTML, con las filas de conflicto ya particionadas). Títulos de evento y locación pasan por `stripHtml`. Nombre `informe_ensamble_<ensamble>_<stamp>.pdf`.

### Texto de eventos

- Fuente del leak (PDF Montani 2026-09-26): `eventos.descripcion` con HTML del editor (`<div>`, `<b>`, `<u>`, `<p>`, `<br>`) y `<span style="--tw-scale-x:…; font-weight: bolder;">` (Tailwind inline). El regex `<[^>]*>` se corta en el primer `>` y deja CSS/`</span>`.
- PDF y modal: `stripHtml` (`eventDisplayUtils.js`, el de agenda). Extra: **DOMParser** (como `htmlToPlainText` de transporte) + borrar `style`/`script`; fallback quote-aware; barrido `--tw-*` residual. Segunda pasada sobre el subtítulo completo.

### PDF vs HTML

| | HTML | PDF listado | PDF detalle |
|--|------|-------------|-------------|
| Orientación | — | A4 vertical | A4 vertical |
| Giras fuera/casa + Ensayos + PCV + Total + Prest/mes | Sí. Par de ensayos bajo encabezado «Ensayos» + toggle | Sí, el par visible bajo «Ensayos» | Resumen en encabezado |
| Sort / separadores convocatoria | Sí | Sí (`rowGroups`) | Orden de `visibleRows` |
| Integrante | 1 col (nombre + instrumento) | Integrante + Instrumento | Encabezado de página |
| Categorías de detalle | Recuadro por tipo de programa + colapsables | No | Recuadro por tipo + eventos `>` |
| Informe ensamble | Giras / programas+conciertos / ensayos+conflicto | — | Mismas secciones, portrait |
| Títulos de evento | `stripHtml` | — | `stripHtml` |
| R/L | Color sky/ámbar | Texto `+n` | Letra R/L coloreada |
| Ensayo en conflicto | Ámbar / verde / celeste en el detalle | — | Fila pintada + etiqueta |
| Totales /mes | — | — | Tasa de esa persona |

## Filtros (paridad Convocatorias + rango de fechas)

- Árbol izquierda: **Ninguno** por defecto (como Convocatorias). Catálogo del árbol: `fetchAsistenciaMatrixBaseData` al entrar (igual que el informe de convocatoria).
- **Eventos + roster no se piden** hasta que hay integrantes seleccionados (`selectedIntegranteIds.size === 0` → empty state, sin `fetchServiciosCantidadPeriod` ni `resolveGiraRosterForMatrix`).
- Tipos de programa: `TIPOS_PROGRAMA_ASISTENCIA_MATRIZ` (Sinfónico, Camerata Filarmónica, Ensamble, Jazz Band, Comisión). Default: **todos tildados**. El usuario puede destildar.
- Rango **desde/hasta**: default **año calendario siguiente** completo (`year+1-01-01` … `year+1-12-31`); botón «Año siguiente» lo restaura. El usuario puede cambiarlo. No dispara eventos si nadie está tildado.
- Gira opcional: combo sobre programas del catálogo que solapan el rango (`programOverlapsDateRange` `calendarOnly`).
- Familia de instrumento: join `instrumentos`, no columna en `integrantes`.

## Estimar futuros

Toggle **«Estimar futuros»** (`IconCalculator`, default **ON**). El usuario puede destildar. OFF = todo exacto (giras futuras vacías quedan en 0).

### Pasado vs futuro (calendario del programa)

- **Pasada:** `programas.fecha_hasta` &lt; hoy (`toLocalDateString`). Siempre exacta.
- **A estimar (toggle ON):** programas **`Sinfónico`** y **`Camerata Filarmónica`** con `fecha_hasta >= hoy` (o sin fin). Incluye giras en curso: se reemplaza el bucket de gira (ensayos 2/3 + conciertos/didácticos).
- **Jazz / ensamble-gira:** no se estima. Ensayos de ensamble (tipo 13) nunca se pisan.

### Valor por gira (ya no es un 8 fijo global)

Prioridad en `resolveGiraServiciosEstimate` ([`giraProyeccionPcv.js`](../../src/utils/giraProyeccionPcv.js)):

1. `programas.servicios_estimados` si está seteado (manual, Proyección).
2. Suma de eventos tipo 1/2/3 ya cargados (concierto 1 / didáctico 0,5; ensayos por duración).
3. Default **7** (`FIXED_FUTURE_GIRA_SERVICIOS`): 1 concierto + 6 ensayos ≥2h.

### Proyección (Prestaciones)

Subvista **«Proyección»** junto a Listado (default al entrar: Listado) ([`PrestacionesProyeccionSandbox.jsx`](../../src/components/management/PrestacionesProyeccionSandbox.jsx)). Toggle **Vista Listado | Proyección** un nivel arriba; en Proyección se ocultan sidebar (tipos/integrantes/ensambles), gira/buscar/agrupar/estimar futuros, barra de informe de ensamble y leyenda de listado — solo quedan fechas + contenido de proyección. Rango de fechas por defecto = **año calendario siguiente** completo:

- Por gira Sinf/CF: columnas **F. inicio / H. inicio / F. fin / H. fin** (doble clic) + **Serv.** + **Feriados** (días feriado/no laborable/domingo con ensayo o concierto tipos 1/2/3/13); luego **una columna por ensamble regional**, agrupadas bajo encabezado de CF (CFMar / CFMon / CFVal).
- Celda gira×ensamble: vacía si no convocado; **L** si local; número de **PCV** (días) si fuera. Casa = `ensambles.id_localidad` vs sedes/tramos de la gira (`classifyProgramaEnsambleConvocatoria` + `giraTramoPesos` + `estimatePcvFromFueraSegs`).
- Precarga horaria 15:00 / 23|14. Override manual (**M**) con `IconRefresh` al lado.
- **IconEdit** abre [`GiraForm`](../../src/views/Giras/GiraForm.jsx) (horas proyección + prestaciones manuales) vía portal.
- Filas coloreadas con `getProgramTypeColor` / `PROGRAM_TYPES`.
- Export **PDF informe** / **Excel informe** = informe del **año que viene** (`getAnioProyeccion()`).
- **PCV con tramos empalmados:** salen de casa hacia el **primer** tramo fuera; vuelven desde el **último** tramo fuera (`estimatePcvFromFueraSegs` / `estimatePcvWindow` con `destBackLocId`). No se cuenta una ida/vuelta por cada tramo. Un tramo cuya localía es la casa propia corta el viaje y abre otro. Demoras: `gira_demoras_localidad`; sin tramo → fallback 6h en la nota.
- **Demoras** en modal Portal `z-[100]` ([`DemorasLocalidadModal.jsx`](../../src/components/management/DemorasLocalidadModal.jsx)): se elige una localidad y se listan / editan / agregan conexiones desde o hacia ella (`gira_demoras_localidad`, minutos). Alerta si faltan pares usados por PCV en la temporada o localidades de giras sin ningún tramo (`findMissingDemorasTemporada`). Botón **Demoras** en la barra (badge si hay faltantes).
- Subvistas de Proyección (a la derecha del toggle Listado|Proyección): **Programas** (cuadro giras×ensambles), **Ensambles** (detalle vivo [`EnsambleProyeccionDetalle.jsx`](../../src/components/management/EnsambleProyeccionDetalle.jsx)), **Prestaciones** ([`ProyeccionPrestacionesVista.jsx`](../../src/components/management/ProyeccionPrestacionesVista.jsx)): toggle interno **Prestaciones | Programas** (2º / 1º cuadro del PDF pág. 1; default Prestaciones). Ens. netos: `brutos - conflicto = netos` (si conflicto = 0, solo el neto; el `-m` de conflicto en naranja en UI). Conc. ensamble: `prest. (N + M did.)`. **Prestaciones por gira** = suma de ensayos/conciertos estimados por gira (manual o default; hint «Ensayos y conciertos en gira»; sin mostrar la multiplicación). PDF hoja individual: resumen (1 Giras + 2 Prestaciones) y luego detalle en orden **Giras en casa → Giras fuera de casa → Programas de ensamble → Feriados → Ensayos en conflicto** (fechas de conflicto: `martes, 01 de julio de 2027`). Pág. 1 = ambos cuadros; pág. 2 = cuadro giras×ensambles.
- **Plantilla semanal de ensayos** editable por ensamble (`ensamble_proyeccion_ensayos`: `iso_dow`, horas, `id_locacion` → sede, título). Seed desde eventos tipo 13 de la semana 26/10–01/11/2026. Ventanas de proyección y **servicios/gira** viven en `ensamble_proyeccion_config`. En el sandbox los tramos se muestran como chips de solo lectura + icono editar (`ProyeccionTramosModal`, portal `z-[100]`); hueco entre tramos = corte p. ej. vacaciones de invierno. Ensambles del informe: `ensambles.es_ensamble_local` (Data → Ensambles). Alias corto de ciudad: `localidades.alias` (Data → Localidades).

Migraciones: `20261024200000_gira_proyeccion_sandbox.sql`, `20261024210000_gira_demoras_localidad.sql`, `20261024220000_gira_demoras_todas_localidades_hub.sql`, `20261025200000_ensamble_proyeccion_ensayos.sql`, `20261025210000_ensamble_proyeccion_ensayos_locacion.sql`, `20261026120000_proyeccion_config_ensamble_local_alias.sql`.

### Exportar y móvil

- Un solo botón **Exportar** (menú Portal `z-[100]`, mismo patrón que Gestión → Ensayos / Seating): PDF listado, PDF detalle lote, Excel. Iconos de `Icons.jsx`.
- En el teléfono el menú se abre con el ítem en el mismo toque (`pointerdown`). El cierre por fuera no usa `mousedown` sobre el portal: eso desmontaba el ítem antes del click y la descarga no arrancaba.
- La descarga no usa `file-saver`. En iPhone/iPad se abre Compartir (Guardar en Archivos). Si el gesto ya no vale después de armar el archivo, aparece **Guardar** para un segundo toque. En el resto, un `<a download>` dentro de `document.body`. El nombre lleva fecha y hora.
- **Móvil:** la página scrollea; la lista de integrantes tiene alto máximo y scroll propio (se puede ocultar). El botón Exportar está en ese encabezado. La tabla/lista de personas también scrollea. Tap abre el modal con el **recuadro de tipos de programa** (mismo layout que el PDF). El listado de eventos queda en escritorio / PDF.

## Ensayos en conflicto

Modal **«Ensayos en conflicto»** (botón en la barra de Prestaciones; Portal `z-[100]`, `IconAlertTriangle`). **No** espera la selección de integrantes: carga al abrir, con spinner.

**Conflicto pleno:** un ensayo de ensamble (`id_tipo_evento = 13`, no técnico, no borrado) solapa el calendario de una gira (`programOverlapsDateRange` `calendarOnly` sobre `fecha_desde`/`fecha_hasta`) **y** el ensamble **como grupo** está convocado: `classifyProgramaEnsambleConvocatoria` = `convocado` (fuente `ENSAMBLE` de ese id, o `FAMILIA` = `ensambles.id_familia`, o `CF` vía `ensambles_cf`) **sin** `EXCL_ENSAMBLE` de ese id. **No** hace falta que haya gente en el roster. Agenda/Lista lo calculan en memoria (eventos + **un** bulk de `programas`+`giras_fuentes` + catálogo ensambles/CF). **Nunca** `fetchRosterForGira` por fila ni en UnifiedAgenda.

**Tutti - N (no es conflicto pleno):** el criterio pleno es **falso**, pero hay integrantes de **ese** ensamble en el roster real de seating (`fetchRosterForGira` / `useGiraRoster`: counted / R / L; `ausente` no cuenta): (1) el ensamble **está** `EXCL_ENSAMBLE` y quedan overrides personales, o (2) **no** se convocó ni ensamble ni CF ni familia, y aun así hay gente en el roster. Universal (cualquier ensamble/gira). **UI solo en Coordinación → Lista**. Seating: **una** query por gira candidata del rango visible, **en serie** y memoizada — no por ensayo. **No** se muestra en UnifiedAgenda ni en Coordinación Calendario. No entra al modal de conflictos ni a la cantidad (Tutti-N **sí** cuenta).

En el modal Tutti-N, los checkboxes **no** marcan quién falta: tildar = **asiste igual al ensayo** pese a estar convocado a la gira. Default destildado. Persistencia: `eventos_asistencia_custom.tipo = asiste_igual`. Helper: «Tildá si asiste igual al ensayo a pesar de estar convocado a la gira.»

- Miembro: `membershipActiveOnProgramDate` en ese ensamble el día del ensayo, más invitados/adicionales de `isIntegranteConvocadoToEnsayo`.
- Roster de conflicto pleno: no se usa seating. Tutti-N (solo Lista): `fetchRosterForGira` lite, una gira a la vez. La matriz de Prestaciones de gira sigue usando `resolveGiraRosterForMatrix`. Ausente sin abono y pre-alta **no**. Borrador no entra.
- Ensambles: `filterEnsamblesForConvocatoriaView` (ensambles + cameratas). **Prueba** excluido.

- Agrupado por ensamble. Cada fila: a la izquierda fecha `dd/MM/yyyy, weekday` en minúsculas (`formatDdMmYyyyWeekday`, p. ej. `18/02/2026, miércoles`) + horario, título (`stripHtml`) y duración; **arriba a la derecha**, el nombre del programa/gira superpuesto en texto compacto secundario (`text-[10px]`, `nomenclador` + `nombre_gira`); debajo, los 3 botones de acción y el **número clickeable** de personas (triángulo). El número abre un segundo Portal `z-[110]` con nombre + `nomenclador` + `nombre_gira`. Si hay varias giras, se listan (la principal = más personas afectadas; el badge sigue siendo el conteo de personas).
- Pendientes arriba. Resueltos abajo, con encabezado **«Se ensayó igual»** (solo ese kind) o **«Resueltos»** (si hay borrados/reprogramados en la sesión). `ensayo_pese_conflicto` sigue viniendo del query tras recargar. «No se ensayó» / «Otro día» se guardan en estado local de sesión (`conflictoSessionByEventId` en `ServiciosCantidadReport`) y se reinsertan si el refetch ya no los trae; desaparecen al recargar la página (o al cambiar el rango de fechas).
- Rango = el mismo desde/hasta de Prestaciones.

**Cantidad:** un ensayo en **conflicto pleno pendiente** no suma (0) aunque dure ≥2 h. Tras **Se ensayó igual** aplica la fórmula normal (1 / ½ / 0). **No se ensayó** = 0 (borrado). **Otro día** = el evento nuevo cuenta si ya no está en conflicto pleno. Tutti-N **sí** cuenta (no es conflicto pleno). `resolveServicioForIntegrante` recibe `pendingConflictoEventIds`. El total neto del informe de ensamble (`ensayosNeto`) resta solo pendientes plenos. HTML, Excel y PDF (listado, detalle, informe ensamble) usan el mismo ctx.

**Agenda / Coordinación:** el mismo util. Tag ámbar **«Ensayo en conflicto»** (color de tarjeta distinto) + clic → `ConflictoEnsayoActions` (No se ensayó / Se ensayó igual / Otro día). Título del evento en cursiva gris **solo** si el conflicto pleno está pendiente; al lado/debajo, el nombre de gira superpuesto (`nomenclador` + `nombre_gira`, más grande que el tag). Superficies de conflicto: UnifiedAgenda (móvil y escritorio), Coordinación Lista, Coordinación Calendario + `EventQuickView`. Tutti-N **solo** Coordinación Lista, en la **fila de metadatos inferior** de la tarjeta (mismo lugar que el chip tradicional **Tutti**, junto a locación/ensamble; no junto a `ENSAYO ENSAMBLE`). Staff y coordinador del ensamble pueden actuar; el músico ve el tag de conflicto.

Modal **«Ensayos en conflicto»** (botón en la barra de Prestaciones; Portal `z-[100]`, `IconAlertTriangle`). **No** espera la selección de integrantes: carga al abrir, con spinner.

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

Tres bloques: 1) giras Sinfónico/CF; 2) programas tipo Ensamble (Jazz Band si aplica) con **conciertos anidados** (cada ítem: fecha, hora desde, hora hasta, locación; sin chips «Ensamble» a la derecha); 3) total neto de ensayos + detalle **solo** de los que están en conflicto (pendientes) y, debajo, los resueltos. El número de cada encabezado de bloque va grande (`text-lg`). Entre giras y entre programas de ensamble: separador `mt-1.5` + `border-t border-slate-200`. Chips de gira en el modal: `Tipo: {programa.tipo}` y convocatoria `Conv.: Ensamble` / `Conv.: {familia}` / `Conv.: {CF}` (PDF vía `ensambleViaPdfLabel` con el mismo prefijo). En móvil, `ProgramRow` y `ConflictoEnsayoLayout` apilan meta arriba y chips/botones abajo (`flex-col` → `sm:flex-row`) para que no se solapen ni truncen el título. Filas de conflicto: misma fecha `dd/MM/yyyy, weekday` + horario, título y duración a la izquierda; nombre de gira/programa compacto; botones + badge debajo (o a la derecha desde `sm`). El PDF replica esos tres bloques en A4 vertical; no inventa Coordinación. No hay bloque de programas con `EXCL_ENSAMBLE`: esas giras no se listan. El listado completo de ensayos es solo del modal (desplegable, cerrado por defecto).

**Casa / fuera / mixta (solo giras Sinfónico/CF; enteros, sin 1/n):** se mira el conjunto de localías de la gira (`giras_localidades` / tramos). **En casa:** todas las localías son la sede del ensamble (`ensambles.id_localidad`). **Fuera:** ninguna localía es la sede. **Mixta:** 2+ localías distintas y al menos una es la sede y otra/s no (cuenta **1** en mixtas, no fracciones). Sin localidad en el ensamble o sin sedes: se usa el criterio binario previo (todo o nada). El encabezado y las columnas **Giras fuera** / **Giras mixtas** / **Giras en casa** / **Total giras** suman enteros (Total = fuera + mixtas + en casa). PCV sigue usando solo los tramos/ventanas ajenos a la sede (mixta y fuera). Programas y conciertos de ensamble no se discriminan por casa/fuera.

**Prestaciones de cada gira (detalle del informe individual):** entre paréntesis, al lado del nombre, solo si la gira ya pasó (`isPastGira`: `fecha_hasta` anterior a hoy). Las giras en curso o futuras no muestran el paréntesis. Suma de conciertos (tipo 1) y ensayos de gira (tipos 2 y 3) del rango, con la misma fórmula del informe (1 / ½ / 0; ≤30 min o ensayo sin horas = 0). No entran los ensayos de ensamble (tipo 13). Cada gira muestra `programas.zona` junto al nombre. El PDF de giras lleva la zona, el mismo paréntesis (si ya pasó) y la marca fuera de casa. **FIMBA (`programas.id = 12`):** el paréntesis no es la suma de todas las actividades en paralelo. Es el promedio de prestaciones de los músicos de ese ensamble que están en el roster (X / R / L) y con membresía vigente al inicio de la gira. Un evento con `eventos_grupos` cuenta solo para los integrantes de esos grupos; sin grupos, cuenta para todo el roster. Si el roster no carga, queda la suma cruda. Esas prestaciones **no** entran al cuadro Todos (columnas de prestaciones / netos fuera por ahora).

**Opción Todos** (combo del árbol y de la barra): no abre el modal. Descarga un PDF (`informe_ensambles_<stamp>.pdf`). Primera página **A4 vertical**: una fila por ensamble del combo (solo ensambles regionales: sin Prueba, sin Jazz Band y sin CF) más fila Total. Encabezados con salto de línea (`Giras / fuera de / casa`, etc.). Jazz Band y las CF (nombre que empieza con `CF`) no entran a este informe: ni combo, ni ícono del árbol, ni PDF. Orden de columnas: **Giras fuera de casa** (naranja), **Giras mixtas** (ámbar), **Giras en casa** (verde), **Total giras** (slate), **Programas de Ensamble**, **Conciertos de Ensamble**, **Ensayos de ensamble**, **Ensayos en conflicto** (rojo, encabezado y cuerpo). Sin columnas de Prestaciones ni Prestaciones netas (por ahora). Programas = `programasPropios.length`. Conciertos = anidados en esos programas + `conciertosSueltos`. Las giras futuras entran en el conteo de giras. Ensayos de ensamble = cantidad que no está en conflicto pleno pendiente. Ensayos en conflicto = ese pendiente (con la sesión del informe). Después, cada informe en A4 vertical, uno por página de arranque. Un solo `fetchEnsambleServiciosBundle`.

**Join de conciertos al programa Ensamble:** `eventos.id_gira` y `eventos_programas_asociados` (`eventAssociatedProgramaIds`). Los conciertos VS son eventos de gira (`id_tipo_evento = 1`); **no** exigen fila en `eventos_ensambles`. Esa tabla queda para ensayos independientes (tipo 13) y para conciertos sueltos (sin programa propio de tipo Ensamble). Si el informe pedía `eventos_ensambles` para anidar, los VS salían solo como título.

### Acciones en un ensayo en conflicto

Staff (admin/editor, misma pantalla Prestaciones). En el modal de conflictos y en el informe de ensamble:

| Acción | Persistencia | Efecto |
|--------|--------------|--------|
| **No se ensayó** | `eventos.is_deleted` + `deleted_at` (mismo path que Agenda / `IndependentRehearsalForm`) + `notifyEnsayoEventoSoftDeleted` | En sesión queda como resuelto; al recargar desaparece (el query filtra `is_deleted`) |
| **Se ensayó igual** | `eventos.ensayo_pese_conflicto = true` **y** `ensayo_pese_conflicto_justificacion` (texto no vacío). Migraciones `20260927002345` + `20260930190100`. El trigger ignora un UPDATE **solo** del flag; flag+justificación pisa `updated_at` de **ese** evento. | El evento queda; el query de conflicto lo **incluye** con `resolvedKind = kept` y se lista bajo **«Se ensayó igual»** con la justificación. Confirmación: textarea obligatorio (`ConfirmModal` Portal `z-[110]`). |
| **Se ensayó otro día** | `IndependentRehearsalForm` (mismo save que Coordinación/Agenda: fecha, hora, locación) | En sesión queda como resuelto; al recargar, si la fecha nueva ya no solapa giras, no vuelve |
| **Deshacer** (kept / deleted) | `clearEnsayoPeseConflicto` (flag + justificación a null) o `restoreEnsayoEvento` (`is_deleted = false`, `deleted_at = null`). Botón junto al chip en `ConflictoEnsayoUndo`. | Quita la entrada de `conflictoSessionByEventId` (`onSessionForgotten`) y vuelve a pendiente |

Confirmaciones Portal `z-[110]` sobre el modal `z-[100]`. No hay tabla extra: un flag por evento, como `is_deleted`.

## Archivos

| Pieza | Ruta |
|-------|------|
| UI | `ServiciosCantidadReport.jsx`, `EnsayosConflictoModal.jsx`, `EnsambleServiciosModal.jsx`, `ConflictoEnsayoActions.jsx`; agenda: `EnsayoImpactTags.jsx` / `EnsayoConflictoTag.jsx` / `EnsayoTuttiMinusTag.jsx`; Coordinación: `EnsembleCoordinatorView.jsx`, `EnsembleCalendar.jsx`, `EventQuickView.jsx` |
| Cálculo | `serviciosCantidad.js`, `serviciosPcv.js` (giras fuera/casa + PCV), `serviciosEnsayosConflicto.js`, `serviciosEnsambleReport.js`, `serviciosConflictoActions.js`, `viaticosDiasComputables.js` |
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
| Fila personal presente cuenta aunque haya `EXCL_ENSAMBLE` o sin vigencia de legajo | Completado |
| Detalle individual: color en ensayos en conflicto (HTML + PDF) | Completado |
| Listado: alternar ensayos por duración o por ensamble/gira (dos columnas) | Completado |
| Listado: encabezado «Ensayos» con el toggle en la tabla (PDF/Excel agrupados) | Completado |
| Ensayo ensamble = `isIntegranteConvocadoToEnsayo` | Completado |
| Columnas + detalle colapsable + Excel + PDF listado/detalle | Completado |
| Prestaciones/mes (feb–dic, `fecha_alta`) | Completado |
| Renombre visible Servicios → Prestaciones | Completado (2026-10-17) |
| Cuadro Todos: giras casa/fuera/total + programas/conciertos; sin prestaciones/netos | Completado (2026-10-17) |
| Listado integrante: Fuera/En casa + PCV (días viático); Total = ensayos + PCV | Completado (2026-10-19) |
| Fuera/En casa con (conciertos); Conc.ens. + Prest.conc.; Total += conciertos | Completado (2026-10-19) |
| Prestaciones: recorte por `eventos_grupos` (FIMBA y giras con grupos) | Completado (2026-10-19) |
| Prest.conc. contraste rose (legible vs indigo) | Completado (2026-10-19) |
| PDF A4 vertical + detalle persona + lote | Completado |
| Recuadro PDF/HTML = resumen del año Giras (`GirasYearSummaryBar`) | Completado |
| Tipos de programa: todos tildados por defecto | Completado |
| Estimar futuros (8 fijo, default ON) | Completado (2026-10-09) |
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
| Informe ensamble: fuera de casa + servicios por gira (ensayos 2/3 + conciertos) | Completado (2026-10-09) |
| Informe ensamble: desplegable de todos los ensayos (solo modal) | Completado (2026-10-09) |
| Informe ensambles: opción Todos (PDF con cuadro general + informes) | Completado (2026-10-09) |
| Barra superior agrupada (período / listado / informe de ensamble) | Completado (2026-10-09) |
| Tramos de localidad: cada tramo pesa 1/n en giras y servicios fuera de casa | Superado (2026-10-26): enteros casa/fuera/mixta |
| Casa / fuera / mixta enteros (mixta = 2+ localías con ≥1 local; sin 1/n) | Completado (2026-10-26) |
| FIMBA (id 12): promedio de servicios de los músicos del ensamble en el roster | Completado (2026-10-09) |

## Deuda / abierto

- Ensayo sin horas: no cuenta (¿tratar como &lt;2 h?). Bloques ≤30 min tampoco.
- ~~`eventos_grupos`: la matriz no recorta~~ → Prestaciones sí recorta por tags de grupo (2026-10-19).
- Catálogo del árbol sí pega a la DB al entrar (igual Convocatorias); lo pesado (eventos/nómina) espera la selección.
- `useGiraRoster` no se usa: el informe es multi-gira, igual que Convocatorias (`resolveGiraRosterForMatrix` por programa).
- Tipos de ensayo de gira cubiertos: 2 y 3. Otros tipos de categoría Ensayos no entran.
- Vacantes `es_simulacion`: el catálogo de matriz no las filtra explícitamente aquí (misma base que Convocatorias).
- PDF listado en vertical usa `shortLabel` (Conc., >=2h) por ancho; Helvetica no dibuja `≥`. El detalle sí lleva labels largos de categoría.
- PDF detalle lote puede ser pesado con muchos integrantes y muchos eventos (un archivo; no ZIP).
- El recuadro de tipos no se repite en páginas de continuación si el detalle de una persona desborda.
- Totales de Prestaciones/mes no se agregan (cada fila tiene divisor propio).
- Prestaciones netas y columnas de prestaciones por casa/fuera del cuadro Todos quedan fuera por ahora (pueden volver).
- PCV del listado usa eventos de transporte a nivel gira (no boarding personal de `useLogistics`); si no hay paradas en el tramo, mediodía. Ideal futuro: misma ventana personal que Viáticos / desdoble guardado en `giras_viaticos_detalle`.
- Conc./Didác. salieron del listado y del Total; el modal de detalle aún los muestra. «Estimar futuros» sigue metiendo 1 concierto sintético que ya no suma al Total (sí los 7 ensayos de gira).
- `stripHtml` ahora usa DOMParser en todo el producto (agenda, FIMBA, comidas): más agresivo que el regex viejo; títulos con `<` literales poco frecuentes.
- El 8 fijo no refleja giras cortas (p. ej. Navidad Coral); solo pisa sinfónicas futuras.
- El estimado reparte 8 en Conc./≥2h (1+7); no mete bloques de 15/30 min.
- `computeGiraServiciosAverage` queda en el util por si se vuelve a la media empírica; el informe ya no la usa.
- Ensayos en conflicto: Agenda no pide seating. El modal de Prestaciones arma grupos sin N `fetchRosterForGira` (pleno = classify + overlap). No cruza hora del ensayo con hora de viaje (solo calendario `fecha_desde`/`fecha_hasta`). Ensambles Prod. quedan fuera por el filtro de convocatoria.
- Informe de ensamble: familia/CF salen de `ensambles.id_familia` / `ensambles_cf` (el staff las carga; varias regionales aún sin CF). El bundle pide de nuevo nómina de giras, más ensayos de gira (tipos 2 y 3) y `giras_localidades` para fuera de casa. No se inventan membresías a Jazz Band. Conciertos de programa Ensamble se anidan por `id_gira` / `eventos_programas_asociados`; `eventos_ensambles` no los cubre (ensayos independientes). `eventos_giras_asociadas` existe en schema y no se usa. El PDF no incluye Coordinación (no está en el HTML) ni el desplegable de todos los ensayos. Helvetica dibuja acentos latinos pero no flechas; `toServiciosPdfText` sigue siendo obligatorio. El recuadro de tipos de programa del PDF persona no se replica aquí (el informe de ensamble no es por músico). En el copy «Ninguno en conflicto» usar `ensayosNeto ?? ensayosTotal ?? 0` (sin mezclar `??` con `||`: Vite/Rollup aborta el build). Clasificación entera por localías: casa / fuera / mixta (mixta = 2+ localías con ≥1 local y ≥1 ajena; sin pesos 1/n). Gira o ensamble sin localidad: criterio binario. FIMBA (id 12) promedia por músico del ensamble en el roster; el listado por integrante de Prestaciones no cambia (sigue sin recortar por `eventos_grupos`). El paréntesis de prestaciones no aplica «Estimar futuros» (sale el cronograma real del rango) y solo aparece si `fecha_hasta` es anterior a hoy.
- `ensayo_pese_conflicto` no tiene historial ni autor; **Deshacer** en la UI vuelve el flag a false y limpia la justificación (y restaura de papelera si era «No se ensayó»).
- Tutti-N `asiste_igual` no cambia convocatoria ni cantidad: es un override de coordinación (quién asiste al ensayo pese a la gira). `IndependentRehearsalForm` preserva esas filas al guardar invitados/ausentes.
- Alta de `ensayo_pese_conflicto` (`20260927002345`): catalog-only, no pisó `updated_at`. Los triggers de agenda **ignoran** un UPDATE que solo cambia ese flag (`20260927005059`), para no marcar toda la agenda como recién editada. `ensayo_pese_conflicto_justificacion` (`20260930190100`, text NULL) **no** entra en esa lista: guardar «Se ensayó igual» (flag + texto) pulsa **ese** evento.
- «Otro día» abre el formulario completo de ensayo (ensambles/programas/asistencia), no un editor mínimo de fecha.
- Filas «No se ensayó» / «Otro día» resueltas viven solo en estado de sesión del informe (`conflictoSessionByEventId`); no hay bitácora. Cerrar el modal no las borra; recargar la página sí. Un «Se ensayó igual» de otra pestaña no aparece hasta refetch/reload.
