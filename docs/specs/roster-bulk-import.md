# Spec: Carga masiva de personas en Roster (Excel)

## Objetivo
Permitir dar de alta varias personas desde un Excel en el roster de gira: plantilla descargable con listas desplegables, validación previa e inserción en padrón + convocatoria a la gira.

## Estado
- [x] Utilidad `src/utils/rosterBulkImport.js` (plantilla ExcelJS + parse/validación).
- [x] Modal `src/components/giras/RosterBulkImportModal.jsx` (portal `z-[100]`).
- [x] Entrada en `GiraRoster` modo Individual: **Carga masiva (Excel)**.

## Decisiones de producto
- Condición de alta: **`Invitado`** (igual que Crear Invitado Rápido).
- Cada fila válida: insert en `integrantes` **y** en `giras_integrantes` con `estado: "confirmado"`.
- Rol en gira: `inferDefaultTourRole` por instrumento; si no hay, `DEFAULT_ROL_ID` (`musico`).
- No se editan fichas existentes desde el Excel.
- No hay columna de condición/rol en la plantilla.

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
| Alimentación | `alimentacion` | Dropdown: `DIET_OPTIONS` (`src/utils/dietOptions.js`) |
| Instrumento | `id_instr` | Dropdown: nombres de `instrumentos`; se resuelve a id |

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


## Plantilla
- Hoja `Personas` + hoja oculta `_listas` (dietas A, instrumentos B, género C).
- `dataValidation` tipo lista sobre rangos de `_listas` (evita límite 255 chars del list inline).
- Descarga: `saveBlobFile` / `XLSX_MIME`.

## Flujo UI
1. Convocar → **Individual (Excel)** (acceso directo), o Individual → **Carga masiva (Excel)**.
2. Plantilla: **Descargar Excel** (dinámica) y/o **Plantilla Google Sheets** (`/copy`).
3. Subir `.xlsx` / `.xls` / `.csv` → preview (válidas / errores).
4. Importar solo filas OK → toast resumen (creados / sumados / ya en gira / error).
5. Notificaciones ALTA en cola solo si ya hubo convocatoria inicial, notificaciones habilitadas y hay mail (mismo gate que alta manual).

## Plantilla Google Sheets (`/copy`)
1. Crear un Sheet maestro con las mismas columnas que `ROSTER_IMPORT_HEADERS` (fila 1).
2. Hoja auxiliar (p. ej. `_listas`) con Género / Alimentación / Instrumentos; validación de datos tipo lista en las columnas correspondientes (se puede copiar desde el Excel generado por la app).
3. Compartir el maestro como **Cualquiera con el enlace: Lector**.
4. En `.env` / Vercel:
   `VITE_ROSTER_BULK_SHEETS_COPY_URL=https://docs.google.com/spreadsheets/d/<ID>/copy`
   (también acepta un URL `/edit`; el front lo normaliza a `/copy`).
5. Uso: el botón abre «Hacer una copia» → el usuario completa su copia → **Archivo → Descargar → Microsoft Excel (.xlsx)** → Subir archivo en el modal.
6. Mantener la lista de instrumentos del Sheet a mano cuando cambie el catálogo (el Excel descargable siempre sale al día).

## Plantilla (detalle)
- Hoja `_listas` con `state: "hidden"` (no visible al abrir; se puede mostrar con «Mostrar» en Excel).
- Columna Género: lista `M` / `F` / `-`.
- Columna Fecha de nacimiento: `numFmt dd/mm/yyyy` + `dataValidation` tipo `date` (1900–2100, blank permitido).

## Archivos
- `src/utils/rosterBulkImport.js`
- `src/components/giras/RosterBulkImportModal.jsx`
- `src/views/Giras/GiraRoster.jsx` (botón + modal)
