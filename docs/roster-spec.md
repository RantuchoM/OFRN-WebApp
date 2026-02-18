# Especificación Técnica: Gestión de Roster y Convocados

## 1. Propósito
Definir las reglas para determinar qué integrantes participan efectivamente en una gira y cómo se calculan sus estados.

## 2. Fuentes de Convocatoria (Tablas)
- **giras_fuentes**: Define quiénes "deberían" ir por defecto (ej: 'Todos los Violines' o 'Ensamble de Vientos').
- **giras_integrantes**: Es la tabla de verdad final. Contiene excepciones y staff.
    - Si un integrante tiene `estado: 'ausente'`, NUNCA debe figurar en listas de logística ni estadísticas.
    - Si un integrante está aquí con `estado: 'confirmado'`, debe incluirse siempre (aunque no pertenezca a la fuente original).

## 3. Resolución de Roster (Lógica de Negocio)
Para obtener la lista de personas que viajan:
1. Identificar integrantes por `ENSAMBLE` o `FAMILIA` desde `giras_fuentes`.
2. Añadir registros manuales de `giras_integrantes`.
3. **FILTRO CRÍTICO**: Eliminar a cualquier integrante que tenga un registro en `giras_integrantes` con `estado = 'ausente'`.

## 4. Consumo en Servicios
- La función `resolveGiraRosterIds` en `giraService.js` es la implementación de referencia para esta lógica.