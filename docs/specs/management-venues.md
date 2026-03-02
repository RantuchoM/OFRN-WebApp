## Especificación: Módulo de Gestión de Venues

### Objetivo
Proporcionar una interfaz administrativa centralizada para gestionar el estado de los venues de todos los conciertos (Event Type 1) del sistema.

### Requisitos Funcionales
- **Acceso Restringido:** Solo visible para usuarios con `rol_sistema` 'admin' o 'editor'.
- **Filtros Múltiples:**
  - Por Programa (basado en la tabla `programas`).
  - Por Estado de Venue (Confirmado, Solicitado, En proceso, Autogestionado, Cancelado).
- **Listado:** Tabla interactiva que muestre conciertos, su programa asociado y el estado actual del venue.

### Estructura de Datos (SQL Requerido)
Se asume la existencia de la tabla `venue_status_types` y la columna `id_estado_venue` en la tabla `eventos`.

### Interfaz (UI)
- Integración en el header de `GirasView` bajo la sección "Administración", mediante el botón "Gestión General" (icono `IconSettings`), visible solo para usuarios admin/editor.
- Uso de `MultiSelect.jsx` para los filtros de programas y estados dentro de `VenuesManager`.

### Implementación Actual
- **Archivos creados:**
  - `src/components/management/VenuesManager.jsx`: Contiene `ManagementPanel` (contenedor con pestañas, actualmente sólo "Venues") y `VenuesManager` (listado y filtros).
  - `docs/specs/management-venues.md`: Este documento.
- **Modificaciones:**
  - `src/views/Giras/GirasView.jsx`:
    - Nuevo modo de vista `MANAGEMENT` manejado por `updateView`.
    - Botón "Gestión General" en el header, bajo etiqueta "Administración", que abre el `ManagementPanel`.
    - Render del componente `VenuesManagementPanel` cuando `mode === "MANAGEMENT"` y el usuario es admin/editor.
  - `src/services/giraService.js`:
    - Nueva función `getAllConcertVenues(supabase)` que trae todos los eventos con `id_tipo_evento = 1` e incluye joins a `programas` y `venue_status_types`.
- **Comportamiento de Filtros:**
  - Filtro por Programa usa la lista única de programas presentes en los resultados de `getAllConcertVenues`.
  - Filtro por Estado usa `VENUE_STATUS_OPTIONS` definido en `src/utils/venueUtils.js`.
  - El filtrado es enteramente en cliente usando `useMemo` sobre el set de datos cargado.
- **Tabla de Resultados:**
  - Columnas: Fecha (y hora), Concierto (descripción), Programa (nombre y nomenclador) y un badge con el color del estado de venue (o "Sin estado" en gris).


