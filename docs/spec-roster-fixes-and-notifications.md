# Spec: Correcciones de Roster y Refinamiento de Notificaciones (Final)

## 1. Reglas de Negocio: Persistencia

- **Estado 'Ausente'**: Nunca se elimina el registro de `giras_integrantes` al cambiar estados. Se usa `estado = 'ausente'` o `estado = 'confirmado'`.
- **Eliminación manual**: Solo el botón de la papelera (Trash) en músicos adicionales/vacantes puede ejecutar un `DELETE` en `giras_integrantes`.

## 2. Buscador de Integrantes

- **Detección de presencia**: El buscador individual compara contra `localRoster`.
- **Acción**:
  - **En gira**: scroll al integrante en la tabla (etiqueta "Ya en gira").
  - **Fuera de gira**: `INSERT` en `giras_integrantes` + encolar notificación con motivo.

## 3. Matriz de Motivos (Reasoning)

El sistema inyecta el string exacto del motivo en el campo `data.reason` del mail para que el músico entienda su rol o su exclusión:

| Origen | Motivo en el mail |
|--------|-------------------|
| Alta individual | "Se te convoca individualmente" |
| Alta por ensamble | "Se te convoca con el ensamble [Nombre]" |
| Alta por familia | "Se te convoca con la familia de [Familia]" |
| Exclusión de ensamble | "Se excluyó al ensamble [Nombre]" |
| Ausente (toggleStatus) | "Se te marcó como ausente" |
| Baja manual | (opcional, ej. "Baja de la gira") |

## 4. Notificación de Borrado (GirasView)

- **Condición**: `programas.notificacion_inicial_enviada === true`.
- **Destinatarios**: Todos los integrantes con `estado === 'confirmado'` que tengan email.
- **Variante**: `GIRA_ELIMINADA`.
- Se envía **antes** de ejecutar el borrado del programa (vía Edge Function o servicio).

## 5. Bloqueo de Seguridad

- No se permite cerrar la vista ni volver atrás sin resolver el `NotificationQueuePanel`: se inyecta un modal de confirmación en `onBack` (y se advierte con `beforeunload` al cerrar pestaña) con opciones: Enviar todo ahora / Descartar y salir / Permanecer aquí.

## 6. Triggers de Notificación

- **addManualMusician**: ALTA + reason "Se te convoca individualmente".
- **handleUpdateGroups**: ALTA para nuevos (reason por ensamble o familia); BAJA para excluidos por EXCL_ENSAMBLE con reason "Se excluyó al ensamble [Nombre]".
- **toggleStatus** (a Ausente): AUSENTE + reason "Se te marcó como ausente"; (a Presente): ALTA sin motivo específico o genérico.

Solo se encola cuando la gira tiene `notificacion_inicial_enviada === true`.

## 7. NotificationQueuePanel

- Expone **`sendAllNow()`** vía ref para el modal de salida.
- Cada tarea enviada a la Edge Function incluye **`reason`** en el payload `detalle` para que la plantilla lo muestre en el cuerpo del mail.
