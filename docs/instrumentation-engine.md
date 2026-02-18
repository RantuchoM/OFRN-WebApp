# Especificación Técnica: Motor de Filtro de Instrumentación Analítica

## 1. Propósito
Permitir la búsqueda de obras mediante operadores lógicos aplicados a la plantilla de instrumentos (ej. `=2 ob`, `>1 cl`, `3 tr`).

## 2. Lógica de Parseo
El motor debe descomponer el string de búsqueda en:
- **Operador**: `=`, `>`, `<`, `>=` o `<=` (por defecto `=` si no se especifica).
- **Cantidad**: El número de instrumentos requeridos.
- **Instrumento**: El código o abreviatura (fl, ob, cl, fg, cr, tr, tb, tu, timb, perc, arpa, pf).

## 3. Mapeo de Columnas
La búsqueda debe iterar sobre las columnas específicas de la tabla `obras`:
- `viento_madera` (array o objeto según esquema).
- `viento_metal`, `percusion`, `otros`.
*Nota: El filtro debe comparar la cantidad ingresada con el valor numérico guardado en la columna correspondiente del instrumento.*

## 4. Integración
Este filtro debe coexistir con el filtro de texto por título o compositor.