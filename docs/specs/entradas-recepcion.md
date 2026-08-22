# Entradas — recepción (check-in QR)

## Acceso público (contraseña o enlace)

- Spec de login: `docs/specs/entradas-acceso.md`.
- Edge Function `entradas-auth-email`: en **Entradas** se envía un enlace directo (sin código de 8 dígitos). OTP numérico queda para SCRN / viáticos.
- Contraseña opcional; restauración por el mismo enlace (`purpose=reset`).
- [x] Errores de red / timeout al invocar la función se muestran en español claro («revisá tu conexión e intentá de nuevo»), no el mensaje técnico de Supabase.
- Mensajes del servidor (cooldown 60s, límite por hora, enlace inválido, etc.) se conservan tal cual.

## Alcance

- Roles **recepcionista**, **boletos_recep** (Boletos+Recepc) o **admin** en `/entradas?view=recepcion`.
- El rol **boletos** no accede a recepción (solo reservas a terceros).
- Escaneo de QR (cámara, foto o código manual de 10 dígitos) contra el concierto elegido.

## Flujo de ingreso

- [x] Tras leer un código válido con plazas pendientes, el **ingreso se registra automáticamente** (sin botón «Ingresar a sala»).
- [x] QR de **entrada individual** → ingresa esa plaza.
- [x] QR de **reserva grupal** o código manual → ingresa **todas** las plazas pendientes.
- [x] Si la reserva ya tuvo ingresos parciales, un nuevo escaneo del QR grupal ingresa el resto sin confirmación extra.
- [x] Toast de éxito; el campo de escaneo queda libre para el siguiente QR.

## Banner «Último ingreso»

- [x] Tras cada ingreso exitoso aparece un **banner verde** con reserva y plazas registradas en esa operación.
- [x] Permanece visible hasta el **próximo ingreso exitoso** (o cambio de concierto).
- [x] Acciones sobre ese ingreso:
  - **Cancelar** (por plaza o todo el último escaneo): revierte el check-in (`entrada_recepcion_revertir_ingresos`); la plaza vuelve a **pendiente**. **No cancela la reserva.**
  - **Bajar** plazas pendientes (atajo por fila o modal «Bajar plazas sin ingresar…»): anula entradas que **no ingresaron** (`entrada_recepcion_anular_entradas`).
  - En recepción **no** hay «Cancelar reserva completa» (eso queda en catálogo / mis reservas).

## RPCs

- `entrada_recepcion_anular_entradas(p_reserva_id, p_ordenes)` — pendiente → anulada (baja sin ingresar)
- `entrada_recepcion_revertir_ingresos(p_reserva_id, p_ordenes)` — ingresada → pendiente (cancelar ingreso)
- `entrada_validar_y_consumir_qr` devuelve `ordenes_ingresadas[]`
- `entrada_preview_qr` devuelve `reserva_id`, `entrada_id` e `id` por fila en `entradas[]`.

Migraciones:
- `supabase/migrations/20260620120000_entradas_recepcion_auto_cancel.sql`
- `supabase/migrations/20260620130000_entradas_recepcion_revertir_ingreso.sql`
- `supabase/migrations/20260620140000_entradas_helpers_fecha_lugar_evento.sql` — si falta `entrada_fecha_hora_desde_evento` (entornos sin `20260520120000`)
- `supabase/migrations/20260620150000_entradas_helpers_recepcionista_nombre.sql` — si falta `entrada_recepcionista_nombre_entrada`

## UI

- Componente: `src/views/Public/Entradas/EntradasMain.jsx` (sección Recepción).
- Servicio: `recepcionAnularEntradas`, `recepcionRevertirIngresos` en `src/services/entradaService.js`.
- `ConfirmModal` renderiza en `document.body` (z-index visible en recepción).

## Notas

- Llegada parcial al grupo: escanear QR individuales, o escanear el grupal y **cancelar ingreso / bajar plazas** desde el banner.
- Contador «Sin entrada / sin QR» sin cambios.

## Vista pública de QRs (evitar escaneo accidental)

- [x] Al abrir «Ver QR» (Mis entradas, Terceros, catálogo post-reserva y modal), se abre un **modal overlay** (`MisReservasQrModal`, portal a `document.body`, `z-[100]`) con el **QR general** y la **cantidad de entradas**.
- [x] Debajo, recuadro gris: «Solo si entran por separado -->» + «Ver QRs individuales» a la derecha (colapsados por defecto; se generan al expandir).
- [x] Panel: `MisReservasQrPanel.jsx`.
- [x] PDF (`entradasReservaPdf.js`): fila superior = detalle (izq.) + **QR general a la derecha**; debajo el aviso de asistencia; **QRs individuales al pie** de la hoja (chicos y separados).
- [x] Si **todas** las plazas de la reserva ya ingresaron: el botón **Ver QR** (Mis entradas, catálogo y Terceros) se muestra **gris** con el texto **«Ver QR (ya ingresadas)»**. Sigue abriendo el modal (QR en rojo / «usada»).
- [x] **Descargar PDF** de Mis entradas usa el mismo generador que el mail (`buildEntradasReservaPdfBlob`). Si las plazas ya ingresaron, el PDF marca el QR general y los individuales usados (mismo criterio que el modal). Un PDF viejo adjunto a un mail anterior no se reescribe: hay que volver a descargarlo.
