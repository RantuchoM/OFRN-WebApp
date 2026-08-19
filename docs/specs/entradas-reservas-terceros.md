# Entradas — reservas a terceros

## Alcance

- Roles **admin**, **boletos** y **boletos_recep** en `/entradas`.
- Reservar entradas para otra persona.
- Admin: pestaña **«Entradas de terceros»** dentro de Admin.
- Boletos / Boletos+Recepc: ítem de menú **«Entradas para terceros»** (`?view=entradas-terceros`), fuera de Admin (no ven Programas ni Usuarios).
- Admins pueden todo (programas, usuarios, recepción y terceros).

## Modelo (`entrada_reserva`)

| Columna | Uso |
|---------|-----|
| `reservada_por` | UUID del creador (admin, boletos o boletos+recepc). `NULL` = reserva personal. |
| `email_beneficiario` | Mail pendiente de vinculación (lowercase). |
| `beneficiario_referencia` | Nota libre del emisor. |

## Roles (`entrada_rol`)

| Rol | Catálogo / mis entradas | Recepción | Entradas para terceros | Admin (programas/usuarios) |
|-----|-------------------------|-----------|------------------------|----------------------------|
| `personal` | sí | no | no | no |
| `recepcionista` | sí | sí | no | no |
| `boletos` | sí | no | sí (menú propio) | no |
| `boletos_recep` | sí | sí | sí (menú propio) | no |
| `admin` | sí | sí | sí (pestaña Admin) | sí |

- [x] Enum `boletos` y `boletos_recep`.
- [x] Helper `entrada_can_terceros` (admin, boletos, boletos_recep).
- [x] `entrada_is_recepcion` incluye `boletos_recep`.

## Reglas

- [x] Reserva personal: máx. 1 activa por `(usuario_id, concierto)` si `reservada_por IS NULL`.
- [x] Admin / boletos / boletos_recep pueden crear **varias** reservas a terceros para el mismo concierto.
- [x] Sin mail: titular temporal = el emisor (`usuario_id = auth.uid()`).
- [x] Con mail existente en `entrada_usuario`: vinculación inmediata tras confirmación UI (Apellido, Nombre).
- [x] Con mail inexistente: pendiente hasta login; `entrada_vincular_reservas_pendientes()` en `entrada_ensure_profile`.
- [x] «Mis entradas» excluye filas con `reservada_por IS NOT NULL` en cuenta admin.
- [x] PDF descargable al crear y desde listado de terceros.
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
- `supabase/migrations/20260819150000_entradas_roles_boletos.sql`

## UI

- **Admin** → pestaña **«Entradas de terceros»** (junto a Programas y Usuarios).
- **Boletos / Boletos+Recepc** → menú superior **«Entradas para terceros»** (sin menú Admin).
- Selector de concierto actual con reservas abiertas + formulario de reserva + listado activo.
- Componente: `src/components/entradas/EntradasTercerosSection.jsx`.
- Helpers de rol: `src/utils/entradaRoles.js`.
- Roles asignables en Usuarios / pre-registro: personal, recepcionista, boletos, boletos+recepc, admin.

## Edge

- `entradas-send-reserva-email`: envío múltiple (admin + beneficiario) para reservas con `reservada_por`.

## Admin — resúmenes de programa (programas actuales)

- [x] En cada tarjeta de concierto (vista Admin → Programas), junto al botón de copiar mails de cada resumen, ícono **lista** abre modal con buscador.
- [x] Modal (`EntradasAdminReservasListModal`): usuario, cantidad de entradas, fecha de reserva/inscripción; columna concierto si el listado agrupa varios.
- [x] Misma categorización que mails: reservaron, ingresaron, sin ingreso, recordatorio de apertura.
- [x] A nivel programa: botón lista al lado de cada «Mails: …».
- [x] Barra de disponibilidad (`EntradasDisponibilidadBar`, igual que catálogo) en conciertos con reservas abiertas, vía RPC `entrada_conciertos_disponibilidad`.
- Servicio: `getAdminReservasList` en `src/services/entradaService.js`.
