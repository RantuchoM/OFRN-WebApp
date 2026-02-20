# Spec: Descarte de Notificación Inicial y Modo Silencio Automático

## Objetivo
Permitir que el coordinador defina que una gira no requiere notificaciones oficiales, eliminando el banner de advertencia y configurando el programa en "Modo Silencio" de forma permanente.

## 1. Interfaz en GiraRoster
- **Banner de Advertencia**: Se añade una segunda acción junto a "Notificar a todos ahora".
- **Nueva Acción**: "No requiere notificaciones".
- **Comportamiento**:
  1. Solicita confirmación al usuario mediante `confirm()`.
  2. Actualiza `notificacion_inicial_enviada = true` (para ocultar el banner).
  3. Actualiza `notificaciones_habilitadas = false` (para desactivar el toggle de mails individuales).

## 2. Lógica de Persistencia
- Se ejecutan ambos cambios en la tabla `programas` mediante una única llamada a Supabase para asegurar la consistencia del estado.
- El estado local se actualiza inmediatamente para reflejar los cambios en la UI.

## 3. Estilos
- El botón principal "Notificar a todos ahora" mantiene su estilo actual (bg-amber-600, acción principal).
- El botón secundario "No requiere notificaciones" usa estilo de link/texto secundario (text-amber-700 hover:text-amber-900 underline o similar).

## 4. Validaciones
- No se dispara ninguna tarea hacia `NotificationQueuePanel` al ejecutar esta acción.
- El banner desaparece inmediatamente después de la confirmación.
- Se limpia cualquier notificación pendiente en la cola al ejecutar esta acción.

---

## Estado de Implementación

| Tarea | Estado | Archivo / Notas |
|-------|--------|-----------------|
| Spec documento | ✅ Completado | `docs/spec-notifications-bypass.md` |
| Estado local para banner | ✅ Completado | `GiraRoster.jsx`: `localNotificacionInicialEnviada` para controlar visibilidad del banner |
| Función bypassNotificaciones | ✅ Completado | Actualiza ambos campos en BD, actualiza estado local, limpia cola |
| Botón secundario en banner | ✅ Completado | Estilo de link/texto secundario con IconX, underline, hover states |
| Confirmación modal | ✅ Completado | `confirm()` con mensaje claro sobre las consecuencias |
| Actualización en BD | ✅ Completado | Una sola llamada a Supabase con ambos campos para consistencia |
| Limpieza de cola | ✅ Completado | `setPendingNotifications([])` al ejecutar bypass |
| Estilos diferenciados | ✅ Completado | Botón principal (amber-600 sólido) vs secundario (texto con underline) |
