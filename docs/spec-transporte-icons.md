# Spec: Iconografía Dinámica de Transportes (OFRN)

## Objetivo
Permitir que cada tipo de transporte tenga un icono visual distintivo en la base de datos que se refleje en toda la aplicación (Tablas Maestras, Gestión de Giras y Agenda).

## Cambios en Componentes
1. **Icons.jsx**:
   - Exportados y disponibles: `IconBus`, `IconTruck`, `IconVan`, `IconPlane`, `IconCar`.
   - Todos aceptan `size` y `className`.

2. **DataView.jsx**:
   - En `tableConfigs.transportes` se agregó la columna `icon`.
   - Tipo: `select`.
   - Opciones: `IconBus`, `IconTruck`, `IconVan`, `IconPlane`, `IconCar`.

3. **GirasTransportesManager.jsx**:
   - Se reemplazó el icono estático de tarjeta por render dinámico basado en `t.transportes.icon`.
   - Fallback defensivo a `IconBus`.

4. **UnifiedAgenda.jsx**:
   - Se reemplazó el icono estático del chip de transporte por render dinámico usando `evt.giras_transportes.transportes.icon`.
   - Aplicado en ambas variantes de render del chip (desktop y mobile).

## Consideraciones Técnicas
- Se utiliza un objeto de mapeo para transformar el string de DB en componente React:
  `const IconComp = TRANSPORT_ICON_MAP[iconName] || IconBus;`
- Si el valor `icon` no existe o no es reconocido, el sistema usa `IconBus` como fallback.

## Estado
- [x] Integración completa en UI de datos maestros, gestión de transportes y agenda unificada.
- [x] Compatibilidad hacia atrás preservada con fallback visual.
