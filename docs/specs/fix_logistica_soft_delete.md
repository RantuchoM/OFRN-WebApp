## Spec: Filtrado de Eventos Eliminados en Módulos de Comidas

### Problema
Los eventos marcados con `is_deleted: true` siguen apareciendo en la Matriz de Comidas, Reportes de Asistencia y la sección "Mis Comidas" del músico, generando confusión y datos erróneos.

### Alcance de la Corrección
Se deben filtrar los eventos de la tabla `eventos` (eventos de gira) para excluir aquellos donde `is_deleted` sea `true`.

### Archivos y Funciones a Modificar
1. **Matriz de Comidas y Reportes:**
   - `src/hooks/useLogistics.js`: filtrar la carga de eventos en la función que alimenta la matriz.
   - `src/views/Giras/MealsManager.jsx`: asegurar que el estado local de eventos no incluya eliminados.
2. **Asistencia y Reportes de Comidas:**
   - `src/views/Giras/MealsAttendance.jsx` y `src/views/Giras/MealsReport.jsx`.
3. **Sección "Mis Comidas" (Vista del Músico):**
   - `src/views/Giras/MealsAttendancePersonal.jsx`: filtrar para que el músico no vea eventos borrados.
4. **Servicios relacionados:**
   - `src/services/giraService.js`: cualquier helper que obtenga eventos de gira (p.ej. `getEventsByGira`).

### Criterio de Aceptación
- Ningún evento con `is_deleted: true` debe ser visible en:
  - La Matriz de Comidas (`MealsManager`).
  - El control de asistencia de comidas (`MealsAttendance`).
  - El reporte de comidas (`MealsReport`).
  - La vista "Mis Comidas" del músico (`MealsAttendancePersonal`).
  - Los listados de eventos de gira usados por logística cuando se trate de eventos de comida.

### Estilos de servicio de comida (completado)
- [x] Fuente única `MEAL_SERVICE_STYLES` / `getMealServiceStyle` / `buildMealServicePrintBadgeCss` en `mealLogistics.js`.
- [x] Consumidores: `MealsReport` (`reportTag`), `MealsManager` (`tag`/`card`), `LogisticsManager` (`tag`/`rowHover`/`date`/`icon`), `PrintWrapper` (CSS de impresión generado).
- [x] Variante reporte: texto negro sobre fondo saturado; variante UI: texto coloreado sobre fondo suave.

### Filtros de exportación en Reporte de Comidas (completado)
- [x] `MealsReport`: multi-select de **localidad** (ciudad de la locación), **locación** (venue) y de **tags de convocados** del evento (Tutti, Solo alojados, Locales, Prod., etc. y tags LOC:/ENS: presentes).
- [x] Vacío en cada selector = sin filtro en ese eje; se combinan con el toggle de tipo de servicio (D/A/M/C). Default: A/M/C activos (Desayuno destildado); «Incluir Pendientes» activo.
- [x] La tabla, totales, «Texto pedido» y PDF (`handlePrintExport`) respetan la vista filtrada; el PDF imprime el resumen de filtros activos.
- [x] Etiquetas `LOC:` / `ENS:` resueltas a nombre (roster + `localidades` / `ensambles` en BD); no más `Ens. 12` / `Loc. 3`.
- [x] `MealsManager`: comensales abre modal (click) con cantidades por dieta y listado agrupado por localidad de residencia; reemplaza el tooltip hover.

