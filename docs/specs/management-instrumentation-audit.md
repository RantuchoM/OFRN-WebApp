# Spec: Panel de Auditoría de Instrumentación (Gestión)

## Objetivo
Proveer una interfaz centralizada para comparar la instrumentación técnica requerida por las obras frente a los integrantes efectivamente convocados en cada programa/gira.

## Interfaz y Comportamiento
1. **Filtros**
   - Selector por **Tipo de Programa** (`programas.tipo`), con valor inicial **"Sinfónico"**.
   - El resto de los tipos disponibles se construyen dinámicamente a partir de los programas activos en Supabase.

2. **Lista de Programas (Acordeón)**
   - Cada ítem corresponde a un registro de `programas`.
   - Cabecera del acordeón (layout vertical usando `flex-col`):
     - **Nombre del programa** (`nombre_gira`) en bold.
     - **Rango de fechas** (`fecha_desde` – `fecha_hasta`) en formato legible.
     - **Zona** (`zona`) en texto auxiliar.
   - La cabecera debe ser clickeable y expandir/colapsar el cuerpo del acordeón.

3. **Matriz de Comparación**
   - Se renderiza dentro del contenido expandido de cada acordeón.
   - **Columnas**: Instrumentos estándar, en este orden:
     - `Fl`, `Ob`, `Cl`, `Fg`, `Cr`, `Tp`, `Tb`, `Tba`, `Tim`, `Perc`, `Har`, `Pno`, `Cuerdas`.
   - **Filas**:
     - **Fila Superior (Req Max)**: Instrumentación máxima requerida por las obras asociadas al programa.
     - **Fila Inferior (Conv)**: Instrumentación convocada (conteo de integrantes activos vinculados a la gira).
   - La tabla debe ser scrollable horizontalmente en pantallas pequeñas (`overflow-x-auto`) y mantener un diseño compacto (`text-xs`, paddings cortos).

4. **Alertas Visuales**
   - Para cada celda de la matriz:
     - Se compara el valor **Req** vs **Conv**.
     - Si los valores difieren, la celda se resalta con:
       - `bg-orange-500 text-white font-bold rounded`.
   - El comportamiento de comparación sigue las mismas reglas que el módulo de Seating:
     - **Cuerdas (`Str`)**:
       - Se normaliza a 0/1 (presencia o ausencia):
         - `requiredNorm = required > 0 ? 1 : 0`
         - `convokedNorm = convoked > 0 ? 1 : 0`
     - **Percusión (`Perc`)**:
       - Se compara usando el total `Tim + Perc`:
         - `requiredPercTotal = required.Tim + required.Perc`
         - `convokedPercTotal = convoked.Tim + convoked.Perc`
       - El valor mostrado en la columna `Perc` sigue siendo el valor específico de percusión, pero la alerta toma en cuenta el total combinado.

## Lógica de Datos

### 1. Instrumentación Requerida (Req Max)
- Fuente: campo `instrumentacion` de las **obras** vinculadas al programa.
- Relación de datos:
  - `programas` → `programas_repertorios` → `repertorio_obras` → `obras.instrumentacion`
- Se consideran únicamente las obras no excluidas (`repertorio_obras.excluir` falsy).
- Para cada obra:
  - Se toma el string `obras.instrumentacion` (ej: `"2.2.2.2 - 4.3.3.1 - Timp+2 Perc - Hp - Key - Str"`).
  - Para cada instrumento estándar se obtiene el valor numérico usando:
    - `getInstrumentValue(obra.instrumentacion, instrumentKey)` de `src/utils/instrumentation.js`.
  - Claves internas:
    - **Fl** → `"fl"`
    - **Ob** → `"ob"`
    - **Cl** → `"cl"`
    - **Fg** → `"bn"`
    - **Cr** → `"hn"`
    - **Tp** → `"tpt"`
    - **Tb** → `"tbn"`
    - **Tba** → `"tba"`
    - **Tim** → `"timp"`
    - **Perc** → `"perc"`
    - **Har** → `"harp"`
    - **Pno** → `"key"`
    - **Cuerdas** → `"str"`
- Para cada clave se almacena el **máximo** encontrado entre todas las obras del programa.
- Resultado: un mapa por programa:
  - `required = { Fl, Ob, Cl, Fg, Cr, Tp, Tb, Tba, Tim, Perc, Har, Pno, Str }`.

> **Regla crítica**: siempre utilizar `getInstrumentValue` para interpretar los strings de instrumentación (por ejemplo `"2+1"` debe considerarse 3) y no hacer parseos manuales.

### 2. Instrumentación Convocada (Conv)
- Fuente: tabla `giras_integrantes`.
- Relación de datos:
  - `giras_integrantes.id_gira` ↔ `programas.id`
- Filtro de filas:
  - Se consideran solo registros con `estado != 'ausente'`.
- Para cada registro de `giras_integrantes`:
  - Se obtiene el integrante asociado vía relación `integrantes`:
    - Campos mínimos:
      - `integrantes.id_instr`
      - `integrantes.instrumentos (instrumento, familia)`
  - Se mapea el instrumento real a una de las columnas de la matriz usando las mismas heurísticas que `ProgramSeating`:
    - Si `id_instr` ∈ `["01", "02", "03", "04"]` → cuenta en **Cuerdas**.
    - Si `instrumentos.instrumento` contiene:
      - `"flaut"` o `"picc"` → **Fl**
      - `"oboe"` o `"corno ing"` → **Ob**
      - `"clarin"`, `"requinto"` o `"basset"` → **Cl**
      - `"fagot"` o `"contraf"` → **Fg**
      - `"corno"` o `"trompa"` → **Cr**
      - `"trompet"` o `"fliscorno"` → **Tp**
      - `"trombon"` o `"trombón"` → **Tb**
      - `"tuba"` o `"bombard"` → **Tba**
      - `"timbal"` → **Tim**
      - `"perc"`, `"bombo"`, `"platillo"`, `"caja"` → **Perc**
      - `"arpa"` → **Har**
      - `"piano"`, `"teclado"`, `"celesta"`, `"órgano"`, `"organo"` → **Pno**
    - Si ninguna de las anteriores coincide:
      - Si `instrumentos.familia` incluye `"cuerd"` → cuenta como **Cuerdas**.
- Cada integrante suma `+1` en la familia correspondiente.
- Resultado: un mapa por programa:
  - `convoked = { Fl, Ob, Cl, Fg, Cr, Tp, Tb, Tba, Tim, Perc, Har, Pno, Str }`.

### 3. Comparación y Resaltado
- Para cada programa se comparan los mapas `required` y `convoked`.
- Reglas de comparación:
  - Para `Str` (Cuerdas):
    - `requiredNorm = required.Str > 0 ? 1 : 0`
    - `convokedNorm = convoked.Str > 0 ? 1 : 0`
  - Para `Perc`:
    - `requiredPercTotal = (required.Tim || 0) + (required.Perc || 0)`
    - `convokedPercTotal = (convoked.Tim || 0) + (convoked.Perc || 0)`
  - Para el resto de las claves:
    - Se compara el número entero directamente (`required[id]` vs `convoked[id]`).
- Si hay diferencia en la clave asociada a una celda:
  - Esa celda de la tabla se pinta con:
    - `bg-orange-500 text-white font-bold rounded`.

## Integración en la Vista de Gestión

### Archivo y Ruta
- Nuevo componente React:
  - `src/views/Management/InstrumentationAudit.jsx`
- Registro en el panel de Gestión:
  - `src/views/Management/ManagementView.jsx`
  - Se añade una pestaña `"Instrumentación"` junto a las existentes:
    - `"Espacios"` (venues)
    - `"Informes Seating"`

### Comportamiento en `ManagementView`
- La pestaña `"Instrumentación"`:
  - Cambia el `activeTab` interno de `ManagementView`.
  - Renderiza el componente `InstrumentationAudit` cuando está activa.
  - Reutiliza el mismo estilo de tabs (`inline-flex rounded-lg ...`) que las otras pestañas.

## Diseño y UX
- Layout general:
  - Contenedor principal en `ManagementView`: mantiene el estilo actual (`bg-slate-50`, tarjetas blancas con bordes suaves).
  - El panel de Auditoría se presenta como:
    - Un bloque de filtros en la parte superior.
    - Una lista de acordeones debajo, uno por programa.
- Filtros:
  - Selector compacto de tipo de programa (`<select>` o componente custom equivalente) alineado con el resto de filtros del módulo de Gestión.
  - Etiquetas con tipografía pequeña (`text-xs`) y mayúsculas (`uppercase`) para consistencia.
- Acordeones:
  - Cabecera con `flex flex-col` para apilar:
    - Nombre del programa (bold).
    - Rango de fechas.
    - Zona.
  - Un icono de despliegue (`chevron`) a la derecha ayuda a indicar el estado expandido/colapsado.
  - El cuerpo se anima sutilmente en la apertura/cierre (`transition` de altura/margen).
- Matriz:
  - Tabla responsive con:
    - `overflow-x-auto`.
    - `text-xs`.
    - Encabezados de columna con abreviaturas (`Fl`, `Ob`, `Cl`, etc.).
  - Fila `"Req Max"`:
    - Estilo de encabezado suave (`bg-slate-50`, `font-semibold`).
  - Fila `"Conv"`:
    - Fondo neutro (`bg-white`) y uso de `font-mono` para facilitar la lectura rápida.
  - Las celdas con discrepancias en naranja sirven como **semáforo visual** inmediato.

## Estado Actual de Implementación
- Panel implementado en:
  - `src/views/Management/InstrumentationAudit.jsx`:
    - Fetch masivo de programas (`programas`), repertorio asociado (`programas_repertorios` → `repertorio_obras` → `obras.instrumentacion`) y convocados (`giras_integrantes` + `integrantes`).
    - Cálculo de mapas `required` y `convoked` por programa reutilizando `getInstrumentValue` de `src/utils/instrumentation.js`.
    - Render de la lista de acordeones con cabecera vertical y matriz comparativa de dos filas (Req Max / Conv).
    - Resaltado naranja (`bg-orange-500 text-white font-bold rounded`) en celdas con discrepancias, con reglas especiales para `Perc` (Tim+Perc) y `Str` (presencia/ausencia).
  - `src/views/Management/ManagementView.jsx`:
    - Nueva pestaña `"Instrumentación"` en el selector de tabs del módulo de Gestión.
    - Render condicionado de `InstrumentationAudit` cuando la pestaña está activa.
- El panel respeta la línea visual existente del módulo de Gestión (uso de `Icons`, `Loader`, tarjetas blancas, tipografía compacta) y está optimizado para uso en escritorio con soporte responsive básico vía scroll horizontal en la matriz.

