# Refactor: Enum de Categorías de Transporte

## Descripción

Se ha reemplazado el campo booleano `es_tipo_alternativo` por `categoria_logistica` para soportar múltiples tipos de transporte y comportamientos de visibilidad.

## Mapeo de Categorías

- **`PASAJEROS`**: Transporte estándar. Las paradas usan el tipo de evento **11**. Requiere asignación manual de pasajeros.
- **`LOGISTICO`**: Transporte de carga o staff técnico. Las paradas usan el tipo de evento **12**.
- **`INTERNO`**: Traslado interno general. Las paradas usan el tipo de evento **35**. **Es visible para todos los integrantes activos de la gira (isMyTransport = true automático).** La **ocupación** (chip de butacas) y el **cuadro de firmas** no usan esa admisión automática: solo cuentan quienes tienen **subida y bajada** en ese vehículo.

## Ocupación INTERNO (chip + firmas)

**Antes:** el header `N + M ins = T butacas / cap` y el cuadro de firmas tomaban `logistics.transports` (todos los no ausentes admitidos al INTERNO). Resultado: la orquesta completa (p. ej. `71 + 13 ins = 84 butacas`) aunque el charter solo moviera a Regina/Roca.

**Ahora:** `src/utils/transportOccupancy.js` → `getTransportOccupancyPassengers`.

- **PASAJEROS / LOGISTICO:** sin cambio — admitidos al vehículo.
- **INTERNO:** persona no ausente/baja, admitida (no vetada) **y** con ↑ **y** ↓ en este viaje:
  1. ride logístico con `subidaId` + `bajadaId`, **o**
  2. matchea al menos una regla de subida y una de bajada de ese `giras_transportes` (incluye inf. viáticos ≠ residencia, misma semántica que chips SUBEN/BAJAN).
- Fórmula de butacas igual: personas + `plaza_extra`. Vacantes (`es_simulacion`) cuentan si tienen boarding. IDs numéricos. El ranker de admisión **no** cambia.
- Cuadro de firmas (PDF/DOCX) usa la misma lista.
- PDF/DOCX: márgenes de hoja **12 mm** (cuatro lados); **tres Enters** (párrafos vacíos, sin renglones pautados) encima del bloque de firmas; menores (`fecha_nac`, edad &lt; 18, misma regla CNRT) sin recuadro de firma. Detalle en `viaticos_destaques_custom_location.md`.
- `pasajeros_ids` no se usa aquí (en INTERNO inflaría al roster). CNRT / hoja de ruta siguen el path anterior (deuda).

- [x] Chip de ocupación INTERNO = riders con ↑ y ↓ (no toda la orquesta)
- [x] Cuadro de firmas del mismo vehículo filtrado igual

## Regla de Oro

Cualquier evento en la agenda cuyo `id_tipo_evento` sea **35** debe considerarse "Mi Transporte" para el usuario logueado, sin consultar tablas de asignación.

## Implementación en código

- Constante `CATEGORIAS_TRANSPORTE` en `src/utils/giraTransportUtils.js`: mapea categoría → `id_tipo_evento` (11, 12, 35). Consumida por `GirasTransportesManager.jsx`.
- `UnifiedAgenda.jsx`: `isMyTransport` incluye `id_tipo_evento === 35`; eventos tipo 35 no se atenúan (shouldDim) y pasan el filtro "Solo mi transporte".
- `UnifiedAgenda.jsx` / `agendaHelpers.js`: las paradas del **vehículo asignado** (`isMyTransport`) **no** saltan el filtro de categoría. Si Transporte (id 6) está destildado, se ocultan todas las paradas/traslados (charter, camioneta, chips TRASLADO, INTERNO), aunque el músico esté asignado a ese bus o el evento esté tagueado como Otros/Logística. Con Transporte tildado, `isAssignedVehicleAgendaStop` sigue evitando que el tag de convocatoria (p. ej. Crimson) oculte la parada. Con el ojo cerrado (`visible_agenda === false`), músicos **sí** ven las paradas de **su** bus; el cierre solo oculta paradas de buses ajenos.
- `useLogistics.js` (`calculateLogisticsSummary`): transportes con `categoria_logistica === 'INTERNO'` se añaden al resumen de transporte de cada integrante no ausente, para que la agenda pueda resolver `myTransportLogistics` de forma coherente.
- `giraService.js`: `getTransportesByGira` incluye `categoria_logistica` en el select.
- `useAgendaData.js`: la query de `giras_transportes` incluye `categoria_logistica` para que el cálculo de logística en agenda tenga el dato.
- `useAgendaData.js`: el cálculo de `myTransportLogistics` usa el mismo enriquecimiento territorial que `useLogistics` (`resolveLocalidadResidencia`, `resolveLocalidadEfectivaViaticos`, catálogo `localidades` e `id_region_residencia`) para que reglas por Región/Localidad de admisión y rutas coincidan con la gestión logística.
- `useAgendaData.js`: en agenda de gira específica (`giraId`), siempre se calcula logística del usuario salvo `ausente`/`baja`/`no_convocado` explícitos; los integrantes que entran solo por ensamble (p. ej. ECAS) sin fila en `giras_integrantes` ya no quedan excluidos por un `matchesSource` fallido (p. ej. perfil cacheado sin `integrantes_ensambles`). Se reconsultan ensambles si el perfil no los trae.
- `UnifiedAgenda.jsx`: la detección de transporte asignado (`isMyTransport`) se evalúa siempre; **todas** las paradas del vehículo asignado se muestran con Transporte tildado (incl. `visible_agenda === false`). Si la categoría Transporte está destildada, no se fuerza la fila (`eventPassesAgendaCategoryFilter`).
- `useAgendaData.js`: al armar `mockPerson` para logística, no se escribe `id_localidad_residencia: ""` (eso impedía matchear reglas Localidad p. ej. Charter Viedma); fallback a `id_localidad` del perfil.
- `useAgendaData.js` (2026-09-14): las paradas del bus asignado **no se descartan** por `eventos_grupos` de otro grupo de convocatoria (p. ej. Charter Viedma 03:10 Villa Regina tagueado Crimson, músico Marley admitido por localidad). `mockPerson` lleva `grupo_ids` de la gira. Helper `isAssignedVehicleAgendaStop` en `agendaHelpers.js`.
- `useAgendaData.js` (2026-09-23): caché `v11` slim `{ from, to, items }` (una clave; no hay snapshot por rango). `QuotaExceededError` recorta `agenda_cache_*`, reintenta una vez y, si falla, omite caché sin abortar el pintado de red. Arrays v11 legacy de agenda general se ignoran (truncados a 1000). Agenda general pagina eventos (1000/página) y cubre `max(Hasta, hoy+monthsLimit)`; cambiar Desde/Hasta re-consulta. El roster no va en el SELECT de lista.
- `giraUtils.js` (`resolvePersonTerritoryIds`): trata `id_localidad_residencia` vacío como ausente y reintenta residencia / `id_localidad`.
- `UnifiedAgenda.jsx`: clave de caché de perfil `profile_cache_*_v3` con `integrantes_ensambles` y `datos_residencia`.
- **Visibilidad unificada:** el IconEye en `GirasTransportesManager` y en paradas de transporte de `UnifiedAgenda` escriben `eventos.visible_agenda`. Staff de gestión con visibilidad técnica **sigue viendo** paradas ocultas de cualquier bus (fondo gris). Músicos / Consulta General: ven paradas ocultas **solo** de su vehículo asignado (o tipo 35 INTERNO). En eventos no logísticos, el ojo de agenda sigue siendo marca **técnica** (`tecnica`).

## UI móvil de Gestión de Transportes

- [x] Los cuatro indicadores superiores usan grilla responsive `2 columnas -> 4 columnas` para evitar compresión en pantallas angostas.
- [x] La barra de acciones, filtros y formulario de alta de transporte se adaptan a mobile con controles apilados o de ancho completo.
- [x] Al abrir un transporte en mobile, las paradas se renderizan como cards: fecha, hora desde, hora hasta, locación y detalle quedan apilados; las reglas de subida/bajada quedan en una columna lateral.
- [x] En desktop se mantiene la tabla original de paradas para preservar densidad de edición.
- [x] El menú **Acciones** de cada tarjeta se renderiza con React Portal en `document.body` (`z-[100]`, posición `fixed`) para no quedar recortado por el `overflow` de la tarjeta ni tapado por la siguiente.

## Hora hasta en paradas de transporte

- [x] Columna **Hora desde** (`eventos.hora_inicio`) y **Hora hasta** (`eventos.hora_fin`) en tabla desktop y cards mobile de `GirasTransportesManager`.
- [x] Inline edit vía `TimeInput` + `handleUpdateEvent` (mismo path que fecha/hora inicio).
- [x] Alta de parada persiste `hora_fin` (opcional; vacío → `null`).
- [x] Shift de horarios (`handleApplyShiftSchedule`) desplaza también `hora_fin` cuando existe, conservando el desfase relativo.

## StopRulesManager — ocupación de instrumentos

- [x] Chip de afectados por regla: si hay `plaza_extra`, muestra `N + M ins` (misma semántica que filas de `GirasTransportesManager` / roster).
- [x] Lista expandida de personas (y reglas Individual): `+{abreviatura}` junto al nombre cuando el instrumento efectivo ocupa plaza.
- [x] Roster/catálogo propaga `instrumentos.abreviatura` vía `useGiraRoster` + `applyEffectiveGiraInstrument`.
- [x] Localidad inferida (viáticos ≠ residencia): chip celeste `n inf.` / `m y n inf.` (plaza extra solo sobre pax reales); lista expandida con marca **inf.**.

## Selección de paradas, color de tipo y divergencia

Al tildar paradas (`selectedEventIds`, solo en memoria) aparece una barra fija abajo, en desktop y en mobile. Portal a `document.body`, `z-[90]` (debajo de modales `z-[100]` y tooltips `z-[110]`), desplazada con `--app-sidebar-width` para no tapar el menú. Muestra el conteo y una X que llama a `clearSelection()`.

- [x] **Mover horarios.** Abre `TransportShiftScheduleModal` acotado a la selección (el mismo filtro de antes: con tildes, solo esas paradas; sin tildes, Acciones sigue moviendo todas las del vehículo). Si la selección es de un solo vehículo, el movimiento queda en ese vehículo. Si mezcla varios, toast y no se aplica (ni desde la barra ni desde Acciones). El botón del modal dice «Aplicar a N paradas» cuando la selección de ese vehículo es parcial, y «Aplicar a todos» cuando no hay tildes o están tildadas todas las paradas del vehículo. Al aplicar con éxito, `clearSelection()`.
- [x] **Ocultar / Mostrar en agenda.** Escribe `eventos.visible_agenda` en lote (mismo campo que el ojo de la fila). Si todas las tildadas están ocultas, el botón dice **Mostrar en agenda** y las vuelve a `true`. Si hay alguna visible (o la selección está mixta), dice **Ocultar** y pone `false` en todas. La selección se mantiene para ver el resultado.
- [x] **Cambiar tipo.** Menú con los tres tipos de `TRANSPORT_EVENT_TYPES` (no un ciclo). Actualiza `id_tipo_evento` solo de las paradas tildadas. No toca `categoria_logistica` del vehículo ni las paradas no tildadas. La selección se mantiene.
- [x] Borrar sigue siendo el tacho por fila. No hay borrado masivo.

### Código de colores

Mapa único en `src/utils/giraTransportUtils.js` (`TRANSPORT_EVENT_TYPES` / `transportStopRowPaint`). La fila se pinta por el `id_tipo_evento` de esa parada, en tabla desktop y cards mobile.

| Tipo | id | Nombre | Acento | Fondo de fila | Equivalente Tailwind |
| --- | --- | --- | --- | --- | --- |
| Pasajeros | 11 | Traslado | `#6366f1` (`tipos_evento.color`) | `#EEF2FF` | indigo-500 / indigo-50 |
| Logístico | 12 | Traslado logístico | `#D97706` | `#FFFBEB` | amber-600 / amber-50 |
| Interno | 35 | Traslado Interno | `#8B5CF6` (`tipos_evento.color`) | `#F5F3FF` | violet-500 / violet-50 |

El catálogo pinta 11 y 12 con el mismo `#6366f1`. La fila del 12 usa el ámbar del badge «Solo logístico» para que los tres se distingan. Con `visible_agenda === false` el fondo pasa a gris `#E2E8F0` (slate-200) y se conserva la franja del acento.

- [x] Color por parada, no por la categoría del vehículo
- [x] Oculto sigue leyéndose como gris, con la franja del tipo

### Tag de divergencia

El tipo del contenedor es `eventTypeIdForCategoria(giras_transportes.categoria_logistica)` (el mismo mapa que `saveTransportChanges`: PASAJEROS→11, LOGISTICO→12, INTERNO→35). Si `eventos.id_tipo_evento` es otro, la fila muestra un tag con el nombre del tipo de **esa** parada (`Traslado`, `Traslado logístico` o `Traslado Interno`). Si coincide, no hay tag.

- [x] Tag en desktop y mobile
- [x] `saveTransportChanges` sigue alineando **todas** las paradas al tipo del vehículo al guardar la categoría. Eso borra divergencias a propósito. Las divergencias nacen solo de «Cambiar tipo» sobre la selección.

### Agenda

Cambiar una parada a tipo 35 persiste `id_tipo_evento`. `getAgendaTransportFlags` la sigue tratando como traslado interno (`isMyTransport`) sin cambio de regla ni de visibilidad del tipo 35.

- [x] Sin rediseño de agenda

## Migración SQL

Ver `supabase/migrations/20260329120000_transporte_categoria_logistica.sql`. La columna `es_tipo_alternativo` puede eliminarse después de validar (paso opcional comentado en el archivo).
