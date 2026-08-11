# Refactor: Enum de Categorías de Transporte

## Descripción

Se ha reemplazado el campo booleano `es_tipo_alternativo` por `categoria_logistica` para soportar múltiples tipos de transporte y comportamientos de visibilidad.

## Mapeo de Categorías

- **`PASAJEROS`**: Transporte estándar. Las paradas usan el tipo de evento **11**. Requiere asignación manual de pasajeros.
- **`LOGISTICO`**: Transporte de carga o staff técnico. Las paradas usan el tipo de evento **12**.
- **`INTERNO`**: Traslado interno general. Las paradas usan el tipo de evento **35**. **Es visible para todos los integrantes activos de la gira (isMyTransport = true automático).**

## Regla de Oro

Cualquier evento en la agenda cuyo `id_tipo_evento` sea **35** debe considerarse "Mi Transporte" para el usuario logueado, sin consultar tablas de asignación.

## Implementación en código

- Constante `CATEGORIAS_TRANSPORTE` en `src/utils/giraTransportUtils.js`: mapea categoría → `id_tipo_evento` (11, 12, 35). Consumida por `GirasTransportesManager.jsx`.
- `UnifiedAgenda.jsx`: `isMyTransport` incluye `id_tipo_evento === 35`; eventos tipo 35 no se atenúan (shouldDim) y pasan el filtro "Solo mi transporte".
- `UnifiedAgenda.jsx` / `agendaHelpers.js`: las paradas del **vehículo asignado** (`isMyTransport`) saltan el filtro de categoría (Transporte id 6 / Logística id 3) aunque “Solo mi transporte” esté apagado. Con el ojo cerrado (`visible_agenda === false`), músicos **sí** ven las paradas de **su** bus; el cierre solo oculta paradas de buses ajenos.
- `useLogistics.js` (`calculateLogisticsSummary`): transportes con `categoria_logistica === 'INTERNO'` se añaden al resumen de transporte de cada integrante no ausente, para que la agenda pueda resolver `myTransportLogistics` de forma coherente.
- `giraService.js`: `getTransportesByGira` incluye `categoria_logistica` en el select.
- `useAgendaData.js`: la query de `giras_transportes` incluye `categoria_logistica` para que el cálculo de logística en agenda tenga el dato.
- `useAgendaData.js`: el cálculo de `myTransportLogistics` usa el mismo enriquecimiento territorial que `useLogistics` (`resolveLocalidadResidencia`, `resolveLocalidadEfectivaViaticos`, catálogo `localidades` e `id_region_residencia`) para que reglas por Región/Localidad de admisión y rutas coincidan con la gestión logística.
- `useAgendaData.js`: en agenda de gira específica (`giraId`), siempre se calcula logística del usuario salvo `ausente`/`baja`/`no_convocado` explícitos; los integrantes que entran solo por ensamble (p. ej. ECAS) sin fila en `giras_integrantes` ya no quedan excluidos por un `matchesSource` fallido (p. ej. perfil cacheado sin `integrantes_ensambles`). Se reconsultan ensambles si el perfil no los trae.
- `UnifiedAgenda.jsx`: la detección de transporte asignado (`isMyTransport`) se evalúa siempre; **todas** las paradas del vehículo asignado se muestran (incl. `visible_agenda === false` y sin categoría Transporte/Logística seleccionada).
- `useAgendaData.js`: al armar `mockPerson` para logística, no se escribe `id_localidad_residencia: ""` (eso impedía matchear reglas Localidad p. ej. Charter Viedma); fallback a `id_localidad` del perfil.
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

## Migración SQL

Ver `supabase/migrations/20260329120000_transporte_categoria_logistica.sql`. La columna `es_tipo_alternativo` puede eliminarse después de validar (paso opcional comentado en el archivo).
