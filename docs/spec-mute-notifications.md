# Spec: Modo Silencio de Notificaciones por Programa

## Objetivo
Permitir a los coordinadores omitir o pausar el flujo de notificaciones automáticas (cola de 15s) para una gira específica, útil en ensambles pequeños o fases de edición intensiva.

## 1. Persistencia en Base de Datos
- Se añade la columna `notificaciones_habilitadas` (boolean) a la tabla `programas`.
- Valor por defecto: `true`.
- **Estado**: ✅ Implementado en BD (SQL ejecutado por el usuario).

## 2. UI en GiraRoster
- **Control**: Un switch o toggle en la barra de herramientas (Toolbar) o junto al banner de publicación.
- **Etiqueta**: "Notificaciones automáticas: ON/OFF".
- **Comportamiento**: 
  - Si es `OFF`, las funciones `toggleStatus`, `addManualMusician` y `handleUpdateGroups` no añadirán tareas al `NotificationQueuePanel`.
  - El banner de "Notificación Inicial" debe seguir siendo visible si no se envió, pero los cambios individuales se ignoran.

## 3. Lógica de Negocio
- Al cambiar el toggle, se actualiza inmediatamente la tabla `programas` en Supabase.
- El estado local en `GiraRoster` sincroniza la visibilidad de la cola de tareas.
- Si se activa el modo silencio mientras hay tareas en cola, estas se limpian automáticamente.

## 4. Componentes Afectados
- `GiraRoster.jsx`: Toggle en toolbar, lógica de verificación en funciones de notificación.
- `NotificationQueuePanel.jsx`: Limpieza de cola cuando se desactiva notificaciones (se limpia automáticamente al cambiar el toggle).
- `GirasView.jsx`: Manejo del campo `notificaciones_habilitadas` al crear/editar giras (default true).

---

## Estado de Implementación

| Tarea | Estado | Archivo / Notas |
|-------|--------|-----------------|
| Spec documento | ✅ Completado | `docs/spec-mute-notifications.md` |
| Estado y sincronización en GiraRoster | ✅ Completado | `GiraRoster.jsx`: useState + useEffect para sincronizar con gira |
| Toggle en Toolbar | ✅ Completado | `GiraRoster.jsx`: Botón con IconBell en toolbar, estilos según estado (emerald cuando ON, slate cuando OFF) |
| Verificación en toggleStatus | ✅ Completado | Solo añade notificación si `notificacionesHabilitadas === true` |
| Verificación en handleUpdateGroups | ✅ Completado | Solo añade notificaciones si `notificacionesHabilitadas === true` |
| Verificación en addManualMusician | ✅ Completado | Solo añade notificación si `notificacionesHabilitadas === true` |
| Verificación en removeMemberManual | ✅ Completado | Solo añade notificación si `notificacionesHabilitadas === true` |
| Limpieza de cola al desactivar | ✅ Completado | `setPendingNotifications([])` cuando se desactiva el toggle |
| Actualización en BD al cambiar toggle | ✅ Completado | Update inmediato en tabla `programas` |
| Manejo en GirasView (crear/editar) | ✅ Completado | `formData.notificaciones_habilitadas` con default `true`, incluido en payload |
