# Especificación Técnica: Exportación de Seating a Excel

## Objetivo
Permitir la descarga del Seating de un programa en formato `.xlsx`, replicando la estructura del reporte PDF actual:

1. **Tabla de Cuerdas (Grupos/Contenedores)**.
2. **Tabla de Asignación de Particellas (Vientos y Otros)**.

## Lógica de Datos
- **Librería**: `exceljs` para la generación del workbook/buffer y `file-saver` para la descarga.
- **Filtros**:
  - Excluir roles definidos en `EXCLUDED_ROLES`.
  - Excluir músicos con `estado_gira === "ausente"` o `"baja"`.
  - Excluir músicos de cuerdas (01–04) y músicos ya presentes en los contenedores de Seating de la sección de cuerdas.
- **Estructura**:
  - **Header**: Nombre de la gira y programa con estilo destacado, más fecha de generación.
  - **Sección 1 (Cuerdas)**: Columnas representadas por los nombres de los `containers`. Filas representadas por los músicos de cada atril, en el mismo orden visual que en la UI/PDF.
  - **Sección 2 (Vientos/Asignaciones)**: Tabla cruzada entre Músico (filas) y Obras (columnas), mostrando el nombre de la particella asignada por obra.

## Estilos
- **Encabezados** con fondo azul oscuro (`#1e293b` / `#1f2937`) y texto blanco.
- **Fila de título de documento** con fondo azul oscuro (`#1e293b`) y tipografía en negrita.
- **Alternancia de colores en filas** para mejorar la legibilidad (banding).
- **Bordes finos** en todas las celdas de tablas.
- **Celdas con ajuste de texto (wrap text)** para títulos de obras largos y cabeceras de columnas.
- **Autoajuste de anchos de columna** en base al contenido, con límites razonables.

## Implementación

- **Archivo de utilidad**: `src/utils/seatingExcelExporter.js`
  - Exporta la función:
    - `exportSeatingToExcel(supabase, gira, localRepertorio, roster, assignments, containers, particellas)`
  - Responsabilidades:
    - Construir un `Workbook` y una hoja `"Seating"`.
    - Generar:
      - **Sección 1**: tabla de disposición de cuerdas a partir de `containers` (nombre de contenedor como columna, músicos por fila).
      - **Sección 2**: tabla de asignación de particellas (vientos y otros) utilizando:
        - `localRepertorio` para derivar la lista de obras.
        - `roster` filtrado con la misma lógica que el PDF/Componente (`EXCLUDED_ROLES`, `estado_gira`, cuerdas, etc.).
        - `assignments` (map `M-{id_musico}-{id_obra}`) y `particellas` para resolver el nombre de cada particella por celda.
    - Aplicar los estilos descritos arriba y ejecutar `writeBuffer` + `saveAs` para descargar `Seating_{nomenclador}.xlsx`.

- **Integración UI**: `src/views/Giras/ProgramSeating.jsx`
  - Nuevo import:
    - `import { exportSeatingToExcel } from "../../utils/seatingExcelExporter";`
  - Nuevo handler:
    - `handleExportExcel` que llama a `exportSeatingToExcel` pasando:
      - `supabase`, `program`, `effectiveBlocks`, `filteredRoster`, `assignments`, `containers`, `particellas`.
    - Reutiliza el estado `isExporting` para mostrar el overlay de carga.
  - Nuevo botón en el header, junto al botón de PDF:
    - Icono: `IconDownload`.
    - Texto: `"Excel"`.
    - Estilo: botón primario en verde (`bg-emerald-600` / `hover:bg-emerald-700`), mismo patrón de tamaño que el botón de reporte PDF.

## Estado

- **Implementación completada**:
  - Utilidad `exportSeatingToExcel` creada y estilada con `exceljs`.
  - Integración de exportación a Excel disponible desde `ProgramSeating` mediante un botón dedicado.
  - Lógica de filtrado y estructura de datos alineada con:
    - `src/utils/seatingPdfExporter.js`
    - `src/views/Giras/ProgramSeating.jsx`

