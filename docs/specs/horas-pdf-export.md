# Spec: Notas de Horas Cátedra (plantilla Word)

## Objetivo

Descargar o subir a Drive el **Word rellenado** (`.docx`) por cada registro del historial. La plantilla está en `public/plantillas/modelo_horas.docx`; **docxtemplater** sustituye los campos entre `[corchetes]`.

## Plantilla Word

- Ruta servida: `/plantillas/modelo_horas.docx` (archivo en `public/plantillas/modelo_horas.docx`).
- Marcadores con **corchetes** (un solo bloque por campo en Word, sin partir el texto a mitad de un marcador):
  - `[fecha_hoy]`, `[tipo_cambio_con_articulo]`, `[fecha_novedad_primero_de_mes]`, `[nombre_y_apellido]`, `[nro_dni]`, `[horas_previas]`, `[horas_cambio]`, `[horas_actuales]`
- Motor de relleno: **docxtemplater** + **PizZip** (`delimiters` `[` `]`).
- `[fecha_novedad_primero_de_mes]`: vigencia del cambio en texto, p. ej. `01 de marzo de 2026` (`formatFechaNovedadPrimero`).

## Flujo técnico

1. `fetch` de `/plantillas/modelo_horas.docx` → **docxtemplater** aplica los datos → **Blob .docx**.
2. **Descarga**: `file-saver` con nombre `buildHorasNotaDocxFilename(...)`.
3. **Drive**: `uploadHorasNotaToDrive(supabase, docxBlob, fileName, HORAS_NOTA_DOCX_MIME)`.

En `horasPdfExporter.js` siguen existiendo utilidades opcionales para PDF a partir de texto (p. ej. `exportNotaHoraPdfBlob`) si se necesitan en otro flujo; el dashboard de Horas usa solo Word.

## Implementación

| Archivo | Rol |
|--------|-----|
| `src/utils/horasPdfExporter.js` | `buildFilledHorasDocxBlob`, `exportNotaHoraPdfBlob`, descarga/subida |
| `public/plantillas/modelo_horas.docx` | Plantilla (la aporta el equipo) |
| `src/views/Musicians/HorasCatedraDashboard.jsx` | Botones Word / Drive en el historial |

## Lógica de negocio (tipo de cambio)

Igual que antes: totales por conceptos, registro previo mismo origen; `horas_cambio` = diferencia absoluta entre totales.

## Dependencias

- `docxtemplater`, `pizzip`, `mammoth` (solo `extractRawText` para el PDF)
- `file-saver`, `jspdf`
