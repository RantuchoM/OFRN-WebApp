# Única Fuente de Verdad: Categorías y Roles (GRP)

## Objetivo
Eliminar la dispersión de strings manuales para categorías (GRP) y roles en giras, centralizando la lógica en un objeto inmutable y funciones de utilidad.

## Ubicación
`src/utils/giraUtils.js`

## Constantes Exportadas

### ROSTER_CATEGORIES
Identificadores de categoría (tags de convocatoria). No inventar nuevos.

| Clave     | Valor       |
|-----------|-------------|
| TUTTI     | GRP:TUTTI   |
| SOLISTAS  | GRP:SOLISTAS|
| DIRECTORES| GRP:DIRECTORES|
| PRODUCCION| GRP:PRODUCCION|
| STAFF     | GRP:STAFF   |
| LOCALES   | GRP:LOCALES |
| NO_LOCALES| GRP:NO_LOCALES|

### ROLES_PRODUCCION
Lista de IDs de rol (tabla `roles`) que pertenecen al grupo Producción: produccion, chofer, acompañante, staff, mus_prod, técnico.

### DEFAULT_ROL_ID, DEFAULT_CARGO
Valores por defecto para rol no asignado y cargo en exportaciones.

## Reglas de Implementación
1. Prohibido usar strings literales como `'solista'` o `'GRP:TUTTI'` fuera de `giraUtils.js`.
2. Las comparaciones deben realizarse contra `ROSTER_CATEGORIES` o constantes exportadas.
3. Los IDs de rol en edición provienen de la tabla `roles`; los labels de visualización siguen el estándar unificado.