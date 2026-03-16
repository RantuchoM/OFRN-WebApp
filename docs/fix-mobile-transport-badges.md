# Fix: Visibilidad de Badges de Transporte en Móvil

## Problema
En la vista móvil del `UnifiedAgenda`, los indicadores visuales "Mi Subida" y "Mi Bajada" no se muestran si el evento de transporte carece de una `locacion` definida, debido a un anidamiento incorrecto en el JSX.

## Cambio Realizado
- Se desacopló la lógica de renderizado de `isMyUp` e `isMyDown` del condicional `locName`.
- Se asegura que el badge sea visible siempre que el integrante esté asignado al transporte, independientemente de si el evento tiene o no una locación vinculada.

## Archivos Relacionados
- `src/components/agenda/UnifiedAgenda.jsx`

