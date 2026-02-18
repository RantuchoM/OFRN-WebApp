# Filtro de Hitos (Nodos de Control) en Logistics Manager

## Objetivo
Filtrar la Línea de Tiempo de logística basándose en los seis hitos críticos de seguimiento de integrantes.

## Definición de Nodos (Hitos)
1. **Check-in**: Registro de llegada al hotel/sede.
2. **Check-out**: Registro de salida.
3. **Subida**: Abordaje al transporte.
4. **Bajada**: Descenso del transporte.
5. **Inicio Comida**: Apertura de servicio de catering.
6. **Fin Comida**: Cierre de servicio de catering.

## Reglas de Filtrado
- **Selección Nula/Total**: Si no hay hitos marcados o están los 6, se muestra la línea de tiempo completa.
- **Selección Parcial**: Se filtran los eventos de la línea de tiempo para mostrar solo aquellos que correspondan a los tipos de hitos tildados.