# Spec: Alimentación autogestionada y nombre de preferencia

## Objetivo
Permitir que cada músico edite su tipo de alimentación desde **Mi Perfil** y que, al cambiarla, producción reciba un mail. Además, cargar **nombre** y **apellido de preferencia** para mostrarlos en la interfaz. El nombre legal queda en las exportaciones de documentación oficial.

## Estado
- [x] Columnas `integrantes.nombre_preferencia` y `integrantes.apellido_preferencia`.
- [x] Modal `ProfileEditModal`: alimentación + nombre/apellido de preferencia.
- [x] Mail a `filarmonica.scrn@gmail.com` al cambiar alimentación (`notify-alimentacion-change`).
- [x] Ficha admin (`MusicianPersonalSection`) con los mismos campos de preferencia.
- [x] La interfaz muestra preferencia (fallback al legal) vía `seatingNombre` / `seatingApellido` / `seatingApellidoNombre` en `src/utils/integranteDisplayName.js`.
- [x] Exportaciones de documentación oficial siguen con el nombre legal (`nombre` / `apellido`, o `legalNombre` / `legalApellido`).

## Datos
Tabla: `public.integrantes`

| Columna | Uso |
|---|---|
| `nombre` / `apellido` | Nombre legal. Exportaciones de documentación (CNRT, formularios de viáticos, padrón con DNI). |
| `nombre_preferencia` / `apellido_preferencia` | Opcionales. Si hay valor, reemplazan el legal en la interfaz. Cada campo se aplica por separado. |
| `alimentacion` | Ya existía. Ahora editable desde Mi Perfil. Vacío, **General** (histórico) y **Estándar** son el mismo bucket en Comidas. |

Cada campo de preferencia se aplica por separado: se puede cambiar solo el nombre, solo el apellido, o ambos.

## Dietas OFRN (Comidas)

Fuente: `src/utils/dietOptions.js`. `DIET_OPTIONS` lista **Estándar** (ya no «General»). En matriz / reporte / PDF / Excel:

| Valor en ficha (`integrantes.alimentacion`) | Columna / tooltip | Cabecera corta |
|---|---|---|
| vacío / `General` / `Estándar` | **Estándar** (una sola columna) | Estándar |
| Sin Lactosa | Sin Lactosa | **s/Lact.** |
| Sin Sal | Sin Sal | **s/sal** |
| Sin TACC (FIMBA `sin_tacc`) | Sin TACC | **s/TACC** |
| FIMBA Regular | **Regular** (no se fusiona con Estándar) | Regular |

No abreviar con `substring(0,4)` (colisionaba GENE vs ESTÁ vs SIN). `dietsDiffer` trata vacío/General/Estándar como iguales (no dispara mail).

## UI
### Mi Perfil (`ProfileEditModal`) — flujo del músico
- Se abre desde el avatar / nombre en el header (`App.jsx` → `setProfileModalOpen`).
- Select de alimentación (`DIET_OPTIONS`) + nombre/apellido de preferencia.
- El título junto al avatar usa `seatingNombre` / `seatingApellido`: si hay preferencia cargada, muestra esa; si no, el nombre legal. Se actualiza con lo que está en el formulario (lo guardado al abrir, y lo que se está editando).
- El aviso «Salir sin guardar» usa `overlayClassName: z-[10050]` para quedar por encima del portal del perfil (`z-[9999]`).
- **Único lugar que dispara el mail:** al guardar, si cambió `alimentacion`, se invoca `notifyAlimentacionChange` → `filarmonica.scrn@gmail.com`.
- El guardado no se revierte si el mail falla.

### Ficha de músico admin (`MusicianForm` / `MusicianPersonalSection`)
- Mismos campos (preferencia + alimentación) para que administración pueda cargarlos.
- Autosave (`updateField` → `saveFieldToDb`).
- **No** llama a `notifyAlimentacionChange`. Un cambio de dieta desde acá no avisa a producción.

## Dónde se muestra
Helper: `src/utils/integranteDisplayName.js` (`seatingNombre`, `seatingApellido`, `seatingApellidoNombre`, `seatingApellidoInicial`).

Si hay preferencia, la interfaz la usa (roster, seating e informes de seating, hoteles, comidas, transporte en pantalla, viáticos en pantalla, selects, Concerto Competition, paleta, escenario). Si no hay, queda el nombre legal. No se reescribe `integrantes.nombre` / `apellido` en la base.

Siguen en nombre legal: exportación CNRT (`transportExport.js` / `downloadStyledPassengers`, también FIMBA), hoja de ruta, formularios PDF/Excel de viáticos y rendiciones, padrón exportado del roster (DNI/CUIL) y el resto de planillas oficiales que arman el nombre con `nombre` / `apellido`.

## Mail
Edge Function `notify-alimentacion-change` (también hay template `cambio_alimentacion` en `mails_produccion` por si se reutiliza el hub).

- Destino: `filarmonica.scrn@gmail.com`
- Asunto: `Cambio de alimentación | Nombre Apellido`
- Cuerpo: integrante, id, mail, dieta anterior y nueva.
