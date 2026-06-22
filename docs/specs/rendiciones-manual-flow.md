# Spec: Flujo de Rendiciones Manuales y Persistencia Compartida

## 1. Navegación y Header
- Implementar un **Header de Utilidades** en ambas vistas (`/viaticos-manual` y `/rendiciones-manual`).
- Botón conmutador (tabs) para alternar entre **Viáticos** y **Rendiciones**.
- El Header debe mostrar un indicador de **"Datos sincronizados"** si existe información en el storage.

## 2. Persistencia (localStorage)
- Ambas vistas deben escuchar y escribir en la **misma clave** de `localStorage`.
- Si el usuario completa sus datos personales en la página de Viáticos, al cambiar a Rendiciones, esos campos deben aparecer ya completados.
- **Clave**: `ofrn_manual_viatico_data`

## 3. Exportación de Datos para Rendición (CSV)
- En `ViaticosManual.jsx`, añadir botón: **"Exportar Datos (CSV)"**.
- Este CSV contiene **todos los campos actuales** del formulario + cálculos (`dias_computables`, `valorDiarioCalc`, `subtotal`, `totalGastos`, `totalFinal`).
- Objetivo: que la oficina pueda guardar el archivo y cargarlo semanas después en Rendiciones.

## 4. Lógica de Rendición Manual
- Vista `RendicionesManual.jsx` debe incluir una tabla con columnas:
  - **Concepto**, **Anticipado**, **Rendido**, **Devolución**, **Reintegro**.
- Importación:
  - Botón **"Importar Viático (CSV)"** para precargar la columna **Anticipado**.
- Devolución / Reintegro (mutuamente excluyentes; la columna sin saldo muestra **$0,00**):
  - Si rendido < anticipo → monto en **Devolución**, **$0,00** en Reintegro.
  - Si rendido > anticipo → **$0,00** en Devolución, monto en **Reintegro**.
  - Si rendido = anticipo → **$0,00** en ambas columnas.
- [x] Util compartido `src/utils/rendicionDiff.js` usado en **export PDF rendición**, `RendicionForm`, `RendicionesManual` y formularios de exportación.
- [x] **ViaticosTable** y **DestaquesLocationPanel** mantienen una sola fila de **diferencia** (estimado − rendido) en la UI; el desglose devolución/reintegro aplica solo al PDF de rendición.
- [x] `RendicionesManual` calcula devolución/reintegro con `calcDevolucionReintegro`; la vista no depende de helpers locales inexistentes.

## 5. Exportación PDF
- Invocar `exportViaticosToPDFForm` con `mode: 'rendicion'`.
- `firma` siempre se envía como `null`.
- [x] En rendición, el anticipo de viáticos en **$0** se exporta como monto **$0,00** (no «RENUNCIA A VIÁTICOS»; esa leyenda solo aplica al PDF de **viático** al 0% si está marcada la opción).
- [x] Columnas devolución/reintegro del PDF: placeholder **$0,00** en el lado sin saldo.
