# Especificación Técnica: Unificación de Badges de Instrumentación

## Problema
Existen múltiples implementaciones de la lógica de cálculo y renderizado de instrumentación (Required vs Convoked) en `GiraRoster`, `ProgramRepertoire` y `ProgramSeating`. Esto causa discrepancias visuales y funcionales.

## Solución
1. **Centralizar la lógica de renderizado**: mover la lógica de `renderInstrumentationStandardDiff` (la versión de Seating que resalta cambios individuales) al componente `InstrumentationBadges.jsx`.
2. **Estandarizar el cálculo**: asegurar que todos usen `getInstrumentValue` y la misma lógica de agrupación de familias para construir los mapas `required` y `convoked`.
3. **Refactorizar vistas**: sustituir el código local en `GiraRoster` y `ProgramRepertoire` por el componente reutilizable `<InstrumentationBadges works={...} roster={...} />`.

## Archivos Afectados
- `src/components/instrumentation/InstrumentationBadges.jsx` (actualización de lógica y estilos).
- `src/views/Giras/GiraRoster.jsx` (limpieza de funciones duplicadas y uso del componente).
- `src/views/Giras/ProgramRepertoire.jsx` (limpieza de funciones duplicadas y uso del componente).
- `src/views/Giras/ProgramSeating.jsx` (archivo de referencia; mantiene la fuente original de comportamiento para sincronizar futuros cambios con el componente compartido).

## Comportamiento Unificado

- **Badges**:
  - Dos badges por bloque:
    - `Req:` → muestra el formato orquestal máximo requerido por las obras.
    - `Conv:` → muestra el formato orquestal de los músicos convocados.
  - Estilo visual:
    - Píldoras redondeadas, fondo gris claro, texto oscuro.
    - Dentro del texto, cada número de instrumento se representa como un "token" pequeño; los que difieren entre `Req` y `Conv` se resaltan con `bg-orange-200 text-black font-extrabold`.

- **Reglas de comparación**:
  - Para cada familia estándar:
    - `Fl, Ob, Cl, Fg, Cr, Tp, Tb, Tba, Har, Pno` → se comparan los valores enteros directos.
    - `Str` → se normaliza a presencia/ausencia (`0` o `1`) antes de comparar.
    - `Perc` → se compara el total combinado `Tim + Perc` (no cada campo por separado).

- **Modal de detalle**:
  - El componente central controla la apertura de `InstrumentationSummaryModal`, que recibe:
    - `works`: lista normalizada de obras con `instrumentacion_effective` o `instrumentacion`.
    - `required`: mapa de máximos calculado desde `works`.
    - `convoked`: mapa de convocados calculado desde `roster`.
  - El modal se abre al hacer click en cualquiera de los dos badges.

