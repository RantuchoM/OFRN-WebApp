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
- [x] En exportación por localidad, **todos** los miembros del grupo usan el mismo día y horario general de la **ciudad de viáticos** (`headerInfo` / reglas de ruta de la localidad). La logística personal solo rellena huecos (`mergeTravelPreferringLocality`); no pisa fechas/horas grupales.
- [x] **Viático del lote (2026-09-23):** con **Viáticos** tildado y `porcentaje_destaques` **> 0**, el PDF usa el mismo prorrateo y plantilla dual que la tabla (`calcValorDiarioProporcional` → `exportViaticosToPDFForm`). Un solo % global del panel. **% = 0**: sin lógica dual. Destaque + viático en el mismo lote: el destaque sigue en $0; el viático conserva montos.
- [x] **Patente del lote (2026-09-25):** el PDF de destaque/viático por localidad usa la misma patente que el panel (header del bus → alguien del grupo con placa → logística personal / catálogo). Ya no depende solo de `giras_destaques_config.patente_oficial` ni de `patente_oficial` vacío en el detalle.
- [x] **Renuncia en destaque (2026-09-25):** con `porcentaje_destaques` = 0 y la opción tildada, el destaque pone **RENUNCIA A VIÁTICOS** en `gasto_anticipo`. El checkbox de exportación se ve con Destaques y/o Viáticos marcados.

### Recorridos y casos particulares

- [x] El modal permite definir un **lugar de comisión particular por localidad**, con prioridad sobre el cálculo automático del recorrido.
- [x] Un caso particular vacío conserva el cálculo normal; los recorridos guardados anteriormente siguen siendo compatibles.
- [x] La configuración se guarda en el mismo JSON de recorridos mediante `personalizados`, usando el ID numérico de localidad como clave.
- [x] El modal se renderiza mediante React Portal en `document.body` con `z-[100]`.
- [x] El estado editable se inicializa únicamente al abrir el modal; renders o cambios de referencia en la lista de localidades no descartan recorridos ni casos particulares aún sin guardar.

### Cuadro de Firmas

- [x] La grilla PDF limita la altura vertical de cada celda/firma a un máximo de **1/6 de hoja A4** cuando hay pocas firmas, evitando que una fila única ocupe toda la página.
- [x] El cuadro puede descargarse también como **Word (.docx)** en una hoja A4, reutilizando el mismo cálculo de columnas/filas, proporciones y orden de personas del PDF.
- [x] En el DOCX, cada recuadro (borde + firma + DNI + aclaración) se exporta como **una sola imagen** por celda, evitando que Word separe firma y texto al editar.
- [x] Un único botón **Cuadro de firmas** ofrece elegir **PDF** o **Word** (destaques y transportes).
- [x] **Word + nota:** una sola opción para subir un `.docx`; las firmas se insertan al final del contenido (antes del `sectPr` del documento), con 2 líneas en blanco y sin salto de página forzado. Si Word repagina solo porque no entra el cuadro, queda en la hoja siguiente.
- [x] Carga de firmas para Word/PDF: timeout 25 s, hasta 3 reintentos, descargas en paralelo, acepta `application/octet-stream` (Storage) y log en consola si una firma falla (`Cuadro de firmas: …`).
- [x] **Márgenes de hoja (2026-09-25):** PDF y Word standalone usan **12 mm** en los cuatro lados (rango de impresión 10–15 mm). La grilla se calcula sobre el área útil para no achicar nombres. **Word + nota** no suma margen extra de grilla: usa los márgenes del `.docx` host.
- [x] **Espacio encima de firmas (2026-09-25):** tres **Enters** (párrafos vacíos, 8 mm de alto cada uno) **encima** del bloque de firmas, en PDF y Word. No hay renglones dibujados (`drawLine`) ni tabla de 3 filas con borde inferior. **Word + nota** conserva las 2 líneas en blanco del merge (después del contenido host) y además incluye esos 3 Enters antes de la grilla.
- [x] **Menores no firman (2026-09-25):** si `integrantes.fecha_nac` implica edad **&lt; 18** (misma regla que la columna **MENOR** de CNRT / `transportExport.js`), la persona **sigue en la hoja** (nombre + DNI) pero **sin recuadro ni imagen de firma**. Etiqueta gris «Menor» en el lugar de la firma. No existe columna `es_menor` ni plaza infantil; el «inf.» de transporte/viáticos es **subida inferida** (loc. viáticos ≠ residencia), no infante. Si falta `fecha_nac`, se rehidrata desde `integrantes` y no se asume menor.
- [x] Firmas **PNG** (p. ej. con transparencia) se conservan como PNG al rasterizar; el cuadro rehidrata `firma` desde `integrantes` antes de exportar.
- [x] **Word + nota:** al fusionar, solo se copian relaciones de imagen, se registran PNG/JPEG en `[Content_Types].xml` del host y la tabla usa ancho fijo en DXA (no `100%`).

## SQL

```sql
-- Ejecutar en el SQL Editor de Supabase
-- Añade la columna si no existe en la tabla de configuración
ALTER TABLE giras_viaticos_config 
ADD COLUMN IF NOT EXISTS lugar_comision_destaques_exportacion TEXT;
```

