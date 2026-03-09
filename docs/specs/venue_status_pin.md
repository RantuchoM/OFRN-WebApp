# Spec: Reutilización de VenueStatusPin (Monitoreo de Salas)

## Objetivo
Unificar la lógica visual y operativa del estado de las salas de conciertos en toda la aplicación, permitiendo que tanto en la Agenda como en las GiraCards se pueda visualizar el "semáforo" de estado y acceder al historial de cambios.

## Funcionalidad Extraída
1. **Lógica de Colores**:
   - `Verde`: Confirmado/Disponible.
   - `Amber`: Pendiente/En gestión.
   - `Rojo`: Problemas técnicos/Cancelado.
   - `Gris`: Sin datos.
2. **Modal de Historial**: Al hacer clic, abre un React Portal que muestra quién, cuándo y qué cambió en el estado de esa locación específica.

## Integración en GiraCard
- Se añade el pin a la izquierda de cada concierto en `renderConcertsCompact` (móvil) y `getConcertListDesktop` (escritorio).
- El pin debe reaccionar al estado actual de la locación vinculada al evento.

## SQL (Verificación)
Estructura de referencia basada en schema.sql:

- **eventos**: `id_estado_venue` (FK a `venue_status_types`)
- **venue_status_types**: `id`, `nombre`, `color`, `slug`
- **eventos_venue_log**: `id`, `id_evento`, `id_estado_venue`, `nota`, `id_integrante`, `created_at`

*Nota: El historial de estado se registra por evento en `eventos_venue_log`, no por locación. El componente recibe `eventId` e `idEstadoVenue` para mostrar el pin y cargar el historial.*

---

## Estado de implementación

| Hito | Estado |
|------|--------|
| 1. Crear `src/components/ui/VenueStatusPin.jsx` (pin + modal Portal, colores, consulta `eventos_venue_log`) | ✅ Completado |
| 2. Refactorizar `UnifiedAgenda.jsx`: usar `<VenueStatusPin />`, eliminar modal local | ✅ Completado |
| 3. Integrar en `GiraCard.jsx`: pin en `renderConcertsCompact` y `getConcertListDesktop` | ✅ Completado |
| 4. Documentación actualizada | ✅ Completado |
