# Única Fuente de Verdad: Categorías y Roles (GRP)

## Objetivo
Eliminar la dispersión de strings manuales para categorías (GRP) y roles en giras, centralizando la lógica en un objeto inmutable y funciones de utilidad.

## Categorías Estándar (Basadas en Código Actual)
- **TUTTI**: Grupo general de la orquesta.
- **SOLISTA**: Integrantes con rol de solista.
- **DIRECTOR**: Directores de orquesta.
- **PRODUCCION**: Incluye roles operativos (produccion, chofer, técnico, staff, etc).
- **VACANTE**: Representa plazas no cubiertas (es_simulacion).

## Reglas de Implementación
1. Se prohíbe el uso de strings literales como `'solista'` o `'GRP:TUTTI'` fuera de `giraUtils.js`.
2. Las comparaciones en componentes de UI deben realizarse contra el objeto `ROSTER_CATEGORIES`.