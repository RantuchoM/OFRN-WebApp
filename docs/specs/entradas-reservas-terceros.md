# Entradas — reservas a terceros (admin)

## Alcance

- Solo rol **admin** en `/entradas`.
- Reservar entradas para otra persona desde el catálogo.
- Sección **«Mis entradas de terceros»** (`?view=entradas-terceros`).

## Modelo (`entrada_reserva`)

| Columna | Uso |
|---------|-----|
| `reservada_por` | UUID del admin creador. `NULL` = reserva personal. |
| `email_beneficiario` | Mail pendiente de vinculación (lowercase). |
| `beneficiario_referencia` | Nota libre del admin. |

## Reglas

- [x] Reserva personal: máx. 1 activa por `(usuario_id, concierto)` si `reservada_por IS NULL`.
- [x] Admin puede crear **varias** reservas a terceros para el mismo concierto.
- [x] Sin mail: titular temporal = admin (`usuario_id = admin`).
- [x] Con mail existente en `entrada_usuario`: vinculación inmediata tras confirmación UI (Apellido, Nombre).
- [x] Con mail inexistente: pendiente hasta login; `entrada_vincular_reservas_pendientes()` en `entrada_ensure_profile`.
- [x] «Mis entradas» excluye filas con `reservada_por IS NOT NULL` en cuenta admin.
- [x] PDF descargable al crear y desde listado de terceros.
- [x] Mail de confirmación al **admin creador** y al **beneficiario** (si hay mail); cancelación igual.

## RPCs

- `entrada_admin_buscar_beneficiario(p_email)`
- `entrada_admin_crear_reserva_tercero(...)`
- `entrada_admin_asociar_email_tercero(p_reserva_id, p_email)`
- `entrada_admin_cancelar_reserva_tercero(p_reserva_id)`
- `entrada_vincular_reservas_pendientes()`

Migración: `supabase/migrations/20260619120000_entradas_reservas_terceros.sql`

## UI

- **Admin** → pestaña **«Entradas de terceros»** (junto a Programas y Usuarios).
- Selector de concierto actual con reservas abiertas + formulario de reserva + listado activo.
- Componente: `src/components/entradas/EntradasTercerosSection.jsx`.

## Edge

- `entradas-send-reserva-email`: envío múltiple (admin + beneficiario) para reservas con `reservada_por`.

## Admin — resúmenes de programa (programas actuales)

- [x] En cada tarjeta de concierto (vista Admin → Programas), junto al botón de copiar mails de cada resumen, ícono **lista** abre modal con buscador.
- [x] Modal (`EntradasAdminReservasListModal`): usuario, cantidad de entradas, fecha de reserva/inscripción; columna concierto si el listado agrupa varios.
- [x] Misma categorización que mails: reservaron, ingresaron, sin ingreso, recordatorio de apertura.
- [x] A nivel programa: botón lista al lado de cada «Mails: …».
- [x] Barra de disponibilidad (`EntradasDisponibilidadBar`, igual que catálogo) en conciertos con reservas abiertas, vía RPC `entrada_conciertos_disponibilidad`.
- Servicio: `getAdminReservasList` en `src/services/entradaService.js`.
