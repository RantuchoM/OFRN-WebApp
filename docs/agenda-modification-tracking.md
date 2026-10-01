# Sistema de Auditoría y Borrado Lógico de Agenda (OFRN)

## Propósito
Permitir que los músicos visualicen cambios recientes (24h) y habilitar una "Papelera de Reciclaje" que mantiene los eventos eliminados visibles (tachados) durante 24 horas antes de su desaparición definitiva.

## Especificaciones Técnicas

### 1. Base de Datos (Tabla `eventos`)
- `updated_at` (TIMESTAMPTZ): Lo pisa `tr_set_eventos_updated_at` / `handle_eventos_updated_at` en cada `UPDATE` **editorial**. No se toca si el único cambio es `ensayo_pese_conflicto` (ni un UPDATE no-op). Un UPDATE de `ensayo_pese_conflicto` **junto con** `ensayo_pese_conflicto_justificacion` sí pisa `updated_at` de esa fila. UnifiedAgenda usa este campo, no `last_modified_at`.
- `last_modified_at` (TIMESTAMPTZ): Misma regla vía `tr_eventos_update_timestamp` / `update_last_modified_column`. La agenda no lo lee para el pulso.
- `is_deleted` (BOOLEAN): Indica si el evento ha sido enviado a la papelera.
- `deleted_at` (TIMESTAMPTZ): Timestamp del momento del borrado.

`ADD COLUMN ... NOT NULL DEFAULT false` (p. ej. `ensayo_pese_conflicto`, `es_didactico`) es catalog-only en PG 11+ y **no** reescribe filas. Un `DEFAULT now()` (volátil) sí reescribe y deja el mismo `updated_at` en todas las filas (cluster histórico `2026-08-10 19:29:30+00`, 2183 eventos). No hacer `UPDATE eventos SET ensayo_pese_conflicto = false` masivo: eso sí dispararía los triggers.

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

## Realtime (no auto-refresh)

La suscripción a `eventos` en `useAgendaData` **sigue activa**. Un cambio remoto (de otro usuario) **no** fusiona ni recarga la lista: solo pone un flag sucio.

Barra fija arriba de la UI de agenda (columna flex, debajo del nav principal, escritorio y móvil), copia exacta: **Hubo cambios. Actualizar.** El clic llama `fetchAgenda` de la ventana actual y limpia el aviso. Si hay un modal/formulario abierto, el aviso se ve igual; no hay recarga automática debajo.

El eco de un guardado propio (`markLocalEventMutation`) no enciende la barra (~15 s). Los edits locales siguen usando `refreshEventById` (merge de un evento).

## Integración en GiraCard y edición de programa

| Superficie | Comportamiento |
|------------|----------------|
| **GiraCard** (listado inicial) | Los conciertos con `is_deleted = true` no se muestran en la vista compacta ni en el listado de escritorio. El aviso «No hay conciertos definidos» solo considera conciertos activos. Si el usuario puede editar el programa (`isEditor` / coordinador), el aviso incluye `IconEdit` que abre la edición del programa con `focusSection: "conciertos"` (scroll a la sección y modal de alta). En un solo día la fecha se muestra como `05` (no `05-05`). |
| **GiraForm → Conciertos y Funciones** (Edición) | Se listan todos los conciertos del programa, incluidos los eliminados. Los eliminados se muestran con `line-through` y `opacity-50`. El botón «Eliminar» del modal hace soft delete (`is_deleted` + `deleted_at`); si ya está eliminado, alterna a «Restaurar». |
| **useGirasList** | El select de `eventos` incluye `is_deleted` para filtrar en cliente. |
| **giraDateRange** | `isConcertEvent` ignora eventos con `is_deleted` al calcular fechas de orden y solapamiento. |
