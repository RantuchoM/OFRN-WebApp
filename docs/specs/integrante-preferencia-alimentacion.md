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
### Mi Perfil (`ProfileEditModal`)
- Select de alimentación (`DIET_OPTIONS`).
- Inputs «Nombre de preferencia» y «Apellido de preferencia».
- Al guardar, si cambió `alimentacion`, se invoca `notifyAlimentacionChange`. El guardado no se revierte si el mail falla.

### Ficha de músico (admin)
- Los mismos campos de preferencia debajo del nombre/apellido legal.
- Autosave existente (`updateField` → `saveFieldToDb`).

## Seating
Helper: `src/utils/integranteDisplayName.js`

- `seatingNombre` / `seatingApellido` / `seatingApellidoNombre`
- `applySeatingDisplayNames` / `mapRosterForSeating` sobreescriben `nombre`/`apellido` en el pipeline de seating y conservan `nombre_legal` / `apellido_legal`.
- Transporte **no** pasa por ese mapper.

## Mail
Edge Function `mails_produccion`, template `cambio_alimentacion`.

- Destino: `produccion.ofrn@gmail.com`
- Asunto: `Cambio de alimentación | Nombre Apellido`
- Cuerpo: integrante, id, mail, dieta anterior y nueva.
