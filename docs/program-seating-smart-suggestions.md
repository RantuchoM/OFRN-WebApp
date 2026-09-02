## Sugerencias inteligentes de particellas en ProgramSeating

### Objetivo

Mejorar el flujo de asignación de particellas en `ProgramSeating` sugiriendo, de forma no intrusiva, partes probables para cada músico a partir de patrones ya usados (por ejemplo, repetir “Oboe 1” en todas las obras).

### Alcance

- Vista de seating de programa (`ProgramSeating.jsx`), solo en modo escritorio.
- Fila de **Vientos y Percusión** (asignaciones individuales por músico).
- Fila de **Cuerdas** a nivel de contenedor (sugerencias basadas en el nombre del contenedor).

### Modelo de datos

- `assignments`: `{ [key: string]: id_particella }`, donde la clave es:
  - `C-{id_contenedor}-{id_obra}` para asignaciones por contenedor.
  - `M-{id_musico}-{id_obra}` para asignaciones individuales.
- `suggestions`: `{ [id_musico]: { [id_obra]: id_particella } }`
  - Guarda, por músico, qué particella se sugiere para cada obra aún sin asignación directa.

Helpers de normalización:

- `getPartLabelFromPart(part)`: devuelve una etiqueta legible a partir de `nombre_archivo` o `instrumentos.instrumento` sin extensión.
- `normalizePartLabel(label)`: baja a minúsculas, colapsa espacios y convierte romanos simples a números (`I/II/III/IV` → `1/2/3/4`) para hacer el matching más tolerante.
- **Matching de slot instrumental** (vientos/percusión y contenedores): `seatingPartsRepresentSameSlot` de `drivePartMatcher.js`, que ignora afinación/transposición (`F`, `A`, `Bb`, etc.) y compara instrumento + número. Ej.: `Corno F 1` ≈ `Corno 1`; `Clarinete A 2` ≈ `Clarinete 2` ≈ `Clarinete Bb 2`. `SCORE`/partitura solo matchea con otra partitura, nunca con un instrumento (ej. Tuba). **Percusión:** solo `Perc Timp` / timbales se propagan entre obras; el resto de particellas de perc (`Perc`, bombo, marimba, etc.) no generan sugerencias.

### Lógica de generación de sugerencias (vientos/percusión)

1. Cuando se llama a `handleAssign("M", musicianId, obraId, particellaId)` con `particellaId` definido:
   - Se busca la particella (`obras_particellas`) asignada.
   - Se obtiene su etiqueta normalizada (`normalizePartLabel(getPartLabelFromPart(part))`).
   - Se recorren todas las obras del programa:
     - Se ignora la obra de origen (`originObraId`) y cualquier obra donde el músico ya tenga asignación (`assignments["M-{id_musico}-{id_obra}"]`).
     - Para cada obra, se consulta `availablePartsByWork[obraId]` y se busca la primera particella libre en **esa obra** (no asignada a otro músico/contenedor) que represente el mismo slot (`seatingPartsRepresentSameSlot`) que la del origen.
     - Si hay match, se agrega a `suggestions[id_musico][id_obra] = id_particella_sugerida`.
   - Si no quedan entradas para ese músico, se elimina su key de `suggestions`.

2. Cuando se llama a `handleAssign("M", musicianId, obraId, null)` (borrar asignación):
   - Se eliminan todas las sugerencias para ese músico en `suggestions`.

### Interfaz de usuario

#### Chips por celda (vientos/percusión)

- En cada celda de músico/obra (solo escritorio, solo modo editor):
  - Se renderiza el `ParticellaSelect` habitual.
  - Si **no** hay asignación (`currentVal` vacío) y existe una sugerencia para esa obra (`suggestions[id_musico][id_obra]`):
    - Se muestra un **chip de sugerencia** debajo del select:
      - Estilo: `bg-amber-100 text-amber-900 text-[10px] px-1.5 py-0.5 rounded-full border border-amber-200 max-w-[90px] mx-auto flex items-center gap-1`.
      - Icono: `IconBulb` (Heroicons-like) en ámbar suave.
      - Texto: etiqueta legible de la particella sugerida (`getPartLabelFromPart(part)`).
    - Al hacer click:
      - Se ejecuta `handleAssign("M", id_musico, id_obra, id_particella_sugerida)`.
      - Se elimina esa sugerencia concreta de `suggestions[id_musico][id_obra]`, y si no quedan más, se borra toda la entrada del músico.

#### Botón “Aceptar todas” por músico (vientos/percusión)

- En la primera celda de la fila del músico (junto a su nombre), si:
  - El usuario es editor (`isEditor`).
  - Existen sugerencias pendientes para el músico (`Object.keys(suggestions[id_musico]).length > 0`).
- Se muestra un botón compacto:
  - Label: `[IconBulb] Aceptar todas`.
  - Estilo: chip/badge pequeño, `bg-amber-50` con borde ámbar y tipografía `text-[9px]`.
  - Acción:
    - Llama a `handleAcceptAllParticellaSuggestions(m)` con el músico como alcance.
    - Aplica en lote vía `applyBulkParticellaAssignments` (ver sección Rendimiento).

### Botón global “Aceptar todas las sugerencias”

- En la barra superior (escritorio) y menú móvil, si `pendingParticellaSuggestionsCount > 0`.
- Acción: `handleAcceptAllParticellaSuggestions()` sin alcance (todo el programa activo).
- Muestra overlay con barra de progreso (`ParticellaExportBusyOverlay`: título «Aplicando sugerencias…», contador `current/total`, fase «Cuerdas» / «Vientos y percusión») mientras `isAcceptingAllSuggestions`.

### Rendimiento (aceptación en lote)

- **Problema anterior:** cada sugerencia llamaba `handleAssign` en serie; cada asignación de músico hacía un `SELECT` de `seating_asignaciones` por obra + varios `INSERT`/`UPDATE`/`DELETE`.
- **Solución:** `src/utils/seatingBulkAssign.js` → `applyBulkParticellaAssignments`:
  1. Calcula en memoria el estado final (`assignments` + `musicianAssignments`) desde las sugerencias pendientes.
  2. **Fase contenedores:** `DELETE` + `INSERT` de asignaciones por contenedor; `await` antes de músicos.
  3. **Re-lectura** de `seating_asignaciones` del programa antes de la fase músicos.
  4. **Fase músicos:** reconcilia por obra; permite la misma particella en contenedor y fila de músicos (ej. contrabajo en parte de cello).
  5. Un solo `setState` local; no hace `fetchInitialData` completo.
- **Índices únicos** (`20260902120000_seating_asignaciones_assignment_unique.sql`): una particella por celda contenedor/obra; una fila agregada de músicos por particella/obra (`id_musicos_asignados` con varios IDs). Ya no existe `UNIQUE (id_programa, id_particella)` global.
- La lógica de matching de sugerencias sigue en el cliente (`derivedMusicianSuggestions`, `getContainerSuggestedPart`); no requiere RPC SQL porque el cuello de botella era la red, no el CPU.
- **RPC SQL opcional futuro:** podría enviar un JSON de asignaciones a una función Postgres en una transacción; útil si hay triggers pesados o límites de concurrencia del cliente.

### Sugerencias para cuerdas (contenedores)

- Para cada celda de contenedor/obra en la sección de Cuerdas:
  - Se calcula `currentVal` a partir de `assignments["C-{id_contenedor}-{id_obra}"]`.
  - Se consulta `availablePartsByWork[obraId]`.
  - Si:
    - No hay asignación de contenedor (`!currentVal`),
    - El contenedor tiene al menos un músico (`c.items.length > 0`),
    - Y `getContainerSuggestedPart(c, obraId)` devuelve una particella,
  - Se muestra un chip de sugerencia debajo del `ParticellaSelect`, con el mismo estilo visual que en vientos:
    - Icono: `IconBulb`.
    - Texto: etiqueta legible de la particella sugerida.
  - Al hacer click:
    - Se ejecuta `handleAssign("C", id_contenedor, id_obra, id_particella_sugerida)`.

La función `getContainerSuggestedPart`:

- Normaliza el nombre del contenedor (`normalizePartLabel(container.nombre)`).
- Busca en `availablePartsByWork[obraId]` una particella cuya etiqueta normalizada:
  - Sea igual al nombre normalizado, o
  - Lo contenga / esté contenida por él (para tolerar variaciones tipo “Violín I” vs “Violín 1 Tutti”).

### Consideraciones de UX

- Los chips se muestran solo cuando **no** hay una asignación directa ya elegida, para evitar ruido visual.
- El layout está controlado con `flex flex-col gap-1` dentro de la celda, y tamaños máximos (`max-w-[90px]`) para no romper el ancho de columnas.
- El color ámbar se usa para comunicar “sugerencia” (no estado de error ni confirmación); el usuario conserva siempre el control a través del `ParticellaSelect`.

