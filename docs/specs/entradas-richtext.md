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
2. Si **no hay reserva**: **Cantidad** (1–4) y **Obtener** (si las reservas están abiertas y hay cupo)
3. Justo debajo de **Obtener** (o de Ver QR / Cancelar si ya hay reserva): barra de disponibilidad y botones **Compartir** / **Copiar enlace**
4. Si **ya hay reserva**: no se muestra el desplegable de cantidad (ni bloqueado). En su lugar, **Ver QR** destacado (botón grande) y **Cancelar entradas** con `ConfirmModal` (mismos textos y reglas que en Mis entradas; no se ofrece cancelar si el concierto ya ocurrió)
5. Resultado de la reserva (código, PDF, QRs) cuando acaba de obtenerse
6. Aviso si las reservas aún no abrieron / recordatorio (oculto si ya hay reserva activa)
7. Portada y detalle enriquecido

- [x] CTA de reserva visible sin scrollear el detalle largo.
- [x] Con reserva activa: Ver QR grande + cancelar (sin desplegable bloqueado).
- [x] Disponibilidad y compartir/copiar justo debajo de Obtener.

## Notas

- Contenido antiguo con imágenes en base64 (`data:`) sigue mostrándose; no se reescribe al guardar.
- Portada del concierto (`imagen_drive_url`) usa flujo aparte (`EntradasDriveCoverImage`).
