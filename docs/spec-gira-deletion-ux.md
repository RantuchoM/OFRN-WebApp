# Spec: Cancelación soft de giras (estado Cancelada)

## Objetivo
Reemplazar el hard delete de programas por un estado **Cancelada**: la gira permanece en DB, deja de aparecer en agenda/calendarios, y solo se lista en GirasView (staff) con filtro propio.

## 1. Confirmación (ConfirmDialog)
- **Activador**: «Cancelar programa» en `GiraActionMenu` (reemplaza «Eliminar Programa»).
- **UI**: `useConfirmDialog` + checkbox opcional de notificación.
- **Mensaje**: la gira pasa a Cancelada; eventos dejan de aparecer; la gira sigue en el listado.

## 2. Notificación
- Checkbox «Notificar esta cancelación a los músicos confirmados» solo si `notificacion_inicial_enviada === true`.
- Default tildado solo si además `notificaciones_habilitadas !== false`.
- Sin convocatoria inicial: **sin** opción de notificar (misma regla que traslado de fechas).
- Mail: variante `GIRA_CANCELADA` (`convocatoria_gira`), asunto «Gira cancelada | …».
- Si el mail falla, **no** se cambia el estado.

## 3. Persistencia
- `programas.update({ estado: 'Cancelada' })`. No se borran eventos, roster ni logística.
- Enum DB: `estado_gira` incluye `Cancelada` (migración `20261126140000`).

## 4. Visibilidad
- **GirasView**: chip «Can» solo editor/admin/management; **destildado por defecto**. Coordinadores/músicos no ven canceladas.
- **Agenda / ICS / calendarios / recordatorios ensayo / sync sheet / reportes / constancias**: excluyen Cancelada.
- **Entradas**: no se suspenden automáticamente.
- Reactivación: cambiar estado en `GiraForm` (ConfirmDialog, sin mail en v1).

## 5. Componentes
- `GirasView.jsx` → `handleCancelGira`
- `GiraActionMenu.jsx` → «Cancelar programa»
- `useConfirmDialog.js` → opción `checkbox`
- Helpers en `giraUtils.js` (`isGiraCancelada`, `giraPuedeNotificarMasivo`, …)

## Estado de implementación

| Tarea | Estado |
|-------|--------|
| Enum Cancelada + plantilla mail | ✅ |
| ConfirmDialog + checkbox notify | ✅ |
| handleCancelGira / menú sin Eliminar | ✅ |
| Gate notify sin convocatoria inicial (cancel + traslado) | ✅ |
| Ocultar eventos (Agenda, ICS, etc.) | ✅ |
| Chip/filtro GirasView | ✅ |
| Specs move + listado | ✅ |
