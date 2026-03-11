# Spec: Badges de Instrumentación y Modal de Control en Seating

## Objetivo
Visualizar en tiempo real la diferencia entre la instrumentación técnica requerida por las obras y los músicos efectivamente convocados en la gira, directamente desde la vista de Seating del programa.

## Lógica de Cálculo

### 1. Instrumentación Máxima (Requerida)
- Se itera sobre **todas las obras** del programa (bloques de repertorio incluidos).
- De cada obra se toma el campo `instrumentacion` (string estándar, tipo `2.2.2.2 - 4.3.3.1 - Timp+2 Perc - Hp - Key - Str`).
- Para cada instrumento de la grilla:
  - Fl (Flautas)  → clave `fl`
  - Ob (Oboes)    → clave `ob`
  - Cl (Clarinetes) → clave `cl`
  - Fg (Fagotes)  → clave `bn`
  - Cr (Corni)    → clave `hn`
  - Tp (Trompetas) → clave `tpt`
  - Tb (Trombones) → clave `tbn`
  - Tba (Tuba / Bombardino) → clave `tba`
  - Tim (Timbales) → clave `timp`
  - Perc (Percusión) → clave `perc`
  - Har (Arpa) → clave `harp`
  - Pno (Piano / Teclados / Celesta / Órgano) → clave `key`
  - Cuerdas (sección completa) → clave `str`
- Se usa `getInstrumentValue(work.instrumentacion, instrumentKey)` de `src/utils/instrumentation.js` para obtener el valor numérico de cada clave.
- Para cada clave se guarda el **máximo** encontrado entre todas las obras.
  - Ejemplo: Obra A (`instrumentacion = "2.2.2.2 - 4.3.3.1 - Timp+2 Perc - Hp - Key - Str"`) y Obra B (`"3.3.3.3 - 4.3.3.1 - Timp - Perc.x3 - 2Hp - Str"`):
    - Fl (fl): max(2, 3) → 3
    - Ob (ob): max(2, 3) → 3
    - ...
    - Tim (timp): max(1, 1) → 1
    - Perc (perc): max(2, 3) → 3
    - Har (harp): max(1, 2) → 2
    - Key (key): max(1, 0) → 1
    - Str (str): se interpreta como presencia/ausencia (0/1).

### 2. Instrumentación Convocada
- Se cuenta el personal de la gira usando el hook `useGiraRoster` (roster ya resuelto para la gira actual).
- Se consideran únicamente músicos con:
  - `estado_gira === "confirmado"`.
  - Rol no incluido en `EXCLUDED_ROLES` (`staff`, `producción`, `chofer`, etc.).
- Para cada integrante se mapea su instrumento a una de las familias:
  - **Cuerdas** (`Cuerdas`): `id_instr` en `["01", "02", "03", "04"]` o `instrumentos.familia` incluye `"cuerd"`.
  - **Fl**: nombre de instrumento contiene `"flaut"` o `"picc"`.
  - **Ob**: nombre contiene `"oboe"` o `"corno ing"`.
  - **Cl**: nombre contiene `"clarin"`, `"requinto"` o `"basset"`.
  - **Fg**: nombre contiene `"fagot"` o `"contraf"`.
  - **Cr**: nombre contiene `"corno"` o `"trompa"`.
  - **Tp**: nombre contiene `"trompet"` o `"fliscorno"`.
  - **Tb**: nombre contiene `"trombon"` o `"trombón"`.
  - **Tba**: nombre contiene `"tuba"` o `"bombard"`.
  - **Tim**: nombre contiene `"timbal"`.
  - **Perc**: nombre contiene `"perc"`, `"bombo"`, `"platillo"` o `"caja"`.
  - **Har**: nombre contiene `"arpa"`.
  - **Pno**: nombre contiene `"piano"`, `"teclado"`, `"celesta"`, `"órgano"` o `"organo"`.
- Cada músico suma `+1` en la familia correspondiente.
- Para la comparación con `Cuerdas`, el valor convocado se normaliza a `1` si hay al menos un integrante de cuerdas (`> 0`) y `0` si no hay ninguno.

### 3. Comparación y Alerta
- Se construyen dos mapas:
  - `required` → máximos por instrumento (Fl, Ob, Cl, Fg, Cr, Tp, Tb, Tba, Tim, Perc, Har, Pno, Cuerdas).
  - `convoked` → conteo de músicos convocados por familia.
- Para cada clave:
  - Si la clave es `Cuerdas`, se compara `requiredNormalized = required > 0 ? 1 : 0` contra `convokedNormalized = convoked > 0 ? 1 : 0`.
  - Para el resto, se compara el número entero directamente.
- Si alguna clave presenta diferencia (`requiredNormalized !== convokedNormalized`), ambos badges se pintan con:
  - `bg-orange-500 text-white animate-pulse-subtle`.

## Badges en ProgramSeating

### Ubicación
- En el header de `ProgramSeating` junto al título:
  - **Título**: `Seating & Particellas`.
  - **Badges**: alineados a la derecha del título en vista desktop y mobile.

### Contenido
- **Badge 1 (Requerido)**: texto `Req: [Formato Orquestal]`.
  - Ejemplo: `Req: 3 Fl · 2 Ob · 3 Cl · 2 Fg · 4 Cr · 3 Tp · 3 Tb · 1 Tba · Tim · 3 Perc · 2 Har · Pno · Cuerdas`.
  - Se construye a partir del mapa `required`, omitiendo instrumentos con valor `0`.
- **Badge 2 (Convocado)**: texto `Conv: [Formato Orquestal]`.
  - Ejemplo: `Conv: 3 Fl · 2 Ob · 3 Cl · 2 Fg · 4 Cr · 3 Tp · 3 Tb · 1 Tba · Tim · 4 Perc · 1 Har · 2 Pno · Cuerdas (18)`.
  - Para `Cuerdas` se puede mostrar el número real entre paréntesis: `Cuerdas (18)`.

### Estados de Color
- **Sin discrepancias**:
  - Requerido y Convocado coinciden según las reglas de comparación.
  - Badges con estilo neutro:
    - `bg-slate-50 text-slate-700 border border-slate-300 hover:bg-slate-100`.
- **Con discrepancias**:
  - Si algún valor difiere:
    - Ambos badges reciben:
      - `bg-orange-500 text-white animate-pulse-subtle border-orange-500`.

## Modal de Detalle: InstrumentationSummaryModal

### Archivo y Ruta
- Componente React en `src/components/seating/InstrumentationSummaryModal.jsx`.
- Importado perezosamente en `ProgramSeating`:
  - `const InstrumentationSummaryModal = React.lazy(() => import("../../components/seating/InstrumentationSummaryModal"));`

### Apertura
- El modal se abre al hacer click en cualquiera de los badges (`Req` o `Conv`).
- Props mínimas:
  - `isOpen: boolean`
  - `onClose: () => void`
  - `works: Array` (obras ya procesadas en `ProgramSeating`, incluyendo `instrumentacion`)
  - `required: { [clave]: number }`
  - `convoked: { [clave]: number }`

### Tabla de Doble Entrada
- **Eje X (Superior)**: Instrumentos, en el orden:
  - `Fl`, `Ob`, `Cl`, `Fg`, `Cr`, `Tp`, `Tb`, `Tba`, `Tim`, `Perc`, `Har`, `Pno`, `Cuerdas`.
- **Eje Y (Lateral)**: Obras de la gira, una por fila.
  - Formato de etiqueta: `Apellido, Comienzo Título...`
    - Ejemplo: `Beethoven, Sinfonía...`
    - Se usa `obra.composer` (apellido) y `obra.shortTitle` o título truncado.
- **Intersección (Celda)**:
  - Cantidad: `getInstrumentValue(obra.instrumentacion, claveInterna)` o `0` si no corresponde.
  - Observaciones: texto derivado de `obra.instrumentacion`:
    - Se extrae el contenido entre paréntesis (por ejemplo `(+ Picc, + Corno ing.)`).
    - Se muestra en texto pequeño bajo el número, con `title` para ver completo al pasar el mouse.
  - Si no hay ni cantidad ni observaciones, se muestra `-`.

### Estética
- Inspirada en `UniversalTable`:
  - Bordes: `border border-slate-200` en la tabla principal.
  - Encabezados:
    - Fondo `bg-slate-100`, texto `text-slate-700`, fuente pequeña (`text-[10px]` / `text-xs`).
  - Celdas:
    - Texto en `text-xs`, alineación centrada para números.
    - Líneas divisorias: `divide-y divide-slate-100`.
  - Cabecera de obras (`Y-axis`):
    - Celda sticky en el lateral izquierdo: `sticky left-0 bg-white z-10`.

### Portal
- El modal se renderiza con `createPortal` directamente en `document.body`:
  - Overlay:
    - `fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm flex items-center justify-center`.
  - Contenedor:
    - `bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[80vh] flex flex-col`.
  - Scroll interno para la tabla:
    - `overflow-auto` con padding interno.

## Notas de Implementación
- `ProgramSeating` ya dispone de:
  - Lista de obras (`obras`) con `obra_id`, `title`, `composer`, etc.
  - Roster resuelto mediante `useGiraRoster`.
- Cambios claves:
  1. **Supabase query** en `ProgramSeating`:
     - Incluir el campo `instrumentacion` en la selección de `obras`.
  2. **Mapa de obras**:
     - Propagar `ro.obras.instrumentacion` al objeto plano `obras` usado en Seating.
  3. **Cálculos memoizados**:
     - `instrumentationRequired` (`useMemo` basado en `obras`).
     - `instrumentationConvoked` (`useMemo` basado en `filteredRoster`).
     - `hasInstrumentationMismatch` (`useMemo` que compara ambos mapas).
  4. **Badges**:
     - Se muestran solo si hay al menos una obra en el programa.
     - Click en cualquier badge abre `InstrumentationSummaryModal`.

## Estado Actual
- Implementación integrada en:
  - `src/views/Giras/ProgramSeating.jsx`:
    - Cálculo de instrumentación requerida/convocada.
    - Badges en el header con resalte naranja si hay discrepancias.
    - Apertura del `InstrumentationSummaryModal`.
  - `src/components/seating/InstrumentationSummaryModal.jsx`:
    - Tabla de doble entrada por obra/instrumento.
    - Uso de `getInstrumentValue` para los conteos por obra.
    - Observaciones simples basadas en paréntesis de `instrumentacion`.
  - `docs/specs/instrumentation-badges-seating.md`:
    - Documentación de reglas y comportamiento final.

