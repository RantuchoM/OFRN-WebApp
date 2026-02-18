# Especificación Técnica: Paginación en Vista de Músicos

## Objetivo
Implementar una paginación basada en servidor para la tabla de integrantes para mejorar el tiempo de respuesta (TTI) y reducir el consumo de memoria en el navegador.

## Requisitos
1. **Tamaño de página:** 100 registros.
2. **Interfaz:** - Selector de página en la parte inferior de la tabla.
   - Indicador de "Total de registros encontrados".
3. **Sincronización:** La paginación debe resetearse a la página 1 cuando se apliquen filtros (ensamble, instrumento, condición, búsqueda).
4. **Supabase:** Uso de `count: 'exact'` para obtener el total de registros sin traer toda la data.

## Implementación
- Añadir estado `currentPage` (inicio en 1).
- Añadir estado `totalCount` para calcular el número de páginas.
- Modificar `fetchEnsemblesAndData` para incluir `.range(from, to)`.