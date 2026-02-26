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

### Lógica de generación de sugerencias (vientos/percusión)

1. Cuando se llama a `handleAssign("M", musicianId, obraId, particellaId)` con `particellaId` definido:
   - Se busca la particella (`obras_particellas`) asignada.
   - Se obtiene su etiqueta normalizada (`normalizePartLabel(getPartLabelFromPart(part))`).
   - Se recorren todas las obras del programa:
     - Se ignora la obra de origen (`originObraId`) y cualquier obra donde el músico ya tenga asignación (`assignments["M-{id_musico}-{id_obra}"]`).
     - Para cada obra, se consulta `availablePartsByWork[obraId]` y se busca la primera particella cuya etiqueta normalizada coincida exactamente con la del origen.
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
    - Itera sobre todas las entradas `suggestions[id_musico]`.
    - Para cada (id_obra, id_particella_sugerida) llama a `handleAssign("M", id_musico, id_obra, id_particella_sugerida)` en serie.
    - Al finalizar, elimina completamente `suggestions[id_musico]` para evitar residuos visuales.

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

