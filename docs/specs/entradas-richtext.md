# Entradas — editor de texto enriquecido (imágenes)

## Alcance

- `RichTextEditor` en programas y conciertos (`EntradasMain.jsx`).
- Vista pública: `EntradasRichTextHtml`.

## Imágenes en el cuerpo del texto

- [x] **Solo por URL pública** (sin subida desde el equipo).
- [x] Modal con campo de enlace, vista previa y mensaje de estado (éxito / error / carga).
- [x] **Google Drive**: enlaces compartidos como «Cualquier persona con el enlace»; mismos patrones que portada (`entradasDriveImage.js`).
- [x] URLs `https` directas a imágenes públicas también válidas.
- [x] **Recorte rectangular** opcional (franjas con presets: central, superior, inferior).
- [x] Recorte persistido en `<img data-crop="x,y,w,h" data-img-aspect="…">` (formato guardado en BD).
- [x] Al mostrar: envoltorio `<span class="ql-image-crop">` con estilos inline (solo presentación).
- [x] **Edición posterior**: doble clic en la imagen dentro del editor reabre el modal con URL y recorte cargados.
- [x] Al guardar: `<img src>` de Drive en formato canónico (`drive.google.com/file/d/{id}/view`).
- [x] Al mostrar/editar: conversión a URL mostrable (`lh3.googleusercontent.com/d/{id}`).

## Componentes

| Archivo | Rol |
|---------|-----|
| `src/components/ui/RichTextImageUrlModal.jsx` | Modal de inserción/edición (portal `z-[100]`) |
| `src/components/ui/RichTextImageCropPicker.jsx` | Selector visual de recorte |
| `src/components/ui/quillCroppedImageRegister.js` | Blot Quill `image` con soporte de recorte |
| `src/components/ui/RichTextEditor.jsx` | Handler de imagen + doble clic para editar |
| `src/utils/quillImageCrop.js` | Recorte, presets, estilos inline, wrap de imágenes |
| `src/utils/entradasDriveImage.js` | URLs Drive en `<img src>` |
| `src/components/ui/quillFontNormalize.js` | `prepareEntradasQuillHtmlForDisplay` / `ForStorage` |

## Vista pública del concierto (catálogo)

Al abrir un concierto, el bloque de reserva queda **arriba**, justo debajo de horario y locación:

1. Nombre, fecha/hora, lugar y localidad
2. **Cantidad** (1–4) y botón **Obtener** (si las reservas están abiertas y hay cupo)
3. Resultado de la reserva (código, PDF, QRs) cuando acaba de obtenerse
4. Aviso si las reservas aún no abrieron / recordatorio
5. Portada, detalle enriquecido, barra de disponibilidad y compartir

- [x] CTA de reserva visible sin scrollear el detalle largo.

## Notas

- Contenido antiguo con imágenes en base64 (`data:`) sigue mostrándose; no se reescribe al guardar.
- Portada del concierto (`imagen_drive_url`) usa flujo aparte (`EntradasDriveCoverImage`).
