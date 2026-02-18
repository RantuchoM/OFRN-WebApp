# Especificación: Creación Rápida de Locaciones

## Objetivo
Permitir la creación de nuevas locaciones (sedes de ensayo) directamente desde los formularios de creación de eventos sin perder el progreso del formulario principal.

## Flujo de Usuario
1. El usuario hace clic en el botón `+` al lado del select de locaciones.
2. Se abre un modal con los siguientes campos:
   - Nombre (obligatorio)
   - Localidad (selector de ciudades)
   - Dirección
   - Teléfono
   - Aforo (capacidad)
   - Email
3. Al guardar:
   - Se inserta en la tabla `locaciones` vía Supabase.
   - El formulario principal detecta el nuevo registro.
   - El select se actualiza y la nueva locación queda pre-seleccionada.

## Consideraciones Técnicas
- **Refresco de Datos:** Se debe invocar la función de refresco del catálogo de locaciones (`onRefresh`) en el componente padre.
- **UX:** El botón debe usar `IconPlus` de nuestra librería de íconos.
- **Tabla:** Se inserta en `locaciones` (sedes de ensayo), no en `localidades` (ciudades).