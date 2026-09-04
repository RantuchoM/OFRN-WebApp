# Spec: Alimentación autogestionada y nombre de preferencia

## Objetivo
Permitir que cada músico edite su tipo de alimentación desde **Mi Perfil** y que, al cambiarla, producción reciba un mail. Además, cargar **nombre** y **apellido de preferencia** para seating e informes de seating, sin alterar el nombre legal en transporte.

## Estado
- [x] Columnas `integrantes.nombre_preferencia` y `integrantes.apellido_preferencia`.
- [x] Modal `ProfileEditModal`: alimentación + nombre/apellido de preferencia.
- [x] Mail a `produccion.ofrn@gmail.com` al cambiar alimentación (`mails_produccion` / `cambio_alimentacion`).
- [x] Ficha admin (`MusicianPersonalSection`) con los mismos campos de preferencia.
- [x] Seating e informes de seating usan preferencia (fallback al legal).
- [x] Informes de transporte siguen usando `nombre` / `apellido` legales.

## Datos
Tabla: `public.integrantes`

| Columna | Uso |
|---|---|
| `nombre` / `apellido` | Nombre legal. Transporte, documentos, roster operativo. |
| `nombre_preferencia` / `apellido_preferencia` | Opcionales. Si hay valor, reemplazan el legal **solo** en seating y sus informes. |
| `alimentacion` | Ya existía. Ahora editable desde Mi Perfil. |

Cada campo de preferencia se aplica por separado: se puede cambiar solo el nombre, solo el apellido, o ambos.

## UI
### Mi Perfil (`ProfileEditModal`) — flujo del músico
- Se abre desde el avatar / nombre en el header (`App.jsx` → `setProfileModalOpen`).
- Select de alimentación (`DIET_OPTIONS`) + nombre/apellido de preferencia.
- **Único lugar que dispara el mail:** al guardar, si cambió `alimentacion`, se invoca `notifyAlimentacionChange` → `produccion.ofrn@gmail.com`.
- El guardado no se revierte si el mail falla.

### Ficha de músico admin (`MusicianForm` / `MusicianPersonalSection`)
- Mismos campos (preferencia + alimentación) para que administración pueda cargarlos.
- Autosave (`updateField` → `saveFieldToDb`).
- **No** llama a `notifyAlimentacionChange`. Un cambio de dieta desde acá no avisa a producción.

## Seating
Helper: `src/utils/integranteDisplayName.js`

- `seatingNombre` / `seatingApellido` / `seatingApellidoNombre`
- `applySeatingDisplayNames` / `mapRosterForSeating` sobreescriben `nombre`/`apellido` en el pipeline de seating y conservan `nombre_legal` / `apellido_legal`.
- Transporte **no** pasa por ese mapper.

## Mail
Edge Function `notify-alimentacion-change` (también hay template `cambio_alimentacion` en `mails_produccion` por si se reutiliza el hub).

- Destino: `produccion.ofrn@gmail.com`
- Asunto: `Cambio de alimentación | Nombre Apellido`
- Cuerpo: integrante, id, mail, dieta anterior y nueva.
