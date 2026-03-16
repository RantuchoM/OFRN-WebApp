# Spec: Gestor de Descargas de Particellas (OFRN)

## Descripción
Módulo para la descarga masiva y unificación de particellas de un programa, integrando el conteo de copias basado en el Seating y la exportación a Google Drive.

## Lógica de Negocio
1. **Conteo de Copias**  
   - **Cuerdas**: Basado en `seating_contenedores`. Cada ítem de un contenedor (que no esté ausente) cuenta como un músico. Generalmente se imprime una particella por atril (2 músicos).  
   - **Vientos/Percusión**: 1 copia por cada integrante con la particella asignada.
2. **Filtrado**  
   - Excluir estrictamente integrantes con `estado_gira === 'ausente'`.
3. **Multi-versión**  
   - Si `obras_particellas` devuelve múltiples registros para un mismo instrumento/obra, permitir selección vía dropdown.
4. **Almacenamiento**  
   - Los PDFs generados deben subirse a la carpeta de Drive `1BK8yhY1dvAZRrDwEDXg3VR3QlnmdOH4u` mediante la Edge Function `manage-drive`.

## Componentes Afectados
- `src/views/Giras/ProgramSeating.jsx`: Inclusión del botón y modal.
- `supabase/functions/manage-drive/index.ts`: Nuevo case `upload_particella_set`.
- `src/utils/docMerger.js`: Utilizado para la unión de los buffers descargados.

## Notas de Implementación

### Frontend
- **Vista origen**: `ProgramSeating.jsx` (Seating & Particellas).
- **Nuevo modal**: `ParticellaDownloadModal.jsx` (lazy import desde `ProgramSeating.jsx`).
- **Botón UI**: En el header de `ProgramSeating` se añadió el botón **"Descargar Particellas"** con `IconDownload` + `IconLayers`, que abre el modal.

#### Props que recibe el modal
- `supabase`: cliente de Supabase (para invocar la Edge Function `manage-drive`).
- `program`: programa/gira actual (se usa `id` y `nomenclador` para nombrar los sets).
- `obras`: lista de obras ya construida en `ProgramSeating` (incluye `obra_id`, `composer`, `title`, etc.).
- `assignments`: mapa de asignaciones de particellas (`M-id_musico-id_obra` y `C-id_contenedor-id_obra`).
- `containers`: contenedores de cuerdas ya filtrados a integrantes confirmados de la gira.
- `particellas`: rows de `obras_particellas` (incluyendo `url_archivo`).
- `rawRoster`: roster completo de la gira (sirve para filtrar ausentes y no-músicos).

#### Cálculo de copias
- **Cuerdas**:
  - Se trabaja por contenedor (`seating_contenedores`).
  - Se usan solo los `items` presentes en `containers` (ya filtrados a integrantes confirmados y no ausentes).
  - Para cada obra, si existe asignación contenedor `C-{id_contenedor}-{id_obra}`, se cuenta:
    - Músicos del contenedor = `items.length`.
    - Copias sugeridas = **1 por músico** (se usa directamente `items.length`).
- **Vientos/Percusión**:
  - Se parte de `rawRoster`, filtrando:
    - `estado_gira !== 'ausente'`.
    - `rol_gira` vacío o `"musico"` (se excluyen staff/producción, etc.).
  - Para cada obra, se toma la asignación `M-{id_musico}-{id_obra}` (solo instrumentos no cuerdas).
  - Cada músico presente con particella asignada suma **1 copia** para ese instrumento.

Los conteos se agregan por **obra + instrumento lógico**, y se muestran como “X copias sugeridas” en la UI del modal.  
En la generación del PDF, el buffer de cada particella seleccionada se duplica tantas veces como copias tenga asignadas, de manera que el set resultante ya incluye todas las copias físicas.

#### Multi-versión de particellas
- Para cada combinación obra/instrumento se construye una lista de opciones a partir de `obras_particellas`:
  - Si hay varias filas para el mismo instrumento/obra, se marcan como **multi-versión**.
  - En la UI se muestra un `<select>` con los `nombre_archivo` disponibles.
  - Si solo hay una versión, se muestra como texto plano.
- El usuario elige por instrumento qué versión se usa para el set; el conteo de copias se mantiene por instrumento, independientemente de la versión elegida.

#### Selección Obra → Instrumento
- El modal muestra un árbol:
  - **Nivel 1 (Obra)**: checkbox para habilitar/deshabilitar toda la obra.
  - **Nivel 2 (Instrumento)**: checkbox por fila (instrumento lógico) dentro de la obra.
- Si se desactiva la obra, no se genera ningún set para ella.  
- Si se desactiva un instrumento concreto, sus copias no se incluyen en el set.

#### Descarga de buffers
- Para cada particella seleccionada:
  - Si `url_archivo` contiene `drive.google.com`:
    - Se invoca `supabase.functions.invoke('manage-drive', { action: 'get_file_content', sourceUrl })`.
    - La Edge Function devuelve el archivo como `fileBase64`; el frontend lo convierte a `Uint8Array`.
  - En otros casos (p.ej. URL de Storage pública):
    - El frontend hace `fetch(url_archivo)` y transforma el resultado a `ArrayBuffer`/`Uint8Array`.

#### Unión de PDFs
- Se usa `mergeSequential` de `src/utils/docMerger.js`:
  - Se construye un arreglo de objetos `{ buffer }` (uno por copia).
  - `mergeSequential` detecta tipo (PDF/imagen) y unifica todo en un único PDF.
  - Se genera **un PDF por obra**, que contiene todas las particellas seleccionadas y repetidas según el conteo de copias.

#### Progreso y resultado
- El modal muestra una barra de progreso basada en:
  - Descarga de cada particella.
  - Unión de PDFs por obra.
  - Subida de cada set a Drive.
- Al finalizar se muestra un listado de resultados por obra con:
  - Enlace clicable a Drive (`webViewLink`) cuando la subida fue exitosa.
  - Mensaje de error por obra si falló la subida o unificación.

### Backend: Edge Function `manage-drive`

- Archivo: `supabase/functions/manage-drive/index.ts`.
- Se añadió una nueva constante:
  - `PARTICELLA_SETS_ROOT_ID = "1BK8yhY1dvAZRrDwEDXg3VR3QlnmdOH4u";`
- Nueva acción:

#### Acción `upload_particella_set`
- **Entrada esperada** (en `body` de `supabase.functions.invoke('manage-drive')`):
  - `action: "upload_particella_set"`.
  - `fileBase64`: PDF unificado en base64.
  - `fileName`: nombre de archivo a crear en Drive (incluye normalmente programa + obra).
  - `mimeType`: normalmente `"application/pdf"`.
  - `programId`, `obraId`: metadatos opcionales que por ahora solo se usan para trazabilidad en el nombre (no se persisten en BD).
- **Comportamiento**:
  - Decodifica `fileBase64` a `Uint8Array`.
  - Construye una petición `multipart` al endpoint de subida de Google Drive:
    - Metadata JSON con:
      - `name: fileName`.
      - `parents: [PARTICELLA_SETS_ROOT_ID]` (carpeta fija de sets).
    - Blob binario del PDF con `Content-Type` = `mimeType` (por defecto `application/pdf`).
  - Devuelve:
    - `success: true`.
    - `fileId`: ID del archivo creado en Drive.
    - `webViewLink`: enlace navegable al archivo en Drive.

Por el momento **no** se escribe un log en base de datos (`logs_generacion_particellas`), pero la tabla sugerida en la especificación se puede añadir más adelante y conectarse a este mismo `case` utilizando `programId` y `obraId`.


