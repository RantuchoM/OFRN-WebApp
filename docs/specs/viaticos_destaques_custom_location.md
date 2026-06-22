# Spec: Lugar de Comisión Personalizado para Destaques Masivos

## Estado

Completado.

## Objetivo

Permitir que el usuario defina un "Lugar de Comisión" específico para el proceso de exportación de Destaques Masivos, que actúe como *fallback* o sobreescritura del lugar general de la gira, similar a la implementación actual del motivo.

## Cambios Técnicos

### ViaticosManager.jsx

- Extender el objeto `config` inicial para incluir `lugar_comision_destaques_exportacion`.
- Asegurar que `updateConfig` persista este valor en la tabla `giras_viaticos_config`.
- En `handleExportLocationBatch`, priorizar `config.lugar_comision_destaques_exportacion` sobre `config.lugar_comision` al construir el objeto `richData`.

### DestaquesLocationPanel.jsx

- Añadir un campo de entrada (input) en el header del panel, al lado del input de "Motivo Personalizado".
- Conectar el input a `globalConfig.lugar_comision_destaques_exportacion` y usar `onUpdateGlobalConfig` para los cambios.

## Reglas de Negocio

- Si `lugar_comision_destaques_exportacion` está presente, se usa para todos los PDFs de destaques generados masivamente.
- Si está vacío, se utiliza `config.lugar_comision` (el valor general de la gira).

### Listado por localidad (DestaquesLocationPanel)

- [x] Las localidades que son **sedes de la gira** (`giras_localidades` / `sedeIds` de `useLogistics`) se muestran al **final** del listado.
- [x] El checkbox **Todas las localidades**: 1.er clic selecciona solo localidades **no sede**; 2.º clic agrega las sedes locales; 3.er clic deselecciona todo.
- [x] Badge visual **Sede local** en grupos correspondientes.

### Cuadro de Firmas

- [x] La grilla PDF limita la altura vertical de cada celda/firma a un máximo de **1/6 de hoja A4** cuando hay pocas firmas, evitando que una fila única ocupe toda la página.
- [x] El cuadro puede descargarse también como **Word (.docx)** en una hoja A4, reutilizando el mismo cálculo de columnas/filas, proporciones y orden de personas del PDF.
- [x] En el DOCX, cada recuadro (borde + firma + DNI + aclaración) se exporta como **una sola imagen** por celda, evitando que Word separe firma y texto al editar.
- [x] Un único botón **Cuadro de firmas** ofrece elegir **PDF** o **Word** (destaques y transportes).
- [x] **Word + nota:** una sola opción para subir un `.docx`; las firmas se insertan al final del contenido (antes del `sectPr` del documento), con 2 líneas en blanco y sin salto de página forzado. Si Word repagina solo porque no entra el cuadro, queda en la hoja siguiente.
- [x] Carga de firmas para Word/PDF: timeout 25 s, hasta 3 reintentos, descargas en paralelo, acepta `application/octet-stream` (Storage) y log en consola si una firma falla (`Cuadro de firmas: …`).
- [x] Word sin margen extra: la grilla usa ancho **100%** del área útil (sin los 10 mm del PDF). En **Word + nota**, el layout se calcula con el ancho real entre márgenes del `.docx` host para que no desborde hacia la derecha.
- [x] Firmas **PNG** (p. ej. con transparencia) se conservan como PNG al rasterizar; el cuadro rehidrata `firma` desde `integrantes` antes de exportar.
- [x] **Word + nota:** al fusionar, solo se copian relaciones de imagen, se registran PNG/JPEG en `[Content_Types].xml` del host y la tabla usa ancho fijo en DXA (no `100%`).

## SQL

```sql
-- Ejecutar en el SQL Editor de Supabase
-- Añade la columna si no existe en la tabla de configuración
ALTER TABLE giras_viaticos_config 
ADD COLUMN IF NOT EXISTS lugar_comision_destaques_exportacion TEXT;
```

