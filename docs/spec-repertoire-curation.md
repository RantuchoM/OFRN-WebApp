## Spec: Sistema de Curaduría de Repertorio (OFRN)

### Objetivo

- **Propósito**: Permitir un flujo de aprobación de obras propuestas para un bloque de programa, diferenciando entre obras simplemente sugeridas y obras ya validadas por coordinación/edición.
- **Alcance**: Vista `RepertoireManager` (bloques de `programas_repertorios` y sus filas de `repertorio_obras`) y columnas adicionales en la tabla `repertorio_obras`.

### Modelo de Datos

- **Tabla base**: `repertorio_obras` (relación obra ↔ bloque de repertorio).
- **Nuevos campos**:
  - `estado_curaduria TEXT DEFAULT 'Propuesto' CHECK (estado_curaduria IN ('Propuesto', 'Aceptado', 'Rechazado'))`
  - `observacion_curaduria TEXT`
  - `en_definicion BOOLEAN DEFAULT false`
- **Semántica**:
  - `en_definicion`: indica si las obras de un bloque están aún en modo de definición/curaduría (flujo abierto).
  - `estado_curaduria`: estado de validación de la obra propuesta dentro del bloque.
  - `observacion_curaduria`: comentarios breves de coordinación/edición sobre la decisión.

### Reglas de Negocio

1. **Interruptor de Bloque (`en_definicion`)**
   - Cada bloque de `programas_repertorios` opera sobre sus filas en `repertorio_obras` mediante un flag de definición.
   - El flag se implementa como un booleano `en_definicion` en cada fila de `repertorio_obras`.
   - El header del bloque en `RepertoireManager` expone, solo para editores, un control **"Modo Definición"**:
     - Al activarlo, todas las filas de `repertorio_obras` asociadas a ese bloque pasan a `en_definicion = true`.
     - Al desactivarlo, todas las filas asociadas pasan a `en_definicion = false`.

2. **Estados de Curaduría**
   - Las obras pueden estar en uno de estos estados:
     - `Propuesto` (valor por defecto).
     - `Aceptado`.
     - `Rechazado`.
   - El estado se almacena en `repertorio_obras.estado_curaduria`.

3. **Visibilidad de Controles**
   - Si `en_definicion` es `false` para una fila:
     - Los controles de validación (select + observación) se ocultan para todos los usuarios.
     - Se puede mostrar, opcionalmente, solo un indicador de estado si fuera necesario en el futuro.
   - Si `en_definicion` es `true`:
     - **Editores**:
       - Ven un selector de estado (`Propuesto`, `Aceptado`, `Rechazado`) por obra.
       - Ven un campo de texto corto para `observacion_curaduria`.
     - **Usuarios sin permisos de edición**:
       - No pueden modificar valores, pero pueden ver el estado resultante en formato de badge/etiqueta de color.

4. **Persistencia**
   - Los cambios se guardan siempre en la tabla `repertorio_obras`:
     - `en_definicion` se actualiza en lote para todas las filas del bloque cuando el editor cambia el "Modo Definición".
     - `estado_curaduria` y `observacion_curaduria` se actualizan por fila mediante acciones de edición en `RepertoireManager`.

### Componentes Afectados

- **`RepertoireManager.jsx`**:
  - Inyectar lógica de toggle en el header del bloque:
    - Control `Modo Definición` visible solo para `isEditor`.
    - Cuando cambia, actualiza `en_definicion` para todas las obras del bloque (UI + Supabase).
  - Tabla de obras (vista Desktop):
    - Añadir una columna condicional a la derecha del título:
      - Solo muestra controles cuando `item.en_definicion` es `true`.
      - Para editores: select de `estado_curaduria` + input breve `observacion_curaduria`.
      - Para lectores: badge de solo lectura con color según estado.
  - Vista móvil (cards):
    - Al final de la card (antes de la botonera inferior), mostrar el mismo bloque de curaduría:
      - Solo si `item.en_definicion` es `true`.
      - Respetar el mismo comportamiento de edición/solo lectura que en Desktop.

### UI / UX

- **Select de Estado**:
  - Opciones:
    - `Propuesto` → color base `amber` (p. ej. `bg-amber-50`, `text-amber-700`, borde `border-amber-200`).
    - `Aceptado` → color base `emerald` (p. ej. `bg-emerald-50`, `text-emerald-700`, borde `border-emerald-200`).
    - `Rechazado` → color base `red` (p. ej. `bg-red-50`, `text-red-700`, borde `border-red-200`).
  - Puede acompañarse de iconos Lucide:
    - `IconAlertCircle` para `Propuesto`.
    - `IconCheck` para `Aceptado`.
    - `IconX` para `Rechazado`.

- **Campo de Observación**:
  - Input de texto pequeño, alineado a la derecha del select de estado o debajo, según espacio disponible.
  - Uso principal: registrar comentarios breves de coordinación (p. ej. razones de rechazo, condiciones de aceptación).

- **Consistencia Visual**:
  - Mantener coherencia con los estilos actuales de `RepertoireManager`:
    - Tamaños de fuente `text-[10px]` / `text-xs`.
    - Bordes suaves y fondos claros.
    - Integrarse con el diseño de tabla (desktop) y tarjetas (móvil).

### Estado de Implementación

- **Estado**: Pendiente
- **Tareas**:
  - [ ] Crear campos `estado_curaduria`, `observacion_curaduria` y `en_definicion` en `repertorio_obras` (SQL en Supabase).
  - [ ] Añadir toggle de `Modo Definición` en el header del bloque en `RepertoireManager`.
  - [ ] Añadir columna de curaduría en la tabla Desktop (select + observación).
  - [ ] Añadir controles equivalentes en las tarjetas móviles.
  - [ ] Probar flujo completo con distintos roles (editor / solo lectura).
  - [ ] Actualizar este spec marcando el estado como **Completado**.

