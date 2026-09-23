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
Lista de IDs de rol (tabla `roles`) que pertenecen al grupo Producción (convocatoria `GRP:PRODUCCION`): produccion, chofer, acompañante, staff, mus_prod, técnico, iluminacion.

### ROLES_CATEGORIA_LOGISTICA_PRODUCCION
Subconjunto que mapea a la categoría logística `PRODUCCION` en reglas de hotelería, comidas y transporte: produccion, chofer, mus_prod. Fuente: `getCategoriaLogistica` en `giraUtils.js`. **No** incluye staff ni otros roles de `ROLES_PRODUCCION` que tienen categoría propia (`STAFF`) o geográfica (`LOCALES` / `NO_LOCALES`).

### DEFAULT_ROL_ID, ROLE_MUS_PROD, DEFAULT_CARGO
Valores por defecto para rol no asignado (`musico`), músico-producción (`mus_prod`) y cargo en exportaciones.

### instrumentos.rol_gira_default
FK a `roles.id`. Se edita en Datos → Instrumentos. En `inferDefaultTourRole` **no** gana si la persona está en Prod. **y** en un ensamble músico.

### Rol por defecto al convocar (`inferDefaultTourRole`)
Prioridad (2026-09-23):

1. **Ensamble Prod.** (`Prod.`, `Prod`, `Producción` — misma heurística que `isProduccionParticipanteLabel`) **y** al menos un ensamble músico (p. ej. VS) → `mus_prod`. Gana sobre el default del instrumento. Quien solo es músico (sin Prod.) sigue en `musico` / default de instrumento.
2. `instrumentos.rol_gira_default` (chofer, producción, etc.).
3. Solo ensamble Prod. (sin ensamble músico) → `produccion`.
4. Sino `musico`.

`resolveTourRoleOverride`: si `giras_integrantes.rol` quedó en `musico`, se trata como default automático y se aplica la inferencia. Overrides reales (`solista`, `produccion`, `mus_prod`, …) no se reescriben.

## Reglas de Implementación
1. Prohibido usar strings literales como `'solista'` o `'GRP:TUTTI'` fuera de `giraUtils.js`.
2. Las comparaciones deben realizarse contra `ROSTER_CATEGORIES` o constantes exportadas.
3. Los IDs de rol en edición provienen de la tabla `roles`; los labels de visualización siguen el estándar unificado.