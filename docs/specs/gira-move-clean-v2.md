# Spec: Traslado de Gira - Modelo Basado en Eventos (v2)

## Objetivo
Refactorizar el traslado de giras para que la tabla `eventos` sea el origen principal de la agenda, eliminando la redundancia de fechas en logística y automatizando avisos masivos.

## Lógica de Traslado

1. **Cálculo de Delta:** Se determina el `daysDiff` entre la fecha original (`programas.fecha_desde`) y la nueva fecha de inicio elegida por el usuario.

2. **Actualización de Programas:** Únicamente se mueven:
   - `fecha_desde`
   - `fecha_hasta`
   - `fecha_confirmacion_limite`

3. **Actualización de Eventos:** Se desplazan todos los registros de la tabla `eventos` sumando el `daysDiff` a la columna `fecha`. Las reglas de logística se mantienen íntegras gracias a sus FKs hacia los eventos (ya no se actualizan columnas de fecha en `giras_logistica_reglas`).

4. **Otras tablas con fechas (traslado coherente):**
   - `programas_agenda_comidas`: se actualiza `fecha`.
   - `giras_destaques_config`: `fecha_llegada`, `fecha_salida`.
   - `giras_viaticos_detalle`: `fecha_salida`, `fecha_llegada`.

5. **Limpieza de esquema:** Las columnas de fecha en `giras_logistica_reglas` (`fecha_checkin`, `fecha_checkout`, `comida_inicio_fecha`, `comida_fin_fecha`) fueron eliminadas. No se realiza ninguna actualización sobre esa tabla en el traslado ni se copian esas columnas en la duplicación.

## Notificación Masiva (notify: true)

- **Cuándo:** Si la petición a la Edge Function `manage-gira` incluye `notify: true` en el body (tras confirmar el traslado desde el diálogo del frontend).

- **Destinatarios:** Integrantes del roster de la gira con `estado_gira !== 'ausente'` y con `mail`, obtenidos con **fetchRosterForGira** (misma lógica que la notificación inicial en GiraRoster: fuentes + giras_integrantes).

- **Canal:** El **frontend** (GirasView), tras confirmar que el traslado fue exitoso y si `notify` es true, obtiene el roster con **fetchRosterForGira(supabase, actionGira)** (misma lógica que useGiraRoster / notificación inicial en GiraRoster), filtra por `estado_gira !== 'ausente' && mail`, construye fechas viejas/nuevas y llama a `supabase.functions.invoke("mails_produccion", { body: { action, templateId, bcc, gira, detalle } })`. La Edge Function `manage-gira` solo realiza el traslado; no devuelve `notifyPayload` ni obtiene emails.

- **Formato del envío:**
  - **Subject:** `⚠️ CAMBIO DE FECHAS: [Nombre de la Gira]`
  - **Body:** Mensaje HTML informando que la gira se trasladó de [Fechas anteriores] a [Nuevas fechas].
  - **BCC:** Array de correos obtenidos (envío vía `bcc` en nodemailer).

- **Template en mails_produccion:** `cambio_fechas_gira`, con `detalle.fechas_viejas` y `detalle.fechas_nuevas`.

## Frontend

- **GiraManipulationModals.jsx – MoveGiraModal:**
  - Checkbox (Tailwind): *"Notificar cambio a los músicos por email"* (por defecto marcado).
  - Al confirmar, se llama `onConfirm(newDate, notify)` pasando el valor del checkbox.

- **giraActions.js – moveGira(giraId, newStartDate, notify):**
  - Tercer parámetro opcional `notify` (boolean).
  - Se envía en el body del POST a la Edge Function: `{ action: 'move', giraId, newStartDate, notify }`.

- **GirasView.jsx – onConfirmMove(newDate, notify):**
  - Llama a `moveGira(actionGira.id, newDate, notify)`. Si `notify` es true, tras el éxito llama a **fetchRosterForGira(supabase, actionGira)** para obtener el roster (misma lógica que GiraRoster), filtra por no ausentes y con mail, construye fechas viejas/nuevas (fechasNuevas con date-fns a partir de newDate y el span de la gira) e invoca `mails_produccion` con ese payload.

## Edge Function manage-gira

- **Servicio:** Se usa `createClient` con `SUPABASE_SERVICE_ROLE_KEY` para garantizar permisos de escritura en todas las tablas y la posibilidad de invocar `mails_produccion`.

- **moveGira(supabase, giraId, daysDiff):**
  1. Actualiza `programas` (fecha_desde, fecha_hasta, fecha_confirmacion_limite).
  2. Actualiza `eventos` (fecha) por cada evento de la gira.
  3. Actualiza `programas_agenda_comidas`, `giras_destaques_config`, `giras_viaticos_detalle` como se indicó.
  4. No obtiene roster ni devuelve `notifyPayload`; la notificación la gestiona íntegramente el frontend con **fetchRosterForGira**.

## Duplicación (duplicateGira)

- En la copia de `giras_logistica_reglas` ya no se incluyen `fecha_checkin`, `fecha_checkout`, `comida_inicio_fecha`, `comida_fin_fecha` (columnas eliminadas). Se copian el resto de campos (alcance, prioridad, horas, servicios de comida, etc.).

## Documentación y estado

- Este archivo (`docs/specs/gira-move-clean-v2.md`) describe la especificación y se mantiene actualizado con el código implementado.
- Implementado: refactor de moveGira, notificación por email, checkbox en MoveGiraModal, template `cambio_fechas_gira` en mails_produccion, limpieza de reglas logísticas en duplicateGira.
