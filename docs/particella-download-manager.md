# Spec: Gestor de Descargas de Particellas (OFRN)

## Descripción
Módulo para la descarga masiva y unificación de particellas de un programa, integrando el conteo de copias basado en el Seating y la exportación a Google Drive.

## Lógica de Negocio
1. **Conteo de Copias** (modo **Por obra**)  
   - **Cuerdas**: Basado en `seating_contenedores`. Toggle **1 por atril** (default ON): `ceil(n/2)` copias por contenedor (ej. 9 músicos → 5). Si se desactiva: 1 copia por músico (`n`).  
   - **Vientos/Percusión/Director**: 1 copia por asignación en `musicianAssignments` (no el mapa de contenedores). Incluye roles director/solista del roster confirmado.  
   - **Ajuste manual**: el cálculo es tope; se puede restar por fila (tablets) hasta 0.
2. **Modo «Toda la gira por músico»**  
   - Binder por persona: portada + particellas de todas las obras tildadas donde tiene asignación.  
   - Portada: nombre, `mes_letra`, `nomenclador`, `nombre_gira`, ensambles activos. Con Doble faz ON → portada de 2 páginas (reverso en blanco).  
   - 1 PDF de la parte por obra (cuerdas vía contenedor; no multiplica atriles).  
   - Obras y músicos: todos ON por defecto, destildables. La sync de selección solo reacciona a cambios de IDs (no a nueva referencia del array `obras`/`allBundles`), para no re-tildar lo destildado a mano.
   - Durante exportación: overlay a pantalla del modal + aviso «no cierres la pestaña»; `beforeunload` pide confirmación del navegador al cerrar/recargar.  
   - Orden: alfabético / `id_instr` / ensamble regional (`isRegionalConvocatoriaEnsamble`); desempate apellido.  
   - Salida: un PDF único, o un PDF por músico (ZIP local / subcarpeta Drive con timestamp si el nombre base ya existe).  
   - **Marcadores**: PDF por músico → Portada + obra; PDF unificado → músico (hijos: Portada + obras).  
   - Multi-versión: selector; default primera.
3. **Filtrado**  
   - Excluir estrictamente integrantes con `estado_gira === 'ausente'`.
4. **Multi-versión**  
   - Si `obras_particellas` tiene varios links, permitir selección vía dropdown.
5. **Almacenamiento**  
   - Carpeta Drive `PARTICELLA_SETS_ROOT_ID` (`1BK8yhY1dvAZRrDwEDXg3VR3QlnmdOH4u`).  
   - Acción EF `create_particella_musician_folder` para subcarpetas por-músico.

## Componentes Afectados
- `src/views/Giras/ProgramSeating.jsx`: Inclusión del botón y modal.
- `src/components/seating/ParticellaDownloadModal.jsx`: pestañas Por obra / Por músico.
- `src/components/seating/ParticellaByMusicianExport.jsx`: UI y generación por músico.
- `src/utils/particellaMusicianCover.js`: portada/separador.
- `src/utils/buildMusicianParticellaBundles.js`: mapa músico→partes + orden.
- `supabase/functions/manage-drive/index.ts`: `upload_particella_set`, `create_particella_musician_folder`.
- `src/utils/docMerger.js`: unión de buffers + `padOddPages` + marcadores PDF (`attachPdfBookmarks`).

## Notas de Implementación

### Frontend
- **Vista origen**: `ProgramSeating.jsx` (Seating & Particellas).
- **Nuevo modal**: `ParticellaDownloadModal.jsx` (lazy import desde `ProgramSeating.jsx`).
- **Botón UI**: En el header de `ProgramSeating` se añadió el botón **"Descargar Particellas"** con `IconDownload` + `IconLayers`, que abre el modal.

#### Props que recibe el modal
- `supabase`: cliente de Supabase (para invocar la Edge Function `manage-drive`).
- `program`: programa/gira actual (se usa `id` y `nomenclador` para nombrar los sets).
- `obras`: lista de obras ya construida en `ProgramSeating` (incluye `obra_id`, `composer`, `title`, etc.).
- `assignments`: mapa de asignaciones de contenedores (`C-id_contenedor-id_obra`).
- `musicianAssignments`: mapa de asignaciones individuales (`M-id_musico-id_obra` → array de `id_particella`).
- `containers`: contenedores de cuerdas ya filtrados a integrantes confirmados de la gira.
- `particellas`: rows de `obras_particellas` (incluyendo `url_archivo`).
- `filteredRoster`: roster confirmado de seating (incluye director/solista; excluye staff).

#### Cálculo de copias
- **Cuerdas**:
  - Se trabaja por contenedor (`seating_contenedores`).
  - Se usan solo los `items` presentes en `containers` (ya filtrados a integrantes confirmados y no ausentes).
  - Para cada obra, si existe asignación contenedor `C-{id_contenedor}-{id_obra}`, se cuenta:
    - Músicos del contenedor = `n = items.length`.
    - Con toggle **1 por atril** activo (default): copias = `Math.ceil(n / 2)`.
    - Con toggle desactivado: copias = `n` (1 por músico).
- **Vientos / Percusión / Director / Solistas**:
  - Se usan las asignaciones individuales en `musicianAssignments` (`M-{id_musico}-{id_obra}` → array de `id_particella`), **no** el mapa `assignments` de contenedores.
  - Roster: `filteredRoster` de ProgramSeating (`isConfirmedConvocadoForSeatingReports`), misma regla que `otherMusicians` (no cuerdas, salvo solistas de cuerda).
  - Cada particella asignada a un músico presente suma **1** al tope.
- **Ajuste manual de copias**:
  - El valor calculado es un **tope**. En cada fila hay controles −/+ para bajar (p. ej. músicos con tablet) hasta 0; no se puede superar el tope.
  - La generación usa la cantidad efectiva (override o tope).

Los conteos se agregan por **obra + particella**, y se muestran como `efectivas/tope` en la UI del modal.  
Las filas (y el orden dentro del PDF unificado) se ordenan por `id_instrumento` (numérico-aware) y, en empate, por nombre de archivo.  
En la generación del PDF, el buffer de cada particella seleccionada se duplica tantas veces como copias efectivas tenga, de manera que el set resultante ya incluye todas las copias físicas.

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
- **Score / Director / partitura** (`id_instrumento` 50 o nombre con score/director/conductor/partitura): aparecen en la lista pero **no se tildan** al marcar la obra ni con «Seleccionar todo»; se pueden activar a mano.
- **Sin seating** (toggle **on** por defecto): lista particellas sin asignación (p. ej. arpa) con 1 copia; badge violeta. El header de cada obra muestra `{n} sin seating`.

#### Descarga de buffers
- Para cada particella seleccionada:
  - Si `url_archivo` contiene `drive.google.com`:
    - Se invoca `supabase.functions.invoke('manage-drive', { action: 'get_file_content', sourceUrl })`.
    - La Edge Function devuelve el archivo como `fileBase64`; el frontend lo convierte a `Uint8Array`.
  - En otros casos (p.ej. URL de Storage pública):
    - El frontend hace `fetch(url_archivo)` y transforma el resultado a `ArrayBuffer`/`Uint8Array`.

#### Unión de PDFs
- Se usa `mergeSequential` de `src/utils/docMerger.js`:
  - Se construye un arreglo de objetos `{ buffer, title? }` (uno por copia).
  - `mergeSequential` detecta tipo (PDF/imagen) y unifica todo en un único PDF.
  - Se genera **un PDF por obra**, que contiene todas las particellas seleccionadas y repetidas según el conteo de copias.
  - **Marcadores PDF (bookmarks/outline)**:
    - **Por obra**: un marcador por particella (si hay varias copias: `Nombre (i/n)`).
    - **Por músico · PDF por músico**: Portada + un marcador por obra (con part name si hay más de una parte en la misma obra).
    - **Por músico · PDF unificado**: un marcador por músico, con obras (y portada) anidadas.
    - Implementación: `attachPdfBookmarks` escribe el árbol `/Outlines` (UTF-16 vía `PDFHexString`, dest `/Fit`) y abre el panel con `PageMode /UseOutlines`.
    - Los PDF se guardan con `useObjectStreams: false` para que el outline no quede solo dentro de object streams (algunos editores online, p. ej. Smallpdf, no los muestran y dicen "No Bookmarks").
  - **Doble faz** (`padOddPages: true`, activo por defecto en el modal): tras cada ítem (copia) con cantidad de páginas impar, se inserta una hoja en blanco del mismo tamaño que la última página, para que la siguiente particella empiece en anverso al imprimir a doble faz. Las imágenes (1 página) también reciben hoja en blanco.

#### UI del modal (actualizado)
- Portal a `document.body`, `z-[100]`, overlay con blur; Escape / clic fuera cierra (si no está corriendo).
- Toolbar: Seleccionar todo / Limpiar, resumen de selección, toggles **1 por atril** (cuerdas) y **Doble faz**.
- Árbol de obras con checkbox indeterminado, badge de selección y filas en grilla (particella / asignado / **copias −/+** / archivo / copiar).
- Footer con hint de seating + estado de doble faz y CTA deshabilitado si no hay selección.

#### Progreso y resultado
- El modal muestra una barra de progreso basada en:
  - Descarga de cada particella.
  - Unión de PDFs por obra.
  - Subida de cada set a Drive **o** descarga local al navegador (`file-saver`).
- Enlace permanente a la carpeta de sets: `PARTICELLA_SETS_ROOT_URL`.
- Acciones por fila:
  - **Bajar**: descarga el PDF suelto al navegador.
  - **A Drive**: copia el archivo suelto a la carpeta de sets (`copy_file`), sin bajarlo al PC.
- Footer: **Descargar PDF** (sets unificados locales) y **Subir a Drive**.
- Al finalizar se muestra un listado de resultados por obra con:
  - Enlace clicable a Drive (`webViewLink`) cuando la subida/copia fue exitosa.
  - “Descargado” si fue local.
  - Mensaje de error por obra si falló.

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


