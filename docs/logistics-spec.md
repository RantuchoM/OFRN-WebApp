# Especificación Técnica: Hook useLogistics

## 1. Propósito
Centralizar la carga de toda la configuración logística de una gira para vistas de administración y edición.

## 2. Datos que maneja
- **Hospedajes**: Carga hoteles y la estructura de habitaciones (`hospedaje_habitaciones`).
- **Transporte**: Carga vehículos (`programas_transportes`) y paradas asignadas.
- **Viáticos**: Gestiona las reglas de cálculo de dinero por localidad.

## 3. Lógica de Sincronización
- Utiliza un estado local que se sincroniza con Supabase.
- **Importante**: Al guardar cambios, el hook suele manejar actualizaciones masivas (upserts) en las tablas de detalles (`hospedaje_habitaciones`, `transporte_pasajeros`).

## 4. Uso de IDs
- Al igual que en el resto del sistema, las asignaciones de personas dentro de este hook utilizan el **ID numérico** de la tabla integrantes.