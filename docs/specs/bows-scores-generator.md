# Spec: Generador Automático de Scores para Arcos

## Objetivo
Permitir que los editores generen automáticamente copias de las particellas de **SCORE de Cuerdas (General)** (ID: 50) en la carpeta de Arcos de la gira para facilitar la revisión comparativa de arcos por parte de los guías.

## Lógica de Negocio
1. **Filtro de Usuario:** Solo visible para `isEditor` o `isManagement`.
2. **Origen de Datos:**
   - Se recorren todas las obras (`obras`) del programa.
   - Para cada obra, se busca en `obras_particellas` aquella con `id_instrumento === "50"` (SCORE Cuerdas General).
3. **Formato de `url_archivo`:**
   - Puede ser:
     - Un string simple con una URL de Google Drive.
     - Un JSON con un array de versiones `[{ url, name }]`. En ese caso, se toma la primera entrada con `url` válida.
4. **Acción de Drive (Edge Function):**
   - Se llama a `manage-drive` con una acción `COPY_FILES_BATCH`.
   - Payload: `files: Array<{ fileId, destinationFolderId, newName? }>` asociado al `giraId` actual.
   - La función debe copiar el archivo original y renombrarlo (ej: `[ARCOS] Nombre_Obra.pdf`).
5. **Destino:** Campo `id_folder_arcos` de la tabla `programas`.

## UI/UX
- Menú desplegable **「Arcos」** en la pestaña Repertorio de la gira (`ProgramRepertoire.jsx`), visible para `isEditor` o `isManagement`.
- Opciones del menú:
  1. **Carpeta de arcos** — abre en nueva pestaña `programas.id_folder_arcos` (fallback `id_shortcut_arcos_drive`). Si no existe, toast indicando usar «Generar toda la gira».
  2. **Generar toda la gira** — flujo batch (detalle abajo).
  3. **Acomodar Arcos** — repara shortcuts de Drive para todos los sets ya seleccionados en el repertorio.
  4. **Scores para Arcos** — copia particellas SCORE cuerdas (id 50) a la carpeta de arcos con prefijo `[ARCOS]`.
- **Generar toda la gira** (batch):
     - Por cada fila de `repertorio_obras` con obra vinculada: si ya tiene `id_arco_seleccionado`, no cambia la selección.
     - Si la obra tiene sets en `obras_arcos` pero ninguno seleccionado → asigna el primero (por `id` ascendente).
     - Si la obra no tiene ningún set → modal pidiendo nombre canónico del set (default `Arcos {nomenclador}`); crea el set vía `sync_bowing_to_program` + insert en `obras_arcos` y lo asigna a todas las filas de esa obra en el programa.
     - Al terminar, ejecuta **Acomodar Arcos** (`sync_bowing_to_program` con `targetDriveId` por cada set seleccionado) para reparar shortcuts en Drive.
     - Modal final opcional: «¿Deseás además dejar una copia de los Scores…?» → si confirma, ejecuta **Scores para Arcos** (`COPY_FILES_BATCH`).
- Feedback mediante `sonner` (toast) en todo el flujo batch y al copiar scores.

## SQL (Supabase Editor)
Verifica que la tabla `programas` tenga el campo necesario:

```sql
-- Asegurar que el campo para la carpeta de arcos existe
ALTER TABLE public.programas 
ADD COLUMN IF NOT EXISTS id_folder_arcos TEXT;

-- Comentario para documentación
COMMENT ON COLUMN public.programas.id_folder_arcos IS 'ID de Google Drive de la carpeta destinada a las particellas de arcos';
```

## Estado de Implementación
- **Edge Function `manage-drive`**: acciones `COPY_FILES_BATCH` y `sync_bowing_to_program` implementadas.
- **Frontend `ProgramRepertoire.jsx`**:
  - Menú **Arcos** con cuatro acciones: «Carpeta de arcos», «Generar toda la gira», «Acomodar Arcos», «Scores para Arcos» (`isEditor` o `isManagement`).
  - `executeGenerateBowScores` / `executeRepairArcos` reutilizados por el flujo batch y el modal final de scores.
  - Lógica que filtra `obras_particellas` por `id_instrumento === "50"` y parsea `url_archivo` como string o JSON de versiones.
  - La operación de scores usa `program.id_folder_arcos` como carpeta destino en Drive.
- **Permisos**:
  - Menú Arcos: visible para `isEditor` o `isManagement`.
  - «Importar Repertorio» y «Sincronizar Drive»: visibles solo para editores/admins (`isEditor`).

