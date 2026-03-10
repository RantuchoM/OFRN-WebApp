# Spec: Valores en Cero para Exportación de Destaques

## Estado

Completado.

## Objetivo

Garantizar que todos los campos de importes monetarios en los PDFs de tipo **Destaque** se exporten con el valor `0.00`, eliminando cualquier monto calculado de viáticos o gastos, pero manteniendo la estructura y formato del documento.

## Cambios Técnicos

### ViaticosManager.jsx

- **Helper**: Se añadió `zeroDestaqueMonetaryFields(data)` para clonar un objeto de datos y poner en `0` los campos monetarios relevantes.
- **Masivos (`handleExportLocationBatch`)**:
  - En el mapeo de `richData`, cuando `options.destaque` está activo, se devuelve una versión del objeto enriquecido con todos los campos monetarios en `0` usando `zeroDestaqueMonetaryFields`.
- **Motor común (`processExportList`)**:
  - En el modo `master` y `location`, `appendPersonToDoc` ahora, si `options.destaque` es verdadero, llama a `exportViaticosToPDFForm` pasando una copia de `personData` con montos en `0`.
  - En el modo `individual`, antes de generar el PDF de tipo `"destaque"`, se crea una copia `destaqueData = zeroDestaqueMonetaryFields(personData)` y se pasa esa copia a `exportViaticosToPDFForm`.
- **Individuales (`handleExportToDrive`)**:
  - No se modifica la normalización base de datos (`selectedData`), pero al llegar a `processExportList` la ruta de destaques ya aplica el reseteo de montos.

### pdfFormExporter.js

- Se añadió un helper local `zeroDestaqueMonetaryFields(data)` que clona el registro y pone en `0` los campos de dinero (viáticos, gastos, totales, etc.).
- En `exportViaticosToPDFForm`:
  - Si `mode === "destaque"`, se construye `effectiveDataList` mapeando `viaticosData` con `zeroDestaqueMonetaryFields` antes de rellenar el PDF.
  - El helper `money(val)` ahora siempre usa `fmtMoney(val)`, por lo que, al recibir `0`, los campos se renderizan como `$ 0,00` en el formulario, en lugar de quedar vacíos.

## Reglas de Negocio

- Esta lógica solo aplica al documento de tipo **"Destaque"**.
- Los documentos de **"Viático"** y **"Rendición"** mantienen sus cálculos y montos originales.
- Los campos monetarios del PDF de Destaque:
  - **No** deben quedar vacíos.
  - Deben mostrar siempre `$ 0,00`.

