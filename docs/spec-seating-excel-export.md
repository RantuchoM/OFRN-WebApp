## Spec: Exportación de Seating a Excel

### Objetivo
Permitir a los coordinadores y al equipo de difusión descargar la planilla de seating y asignación de particellas en formato .xlsx para facilitar la edición externa y el control de archivo.

### Componentes Afectados
1. **ProgramSeating.jsx**: 
   - Añadir función `handleExportExcel`.
   - Incluir botón de Excel junto al de PDF.
2. **GiraDifusion.jsx**:
   - Añadir sección de "Descargas de Gestión" o integrar en el menú de acciones para permitir el archivo Excel.

### Estructura del Reporte
El Excel debe contener dos hojas (o una tabla claramente dividida):
- **Cuerdas**: Mapeo de contenedores (filas) y obras (columnas).
- **Vientos y Percusión**: Músicos (filas) y obras (columnas) con el nombre de la particella asignada.

### Lógica de Implementación
Se utilizará la función `exportToExcel` definida en `src/utils/excelExporter.js`, transformando el estado actual de `assignments` y `containers` en un formato JSON compatible.

### Estado
- Implementado en `ProgramSeating.jsx` y `GiraDifusion.jsx` utilizando `exportToExcel` y limpiando etiquetas HTML de los títulos de las obras antes de usarlos como cabeceras en el Excel.

