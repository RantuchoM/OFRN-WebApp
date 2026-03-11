# Spec: Optimización Móvil RoomingManager

## Objetivo
Hacer que el RoomingManager sea 100% funcional en dispositivos móviles mediante una interfaz basada en clics/taps en lugar de arrastre.

## Cambios en UI/UX
1. **Layout Adaptativo**: Cambiar `flex-row` por `flex-col` en pantallas `< 1024px`.
2. **Listas Colapsables**: `MusicianListColumn` debe ser colapsable en móvil para no ocupar todo el scroll.
3. **Action Bar**: Mostrar un componente fijo al final de la pantalla cuando `selectedIds.size > 0`.
4. **Modales de Selección**: Reemplazar el drop por un flujo de: Seleccionar -> Botón "Asignar" -> Lista de Habitaciones.

## Reglas de Negocio
- Mantener la lógica de `selectedIds` (Set de Integers).
- Respetar el filtro de `estado_gira === 'confirmado'`.
- Validar géneros al asignar (alerta de habitación mixta).

## Tareas de Implementación

- [x] **MusicianListColumn**: Colapsable en móvil (acordeón con contador y título).
- [x] **Barra de Acción Móvil**: Fixed bottom cuando `selectedIds.size > 0` en móvil; texto "{n} seleccionados" y botón "Asignar".
- [x] **Modal Asignar**: Portal con lista de hoteles/habitaciones y opción "Nueva Habitación en [Hotel X]".
- [x] **RoomCard móvil**: grid-cols-1, botón "+" visible solo en móvil para asignar selectedIds a esa habitación.
- [x] **handleMoveToRoom**: Refactorizar processDrop para uso desde modal y DnD (handleMoveToRoom + handleMoveToNewRoom).
- [x] **Documentación**: Marcar tareas completadas en este archivo.
