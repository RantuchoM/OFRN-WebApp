# Entradas — reservas a terceros

## Alcance

- Roles **admin**, **boletos** y **boletos_recep** en `/entradas`.
- Reservar entradas para otra persona.
- Todos los que pueden terceros (admin incluido) usan el menú **«🎫 Terceros»** (`?view=entradas-terceros`), fuera de Admin.
- Admin: Programas y Usuarios en Admin; recepción y terceros en menús propios.

## Modelo (`entrada_reserva`)

| Columna | Uso |
|---------|-----|
| `reservada_por` | UUID del creador (admin, boletos o boletos+recepc). `NULL` = reserva personal. |
| `email_beneficiario` | Mail pendiente de vinculación (lowercase). |
| `beneficiario_referencia` | Nota libre del emisor. |
| `cupo_excepcional` | `true` si se emitió forzando cupo (función agotada / sin plazas). |

## Roles (`entrada_rol`)

| Rol | Catálogo / mis entradas | Recepción | 🎫 Terceros | Admin (programas/usuarios) |
|-----|-------------------------|-----------|-------------|------------|
| `personal` | sí | no | no | no |
| `recepcionista` | sí | sí | no | no |
| `boletos` | sí | no | sí | no |
| `boletos_recep` | sí | sí | sí | no |
| `admin` | sí | sí | sí | sí |

- [x] Enum `boletos` y `boletos_recep`.
- [x] Helper `entrada_can_terceros` (admin, boletos, boletos_recep).
- [x] `entrada_is_recepcion` incluye `boletos_recep`.

## Reglas

- [x] Reserva personal: máx. 1 activa por `(usuario_id, concierto)` si `reservada_por IS NULL`.
- [x] Admin / boletos / boletos_recep pueden crear **varias** reservas a terceros para el mismo concierto.
- [x] **Excepción de cupo:** emitir tercero (formulario o lote de ayuda) aunque la función esté agotada, con checkbox + confirmación. RPC `entrada_admin_crear_reserva_tercero(..., p_forzar_cupo)`; marca `cupo_excepcional` en la reserva. Migración `20261023120000_entrada_tercero_forzar_cupo.sql`.
- [x] Sin mail: titular temporal = el emisor (`usuario_id = auth.uid()`).
- [x] Con mail existente en `entrada_usuario`: vinculación inmediata tras confirmación UI (Apellido, Nombre).
- [x] Con mail inexistente: pendiente hasta login; `entrada_vincular_reservas_pendientes()` en `entrada_ensure_profile`.
- [x] «Mis entradas» excluye filas con `reservada_por IS NOT NULL` en cuenta admin.
- [x] PDF descargable al crear y desde listado de terceros.
- [x] Tras generar la entrada desde una consulta de ayuda, el listado de terceros muestra **WhatsApp** (teléfono de la consulta, o `Tel …` en la referencia) con el mismo link público al PDF.
- [x] Mail de confirmación al **creador** y al **beneficiario** (si hay mail); cancelación igual.

## RPCs

- `entrada_admin_buscar_beneficiario(p_email)` — `entrada_can_terceros`
- `entrada_admin_crear_reserva_tercero(...)` — `entrada_can_terceros`
- `entrada_admin_asociar_email_tercero(p_reserva_id, p_email)` — `entrada_can_terceros`
- `entrada_admin_cancelar_reserva_tercero(p_reserva_id)` — `entrada_can_terceros`
- `entrada_actualizar_referencia_tercero(p_reserva_id, p_referencia)` — `entrada_can_terceros`
- `entrada_vincular_reservas_pendientes()`

Migraciones:
- `supabase/migrations/20260619120000_entradas_reservas_terceros.sql`
- `supabase/migrations/20260819150000_entradas_roles_boletos.sql` (enum `boletos` / `boletos_recep`)
- `supabase/migrations/20260819150100_entradas_roles_boletos_rpcs.sql` (RPCs, RLS; transacción aparte por SQLSTATE 55P04)
- `supabase/migrations/20261023120000_entrada_tercero_forzar_cupo.sql` (`cupo_excepcional` + `p_forzar_cupo`)

## UI

- Menú superior **«🎫 Terceros»** (`?view=entradas-terceros`) para admin, boletos y boletos_recep.
- Admin ya no tiene pestaña de terceros dentro de Admin (solo Programas y Usuarios).
- Selector de concierto actual con reservas abiertas + formulario de reserva + listado activo.
- Componente: `src/components/entradas/EntradasTercerosSection.jsx`.
- Helpers de rol: `src/utils/entradaRoles.js`.
- Roles asignables en Usuarios / pre-registro: personal, recepcionista, boletos, boletos+recepc, admin.

## Consultas de ayuda (formulario público)

- Tabla `entrada_ayuda_consulta` + RPCs `entrada_ayuda_listar` / `get` / `marcar_resuelta` / `descartar` (`entrada_can_terceros`).
- Edge `entradas-send-ayuda` persiste la fila, manda mail a staff con botón **Reservar en Entradas** → `/entradas?view=entradas-terceros&ayuda=<uuid>`, y **acuse al consultante** (aviso Spam / Correo no deseado).
- En Terceros: cola de pendientes (`EntradasAyudaConsultasPanel`); al Abrir (mail o cola) se precarga mail/cantidad/concierto/referencia, se hace scroll al formulario y se auto-confirma el beneficiario si ya tiene cuenta.
- **Lote:** tildar varias → **Aceptar N** (un concierto + mensaje personalizado compartido); avisa si alguna persona **ya tiene entradas** para ese concierto (`checkEntradasAyudaReservas`); procesa secuencial (reserva + mail + marcar resuelta; sin auto-descarga PDF).
- **Badge en menú «🎫 Terceros»:** ícono/contador arriba del botón con pendientes (`listEntradasAyudaConsultas`); se refresca al entrar, al resolver y cada 60s.
- **Al abrir Terceros** (sin deep link `?ayuda=`): si hay pendientes que entran en cupo, ConfirmModal ofrece **Resolver las que entren** (elige el concierto que más absorbe; FIFO). Misma acción en la cola: botón «Resolver las que entren en cupo». Helper: `src/utils/entradasAyudaCupo.js`.
- **Duplicados (mismo email):** se detectan en la cola (badge), al abrir lote / resolver-por-cupo y al Abrir una sola. Se unifican en **una reserva** (cantidad = máx del grupo); la consulta más antigua queda resuelta y las copias se **descartan**. Botón «Unificar duplicados» en la cola.
- **Ya tiene entrada activa:** al Abrir (o en la cola vía `checkEntradasAyudaReservas`) se listan reservas vigentes del mail. Se puede **Vincular y marcar resuelta** (sin emitir otra), **Reenviar mail** (`reenviar_entradas`) y **WhatsApp** con el PDF de esa reserva. Preferencia: mismo `concierto_id` de la consulta si coincide.
- Mensaje personalizado opcional en el formulario de terceros → va en el mail de confirmación (`mensajePersonalizado` → Edge `entradas-send-reserva-email`).
- Si `estado=resuelta` (o descartada), el deep link muestra aviso y no pide re-reservar.
- Al crear la reserva de tercero con una consulta pendiente abierta, se marca resuelta y se guarda `reserva_id`.
- [x] En **Entradas de terceros activas**, cada reserva que vino de una consulta con teléfono (o tiene `Tel …` en la referencia) muestra el botón **WhatsApp** con el link al PDF ya generado. El listado se desplaza hasta ahí al resolver una consulta o un lote.
- [x] Cola + deep link + detección de ya resuelta.
- [x] Acuse al consultante + Abrir (scroll / auto-confirm) + mensaje personalizado en mail.
- [x] Aceptar varias a la vez + aviso de reservas existentes.
- [x] Botón WhatsApp (`whatsapp://`, AR por defecto) en cola, banner, listado y mail de consulta. Mensaje: saludo, día, hora, lugar, cantidad, link al PDF si hay reserva, y PD de que no se responden consultas por ese medio.
- [x] Link público PDF en WhatsApp: `/entradas/pdf?t=` identifica la reserva (`pdf_share_token`). `entrada_pdf_share_payload` lee concierto, evento (`eventos.id_locacion`), programa y plazas con la misma forma que Mis entradas. La página llama a `descargarPdfDesdeReservaRow` (el mismo generador). Sin sesión.

## Edge

- `entradas-send-reserva-email`: envío múltiple (admin + beneficiario) para reservas con `reservada_por`; acepta `mensajePersonalizado` en confirmación/cambio.
- [x] Tras la nota de puntualidad, el mail de confirmación/cambio incluye aviso de cancelar o cambiar cantidad + botón «Gestionar mis entradas» (`view=mis-reservas`).

## Admin — resúmenes de programa (programas actuales)

- [x] En cada tarjeta de concierto (vista Admin → Programas), junto al botón de copiar mails de cada resumen, ícono **lista** abre modal con buscador.
- [x] Modal (`EntradasAdminReservasListModal`): usuario, cantidad de entradas, fecha de reserva/inscripción; columna concierto si el listado agrupa varios; botón **PDF** por fila (reservaron / ingresaron / sin ingreso) vía `descargarPdfDesdeReservaId`.
- [x] Misma categorización que mails: reservaron, ingresaron, sin ingreso, recordatorio de apertura.
- [x] A nivel programa: botón lista al lado de cada «Mails: …».
- [x] Barra de disponibilidad (`EntradasDisponibilidadBar`, igual que catálogo) en conciertos con reservas abiertas, vía RPC `entrada_conciertos_disponibilidad`.
- Servicio: `getAdminReservasList` en `src/services/entradaService.js`.
