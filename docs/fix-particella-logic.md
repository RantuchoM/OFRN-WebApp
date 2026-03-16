# Spec: Corrección de Atributos y Flujo de Descarga - Particellas

## Diagnóstico
El componente `ParticellaDownloadModal` no encuentra los links de las obras porque busca la propiedad `link` cuando el schema de Supabase define `link_drive`. Además, el flujo de descarga satura la Edge Function al no tener validaciones previas de existencia de contenido.

## Especificaciones Técnicas

1. **Mapeo de Datos**
   - Cambiar `obra.link` por `obra.link_drive` en:
     - `useEffect` de carga de nombres de Drive.
     - Lógica de renderizado de filas.
     - Fallbacks de links de descarga.

2. **Validación Preventiva**
   - Antes de ejecutar `handleGenerateAndUpload`, verificar que cada `row` seleccionado tenga un `chosenLink.url` válido.

3. **Optimización de Llamadas**
   - El `get_file_content` solo se invoca dentro del loop de ejecución tras el clic del usuario.
   - Añadir un log de control: `[DownloadFlow] Iniciando descarga de: ${row.displayName}`.

## Consistencia con Schema

- **Tabla**: `obras` → **Columna**: `link_drive` (text).
- **Tabla**: `obras_arcos` → **Columna**: `link` (text).

