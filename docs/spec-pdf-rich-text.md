# Spec: Soporte de Texto Enriquecido en Exportación de Agenda PDF

## Objetivo
Permitir que las descripciones y notas de la agenda que contienen etiquetas HTML básicas (`<b>`, `<i>`, `<u>`) se rendericen correctamente en el PDF generado, en lugar de ser limpiadas o mostradas como texto plano.

## Lógica de Implementación

1. **Parser de Segmentos**: Crear una función utilitaria que convierta un string con tags en un array de objetos: `[{ text: 'Hola ', bold: true }, { text: 'mundo', bold: false }]`.
2. **Cálculo de Espaciado**: Al renderizar cada segmento, se debe calcular el ancho del texto ya impreso mediante `doc.getTextWidth()` para posicionar el siguiente segmento en la misma línea.
3. **Preservación de Layout**: La función de dibujo debe retornar el desplazamiento total de altura (Y) para no superponerse con el siguiente evento de la agenda.
4. **Fallback**: Si el tag no es reconocido, renderizar como texto plano para evitar pérdida de información.

## Restricciones
- No utilizar librerías externas pesadas (como html2canvas) para mantener el PDF ligero y rápido.
- Mantener compatibilidad con los estilos de fuente actuales de la OFRN.

---

## Estado de Implementación

- [x] **Parser de segmentos** (`parseRichText`) en `agendaPdfExporter.js`: convierte HTML en array de `{ text, bold, italic, underline }`.
- [x] **drawRichText(doc, text, x, y, maxWidth)** con retorno de altura: dibuja segmento a segmento usando `doc.setFont(undefined, 'bold'|'italic'|'normal')` y `doc.getTextWidth` / `doc.splitTextToSize` para el ancho por estilo.
- [x] **Cálculo de altura** (`getRichTextHeight`) para `minCellHeight` en la columna "Descripción", de modo que los eventos multilínea con formato no se pisen.
- [x] **Integración en didParseCell**: si la descripción contiene `<b>`, `<i>` o `<u>`, se guarda en `descRaw`, se calcula `minCellHeight` y se deja `cell.text = ''` para dibujar en didDrawCell.
- [x] **Integración en didDrawCell**: para la columna desc con `descRaw`, se llama a `drawRichText` con las coordenadas y ancho de la celda.
- [x] **Fallback**: texto sin tags o con tags no reconocidos se renderiza como texto plano (sin pérdida de información). El tag `<u>` se reconoce en el parser; el subrayado visual no se dibuja en jsPDF por limitación de la librería.

---

## Manual de Uso

### Tags soportados en la exportación PDF de la agenda

| Tag   | Efecto en el PDF        | Notas                          |
|-------|-------------------------|--------------------------------|
| `<b>` / `</b>` | **Negrita**             | Usa `doc.setFont(undefined, 'bold')`. |
| `<i>` / `</i>` | *Cursiva*               | Usa `doc.setFont(undefined, 'italic')`. |
| `<u>` / `</u>` | Reconocido, sin efecto  | El texto se muestra; jsPDF no dibuja subrayado en este flujo. |

- Cualquier otra etiqueta se ignora y el contenido se muestra como texto plano (fallback).
- Los eventos sin etiquetas se exportan igual que antes (texto plano en la celda "Descripción").
- No se ha modificado la lógica de filtrado de integrantes ausentes ni el flujo de autenticación.

### Dónde se aplica

- **Columna "Descripción"** de la tabla de la agenda en el PDF generado por `exportAgendaToPDF` (`src/utils/agendaPdfExporter.js`).
- Las descripciones provienen de `evt.descripcion` o `evt.tipos_evento?.nombre`; si contienen `<b>` o `<i>`, se detectan y se dibujan con la nueva lógica.
