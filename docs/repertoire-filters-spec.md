# Especificación Técnica: Filtros de Orgánico en RepertoireManager

## 1. Propósito
Sincronizar la experiencia de búsqueda de obras entre la vista de consulta (`RepertoireView`) y la vista de edición (`RepertoireManager`), permitiendo filtrar por instrumentación/orgánico.

## 2. Lógica de Filtrado
- **Origen de datos**: La lista de obras cargada en el modal (`obras`).
- **Campo de filtro**: `organico` (string).
- **Categorías estándar**: 'Sinfónica', 'Cuerdas', 'Vientos', 'Cámara', 'Otros'.
- **Comportamiento**: Al seleccionar una categoría, la lista de obras disponibles para agregar debe reducirse solo a aquellas que coincidan con el orgánico seleccionado.

## 3. UI/UX
- El selector de filtros debe ubicarse justo arriba del buscador de texto o al lado, de forma compacta.
- Debe incluir una opción 'Todos' para resetear el filtro.