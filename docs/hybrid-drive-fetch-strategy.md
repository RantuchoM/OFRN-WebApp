# Spec: Estrategia Híbrida de Descarga (Token Proxy)

## Objetivo
Optimizar el consumo de ancho de banda (Egress) de Supabase delegando la descarga de archivos al cliente, pero manteniendo la seguridad mediante una Edge Function que provee tokens temporales.

## Requerimientos Técnicos

1. **Edge Function (`manage-drive`)**
   - Implementar acción `get_temp_token` que devuelva un Access Token válido generado con las credenciales existentes (OAuth/Service Account).

2. **Cliente (`ParticellaDownloadModal.jsx`)**
   - Solicitar el token al abrir el modal o al iniciar la descarga.
   - Ejecutar `fetch` directo a `https://www.googleapis.com/drive/v3/files/{fileId}?alt=media` con el header `Authorization: Bearer <TOKEN>`.
   - Pasar los `ArrayBuffer` resultantes a `mergeSequential` para unificar los PDFs por obra.

3. **Fallback**
   - Si la obtención del token o la descarga directa fallan, notificar al usuario en los resultados de la exportación sin reintentar vía proxy de Supabase para proteger el egress.

## Beneficios

- **Ahorro de costos**: Reducción drástica de transferencia de datos (Egress) en Supabase al evitar que los PDFs pasen por la Edge Function.
- **Performance**: Descargas en paralelo directamente desde el navegador del usuario hacia la API de Google Drive.

