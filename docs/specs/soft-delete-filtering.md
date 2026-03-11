## Spec: Filtrado de Soft-Delete en Exportaciones

### Objetivo
Garantizar que los eventos marcados con `is_deleted: true` no aparezcan en:
- **PDFs de agenda generados** (`agendaPdfExporter`)
- **Suscripción de calendario ICS** (Edge Function `calendar-export`)

…manteniendo su visibilidad en la vista de gestión `UnifiedAgenda` para auditoría, recuperación en las primeras 24 horas y contexto histórico.

### Cambios Requeridos

#### 1. Edge Function `calendar-export`
- **Consulta a `public.eventos`**:
  - Incluir filtro que excluya eventos soft-deleted fuera de la ventana de gracia:
    - `or("is_deleted.eq.false,is_deleted.is.null")` si no se requiere ventana de gracia.
  - En esta implementación se prioriza que **ningún evento con `is_deleted = true`** sea exportado al calendario ICS.
- **Razón**: Los calendarios externos (Google Calendar, iCal, etc.) no deben mostrar eventos eliminados para evitar confusión en los músicos y usuarios finales.

#### 2. PDF Exporter `agendaPdfExporter.js`
- En la función `exportAgendaToPDF`:
  - Añadir un filtro previo al procesamiento de `items`.
  - Filtrar la lista `items` para omitir:
    - Marcadores de programa (`isProgramMarker`)
    - Eventos donde `evt.is_deleted === true`
- Resultado esperado: Los eventos eliminados no aparecen en el PDF, aunque sigan visibles en la UI de administración.

#### 3. Unified Agenda (Persistencia Visual)
- **NO** filtrar `is_deleted` en el fetch de la agenda dentro de `UnifiedAgenda`:
  - La lógica de carga de datos se delega al hook `useAgendaData`, que:
    - Incluye `is_deleted` y `deleted_at` en el `SELECT`.
    - Aplica una ventana de gracia de 24 horas donde los eventos eliminados siguen visibles.
  - `UnifiedAgenda` debe seguir mostrando esos eventos (por ejemplo, tachados o en gris) según la lógica de UI existente.

### Verificación Manual

- **PDF**:
  - Generar un PDF desde una gira que tenga eventos marcados como `is_deleted = true`.
  - Confirmar que esos eventos **no aparezcan** en el documento.
- **ICS**:
  - Abrir el enlace de calendario ICS para un usuario que tenga eventos soft-deleted.
  - Verificar que dichos eventos **no aparezcan** (o desaparezcan en la siguiente actualización del calendario).
- **UnifiedAgenda**:
  - Verificar que:
    - Los eventos con `is_deleted = true` sigan visibles en la UI.
    - Se apliquen estilos de "papelera"/tachado/estado visual diferenciado según la lógica ya existente.

### Estado de Implementación

- **calendar-export** (`supabase/functions/calendar-export/index.ts`)
  - Implementado filtro para excluir eventos con `is_deleted = true`:
    - Uso de `.or("is_deleted.eq.false,is_deleted.is.null")` en la consulta a `eventos`.
- **PDF Exporter** (`src/utils/agendaPdfExporter.js`)
  - Implementado filtro de soft-delete en `exportAgendaToPDF`:
    - `const events = items.filter(i => !i.isProgramMarker && !i.is_deleted);`
- **UnifiedAgenda** (`src/components/agenda/UnifiedAgenda.jsx` + `src/hooks/useAgendaData.js`)
  - El fetch principal **no filtra** los eventos por `is_deleted` en el componente:
    - La selección y filtrado se realiza en `useAgendaData`, que:
      - Incluye `is_deleted` y `deleted_at` en `EVENT_SELECT`.
      - Permite ver eventos en papelera durante una ventana de 24 h (`visibleEvents` incluye soft-deleted recientes).
  - La UI sigue pudiendo representarlos (tachados, grises o con indicadores) según la lógica ya implementada.

**Conclusión**:  
El filtrado de soft-delete en exportaciones (PDF e ICS) está **implementado y operativo**, manteniendo la visibilidad controlada de eventos eliminados dentro de `UnifiedAgenda` para fines de gestión y auditoría.

