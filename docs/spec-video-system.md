# Spec: Sistema de Video para Manual y Notificaciones

## 1. Objetivo
Integrar soporte de video embebido (Google Drive, YouTube, Vimeo) en los módulos de Manual de Usuario y Logs de Notificaciones de la OFRN.

## 2. Tablas Involucradas (Esquema Verificado)
- **`app_manual`**: Utiliza `video_url` (TEXT) para secciones de ayuda.
- **`giras_notificaciones_logs`**: Se añadirá `video_url` (TEXT) para adjuntar videos a las noticias/comunicaciones de giras.
- **Estado**: ✅ Columnas añadidas en BD (SQL ejecutado por el usuario).

## 3. Componente: VideoPlayer
- **Lógica de Parseo**:
  - **Google Drive**: Convierte `.../file/d/ID/view` o `.../edit` en `.../file/d/ID/preview`.
  - **YouTube**: Convierte links estándar o cortos en formato `/embed/ID`.
  - **Vimeo**: Genera el link `player.vimeo.com/video/ID`.
- **UI**: 
  - Ratio de aspecto 16:9 (`aspect-video`).
  - Skeleton loader mientras carga el iframe.
  - Botón para abrir en pestaña nueva como fallback.

## 4. Implementación en Views
- **Manual**: El `ManualModal` debe renderizar el video debajo del título y antes del `content`.
- **Noticias/Logs**: El `NewsModal` (asociado a `giras_notificaciones_logs`) mostrará el video si la columna no es null.

## 5. Formularios
- **ManualAdmin**: Ya tiene campo `video_url` en el formulario, verificar que funcione correctamente.

## 6. Estado de Implementación

### ✅ Completado

1. **Spec Document**: Creado `docs/spec-video-system.md` con especificaciones técnicas.

2. **VideoPlayer Component**: 
   - ✅ Creado `src/components/ui/VideoPlayer.jsx`
   - ✅ Implementada lógica de parseo para Google Drive (convierte a `/preview`)
   - ✅ Implementada lógica de parseo para YouTube (convierte a `/embed/ID`)
   - ✅ Implementada lógica de parseo para Vimeo (convierte a `player.vimeo.com/video/ID`)
   - ✅ UI con ratio 16:9 (`aspect-video`)
   - ✅ Skeleton loader usando `Loader.jsx` mientras carga
   - ✅ Botón para abrir en nueva pestaña como fallback
   - ✅ Manejo de errores con mensaje y botón de fallback

3. **ManualModal**: 
   - ✅ Importado `VideoPlayer`
   - ✅ Reemplazado iframe básico por componente `VideoPlayer`
   - ✅ Video se muestra debajo del título y antes del contenido

4. **NewsModal**: 
   - ✅ Importado `VideoPlayer`
   - ✅ Añadido renderizado condicional de `VideoPlayer` si `selectedNews.video_url` existe
   - ✅ Video se muestra antes del contenido de la noticia

5. **ManualAdmin**: 
   - ✅ Campo `video_url` ya existente en formulario (líneas 750-757)
   - ✅ Campo se guarda correctamente mediante `manualService.create/update`
   - ✅ Campo está incluido en `formData` state

### Notas Técnicas

- `VideoPlayer` maneja URLs de Google Drive, YouTube y Vimeo de forma robusta
- El componente es reutilizable y puede usarse en cualquier parte de la aplicación
- `NewsModal` actualmente usa `sistema_novedades`, pero el soporte de `video_url` está implementado. Si se necesita mostrar videos de `giras_notificaciones_logs`, se puede añadir fácilmente siguiendo el mismo patrón.
