# Spec: Exportación CNRT - Inclusión Total de Pasajeros

## Objetivo
Garantizar que el archivo de exportación para la CNRT incluya a la totalidad de los integrantes asignados a un transporte, sin importar si tienen definidas paradas de subida o bajada en la tabla de rutas.

## Lógica de Cambio
1. **Origen de Datos**: La exportación CNRT se basa en `giras_transportes.pasajeros_ids` como fuente principal de integrantes del transporte.
2. **Fallback de Fuente**: Si `pasajeros_ids` no está disponible, se usa el roster enriquecido (`passengerList`) con la asignación logística al transporte seleccionado.
3. **Fallback de Paradas**: Si un pasajero no tiene una regla de parada específica para el tramo seleccionado:
   - Se usa por defecto el evento "Desde" (`startId`) como subida.
   - Se usa por defecto el evento "Hasta" (`endId`) como bajada.
4. **Filtro de Exclusión**: Se elimina la lógica que excluía pasajeros por falta de `subidaId` o `bajadaId`.

## Estado
- [x] Implementado en `src/views/Giras/GirasTransportesManager.jsx`.
- [x] Alineado también en `src/views/Giras/DataIntegrityIndicator.jsx` para mantener consistencia de exportación CNRT en ambos flujos.
