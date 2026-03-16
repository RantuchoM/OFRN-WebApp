# Spec: Corrección de Nombres de Archivos en ParticellaDownloadModal

## Problema
Los desplegables de selección de versión en el modal de descarga de particellas muestran etiquetas genéricas como **"Principal"** o **"Versión X"** en lugar del nombre real del archivo recuperado de Google Drive, a pesar de que la Edge Function `manage-drive` devuelve correctamente el `name`.

## Causa Raíz
- La lógica de etiquetado en el `<select>` no priorizaba siempre el estado `remoteLinkNames[link.url]` (rellenado de forma asíncrona vía `get_file_name`).
- La función `getDriveFileLabel` generaba labels genéricos que podían seguir mostrándose aunque ya existiera un nombre real obtenido desde Drive.

## Solución
1. **Estado de nombres remotos**
   - Se mantiene un estado `remoteLinkNames: { [url: string]: string }` que se completa llamando a la Edge Function `manage-drive` con la acción `get_file_name` para cada `url` cuando:
     - La particella tiene múltiples versiones (`row.hasMultipleLinks === true`).
     - No existe ya un nombre almacenado para ese `url`.

2. **Prioridad de etiquetas en el `<select>`**
   - Dentro del mapeo de `row.links` en `ParticellaDownloadModal.jsx`, la etiqueta de cada `<option>` se calcula como:
     ```js
     const remoteName = remoteLinkNames[link.url];
     const label = remoteName || getDriveFileLabel(link.url, idx);
     ```
   - Es decir:
     - **Primero**: si existe `remoteLinkNames[link.url]`, se usa el nombre real (`name`) devuelto por Google Drive.
     - **Segundo**: solo si aún no se ha resuelto el nombre remoto, se usa `getDriveFileLabel` como fallback.

3. **Comportamiento de `getDriveFileLabel`**
   - `getDriveFileLabel(url, fallbackIndex)` ya no intenta inferir el nombre desde la URL.
   - Se usa únicamente como etiqueta genérica mientras se resuelven los nombres reales:
     - `fallbackIndex === 0` → `"Principal"`.
     - `fallbackIndex > 0` → `"Versión N"`.
   - En cuanto `remoteLinkNames[link.url]` se actualiza, el componente se re-renderiza y la etiqueta pasa a ser el nombre real de Drive.

4. **Renderizado para una sola versión**
   - Incluso cuando hay una sola versión:
     - Si `remoteLinkNames[url]` existe, se muestra ese nombre.
     - Si no, se muestra `"Principal"` como fallback.

## Verificación
1. Abrir el modal en una obra con múltiples versiones de una misma particella (campo `url_archivo` con un array de objetos `{ url }`).
2. Observar en la consola del navegador:
   - Logs de `get_file_name OK` con `{ success: true, name: 'NombreReal.pdf' }`.
3. Confirmar que:
   - Inicialmente el `<select>` puede mostrar `"Principal"`, `"Versión 2"`, etc.
   - Tras resolverse las llamadas asíncronas, las opciones se actualizan a:
     - `"Violín 2 - Hommage a Mozart [nueva edición] - Ibert, J .pdf"`,
     - `"Violín 2 - Hommage a Mozart - Ibert, J.pdf"`, etc.

## Estado
- **Implementado** en `src/components/seating/ParticellaDownloadModal.jsx` y Edge Function `supabase/functions/manage-drive/index.ts`.

