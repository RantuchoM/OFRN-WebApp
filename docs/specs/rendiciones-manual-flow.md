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
- Vista `RendicionesManual.jsx` debe incluir una tabla con 4 columnas:
  - **Concepto**, **Anticipado**, **Rendido**, **Diferencia**.
- Importación:
  - Botón **"Importar Viático (CSV)"** para precargar la columna **Anticipado**.
- Diferencia:
  - Si rendido < anticipo → **Devolución**
  - Si rendido > anticipo → **Reintegro**

## 5. Exportación PDF
- Invocar `exportViaticosToPDFForm` con `mode: 'rendicion'`.
- `firma` siempre se envía como `null`.
