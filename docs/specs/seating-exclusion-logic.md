# Spec: Filtrado Estricto de Exclusiones en Seating

## Objetivo
Garantizar que los miembros de ensambles excluidos no aparezcan en ninguna instancia del Seating, independientemente de si su familia de instrumento está convocada.

## Reglas de Filtrado
1. **Prioridad de Fuente**: Si una gira tiene una fuente de tipo `ENSAMBLE` con un `valor_id` específico y esta se marca como excluida (o simplemente no se incluye en la resolución activa), sus miembros deben ser omitidos.
2. **Jerarquía de Resolución**: 
   - El Roster debe calcularse primero.
   - El Seating debe consumir el `enrichedRoster` que ya viene filtrado por `giraService`.
   - Si un músico aparece en el Seating pero su ensamble está excluido, significa que el componente de Seating está usando una lista de integrantes "maestra" en lugar de la lista "filtrada por gira".

## Acción Correctiva
Refactorizar el selector de músicos en la vista de Seating para validar contra el estado de resolución de `giraService`.

## Deduplicación de Cuerdas en Contenedores
- **Regla:** dentro de la configuración de cuerdas de una gira, cada `id_musico` debe aparecer como máximo una vez en `seating_contenedores_items` para los contenedores del programa.
- **Lectura:** si existen filas duplicadas persistidas, las vistas de Seating, reportes, listados y composición `Str` deben mostrar solo la posición visual más alta. La prioridad visual se resuelve por `seating_contenedores.orden`, luego `atril_num`, `lado`, `orden` e `id` de la fila.
- **Escritura:** cualquier cambio realizado desde el manager de cuerdas (crear/editar/eliminar contenedor, agregar/mover/quitar músicos, importar o reordenar) dispara una limpieza persistente que borra las filas duplicadas y conserva la misma fila ganadora que se muestra en lectura.
- **Estado:** implementado en `src/utils/seatingStringItemsDedupe.js`, `ProgramSeating.jsx`, `GlobalStringsManager.jsx` y consumidores directos de seating.