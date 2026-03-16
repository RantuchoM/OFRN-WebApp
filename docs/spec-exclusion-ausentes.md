# Spec: Exclusión de Ausentes en Exportaciones Universales

## Objetivo
Garantizar que ningún integrante marcado con `estado_gira === 'ausente'` aparezca en los documentos generados (Excel de Viáticos y PDF de Agenda/Roster) desde la vista de GiraRoster.

## Lógica de Aplicación
1. **GiraRoster.jsx**: Antes de invocar a `exportViaticosToExcel` o cualquier exportador de PDF, se debe aplicar un filtro `.filter(m => m.estado_gira !== 'ausente')`.
2. **Excel Exporter**: Validar que la data recibida no procese hojas para ausentes.
3. **Agenda PDF**: Los eventos o listados asociados a la gira deben omitir referencias a personal no asistente.

## Dependencias
- Hook `useGiraRoster`: Provee el estado `estado_gira` derivado de la tabla `giras_integrantes`.

## Archivos modificados
- `src/views/Giras/GiraRoster.jsx`
- `src/utils/excelExporter.js`
- `src/utils/agendaPdfExporter.js`

