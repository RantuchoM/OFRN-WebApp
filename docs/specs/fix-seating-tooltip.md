# Spec: Corrección de Tooltip de Integridad en Seating

## Problema
En la vista de Seating, el icono de advertencia (IconAlertTriangle) aparece cuando hay inconsistencias (particellas sin músico asignado), pero no muestra el detalle al hacer hover o clic.

## Diagnóstico Técnico
1. **Z-Index**: El modal de Seating o los contenedores superiores pueden tener un z-index que tape el portal del tooltip.
2. **Missing State**: El componente `DataIntegrityIndicator` puede estar recibiendo los datos pero no manejando el estado de visibilidad del cartel flotante.
3. **Tailwind Peer**: Falta la clase `group` o `peer` para activar el tooltip por CSS, o bien el componente de UI `Tooltip` no está envolviendo al icono.

## Solución
- Envolver el `IconAlertTriangle` en un componente de Tooltip dedicado.
- Asegurar que la lógica de `checkIntegrity` en Seating pase los datos correctos al indicador.