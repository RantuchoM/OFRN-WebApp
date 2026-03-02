## Spec: Repertoire Quick Entry (Inline Table)

### Objetivo
Reemplazar en vista de escritorio el botón de `Agregar Obra` de cada bloque de `RepertoireManager` por una **fila de entrada rápida inline** (`QuickWorkRow`) al final de la tabla de repertorio, optimizada para:

- **Captura rápida** de Compositor, Título, Instrumentación y Duración.
- **Creación encadenada** de compositor nuevo → obra → vínculo en `repertorio_obras`.
- **Follow‑up inmediato** para cargar enlaces de Drive / YouTube y notas específicas.

En vista móvil se mantiene, de momento, el botón clásico `Agregar Obra` que abre el modal de búsqueda / selección existente.

### Flujo de Usuario

1. **Inline Quick Row por bloque**
   - En cada bloque de `RepertoireManager` aparece, al final de la tabla de escritorio (`md+`), una fila especial `QuickWorkRow` con los campos:
     - **Compositor**: input de texto con búsqueda en vivo.
     - **Obra**: input de texto que busca y sugiere obras existentes del compositor o permite crear una nueva.
     - **Instr.**: input compacto tipo `font-mono`.
     - **Dur.**: input de duración (`mm:ss` o similar).
     - Botón **Guardar** al final de la fila.

2. **Búsqueda / creación de Compositor**
   - Al escribir en el campo **Compositor**:
     - Se aplica un **debounce de 300 ms** usando `useDebouncedCallback` del proyecto.
     - Se consulta Supabase sobre la tabla `compositores` filtrando por `apellido` y, si se provee, por `nombre` (formato `Apellido, Nombre`).
     - Se muestra un dropdown bajo el input con coincidencias ordenadas por apellido.
   - Si no hay resultados y el texto tiene al menos 2 caracteres, se muestra siempre una opción conceptual de **“+ Crear `[Texto ingresado]`”** (la creación real ocurre al guardar).
   - Al seleccionar una opción del listado, el input se rellena con `Apellido, Nombre` y se fija el compositor seleccionado.

3. **Búsqueda de obras existentes y detección de “Nueva Obra”**
   - Cuando hay un **compositor seleccionado** y el título de la obra tiene al menos 2 caracteres, `QuickWorkRow`:
     - Lanza, con debounce (~400 ms), una consulta a Supabase sobre `obras` con join `obras_compositores!inner` filtrando por:
       - `obras_compositores.id_compositor = compositor.id`
       - `obras_compositores.rol = 'compositor'`
       - `titulo ILIKE %texto%`
     - Muestra un desplegable bajo el campo **Obra** con las coincidencias del archivo (título, instrumentación y duración).
     - Al hacer clic en una obra sugerida, se **selecciona** esa obra para el guardado rápido (se enlaza en el bloque en lugar de crear una nueva).
     - Si no hay coincidencias, y el título tiene al menos 3 caracteres, se marca internamente como **“nueva obra para este compositor”** y se muestra el badge verde correspondiente bajo el input de Título.

4. **Guardado Rápido (Enter / Botón Guardar)**
   - Al pulsar **Enter** en cualquier input de la fila o el botón **Guardar**:
     1. Se valida que haya **Compositor** (seleccionado o texto) y **Título**.
     2. Si el usuario **ha seleccionado una obra existente** desde el desplegable de Título y el compositor es conocido:
        - Se llama a `addWorkToBlock(existingWork.id, rep.id)` para vincular directamente esa obra al bloque actual.
        - Se abre el mini‑modal de follow‑up para permitir ajustar enlaces y notas específicas (opcional).
        - Se limpia el estado de la fila.
     3. En caso contrario (no hay obra seleccionada), se asegura la existencia del compositor:
        - Si hay compositor seleccionado, se usa su `id`.
        - Si no, se parsea el texto `Compositor` en `apellido` y `nombre` (`Apellido, Nombre` o solo `Apellido`).
        - Se intenta localizar un compositor exacto en Supabase (`apellido` + `nombre`), y si no existe se inserta en `compositores` y se usa su nuevo `id`.
     4. Se crea entonces la **obra nueva** en `obras` con:
        - `titulo`: HTML simple `"<p>Título</p>"` (compatible con el WYSIWYG de `WorkForm`).
        - `duracion_segundos`: calculada con `inputToSeconds` desde el string de duración.
        - `instrumentacion`: texto libre del campo de la fila.
        - `estado`: `"Solicitud"` (alineado con el flujo actual de creación desde `WorkForm`).
        - `id_usuario_carga`: `user.id` del contexto de autenticación cuando está disponible.
     5. Se crea el vínculo en `obras_compositores`:
        - Una fila `rol = 'compositor'` con el `id_obra` recientemente creado y el `id_compositor` asegurado.
     6. Se vincula la obra al **bloque de repertorio actual** llamando a `addWorkToBlock(newWorkId, rep.id)`, que:
        - Inserta en `repertorio_obras` con `id_repertorio = rep.id` y `orden` = último orden + 1.
        - Devuelve la fila insertada (incluyendo su `id`) para el follow‑up.
        - Dispara `autoSyncDrive()` como en el flujo tradicional.
     7. Se limpia el estado de la fila (inputs de compositor, título, instrumentación y duración).

5. **Mini‑Modal de Follow‑up (“¿Deseas agregar los enlaces ahora?”)**
   - Tras una creación rápida exitosa se abre automáticamente un **mini‑portal modal** usando `ModalPortal` con:
     - Un resumen encabezado (`composerLabel` + `titulo` renderizado con `RichTextPreview`).
     - Campos editables:
       - `link_drive` (Carpeta de Drive de material).
       - `link_youtube` (Audio / Video).
       - `observaciones` (públicas, sobre la obra).
       - `notas_especificas` (texto asociado a la fila de `repertorio_obras` para este programa).
     - Botón **“Más tarde”** que cierra el modal sin guardar.
     - Botón **“Guardar ahora”** que:
       - Actualiza `obras` (`link_drive`, `link_youtube`, `observaciones`).
       - Actualiza `repertorio_obras` (`notas_especificas`), si se dispone del `id` de la fila creada.
       - Vuelve a llamar a `fetchFullRepertoire()` para refrescar la UI.

### Reglas Técnicas Implementadas

- **PK Integrantes / IDs**: Se respetan los IDs numéricos ya existentes para `compositores`, `obras` y `repertorio_obras`.
- **Orden y Transaccionalidad Lógica** (no DB‑transaction explícita):
  1. Asegurar y obtener `id_compositor` (buscar o insertar).
  2. Crear `obra` en `obras` con los datos mínimos (título, duración, instrumentación, estado).
  3. Crear relación en `obras_compositores` (`rol = 'compositor'`).
  4. Vincular con el bloque actual en `repertorio_obras` mediante `addWorkToBlock`.
- **UI / Diseño**:
  - Se mantiene la estética Tailwind existente en `RepertoireManager`.
  - Se reutilizan los iconos de `Lucide` expuestos por `../ui/Icons`:
    - `IconPlus` para indicar nueva fila / acción de alta.
    - `IconLoader` para estados de carga.
    - `IconCheck` para confirmación / guardado.
    - `IconLink` en el mini‑modal de follow‑up.
  - La fila rápida solo se renderiza cuando `isEditor === true` y la vista **no** está en modo compacto (`!isCompact`).
  - En móviles (`md:hidden`) se mantiene el botón clásico de `Agregar Obra` que abre el modal de búsqueda existente.

### Integraciones y Hooks

- **Contexto de autenticación**: se reutiliza `useAuth` desde `AuthContext` para obtener `user` e inferir `id_usuario_carga` al crear obras.
- **Supabase**:
  - Todas las operaciones siguen el patrón ya usado en `RepertoireManager` y `WorkForm`:
    - `from("compositores")`, `from("obras")`, `from("repertorio_obras")`, `from("obras_compositores")`.
  - No se introduce ningún cliente nuevo, se usa el `supabase` ya inyectado por props.
- **Hooks utilitarios**:
  - `useDebouncedCallback` (ya existente en el proyecto) para:
    - Búsqueda de compositores con debounce de 300 ms.
    - Detección de “nueva obra” por compositor con debounce aproximado de 400 ms.
  - `inputToSeconds` y `formatSecondsToTime` desde `utils/time` para la conversión de duración.

### SQL / Índices Recomendados (Supabase)

Para mantener la búsqueda de compositores y obras eficiente a medida que crezcan las tablas se recomiendan los siguientes índices en Supabase (pueden ejecutarse desde el editor SQL de Supabase o incorporarse a la migración correspondiente):

```sql
CREATE INDEX IF NOT EXISTS idx_compositores_apellido_nombre
  ON compositores (apellido, nombre);

CREATE INDEX IF NOT EXISTS idx_obras_titulo
  ON obras (titulo);
```

Estos índices no son estrictamente necesarios para el correcto funcionamiento de la UI, pero ayudan a que las búsquedas debounced sigan siendo rápidas incluso con volúmenes grandes de datos.

### Notas de Diseño y Extensibilidad

- La fila rápida está pensada como **MVP de entrada inline**:
  - Actualmente crea siempre nuevas obras (no reusa directamente obras existentes del archivo); la selección de obras ya existentes sigue disponible vía el modal de búsqueda clásico.
  - El patrón se ha encapsulado en el componente interno `QuickWorkRow` para que pueda evolucionar (p. ej. permitir búsqueda de obras existentes por título) sin afectar la tabla principal.
- El mini‑modal de follow‑up está intencionadamente acotado a los campos más usados en la carga inicial:
  - Si se requieren ediciones más avanzadas (particellas, arcos, metadata extendida), se sigue utilizando el modal de `WorkForm` ya existente desde otras rutas de la app.

