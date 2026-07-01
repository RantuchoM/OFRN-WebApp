# Entradas — recepción (check-in QR)

## Acceso público (login OTP)

- Edge Function `entradas-auth-email` (código de 8 dígitos + enlace mágico).
- [x] Errores de red / timeout al invocar la función se muestran en español claro («revisá tu conexión e intentá de nuevo»), no el mensaje técnico de Supabase.
- Mensajes del servidor (cooldown 60s, límite por hora, código inválido, etc.) se conservan tal cual.

## Alcance

- Rol **recepcionista** o **admin** en `/entradas?view=recepcion`.
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
