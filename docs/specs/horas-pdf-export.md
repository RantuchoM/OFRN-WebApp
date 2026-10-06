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
- `file-saver`, `jspdf`, `jspdf-autotable`
- El ZIP de nómina (solo **PDFs individuales**) reutiliza **PizZip**. No se agregó JSZip. Consolidados y Solo novedades no zipean: dos `<a download>` seguidos, con una pausa antes del segundo.

## Nómina PDF (rango, cuatro formatos, detalle)

- [x] Desde **Gestión de Horas**, el botón **PDF** abre un diálogo (portal a `document.body`, `z-[100]`).
- [x] Rango **desde / hasta** (mes y año). El mes visible en la grilla queda precargado en ambos extremos.
- [x] Cuatro modos, uno a la vez. Default: **PDFs individuales**.
- [x] **PDFs individuales** = el ZIP ya existente (`downloadHorasNominaRangeZip`): un PDF por mes y por área, nombres `Nomina_horas_Cultura_MM_AAAA.pdf` y `Nomina_horas_Educacion_MM_AAAA.pdf`. No cambia el empaquetado.
- [x] **2 PDFs consolidados**: dos descargas sueltas, sin ZIP (`Nomina_horas_Cultura_….pdf` y `Nomina_horas_Educacion_….pdf`). Un solo mes igual son dos PDF. Cada mes siguiente empieza en una página nueva (`doc.addPage()` antes del bloque del mes, no antes del primero).
- [x] **Un único PDF**: todo el rango en un archivo, con secciones rotuladas `Cultura — mes año` y `Educación — mes año`. Salto de página al cambiar de mes; Cultura y Educación del mismo mes siguen en la misma página si entran. El primer mes arranca en la primera página, debajo del título.
- [x] **Solo novedades**: dos descargas sueltas, sin ZIP (`Nomina_horas_novedades_Cultura_….pdf` y `…_Educacion_….pdf`). Cada archivo trae solo el texto de esa área, mes tras mes, sin tabla y sin salto de página forzado. El área y cada mes van rotulados. Sin novedades en un mes: `Sin novedades.` Si el área no tiene cambios en el rango, igual se descarga su PDF.
- [x] Checkbox **Detalle de novedades**, tildado por defecto. Si está destildado, el PDF con listado sale sin la sección. En Solo novedades queda tildado y deshabilitado: cada PDF es ese detalle. El detalle va debajo de cada listado (cada mes / cada sección) en los otros modos.
- [x] La grilla y la tabla del PDF muestran en cada celda con novedad `n (+m)` o `n (-m)`. Si el delta es 0, queda el valor vigente sin sufijo.

**Novedad:** diferencia, por concepto y por origen (`CULTURA` / `EDUCACION`), entre las horas vigentes de ese mes y las del mes calendario anterior. El saldo de un mes es el registro cuyo **mes de vigencia** (`anio_inicio` / `mes_inicio`) es el más reciente que ya empezó, no el de `created_at` más nuevo. `created_at` solo desempata dos filas del mismo mes de inicio. `n` es el valor vigente; `m` es ese delta.

- [x] Administración de Horas tiene URL propia: `/?tab=musicos&vista=horas`. Abrir la pantalla hace push de ese query; **Volver** lo saca con `replace`. El listado de Personas queda en `/?tab=musicos` sin `vista`. Cambiar de sección borra `vista` para no arrastrarla.

**Detalle** (`formatNovedadDetalleLine`): solo rubros con delta distinto de cero. Cada rubro lleva signo (`+3 coord`, `-9 des`). El neto de afuera es la suma algebraica de esos deltas. Etiquetas cortas en minúscula (`básico`, `ens`, `ensamb`, `cat`, `coord`, `des`, `otros`).
- Cambio (había horas y sigue habiendo): `Apellido, Nombre. Antes: 30 hs. Ahora: 33 hs. +3 hs (+3 coord)`. `Ahora = Antes + neto`.
- Alta (antes 0 y ahora hay horas): `Apellido, Nombre. Alta: 33 hs. +33 hs (+30 básico, +3 coord)`.
- Baja (había horas y ahora el total es 0): `Apellido, Nombre. Baja: 30 hs. -30 hs (-30 básico)`.
Sin novedades en ese mes/área: línea `Sin novedades.`

**Resumen** al final de cada bloque (ese mes y esa área):
- `Horas que subieron o bajaron: +N hs` / `-N hs`. Es la suma algebraica de los netos de las líneas de ese bloque (altas, bajas y cambios, Otros incluido porque la línea lo suma). Si hubo novedades y el neto da 0, se escribe `0 hs`. Si el bloque es `Sin novedades.`, esa línea no se escribe.
- `Total de horas pagadas: N hs`. Siempre, también sin novedades. Es el **Total general** de la grilla de ese mes y esa área: suma de horas vigentes menos Otros. No es el delta.
Va en Solo novedades (debajo de las personas de cada mes) y en el detalle bajo el listado (PDF único, consolidados e individuales).

La grilla sigue sumando ambos orígenes en las columnas de concepto; el sufijo de esas celdas es el delta de la suma. **Total Cult** y **Total Edu** muestran el delta de cada origen. El PDF de área no suma el otro origen.

| Archivo | Rol |
|--------|-----|
| `src/utils/horasNominaReport.js` | Filas del mes, formato de celda y línea de detalle |
| `src/utils/horasNominaTablePdf.js` | PDF por área, ZIP individual (sin cambiar), PDF único, y dos PDF sueltos en consolidados y en novedades por área |
| `src/views/Musicians/HorasNominaExportModal.jsx` | Diálogo: rango, cuatro formatos y checkbox |
| `src/views/Musicians/HorasCatedraDashboard.jsx` | Grilla y botón PDF |
