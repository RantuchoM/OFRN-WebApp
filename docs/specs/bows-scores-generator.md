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
- Botón al lado de "Importar Repertorio" con icono de `IconBus` (o similar que represente arcos/cuerdas).
- Feedback mediante `sonner` (toast) que muestre el progreso o el resultado final de la operación:
  - Cargando: "Copiando scores para arcos..."
  - Éxito: "Se copiaron X particellas de cuerdas con éxito."
  - Error: Detalle de la causa (incluyendo el caso en que no haya particellas SCORE de cuerdas 50 con archivo).

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
- **Edge Function `manage-drive`**: acción `COPY_FILES_BATCH` implementada.
- **Frontend `ProgramRepertoire.jsx`**:
  - Botón "Scores para Arcos" añadido, restringido a `isEditor` o `isManagement`, usando `toast.promise` de `sonner`.
  - Lógica que filtra `obras_particellas` por `id_instrumento === "50"` y parsea `url_archivo` como string o JSON de versiones.
  - La operación usa `program.id_folder_arcos` como carpeta destino en Drive.
- **Permisos**:
  - "Scores para Arcos": visible para `isEditor` o `isManagement`.
  - "Importar Repertorio" y "Sincronizar Drive": visibles solo para editores/admins (`isEditor`).

