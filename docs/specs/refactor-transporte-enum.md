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

- Constante `CATEGORIAS_TRANSPORTE` en `GirasTransportesManager.jsx`: mapea categoría → `id_tipo_evento` (11, 12, 35).
- `UnifiedAgenda.jsx`: `isMyTransport` incluye `id_tipo_evento === 35`; eventos tipo 35 no se atenúan (shouldDim) y pasan el filtro "Solo mi transporte".
- `useLogistics.js` (`calculateLogisticsSummary`): transportes con `categoria_logistica === 'INTERNO'` se añaden al resumen de transporte de cada integrante no ausente, para que la agenda pueda resolver `myTransportLogistics` de forma coherente.
- `giraService.js`: `getTransportesByGira` incluye `categoria_logistica` en el select.
- `useAgendaData.js`: la query de `giras_transportes` incluye `categoria_logistica` para que el cálculo de logística en agenda tenga el dato.

## Migración SQL

Ver `supabase/migrations/20260329120000_transporte_categoria_logistica.sql`. La columna `es_tipo_alternativo` puede eliminarse después de validar (paso opcional comentado en el archivo).
