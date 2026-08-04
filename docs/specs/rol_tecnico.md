# Especificación Técnica: Rol de Sistema "Tecnico"

## Objetivo
Implementar un nuevo rol de sistema denominado `tecnico` para permitir que el personal de estenotecnia y técnica tenga acceso a la visualización de eventos marcados con `tecnica: true` en la agenda, además de poseer permisos de gestión/lectura similares al equipo de producción.

## Cambios en Lógica de Negocio
- **AuthContext**: 
    - Nuevo flag `isTechnician`: basado en que alguno de los roles de `rol_sistema` sea `tecnico`.
    - `isManagement`: **no** incluye `tecnico`; el técnico no es parte del equipo de gestión ni de edición global.
    - `isEditor`: **no** incluye `tecnico` (rol de consulta técnica, sin edición de estructura).
- **UnifiedAgenda**:
    - El filtro `techFilter` debe inicializarse en `all` si el usuario es `tecnico`, para que vea por defecto los eventos técnicos.
    - Los eventos con `tecnica: true` deben ser visibles para este rol sin restricciones, aunque estén ocultos para otros usuarios.
    - La categoría de logística debe estar activa por defecto para este rol (igual que para management), pero sin convertirlo en `isManagement`.
    - La visibilidad técnica se deriva con `canSeeTechEvents` en `deriveAgendaPermissions` (roles staff de agenda + `tecnico`). **No** incluye `consulta_general`.
- **UsersManager**:
    - Añadir `tecnico` a las opciones de `select` de roles (con el emoji 🛠️).

## Impacto en Base de Datos
- La columna `rol_sistema` de la tabla `integrantes` ahora acepta el valor `tecnico`.

## Consulta General vs. eventos Téc / ocultos
- **Estado**: Completado.
- El rol `consulta_general` sigue siendo `isManagement` (acceso a vistas de gestión), pero **no** ve en Agenda:
  - eventos con `tecnica: true`;
  - paradas de transporte con `visible_agenda === false`.
- No muestra el control "Filtro Técnica" ni puede toglear marca Téc / ocultar en agenda.
- Flags: `canSeeTechEvents` y `canSeeHiddenAgendaEvents` en `src/utils/agendaPermissions.js`; aplicados en `useAgendaFilters` y `UnifiedAgenda`.

