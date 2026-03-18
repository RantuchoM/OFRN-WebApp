# Especificación Técnica: Coordinador General (Rol de Gestión de Personal)

## Objetivo
Implementar el rol `coord_general` como una entidad de coordinación con alcance sobre todos los ensambles, pero restringida a las acciones propias de un coordinador (asistencia, visualización técnica, gestión de ensayos parciales).

## Lógica de Permisos
- **Identidad**: El usuario mantiene su `rol_sistema` como `coord_general`.
- **Alcance**: 
  - No hereda `isEditor`. No puede editar eventos sinfónicos o generales.
  - Hereda la lógica de coordinación de ensambles de forma global.
  - En `UnifiedAgenda.jsx`, el `Set` `coordinatedEnsembles` se puebla con todos los IDs de la tabla `ensambles` cuando el usuario tiene `coord_general`.
- **Restricciones**: 
  - No puede modificar la configuración de una Gira.
  - Solo puede editar eventos donde el tipo sea "Ensayos de Ensamble" (ID 13) o similares, gracias a la lógica de `canUserEditEvent` ya existente que valida contra el `Set` de ensambles.

