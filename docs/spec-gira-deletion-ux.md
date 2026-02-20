# Spec: Refinamiento de UX en Eliminación de Giras

## Objetivo
Sustituir las alertas nativas por un flujo de confirmación moderno mediante 'sonner' (toast) que permita gestionar notificaciones y proporcione feedback visual durante el borrado.

## 1. Flujo de Confirmación (Toast Interactivo)
- **Activador**: Botón de eliminar en `GirasView` o `GiraActionMenu`.
- **Interfaz**: Toast persistente con:
  - Mensaje: "¿Confirmas la eliminación de [Nombre de Gira]?"
  - Toggle/Checkbox: "Notificar a los músicos confirmados" (Habilitado por defecto si la gira fue publicada).
  - Botones: [Eliminar] (Rojo) y [Cancelar].

## 2. Estado de Procesamiento
- **Feedback**: Al confirmar, el toast cambia a estado de "Cargando" (Loading).
- **Acción**: Se dispara la lógica de envío de mails (si se marcó) y posteriormente el borrado en Supabase.
- **Finalización**: El toast muestra éxito o error, y se refresca la lista de giras.

## 3. Lógica de Negocio
- **Condición de Mail**: La opción de notificar solo se ofrece si `notificacion_inicial_enviada` es `true`.
- **Persistencia**: La gira solo se borra de la DB tras procesar exitosamente la cola de correos (si aplica).
- **Respeto a Modo Silencio**: Si `notificaciones_habilitadas` es `false`, no se debe ofrecer la opción de notificar.

## 4. Componentes Afectados
- `GirasView.jsx`: Función `handleDeleteGira` con toast interactivo.
- `GiraRoster.jsx`: Función `bypassNotificaciones` también usa toast interactivo en lugar de `confirm()` nativo.

---

## Estado de Implementación

| Tarea | Estado | Archivo / Notas |
|-------|--------|-----------------|
| Spec documento | ✅ Completado | `docs/spec-gira-deletion-ux.md` |
| Toast interactivo en handleDeleteGira | ✅ Completado | `GirasView.jsx`: Toast con checkbox y botones Eliminar/Cancelar |
| Checkbox "Notificar músicos" | ✅ Completado | Solo visible si `notificacion_inicial_enviada === true` y `notificaciones_habilitadas !== false` |
| Estado de carga durante eliminación | ✅ Completado | Toast loading "Procesando eliminación y notificaciones..." |
| Envío de mails antes de eliminar | ✅ Completado | Si checkbox marcado, envía GIRA_ELIMINADA antes de eliminar |
| Manejo de errores con toasts | ✅ Completado | toast.error en lugar de alert() nativo |
| Toast de éxito | ✅ Completado | Muestra cantidad de músicos notificados si aplica |
| Toast interactivo en bypassNotificaciones | ✅ Completado | `GiraRoster.jsx`: Reemplazado confirm() por toast.custom() |
| Respeto a modo silencio | ✅ Completado | No ofrece checkbox si `notificaciones_habilitadas === false` |
