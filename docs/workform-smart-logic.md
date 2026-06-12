# Spec: Lógica Inteligente y Feedback Visual en WorkForm

## 1. Feedback de Guardado (Field-Level)
Cada input debe manejar un estado local de "vuelto" (status):
- **Idle**: Color estándar.
- **Saving**: Animación sutil o borde azul.
- **Success**: Fondo verde esmeralda suave (`bg-emerald-50`) y borde verde por 2 segundos.
- **Error**: Fondo rojizo (`bg-red-50`) y borde rojo.

## 2. Bloqueo de Búsquedas (Políticas)
Para ahorrar tokens y evitar sobreescritura:
- **YouTube**: Si `formData.link_youtube` ya tiene un valor, se suspende la búsqueda de sugerencias de video.
- **Año**: Si `formData.anio` es válido (> 0), se suspende la búsqueda del año.
- **IMSLP/Drive**: Si existe `formData.link_drive`, se omite la búsqueda en IMSLP para no duplicar fuentes de partituras.

## 3. Integración IMSLP
- Si la IA encuentra un enlace a IMSLP, este debe concatenarse en el campo `observaciones` (formato WYSIWYG) como un link HTML: `<a href="...">Ver en IMSLP</a>`.

## 4. Footer al crear solicitud (sin `formData.id`)
- **Estado interno Borrador**: mientras no hay `formData.id`, el formulario muestra estado visual **Borrador** (cabecera y cuerpo en gris). No existe en BD; al guardar se persiste con `estado: "Solicitud"` (u otro según `formData.estado`).
- **Cancelar** / **X** del header: abren `ConfirmDialog` con tres opciones — *Crear solicitud* (guarda y cierra), *Cancelar solicitud* (descarta), *Seguir editando* (cierra el diálogo).
- **Crear solicitud** (footer): persiste la obra y mantiene el formulario abierto (`onSave(id, false)` en archivo; en contexto programa añade al bloque y no cierra el modal).
- **Guardar y Cerrar** (footer): persiste y cierra (`onSave(id, true)` / `onCancel` en programa).
- Con obra ya guardada, el botón izquierdo vuelve a decir **Cerrar** y el selector de estado vuelve a ser editable.