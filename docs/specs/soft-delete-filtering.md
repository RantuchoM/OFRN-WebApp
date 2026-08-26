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
  - La lista `items` llega **ya filtrada** desde `UnifiedAgenda` (`buildAgendaPdfExportItems` sobre `filteredItems`).
  - El exportador solo omite marcadores de programa (`isProgramMarker`) como defensa; **no** reaplica filtros de negocio (soft-delete, ausentes, categorías, fechas, etc.).
  - `UnifiedAgenda` respeta `hideDeletedEvents`: si el admin oculta eliminados en la vista, tampoco van al PDF; si los muestra, el PDF los incluye.
- Resultado esperado: el PDF coincide con la vista filtrada actual (incl. rango de fechas, categorías, transporte/comidas, técnica y colapsado de “eventos anteriores de hoy”).

#### 3. Unified Agenda (Persistencia Visual)
- **NO** filtrar `is_deleted` en el fetch de la agenda dentro de `UnifiedAgenda`:
  - La lógica de carga de datos se delega al hook `useAgendaData`, que:
    - Incluye `is_deleted` y `deleted_at` en el `SELECT`.
    - Aplica una ventana de gracia de 24 horas donde los eventos eliminados siguen visibles.
  - `UnifiedAgenda` debe seguir mostrando esos eventos (por ejemplo, tachados o en gris) según la lógica de UI existente.

### Verificación Manual

- **PDF**:
  - Generar un PDF con filtros activos (fechas, categorías, solo mi transporte, etc.) y confirmar que solo aparecen los mismos eventos que en la lista.
  - Con `hideDeletedEvents` activo: eventos en papelera no deben figurar.
  - Con `hideDeletedEvents` desactivado (admin): eventos eliminados visibles en la agenda deben figurar en el PDF.
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
  - **Modo admin** (`admin=true&type=…`): el filtro por tipo de programa usa solo la asociación directa `eventos.id_gira` → `programas`. No incluye ensayos de ensamble (`id_tipo_evento = 13`) vinculados únicamente por `eventos_programas_asociados` (programas que se ensayan, no eventos del programa).
  - **Master solo conciertos** (`admin=true&mode=conciertos`): exporta únicamente eventos tipo Concierto (`id_tipo_evento = 1`) de todos los organismos, más los marcadores de día completo (`fecha_desde`–`fecha_hasta`) de **todos** los programas sin filtrar por tipo.
  - **Cache-bust de suscripción**: el modal en `App.jsx` agrega `v=YYYYMMDDHHmmss` al enlace en cada clic de suscripción; la Edge Function lo ignora pero Google/iCal lo tratan como feed nuevo.
  - **Marcadores día completo**: no se exportan programas con `tipo = Ensamble` (ventanas amplias de coordinación); el resto de tipos sí generan evento `fecha_desde`–`fecha_hasta`.
  - **Títulos ICS**:
    - Ensayo de ensamble (`id_tipo_evento = 13`): `[ENSAYO ENSAMBLE {ensamble}]` (+ programas ensayados si aplica en modo personal).
    - Concierto (`id_tipo_evento = 1`): `[CONCIERTO {nomenclador}]`.
    - Marcadores de programa (día completo): `🏁 {nomenclador} | {nombre_gira} | {zona}`.
  - **Modo personal — ensayos de ensamble** (`id_tipo_evento = 13`): alineado con `useAgendaData` en agenda general. Solo se exportan si el integrante tiene asistencia custom en el evento o pertenece a un ensamble vinculado en `eventos_ensambles` (membresía activa en la fecha del evento). **No** se incluyen por participación en el programa asociado (`eventos_programas_asociados` / familia de instrumento) ni solo por etiquetas `convocados`. En `mode=musical` los ensayos de ensamble siempre pasan el filtro de categoría aunque su `id_categoria` no sea 1 ni 2.
- **PDF Exporter** (`src/utils/agendaPdfExporter.js`)
  - `exportAgendaToPDF` confía en la lista pre-filtrada de `UnifiedAgenda`; solo descarta `isProgramMarker` por seguridad.
- **UnifiedAgenda** (`src/components/agenda/UnifiedAgenda.jsx` + `src/utils/agendaHelpers.js`)
  - `buildAgendaPdfExportItems` arma la lista de exportación a partir de `filteredItems` (mismos filtros que la lista) y excluye marcadores de programa y eventos colapsados de “hoy”.
  - El fetch principal **no filtra** los eventos por `is_deleted` en el componente:
    - La selección y filtrado se realiza en `useAgendaData`, que:
      - Incluye `is_deleted` y `deleted_at` en `EVENT_SELECT`.
      - Permite ver eventos en papelera durante una ventana de 24 h (`visibleEvents` incluye soft-deleted recientes).
  - La UI sigue pudiendo representarlos (tachados, grises o con indicadores) según la lógica ya implementada.
  - **Actualización incremental (sin saltos de scroll)**: al crear/editar/eliminar/restaurar un evento desde la agenda, no se llama a `fetchAgenda()` completo; se usa `refreshEventById` (merge de un solo evento). El listener realtime sigue activo para cambios de otros usuarios. El auto-scroll al evento «ahora» corre solo en la carga inicial de cada vista de agenda (`giraId`), no tras cada refresco.
  - **Creación optimista**: al guardar un evento nuevo, se inserta de inmediato en `items` con metadatos locales (tipo, locación, grupos, `programas` de la gira ya cargada), se cierra el modal y el `refreshEventById` hidrata en segundo plano. El guardado del form usa `formSaving` (no el `loading` global de la agenda) para no “congelar” la lista.

**Conclusión**:  
El filtrado de soft-delete en exportaciones (PDF e ICS) está **implementado y operativo**, manteniendo la visibilidad controlada de eventos eliminados dentro de `UnifiedAgenda` para fines de gestión y auditoría.

### Observaciones internas (staff)
- Columna `eventos.observaciones_internas` (HTML). UI solo en `EventForm` / FIMBA modal para editores+técnicos (`canEditEventObservacionesInternas`) / FIMBA `canEditPropuestaMeta`.
- **No** se renderiza en cards de agenda pública, PDF (`agendaPdfExporter` usa `descripcion`) ni vistas consulta/token. Imágenes en bucket `eventos-internas`.

