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
- [x] Imagen de firma en `plantilla_rendicion.pdf` (`firma_imagen`): recuadro 150×46 pt (antes 150×30), sin tapar TOTAL ni la leyenda «Firma del agente». Preview HTML en `RendicionForm.jsx` alineado (`maxHeight` 96px).
- [x] **PDF dual al cruzar franjas (2026-09-25):** si el viaje tiene ≥2 vigencias (`segmentosValorDiario`) y el % **no** es 0, se usa `plantilla_rendicion_multiples.pdf`. Un solo valor diario sigue `plantilla_rendicion.pdf`. Primer tramo (viejo): `dias_computados` + `valor_diario`. Segundo (nuevo): `dias_computados1` + `valor_diario1`. `valor_diario*` ya ponderado por el % (igual que la plantilla simple / `valorDiarioCalc`). Un solo `porcentaje_viatico`. La plantilla múltiple no tiene `dias_computados_total` ni `porcentaje` / `porcentaje1` (si aparecen, el exporter los rellena igual que en viáticos). Manual: el PDF recibe `segmentosValorDiario` desde `calcFinanciero`. La pantalla muestra los mismos rangos (fechas, días × valor y subtotal del tramo). Cada vigencia dura tres meses: el viaje tiene un tramo o dos, y las dos líneas de la plantilla alcanzan.
- [x] **Anticipo de viáticos calculado, no editable (2026-09-25):** en `/viaticos-manual` y en Rendiciones el anticipo de viáticos sale de los datos cargados (fechas, % , temporada e historial de vigencias). La celda Anticipado de Viáticos no es un input. No se conserva un importe escrito a mano.
- [x] **Temporada en el PDF (2026-09-25):** el tilde de temporada alta escribe `X` en `check_temporada` de la plantilla de rendición (el campo `porcentaje_temporada` no existe).
- [x] **Total del PDF = total de la tabla (2026-09-25):** `totales_ant` usa el `totalFinal` de la pantalla (incluye ceremonial). No se recalcula con la suma de la grilla de giras, que omite ceremonial.
