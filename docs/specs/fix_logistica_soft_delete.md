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

