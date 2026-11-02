# Spec: Carga masiva de personas en Roster (Excel)

## Objetivo
Permitir dar de alta varias personas desde un Excel en el roster de gira: plantilla descargable con listas desplegables, validación previa e inserción en padrón + convocatoria a la gira.

## Estado
- [x] Utilidad `src/utils/rosterBulkImport.js` (plantilla ExcelJS + parse/validación).
- [x] Modal `src/components/giras/RosterBulkImportModal.jsx` (portal `z-[100]`).
- [x] Entrada en `GiraRoster` modo Individual: **Carga masiva (Excel)**.
- [x] Preview editable antes de importar (campos cargados y faltantes).
- [x] Columnas **Nota interna** y **Localidad** (residencia = `id_localidad`, no viáticos).
- [x] Alimentación vacía → `null` en DB (`alimentacionForDb`).

## Decisiones de producto
- Condición de alta: **`Invitado`** (igual que Crear Invitado Rápido).
- Cada fila válida: insert en `integrantes` **y** en `giras_integrantes` con `estado: "confirmado"`.
- Rol en gira: `inferDefaultTourRole` por instrumento; si no hay, `DEFAULT_ROL_ID` (`musico`).
- No se editan fichas existentes desde el Excel.
- No hay columna de condición/rol en la plantilla.
- Tras parsear el archivo, la tabla de preview es **editable**: se pueden corregir errores y completar datos faltantes (incluida nota interna y localidad de residencia) antes de Importar. `revalidateRosterImportRows` recalcula OK/errores (DNI duplicado en archivo / padrón).

## Columnas del Excel

| Header (fila 1) | Campo DB | Notas |
|---|---|---|
| Apellido | `apellido` | Obligatorio |
| Nombre | `nombre` | Obligatorio |
| Género | `genero` | Dropdown: `M`, `F`, `-` (enum DB). Vacío → null |
| Fecha de nacimiento | `fecha_nac` | `DD/MM/AAAA`, `AAAA-MM-DD` o serial Excel |
| DNI | `dni` | Duplicado en archivo o en padrón → error de fila |
| CUIL | `cuil` | Opcional |
| Teléfono | `telefono` | |
| Mail | `mail` | |
| Alimentación | `alimentacion` | Dropdown: `DIET_OPTIONS` (`src/utils/dietOptions.js`). Vacío → **null** |
| Instrumento | `id_instr` | Dropdown: nombres de `instrumentos`; se resuelve a id |

**Solo en el preview editable** (no van en la plantilla Excel/Sheets): `nota_interna` (texto libre) y `id_localidad` (residencia; no `id_loc_viaticos`). Si un archivo viejo trae esas columnas, el parser las acepta.

## Indicador de datos faltantes (Roster)
- En `GiraRoster`, mismo patrón visual que Transportes (`DataIntegrityIndicator`).
- Personas reales solamente (`!es_simulacion`); las vacantes no cuentan.
- Campos chequeados (`ROSTER_DOC_FIELDS`): Género, Fecha Nac., DNI, CUIL, Teléfono, Mail, Alimentación, Instrumento.
- Triángulo ámbar junto al nombre en cada fila (`RosterTableRow`); tooltip en portal arriba del icono (`z-[110]`) con lo faltante (`getMissingDocLabels`).
- Tooltip del indicador global: portal + bridge de hover (`h-2`).

## Alimentación
- Migración `20261017140000_…`: backfill histórico null/vacío/`General` → `Estándar`.
- Migración `20261017143000_…`: vuelve a permitir `null` (sin DEFAULT).
- Si no se carga en alta/Excel/ficha → `null`; Comidas sigue tratando null como Estándar; el indicador de Roster/fila marca «Alimentación» faltante.
- Helper `alimentacionForDb`: string vacío / blank → `null` (no forzar Estándar).

## Plantilla
- Hoja `Personas` + hoja oculta `_listas` (dietas A, instrumentos B, género C).
- `dataValidation` tipo lista sobre rangos de `_listas` (evita límite 255 chars del list inline).
- Descarga: `saveBlobFile` / `XLSX_MIME`.

## Flujo UI
1. Convocar → **Individual (Excel)** (acceso directo), o Individual → **Carga masiva (Excel)**.
2. Plantilla: **Descargar Excel** (dinámica) y/o **Plantilla Google Sheets** (`/copy`).
3. Subir `.xlsx` / `.xls` / `.csv` → preview editable (válidas / errores).
4. Corregir / completar celdas en la tabla (inputs + selects / `SearchableSelect` para instrumento y localidad).
5. Importar solo filas OK → toast resumen (creados / sumados / ya en gira / error).
6. Notificaciones ALTA en cola solo si ya hubo convocatoria inicial, notificaciones habilitadas y hay mail (mismo gate que alta manual).

## Plantilla Google Sheets (`/copy`)
- Sheet maestro: [OFRN - Plantilla carga masiva roster](https://docs.google.com/spreadsheets/d/1Ij9g_RGVLLJ5_m0IwMcgRVb0mzxJVlHE-ROMPgUa1QM/edit) (`1Ij9g_RGVLLJ5_m0IwMcgRVb0mzxJVlHE-ROMPgUa1QM`).
- Default en código: `ROSTER_BULK_SHEETS_DEFAULT_COPY_URL` → `…/copy` (override con `VITE_ROSTER_BULK_SHEETS_COPY_URL` en `.env` / Vercel; el front normaliza `/edit` → `/copy`).
- Compartido como **Cualquiera con el vínculo: Lector** (link público de `/copy`).
- UI modal: **Abrir plantilla Sheets** (`window.open` `/copy`) + **Copiar link** (`clipboard` del mismo URL).
- Fila 1 = `ROSTER_IMPORT_HEADERS` (mismas 10 columnas que el Excel). Hoja `_listas` + validación (Género / Alimentación / Instrumento / fecha). El Excel descargable de la app sigue siendo la fuente al día de instrumentos.
- Uso: Abrir / pegar link → «Hacer una copia» → completar → **Archivo → Descargar → Microsoft Excel (.xlsx)** → Subir archivo en el modal.

## Plantilla (detalle)
- Hoja `_listas` con `state: "hidden"` (no visible al abrir; se puede mostrar con «Mostrar» en Excel).
- Columna Género: lista `M` / `F` / `-`.
- Columna Fecha de nacimiento: `numFmt dd/mm/yyyy` + `dataValidation` tipo `date` (1900–2100, blank permitido).
- Nota interna y Localidad: solo en el editor de preview del modal.

## Archivos
- `src/utils/rosterBulkImport.js`
- `src/components/giras/RosterBulkImportModal.jsx`
- `src/views/Giras/GiraRoster.jsx` (botón + modal)
