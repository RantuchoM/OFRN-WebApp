# Spec: Soporte Multi-Bloque en Seating y Mis Partes

## Problema
El sistema actualmente solo visualiza o procesa correctamente el primer bloque de repertorio en la vista de Seating, ignorando bloques subsiguientes (ej. "Primera Parte" vs "Segunda Parte").

## Objetivos
1. **ProgramSeating.jsx**: 
   - Modificar el `useEffect` de carga para que no se detenga si ya hay datos parciales, sino que garantice la carga de todos los bloques asociados al `id_programa`.
   - Asegurar que el `useMemo` de `obras` procese el `effectiveBlocks` sin duplicados accidentales pero manteniendo el orden de los bloques.
2. **MyPartsViewer.jsx**:
   - Refactorizar el procesamiento de `progRepData` para asegurar que el `.forEach((cat) => ...)` procese todos los bloques de la consulta de Supabase.
   - Validar que la asignación de particellas (triangulación) funcione correctamente para cada instancia de obra en el repertorio.

## Reglas de Negocio
- Los bloques de repertorio se ordenan por la columna `orden`.
- Una obra puede pertenecer a un bloque y debe mostrar su particella asignada (sea individual o por contenedor/atril).

