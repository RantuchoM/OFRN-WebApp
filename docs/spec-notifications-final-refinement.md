# Spec: Refinamiento Final de Notificaciones y Cola de Tareas

## 1. Notificaciones por Exclusión

- **Escenario**: Cuando un usuario **destilda** un ensamble en el dropdown de Grupos (lo quita de la selección de incluidos).
- **Acción**: El sistema identifica qué músicos pertenecen a ese ensamble y genera una tarea en la cola con el motivo: `"Se excluyó al ensamble [Nombre]"`.
- **Validación**: Solo se genera la tarea si la gira tiene `notificacion_inicial_enviada === true`.
- **Nota**: Lo mismo aplica cuando se agrega un ensamble como **EXCL_ENSAMBLE** (exclusión explícita): los integrantes de ese ensamble que salen del roster reciben la misma notificación.

## 2. Gestión Masiva de la Cola (Panel)

- **UI**: El `NotificationQueuePanel` incluye dos botones globales:
  - **"Enviar todos ahora"**: Procesa inmediatamente todas las tareas pendientes hacia la Edge Function `mails_produccion`.
  - **"Cancelar todos"**: Vacía la cola sin enviar correos (limpia `pendingTasks`).
- **Seguridad**: Al intentar salir de `GiraRoster` con tareas pendientes, el modal de confirmación ofrece las mismas dos opciones masivas:
  - Enviar todo ahora (invoca `sendAllNow()` del panel).
  - Cancelar todos y salir (invoca `cancelAll()` del panel y luego `onBack()`).

## 3. Motivos Detallados

El campo `reason` viaja siempre en el JSON hacia `mails_produccion` en los siguientes casos:

| Caso / Variante   | Motivo en el mail                                      |
|-------------------|--------------------------------------------------------|
| ALTA_INDIVIDUAL   | "Se te convoca individualmente"                        |
| ALTA_GRUPO        | "Se te convoca con el ensamble/familia [Nombre]"       |
| BAJA_EXCLUSION    | "Se excluyó al ensamble [Nombre]"                      |
| AUSENCIA          | "Se te marcó como ausente"                             |
| GIRA_ELIMINADA    | "La gira [Nombre] ha sido cancelada y eliminada del cronograma" |

En el frontend se siguen usando las variantes `ALTA`, `BAJA`, `AUSENTE` y `GIRA_ELIMINADA`; el texto exacto se define en `reason`.

## 4. Referencia desde el padre

- El componente padre (`GiraRoster`) pasa una **ref** al `NotificationQueuePanel` para invocar desde el modal de bloqueo:
  - `ref.current.sendAllNow()`: envía todas las tareas ahora.
  - `ref.current.cancelAll()`: vacía la cola (y el padre puede ejecutar `onBack()` si corresponde).
