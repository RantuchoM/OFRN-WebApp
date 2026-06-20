# Entradas — recepción (check-in QR)

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
  - **Deshacer** una plaza o **deshacer todo** el ingreso recién registrado (vuelve a pendiente).
  - **Anular** plazas que sigan pendientes en la misma reserva.
  - **Cancelar reserva completa**.

## RPCs

- `entrada_recepcion_cancelar_reserva(p_reserva_id)`
- `entrada_recepcion_anular_entradas(p_reserva_id, p_ordenes)`
- `entrada_recepcion_revertir_ingresos(p_reserva_id, p_ordenes)` — ingresada → pendiente
- `entrada_validar_y_consumir_qr` devuelve `ordenes_ingresadas[]`
- `entrada_preview_qr` devuelve `reserva_id`, `entrada_id` e `id` por fila en `entradas[]`.

Migraciones:
- `supabase/migrations/20260620120000_entradas_recepcion_auto_cancel.sql`
- `supabase/migrations/20260620130000_entradas_recepcion_revertir_ingreso.sql`

## UI

- Componente: `src/views/Public/Entradas/EntradasMain.jsx` (sección Recepción).
- Servicio: `recepcionCancelarReserva`, `recepcionAnularEntradas`, `recepcionRevertirIngresos` en `src/services/entradaService.js`.

## Notas

- Llegada parcial al grupo: escanear QR individuales, o escanear el grupal y **deshacer/anular** desde el banner.
- Contador «Sin entrada / sin QR» sin cambios.
