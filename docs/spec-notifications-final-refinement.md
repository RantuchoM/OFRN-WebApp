# Spec: Refinamiento Final de Notificaciones y Cola de Tareas

## 1. Notificaciones por Exclusión

- **Escenario**: Cuando un usuario **destilda** un ensamble en el dropdown de Grupos (lo quita de la selección de incluidos) o lo agrega en **EXCLUIR Ens.**.
- **Acción**: El sistema lista integrantes del ensamble afectado en `RosterBajaModal` con casilla por persona (marcadas = desconvocar). Por defecto se marcan quienes saldrían del roster; quienes ya están en `giras_integrantes` (convocatoria manual) aparecen sin marcar y con aviso. Al confirmar: las destildadas se insertan en `giras_integrantes` (quedan manuales, sin mail); las marcadas se desconvocan y, si corresponde, reciben mail con motivo `"Se excluyó al ensamble [Nombre]. Motivo: [texto]"`.
- **Validación**: Solo se ofrece notificación por mail si la gira tiene `notificacion_inicial_enviada === true` y las notificaciones están habilitadas.
- **Nota**: Lo mismo aplica al quitar un chip de ensamble incluido en el header (si hay integrantes afectados).

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
| BAJA_EXCLUSION    | "Se excluyó al ensamble [Nombre]. Motivo: [texto]"     |
| AUSENCIA          | "Se te marcó como ausente"                             |
| GIRA_ELIMINADA    | "La gira [Nombre] ha sido cancelada y eliminada del cronograma" |

En el frontend se siguen usando las variantes `ALTA`, `BAJA`, `AUSENTE` y `GIRA_ELIMINADA`; el texto exacto se define en `reason`.

## 4. Referencia desde el padre

- El componente padre (`GiraRoster`) pasa una **ref** al `NotificationQueuePanel` para invocar desde el modal de bloqueo:
  - `ref.current.sendAllNow()`: envía todas las tareas ahora.
  - `ref.current.cancelAll()`: vacía la cola (y el padre puede ejecutar `onBack()` si corresponde).
