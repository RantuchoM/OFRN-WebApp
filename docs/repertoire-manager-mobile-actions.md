# RepertoireManager: Acciones Móviles y Estados de Obras

## Objetivo

Unificar el lenguaje visual de los estados de las obras (especialmente en dispositivos móviles) y mejorar la capacidad de gestión del repertorio (orden, edición y borrado) desde pantallas táctiles, manteniendo la coherencia con la vista de escritorio.

## Cambios Requeridos

### 1. Vista Móvil (Cards)

- **Código de Colores por Estado**
  - **Oficial**: Borde lateral o fondo suave color `slate` (ej. `slate-400`).
  - **Solicitud**: Borde lateral o fondo suave color `amber` (ej. `amber-500`).
  - **Informativo (Nuevo/Check)**: Borde lateral color `blue` (ej. `blue-500`).
  - **Sin estado definido**:
    - Si la obra tiene parte cargada para el usuario actual, usar un color de énfasis `emerald` (ej. `emerald-500`).
    - En otros casos, usar un color neutro (`slate` suave).

- **Controles de Orden**
  - Añadir un pequeño stack vertical de botones a la derecha de cada tarjeta.
  - Incluir:
    - `IconChevronDown` **rotado 180°** para mover la obra **hacia arriba**.
    - `IconChevronDown` normal para mover la obra **hacia abajo**.
  - Ambos botones deben invocar `moveWork(rep.id, item.id, direction)` con `direction = -1` (subir) o `direction = 1` (bajar).

- **Acciones de Edición y Borrado**
  - En el mismo contenedor vertical de acciones (a la derecha de la card):
    - Icono de edición: `IconEdit` vinculado a `openEditModal(item)`.
    - Icono de borrado: `IconTrash` (en color `red-400` y `hover` más intenso) vinculado a `removeWork(item.id)`.
  - Estas acciones deben respetar siempre el flag `isEditor` (no se muestran ni actúan si el usuario no puede editar).

- **Notas de Producto**
  - Mantener el uso de `MultiLineTitle` / `RichTextPreview` (según corresponda) para mostrar títulos y textos ricos.
  - Respetar el comportamiento actual de badges (INFO, PEND, etc.).

### 2. Vista Escritorio (Table)

- **Unificación de Iconografía**
  - En la columna de acciones de la tabla de escritorio:
    - Reemplazar `IconX` por `IconTrash` en el botón de "eliminar obra".
  - El resto de acciones (comentarios, edición, etc.) se mantienen sin cambios.

### 3. Sincronización y Lógica de Orden

- **Función `moveWork`**
  - Debe manejar correctamente los límites del array:
    - No intentar mover arriba si el índice es `0`.
    - No intentar mover abajo si el índice es `length - 1`.
    - Protegerse ante índices o bloques no encontrados (`repIndex === -1`, obra no localizada, etc.).
  - Esta robustez es especialmente importante cuando se invoca desde la vista móvil.

### 4. Reglas de Negocio

- Mantener el uso de `RichTextPreview` para títulos y textos ricos donde ya esté implementado.
- Todas las acciones de edición, orden y borrado deben respetar el flag `isEditor`.
- No inventar estados nuevos para `obras.estado`; usar únicamente los existentes (`Oficial`, `Solicitud`, `Informativo`, etc.) definidos en la base de datos.

---

## Estado de Implementación

- [x] Vista móvil: código de colores por estado en barra lateral.
- [x] Vista móvil: contenedor vertical de acciones (orden, edición, borrado) respetando `isEditor`.
- [x] Vista escritorio: reemplazo de `IconX` por `IconTrash` en botón de eliminar obra.
- [x] Robustez extra en `moveWork` para evitar errores de índice desde móvil.

