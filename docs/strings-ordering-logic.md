## Especificación Técnica: Lógica de Ordenamiento de Cuerdas (Strings) - v2

### Definición de Lado (int4)

- **0**: Lado Izquierdo (Externo/Principal).
- **1**: Lado Derecho (Interno/Asistente).

### Reglas de Negocio

1. **Lateralidad Persistente**  
   Un integrante asignado al lado `0` nunca debe pasar al lado `1` por un reordenamiento automático, y viceversa. Cada músico mantiene siempre su "carril" (`lado`) salvo intervención manual explícita.

2. **Compactación por Carril**  
   Los movimientos automáticos siempre ocurren **dentro del mismo lado**:
   - Si el integrante del Atril 2, Lado 0 queda ausente o es eliminado, el integrante del Atril 3, Lado 0 debe subir a ocupar `(2, 0)`, el del Atril 4, Lado 0 pasa a `(3, 0)`, etc.
   - Lo mismo ocurre para el Lado 1: solo se compacta la columna `1`, sin afectar la columna `0`.

3. **Integridad de Atril**  
   Un atril `N` se considera completo si tiene ocupados los slots `(N, 0)` y `(N, 1)`. La interfaz siempre muestra ambos lados del atril (aunque uno esté vacío) para preservar la estructura visual de parejas.

4. **Prohibición de Huecos**  
   No puede existir un slot `(N, L)` vacío si existe un slot `(N+1, L)` ocupado.  
   En otras palabras, para cada lado `L` los atriles ocupados deben ser siempre `1..K` sin huecos intermedios; solo el último atril de cada lado puede estar incompleto.

### Casos de Prueba

- **Entrada inicial**  
  - Atril 1: `(Izq, Der)` → `(1, 0)`, `(1, 1)` ocupados.  
  - Atril 2: `(Vacío, Der)` → `(2, 0)` vacío, `(2, 1)` ocupado.  
  - Atril 3: `(Izq, Der)` → `(3, 0)`, `(3, 1)` ocupados.

- **Resultado esperado tras compactación**  
  - Atril 1: `(Izq, Der)` (sin cambios).  
  - Atril 2: `(Izq [del 3], Der)` → el músico que estaba en `(3, 0)` sube a `(2, 0)`, y el que estaba en `(2, 1)` permanece en su lugar.  
  - Atril 3: `(Vacío, Der [del 3])` → el músico que estaba en `(3, 1)` se compacta si hay hueco en `(2, 1)`; de lo contrario permanece como último atril de su lado.

### Notas sobre Implementación

- La representación canónica de posición es el par `(atril_num, lado)` y la lógica de ordenamiento debe operar siempre sobre esa matriz 2×N por contenedor.
- Cualquier índice lineal legado (por ejemplo `orden`) debe considerarse derivado: puede recalcularse como `orden = (atril_num - 1) * 2 + lado`, pero no debe usarse como fuente de verdad para la posición.
- Al actualizar el Seating por ausencias o reordenamientos, el algoritmo debe:
  1. Separar los integrantes por `lado` (`0` y `1`).
  2. Ordenar cada lista de forma independiente según el orden original/jerárquico.
  3. Reasignar `atril_num` consecutivos (`1..K`) dentro de cada lado, cumpliendo las reglas de compactación y prohibición de huecos.

