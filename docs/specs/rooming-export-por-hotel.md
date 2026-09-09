# Spec: Export de rooming por hotel

## Objetivo
Poder exportar el rooming (quién en cada habitación, tipo, fechas) **filtrado o agrupado por hotel**, tanto en giras OFRN como en Hotelería FIMBA.

## UX

### OFRN (Giras → Rooming → Reportes → Reporte de habitaciones)
- Modal portal `z-[100]` (`RoomingReport.jsx`).
- Selector **Hotel**: Todos | cada hospedaje con habitaciones.
- **Imprimir / PDF**: respeta el filtro (un hotel o secciones por hotel).
- **Excel**: hojas `Habitaciones` + `Rooming plazas`; si hay varios hoteles y filtro = Todos, **una hoja extra por hotel** (plazas) para mandar a cada recepción.
- Util: `src/utils/ofrnRoomingExport.js`.

### FIMBA (Hotelería → Reportes / Excel rooming)
- En **Reporte de habitaciones** (`FimbaHoteleriaReports`): selector **Hotel** (Todos | cada hotel del catálogo usado por artistas).
- Vista, texto, PDF y Excel usan el mismo filtro.
- `exportFimbaRoomingExcel`: acepta `hotelKey`; con Todos y 2+ hoteles agrega hoja por hotel.
- Cabecera **Excel rooming** abre el reporte de habitaciones (con selector).

## Contenido exportado
- Habitación / tipo / extras (matrimonial, cuna OFRN).
- Ocupantes con check-in/out (OFRN: confirmados; FIMBA: inventario + artista).
- Columna Hotel / Artista según módulo.

## Checklist
- [x] OFRN: filtro por hotel + Excel + PDF + portal z-100
- [x] FIMBA: filtro por hotel en reporte rooming + Excel multi-hoja por hotel
- [x] Iconos desde `Icons.jsx`
- [x] Spec actualizada
