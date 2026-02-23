# Sistema de Auditoría y Borrado Lógico de Agenda (OFRN)

## Propósito
Permitir que los músicos visualicen cambios recientes (24h) y habilitar una "Papelera de Reciclaje" que mantiene los eventos eliminados visibles (tachados) durante 24 horas antes de su desaparición definitiva.

## Especificaciones Técnicas

### 1. Base de Datos (Tabla `eventos`)
- `updated_at` (TIMESTAMPTZ): Se actualiza automáticamente en cada `UPDATE`.
- `is_deleted` (BOOLEAN): Indica si el evento ha sido enviado a la papelera.
- `deleted_at` (TIMESTAMPTZ): Timestamp del momento del borrado.

### 2. Lógica de Negocio (24 Horas)
- **Modificado recientemente**: `updated_at > (NOW() - INTERVAL '24 hours')`.
- **Borrado temporal**: El evento es visible si `is_deleted = true` Y `deleted_at > (NOW() - INTERVAL '24 hours')`.
- **Filtro de Selección**: Los eventos con `is_deleted = true` y más de 24h de antigüedad son ignorados por el `SELECT`.

### 3. Identidad Visual (Tailwind)
- **Editado (<24h)**: Borde `ring-2 ring-blue-500` con animación `animate-pulse`.
- **Eliminado (Papelera)**:
  - **Fondo**: `bg-orange-50` (o `backgroundColor: '#fff7ed'`). Sin gris ni grayscale.
  - **Texto**: Descripción y metadatos en `text-orange-700` (iconos `text-orange-600`).
  - **Decoración**: `line-through` y `opacity-80`.
  - **Acciones**: Solo el icono de restaurar (Undo/RotateCcw) en `text-emerald-600`. Sin Drive, Comida, Comentarios ni Editar.
  - **Restauración**: Al clic en el icono se llama `handleRestoreEvent(evt.id)`; tras éxito se muestra `toast.success("Evento restaurado exitosamente. Ha vuelto a la agenda activa.", { icon: "✅" })` y se refresca la agenda con `fetchAgenda(true)`.

## Flujo de Trabajo
1. El usuario borra un evento -> Se activa `is_deleted` y `deleted_at`.
2. El sistema muestra el evento tachado a todos los usuarios por 24 horas.
3. Un editor puede "Restaurar" seteando `is_deleted = false`.
