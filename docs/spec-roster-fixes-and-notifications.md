# Spec: Correcciones de Roster y Refinamiento de Notificaciones (Final)

## 1. Reglas de Negocio: Persistencia

- **Estado 'Ausente'**: Nunca se elimina el registro de `giras_integrantes` al cambiar estados. Se usa `estado = 'ausente'` o `estado = 'confirmado'`.
- **Eliminación manual**: Solo el botón de la papelera (Trash) en músicos adicionales/vacantes saca la fila de `giras_integrantes`, vía `baja_giras_integrantes` (queda en `giras_integrantes_historial` con autor y motivo). La papelera de vacante sigue en `eliminar_vacante`.

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
| Exclusión de ensamble | "Se excluyó al ensamble [Nombre]. Motivo: [texto]" + pie Balance Orquestal si aplica |
| Ausente (modal baja) | "Se te marcó como ausente. Motivo: [texto]" + pie Balance Orquestal si aplica |
| Baja manual / desconvocar | "Baja de la gira. Motivo: [texto]" |

## 4. Notificación de Borrado (GirasView)

- **Condición**: `programas.notificacion_inicial_enviada === true`.
- **Destinatarios**: Todos los integrantes con `estado === 'confirmado'` que tengan email.
- **Variante**: `GIRA_ELIMINADA`.
- Se envía **antes** de ejecutar el borrado del programa (vía Edge Function o servicio).

## 5. Bloqueo de Seguridad

- No se permite cerrar la vista ni volver atrás sin resolver el `NotificationQueuePanel`: se inyecta un modal de confirmación en `onBack` (y se advierte con `beforeunload` al cerrar pestaña) con opciones: Enviar todo ahora / Descartar y salir / Permanecer aquí.

## 6. Triggers de Notificación

- **addManualMusician**: ALTA + reason "Se te convoca individualmente".
- **handleUpdateGroups / Convocar → Actualizar**: abre `RosterBajaModal` si hay baja (destildar ensamble o familia, o agregar `EXCL_ENSAMBLE`) o alta (sumar ensamble/camerata/familia, o sacar una exclusión). El texto del mail distingue ensamble y familia. Al confirmar **con notificación**, esas tareas entran en `NotificationQueuePanel` (no se envían en el acto). Con esa cola no se puede cambiar de pantalla ni cerrar la pestaña hasta Enviar o Cancelar.
- **toggleStatus** (a Presente desde ausente): ALTA sin motivo específico o genérico.
- **Modal de baja** (`RosterBajaModal`, ausente o desconvocar): motivo obligatorio (Balance Orquestal, Razones personales, Enfermedad u Otro). Opciones: Deshacer, Confirmar y notificar, Confirmar sin notificar (con confirmación extra). Ausente y desconvocar individual se envían **de inmediato**. El cambio grupal, si se notifica, queda en la cola inferior. El motivo se persiste en `giras_integrantes.motivo_estado` al marcar ausente; en desconvocar o exclusión de ensamble solo viaja al mail si se notifica.

Solo se encola cuando la gira tiene `notificacion_inicial_enviada === true`.

## 8. Exclusión / inclusión grupal — selección por integrante

Aplica a **ensambles** y **familias** (chips del header o desplegable Convocar → Actualizar).

### Baja (quitar ensamble o familia)
- **Listado**: `RosterBajaModal` con casilla por integrante afectado.
- **Prioridad EXCL_ENSAMBLE**: al calcular quién sale del roster (`memberWouldStayInRoster`), la exclusión de ensamble **manda sobre familia** (igual que `useGiraRoster` / `giraService`). Si no, con familia convocada el modal no se abría y la baja se aplicaba en silencio.
- **Por defecto marcados**: quienes saldrían del roster (no están en `giras_integrantes`).
- **Por defecto sin marcar**: convocados manualmente; aviso en el modal.
- **Destildar** (no manual): `upsert` en `giras_integrantes` → queda manual, sin mail.
- **Marcar manual**: `DELETE` en `giras_integrantes` → desconvocado (mail BAJA con motivo si aplica).
- Motivos de mail: ensamble `"Se excluyó al ensamble [Nombre]. Motivo: …"`; familia `"Se excluyó la familia de [Familia]. Motivo: …"`.

### Alta (agregar ensamble, camerata o familia, o sacar una exclusión)
- **Familia**: integrantes estables de esa familia.
- **Ensamble / camerata**: integrantes con membresía vigente en la fecha del programa que quedarían en el roster (la camerata es un ensamble: fila `ensambles_cf.id_ensamble_cf`, o nombre CF* / Jazz Band). Sacar un `EXCL_ENSAMBLE` se trata como alta de ese ensamble si la persona vuelve a entrar.
- **Por defecto marcados**: nuevos integrantes; **sin marcar**: ya convocados manualmente.
- **Destildar**: entran por la fuente pero **sin** mail ALTA.
- **Marcar**: mail `"Se te convoca con el ensamble [Nombre]"` o `"Se te convoca con la familia de [Familia]"`. Si entran por las dos, el texto menciona ambas.
- Si en el mismo Actualizar hay baja y alta, primero modal de baja y luego el de alta.
- El diff de exclusiones lee `EXCL_ENSAMBLE` (el tipo que se guarda).

## 7. NotificationQueuePanel

- Expone **`sendAllNow()`** vía ref para el modal de salida.
- Cada tarea enviada a la Edge Function incluye **`reason`** en el payload `detalle` para que la plantilla lo muestre en el cuerpo del mail.
- Opcionalmente **`reason_footnote`**: párrafo adicional debajo del motivo (ej. leyenda de Balance Orquestal en mails `AUSENTE`).

## 8. Menús de la toolbar en móvil

- [x] Orden, Filtros y Convocar se renderizan en portal (`position: fixed`, `z-index: 80`, `max-height` del viewport). La fila de la toolbar tiene `overflow-x-auto` y recortaba los desplegables absolutos. Los `MultiSelectDropdown` de Filtros siguen en su portal (`z-index: 150`).
