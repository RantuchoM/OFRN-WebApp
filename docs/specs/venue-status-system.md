## Sistema de Estado de Venues (Conciertos)

### Propósito
Permitir el seguimiento administrativo del estado de confirmación de los lugares donde se realizan conciertos, manteniendo un registro histórico de cambios.

### Especificaciones Técnicas
- **Estados:** Confirmado (Verde), Solicitado (Amarillo), En proceso (Celeste), Autogestionado (Azul), Cancelado (Rojo).
- **Persistencia:** Columna `id_estado_venue` en `eventos` para el estado actual. Tabla `eventos_venue_log` para el histórico.
- **Componentes:**
  - `EventForm`: Selector de estado solo visible para tipos de evento "Concierto" (ID: 1).
    - Usa `VENUE_STATUS_OPTIONS` y `getVenueStatusById` desde `venueUtils.js`.
    - Permite elegir `id_estado_venue` y una `nota` opcional (`venue_status_note`) cuando el tipo de evento es 1.
  - `UnifiedAgenda`:
    - Muestra un badge cuadrado con color de estado de venue detrás del `IconMapPin` (desktop y móvil).
    - Al hacer clic en el icono de locación abre un modal con el histórico de `eventos_venue_log` para ese evento.

### Reglas de Negocio
1. Cada cambio de estado en el formulario debe disparar un insert en la tabla de logs:
   - Al editar un evento, si `id_estado_venue` cambia respecto al valor original (`editingEventObj.id_estado_venue`), se inserta un registro en `eventos_venue_log` con `id_evento`, `id_estado_venue`, `nota` (desde `venue_status_note`) e `id_integrante`.
   - Al crear un evento con `id_estado_venue` no nulo, se inserta un log inicial con esos mismos campos.
2. El ID del integrante que realiza el cambio se obtiene del `AuthContext` (`user.id`), garantizando que es numérico y corresponde a `integrantes.id`.
3. El color y metadata de los estados se definen centralizadamente en `venueUtils.js` (`VENUE_STATUS_MAP`, `VENUE_STATUS_OPTIONS`, `getVenueStatusById`).
4. El modal de historial de estado de venue en `UnifiedAgenda`:
   - Consulta `eventos_venue_log` filtrando por `id_evento`, incluyendo relaciones `venue_status_types` (como `status`) e `integrantes` (como `integrante`).
   - Ordena el historial por `created_at` descendente y muestra fecha, estado, nota y nombre del integrante.

