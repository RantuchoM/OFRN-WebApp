## Lógica de Matriz de Seating para Cuerdas

- **Contexto**: La tabla `seating_contenedores_items` ahora incluye las columnas `atril_num` (1..N) y `lado` (0 = Izquierda / Interno, 1 = Derecha / Externo).  
- **Representación lineal**: La columna `orden` sigue existiendo como índice de apoyo y se mantiene sincronizada con la matriz mediante la fórmula:
  - \`orden = (atril_num - 1) * 2 + lado\`

### Comportamiento de la matriz

- **Matriz por contenedor**: Cada contenedor de cuerdas se modela como una matriz de atriles, donde cada fila corresponde a un atril y cada atril tiene hasta dos posiciones:
  - `(Atril n, lado 0)` → Músico izquierdo/interno.
  - `(Atril n, lado 1)` → Músico derecho/externo.
- **Huecos explícitos**: Si un atril tiene un hueco en una de las dos posiciones (por ejemplo, hay alguien en `Atril 2, Derecha` pero no en `Atril 2, Izquierda`), la interfaz debe mostrar un espacio vacío o placeholder para mantener la estructura visual de parejas.

### Desplazamientos independientes por línea

- **RPC en Supabase**: Existe la función `shift_seating_line(target_cont_id, start_atril, target_lado, direction)` que aplica desplazamientos solo sobre una línea de la matriz:
  - `target_cont_id`: ID del contenedor (grupo de cuerdas).
  - `start_atril`: Atril a partir del cual se aplica el corrimiento.
  - `target_lado`: Columna afectada (`0` izquierda, `1` derecha).
  - `direction`: `1` para insertar (empuja hacia abajo), `-1` para eliminar (sube).
- **Invariante**: El RPC actualiza `atril_num` respetando el sentido del desplazamiento y sincroniza `orden` usando la fórmula matricial, manteniendo compatibilidad con componentes que todavía lean el índice lineal.

### Ejemplo de eliminación en una sola línea

- Situación inicial (lado izquierdo completo):
  - Atril 1: `(1, Izq)`, `(1, Der)`
  - Atril 2: `(2, Izq)`, `(2, Der)`
  - Atril 3: `(3, Izq)`, `(3, Der)`
  - Atril 4: `(4, Izq)`, `(4, Der)`
- Si se elimina un músico en `(Atril 3, Izquierda)`:
  - Se invoca el RPC con:  
    - `target_cont_id = <ID del contenedor>`  
    - `start_atril = 4`  
    - `target_lado = 0`  
    - `direction = -1`
  - **Resultado**:
    - Los músicos de la **columna Izquierda** desde el Atril 4 en adelante suben un puesto (4 → 3, 5 → 4, etc.).
    - La **columna Derecha** permanece intacta (los músicos de `(Atril n, Derecha)` no se mueven).
    - La columna `orden` se recalcula automáticamente para todas las filas afectadas.

### Resumen de migración

- **Antes**: Las cuerdas se manejaban como una lista plana basada únicamente en `orden` (`0, 1, 2, 3...`) con el patrón fijo `(atril1-izq, atril1-der, atril2-izq, ...)`.  
- **Ahora**:
  - La posición real de cada músico se define por el par `(atril_num, lado)`.
  - La UI (desktop y mobile) representa los atriles como parejas, preservando la alineación visual incluso cuando existe un hueco en una de las dos posiciones.
  - Las operaciones de desplazamiento de cuerdas deben hacerse por línea utilizando `shift_seating_line` para no afectar la columna opuesta del atril.

