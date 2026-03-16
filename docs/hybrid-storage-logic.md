## Spec: Lógica Híbrida de Manipulación de Archivos (Copy vs Process)

### 1. Operaciones de Servidor (Copy)

Se utilizan cuando queremos **organizar archivos en Drive sin modificar su contenido**, aprovechando que Google puede copiar elementos internamente sin que los bytes pasen por Supabase ni por el navegador.

- **Acción**: `copy_file` en `manage-drive`.
- **Endpoint Google**: `POST https://www.googleapis.com/drive/v3/files/{fileId}/copy`.
- **Flujo**:
  - El cliente invoca la Edge Function `manage-drive` con:
    - `action: "copy_file"`.
    - `fileId`: ID del archivo original en Drive.
    - `destinationFolderId`: ID de la carpeta destino en Drive.
    - `newName` (opcional): nombre del archivo copiado.
  - La Edge Function llama a `drive.files.copy` (Server-Side), que realiza la copia íntegramente en la infraestructura de Google.
- **Consumo de egress Supabase**: **prácticamente cero** (solo se envían instrucciones de texto a la API de Drive).

> Compatibilidad: `copy_file` también soporta el formato legacy `{ sourceUrl, targetParentId, newName }`, pero se recomienda el uso directo de `fileId`/`destinationFolderId`.

### 2. Operaciones de Cliente (Process)

Se utilizan cuando necesitamos **manipular bytes** (unir PDFs, rellenar formularios, etc.). En estos casos el navegador descarga los archivos, los procesa localmente y solo sube el resultado final.

- **Auth**: El cliente solicita un **token temporal** mediante:
  - Acción `get_temp_token` en `manage-drive`.
  - La Edge Function devuelve:
    - `accessToken`: token OAuth de corta duración, con scopes de lectura/escritura sobre el Drive configurado (definidos en el refresh token del backend).

- **Transferencia y procesamiento**:
  1. El cliente llama a `get_temp_token` y obtiene `accessToken`.
  2. El navegador descarga los archivos directamente desde Google:
     - `GET https://www.googleapis.com/drive/v3/files/{fileId}?alt=media` con header `Authorization: Bearer {accessToken}`.
  3. El procesamiento se hace **en el frontend** (por ejemplo con `pdf-lib`):
     - Merge de PDFs.
     - Relleno de formularios.
     - Composición de documentos más complejos.
  4. El resultado final se sube **directamente a Drive** desde el navegador:
     - `POST https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink`.
     - Cuerpo `FormData` con:
       - `metadata`: JSON con `name` y `parents` (carpeta destino).
       - `file`: `Blob` con el PDF generado.

- **Consumo de egress Supabase**:
  - **0 bytes de documento**: Supabase solo participa para emitir el token temporal y, opcionalmente, devolver metadatos ligeros.
  - Todo el tráfico de bytes de los PDFs (descarga y subida) ocurre **entre navegador y Google Drive**.

### 3. Aplicación en Componentes Clave

#### 3.1. `ParticellaDownloadModal.jsx`

- **Copy (simple)**:
  - Para copiar una particella individual sin modificarla:
    - El cliente llama a `manage-drive` con:
      - `action: "copy_file"`.
      - `fileId`: ID extraído de la URL de Drive de la particella.
      - `destinationFolderId`: carpeta fija de sets de particellas (`PARTICELLA_SETS_ROOT_ID`).
      - `newName`: nombre limpio para la copia.
  - Google Drive realiza la copia internamente (server-side), sin descargar el archivo.

- **Process (Set Unificado)**:
  - Descarga de cada particella directamente desde Drive usando `get_temp_token`.
  - Unificación de PDFs en el navegador con `pdf-lib` / `mergeSequential`.
  - Subida del PDF unificado directamente a Drive usando el `accessToken` (multipart upload).
  - Resultado: Supabase no ve los bytes de las particellas ni del set final.

#### 3.2. `ViaticosManager.jsx`

- **Generación de PDFs (Viáticos / Destaques / Rendiciones)**:
  - El cálculo de datos y el armado de PDFs se hace en el **frontend** usando `exportViaticosToPDFForm`.
  - Cuando hace falta combinar documentación con PDFs ya existentes en Drive:
    - Se obtiene un `accessToken` con `get_temp_token`.
    - El navegador descarga los PDFs desde Drive usando `alt=media`.
    - Se unifican los documentos en memoria con `pdf-lib`.
  - Subida del resultado final:
    - Directamente a la carpeta de la gira (`link_drive` en `giras_viaticos_config`, que almacena el **ID de carpeta de Drive**).
    - Usando multipart upload con el `accessToken`.

- **Copia de documentación existente**:
  - Si la fuente es un archivo en Drive: se usa `copy_file` en el backend (server-side `files.copy`).
  - Si la fuente es una URL de Supabase Storage (`supabase.co`): se sigue usando `upload_from_url` en la Edge Function para subir a Drive.

### 4. Esquema y Campos Clave

- En tablas de obras:
  - Usar siempre el campo **`link_drive`** como fuente de verdad para la carpeta/archivo asociado en Drive.
  - Los IDs de Drive se extraen de `link_drive` cuando hace falta trabajar a nivel `fileId`.

- En configuración de viáticos:
  - `giras_viaticos_config.link_drive` almacena el **ID de la carpeta de Drive** de la gira (no la URL completa).
  - El frontend usa directamente ese ID como `parentId` al subir PDFs con el token temporal.

### 5. Principios de Diseño

- **Copy en servidor, Process en cliente**:
  - Operaciones de copia/organización → `copy_file` en Edge Function (Google hace el trabajo).
  - Operaciones que requieren leer/escribir bytes → navegador con token temporal y `pdf-lib`.

- **Minimizar egress de Supabase**:
  - Supabase actúa como **orquestador** (credenciales, IDs de carpeta, metadatos).
  - El navegador gestiona las descargas/subidas pesadas directamente con Drive.

- **Compatibilidad progresiva**:
  - Los endpoints legacy (`upload_file`, `get_file_content`, etc.) se mantienen para no romper flujos antiguos.
  - Los flujos nuevos deben preferir siempre:
    - `get_temp_token` + llamadas directas a Drive para procesamiento.
    - `copy_file` (server-side) para copias simples dentro de Drive.

