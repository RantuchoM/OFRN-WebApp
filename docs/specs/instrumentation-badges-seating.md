# Spec: Badges de Instrumentación y Modal de Control en Seating

## Objetivo
Visualizar en tiempo real la diferencia entre la instrumentación técnica requerida por las obras y los músicos efectivamente convocados en la gira, directamente desde la vista de Seating del programa.

## Lógica de Cálculo

### 1. Instrumentación Máxima (Requerida) en Seating
- **No se usa** el string manual `obras.instrumentacion` para el número mostrado en auditoría de Seating.
- Por obra y por familia (`getEffectiveRequiredColumnMap`):
  1. **Particellas sin asignar** en esa familia → conteo real por archivos de parte (ej. 3 fagotes aunque solo 2 estén asignados).
  2. **Todas asignadas con consolidación** (varias partes en un músico) → músicos asignados (ej. 2 fagotes).
  3. Sin asignaciones de seating → `calculateInstrumentation(particellas)`.
- El **máximo de programa** (`Req`) es el máximo entre obras de esos mapas efectivos.

### 2. Colores de auditoría (Seating)

#### Fondo del badge (Req / Conv)
- **Verde** (`emerald`): `requerido == convocado` en todas las familias comparables (incl. total Tim+Perc).
- **Naranja**: alguna familia con `requerido ≠ convocado`.
- **Ámbar**: sin desajuste de instrumentación pero hay vacantes simuladas en roster.
- **Celeste**: orgánico marcado como revisado (`organico_revisado`).

#### Tokens dentro del badge
- **Naranja** (token): `requerido ≠ convocado` en esa familia.
- **Violeta** (token, solo badge `Req`): `requerido == convocado` **y** consolidación por asignación múltiple (`partsMax > required` en programa).
- **Neutro**: coincide sin reasignaciones.
- Prioridad: naranja gana sobre violeta.

#### Modal de detalle (celdas por obra)
- Misma semántica: naranja si `requerido > convocado`; violeta si `requerido == convocado` por asignación múltiple en esa obra.
- La fila Δ muestra `requerido − convocado` por columna; naranja solo si `> 0`.

### 3. Instrumentación Convocada
- Se cuenta el personal de la gira usando el hook `useGiraRoster` (roster ya resuelto para la gira actual).
- **Instrumento efectivo:** `giras_integrantes.id_instr` si existe; si no, `integrantes.id_instr` (ver `docs/specs/gira-instrument-override.md`). El roster expone `m.id_instr` y `m.instrumentos` ya normalizados.
- Se consideran únicamente músicos con:
  - `estado_gira === "confirmado"`.
  - Rol no incluido en `EXCLUDED_ROLES` (`staff`, `producción`, `chofer`, etc.).
- Para cada integrante se mapea su instrumento a una de las familias estándar (Fl, Ob, Cl, …).
- Cada músico suma `+1` en la familia correspondiente.
- Para la comparación con `Cuerdas`, el valor convocado se normaliza a `1` si hay al menos un integrante de cuerdas (`> 0`) y `0` si no hay ninguno.

### 4. Comparación y Alerta
- Se construyen dos mapas:
  - `required` → máximos por instrumento según asignaciones / particellas.
  - `convoked` → conteo de músicos convocados por familia.
- Percusión: comparar y mostrar siempre como total de instrumentistas (`Perc` / `Perc.xN`). No usar `Timp` en badges ni en strings generados por seating.

## Badges en ProgramSeating

### Ubicación
- En el header de `ProgramSeating` junto al título:
  - **Título**: `Seating & Particellas`.
  - **Badges**: alineados a la derecha del título en vista desktop y mobile.

### Contenido
- **Badge 1 (Requerido)**: texto `Req: [Formato Orquestal]`. Solo visible si el programa tiene al menos una obra.
- **Badge 2 (Convocado)**: texto `Conv: [Formato Orquestal]`. Visible también **sin obras** cuando hay músicos convocables en el roster (para planificar instrumentación en borrador).

### Visibilidad sin obras
- El estado borrador de la gira **no** oculta los badges.
- Sin obras, se muestra únicamente el badge **Conv** (el requerido no aplica hasta cargar repertorio).
- Sin obras, el badge **Conv** usa estilo **neutro** (blanco/gris): no naranja ni tokens resaltados, porque no hay requerido con qué comparar.

## Modal de Detalle: InstrumentationSummaryModal

- Tabla por obra / instrumento con la misma semántica de colores que los tokens del badge.
- Tooltip violeta: `Particellas en obra: N · Músicos asignados: M`.

## Utilidades (`src/utils/instrumentation.js`)
- `getEffectiveRequiredColumnMap` — requerido híbrido por obra (particellas vs músicos según estado de asignación).
- `instrumentationColumnMapToString` — mapa de columnas → string estándar.
- `calculateInstrumentationFromSeatingAssignments` — conteo por músico + `columnMap`.
- `getInstrumentationUnassignedFamilies` — familias con particellas sin asignar (alerta en columnas de seating, no colorea badges).
- `getInstrumentationConsolidatedFamilies` — familias cubiertas con menos músicos que partes.
- `maxInstrumentationColumnMap` — máximo de programa por slots de particella.
- `getPercComparableTotal` — total Tim+Perc en mapa de columnas.
- `parsePercussionTotalFromString` — total desde string (incl. legacy `Timp.+n`).
- `formatPercussionLabel` — `Perc` / `Perc.xN`.

## Estado Actual
- Implementación integrada en:
  - `src/views/Giras/ProgramSeating.jsx`
  - `src/components/seating/InstrumentationSummaryModal.jsx`
  - `src/utils/instrumentation.js`
  - `docs/specs/instrumentation-badges-seating.md`
