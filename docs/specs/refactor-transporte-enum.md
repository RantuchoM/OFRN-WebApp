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
- `UnifiedAgenda.jsx`: las paradas asignadas respetan el filtro de categoría. Si Transporte/Logística está desmarcado, solo se muestran cuando el usuario activa explícitamente `Solo mi transporte`; con ambas opciones desmarcadas permanecen ocultas.
- `useLogistics.js` (`calculateLogisticsSummary`): transportes con `categoria_logistica === 'INTERNO'` se añaden al resumen de transporte de cada integrante no ausente, para que la agenda pueda resolver `myTransportLogistics` de forma coherente.
- `giraService.js`: `getTransportesByGira` incluye `categoria_logistica` en el select.
- `useAgendaData.js`: la query de `giras_transportes` incluye `categoria_logistica` para que el cálculo de logística en agenda tenga el dato.
- `useAgendaData.js`: el cálculo de `myTransportLogistics` usa el mismo enriquecimiento territorial que `useLogistics` (`resolveLocalidadResidencia`, `resolveLocalidadEfectivaViaticos`, catálogo `localidades` e `id_region_residencia`) para que reglas por Región/Localidad de admisión y rutas coincidan con la gestión logística.
- `useAgendaData.js`: en agenda de gira específica (`giraId`), siempre se calcula logística del usuario salvo `ausente`/`baja`/`no_convocado` explícitos; los integrantes que entran solo por ensamble (p. ej. ECAS) sin fila en `giras_integrantes` ya no quedan excluidos por un `matchesSource` fallido (p. ej. perfil cacheado sin `integrantes_ensambles`). Se reconsultan ensambles si el perfil no los trae.
- `UnifiedAgenda.jsx`: la detección de transporte asignado (`isMyTransport`) se evalúa siempre; **todas** las paradas del vehículo asignado se muestran aunque la categoría Logística (id 3) esté desactivada por defecto para músicos (no solo subida/bajada).
- `UnifiedAgenda.jsx`: clave de caché de perfil `profile_cache_*_v2` para forzar refresco con `integrantes_ensambles`.
- **Visibilidad unificada:** el IconEye en `GirasTransportesManager` y en paradas de transporte de `UnifiedAgenda` escriben `eventos.visible_agenda`. Staff (editor, management, admin) **sigue viendo** paradas con `visible_agenda === false` en agenda (fondo gris); músicos no, salvo su subida/bajada propia. En eventos no logísticos, el ojo de agenda sigue siendo marca **técnica** (`tecnica`).

## UI móvil de Gestión de Transportes

- [x] Los cuatro indicadores superiores usan grilla responsive `2 columnas -> 4 columnas` para evitar compresión en pantallas angostas.
- [x] La barra de acciones, filtros y formulario de alta de transporte se adaptan a mobile con controles apilados o de ancho completo.
- [x] Al abrir un transporte en mobile, las paradas se renderizan como cards: fecha, hora, locación y detalle quedan apilados; las reglas de subida/bajada quedan en una columna lateral.
- [x] En desktop se mantiene la tabla original de paradas para preservar densidad de edición.

## Migración SQL

Ver `supabase/migrations/20260329120000_transporte_categoria_logistica.sql`. La columna `es_tipo_alternativo` puede eliminarse después de validar (paso opcional comentado en el archivo).
