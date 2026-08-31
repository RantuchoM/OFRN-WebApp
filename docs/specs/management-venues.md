## Especificación: Módulo de Gestión de Venues

### Objetivo
Proporcionar una interfaz administrativa centralizada para gestionar el estado de los venues de todos los conciertos (Event Type 1) del sistema.

> **Nota (2026-08):** La vista operativa principal para el festival FIMBA vive en **`/fimba/edicion/:id/venues`** (`FimbaVenuesPage`, scope = gira de la edición; metadata en `fimba_venue_info`, sin estado de venue). Este módulo en **Gestión → Espacios** sigue siendo el listado **global** OFRN (todas las giras/programas) con **estado de venue**. **Observaciones aforo** del espectáculo viven en `eventos.observaciones_aforo` (editables en `EventForm` al abrir el concierto desde aquí).

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

### Actualización UX (Menú principal de Gestión)
- **Objetivo UX:** Evitar que la vista de Venues se monte por defecto al entrar a Gestión para reducir consultas innecesarias y permitir escalar a múltiples informes.
- **Comportamiento nuevo en `ManagementView`:**
  - La pantalla inicial ahora es un **menú visual** con tarjetas grandes (estilo panel lateral de viáticos).
  - Cada tarjeta representa un informe/sección habilitada por `managementSections`.
  - Los módulos (Venues, Seating, Instrumentación, Convocatorias, Conciertos) se renderizan **bajo demanda** al seleccionar una tarjeta.
  - Al abrir un informe, se muestra botón **"Menú de informes"** para volver a la portada principal.
  - **Selector de informe** (desktop y móvil): desplegable compacto (`ManagementReportPicker`) con icono + título + subtítulo de cada informe, en lugar de la fila horizontal de pestañas (que se estiraba al sumar secciones). Cierre con click afuera o Escape.
- **Checklist de implementación:**
  - [x] Definir estado inicial en portada (`home`) en lugar de `venues`.
  - [x] Incorporar cards visuales para selección de informe.
  - [x] Mantener navegación rápida entre informes y retorno al menú.
  - [x] Evitar carga automática del módulo de Venues al ingresar a Gestión.
  - [x] Reemplazar pestañas horizontales del header por desplegable de informes.

### Refactor de mantenibilidad (deuda técnica)
- Se extrajo el bloque visual de tarjetas a un componente reutilizable:
  - `src/views/Management/ManagementSectionCard.jsx`
- `ManagementView` ahora delega el render de cada opción al componente anterior, evitando duplicación de JSX y facilitando:
  - incorporación de nuevas secciones,
  - ajustes de estilo centralizados,
  - testeo/iteración aislada del patrón de tarjeta.
- Checklist:
  - [x] Extraer tarjeta a componente dedicado.
  - [x] Integrar componente en el map de secciones habilitadas.
  - [x] Mantener comportamiento visual y navegación sin cambios funcionales.


