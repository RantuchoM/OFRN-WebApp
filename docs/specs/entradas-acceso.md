# Entradas — acceso (sacar con mail, gestionar con login)

## Objetivo

En `/entradas`, **sacar una entrada no exige login**: alcanza un mail válido. Gestionar las que ya tenés sigue pidiendo el acceso (código o contraseña). Si el dispositivo **ya tiene sesión**, entra directo al catálogo.

- Pantalla inicial: **Sacar entradas** y **Gestionar mis entradas**.
- Sacar: pide el mail. Si ya está en la base (`entrada_usuario`, `entrada_auth_email_user` o `integrantes`), abre sesión y sigue. Si no está, manda un código de 8 dígitos y lo valida **una sola vez**.
- Gestionar: el login por pasos (mail → código o contraseña).
- Quien tiene usuario OFRN usa la misma `clave_acceso` en gestionar.

SCRN y Viáticos Manual siguen con código de 8 dígitos + enlace (misma edge function, `app !== entradas`).

## Flujo público

1. Sin sesión: **Sacar entradas** / **Gestionar mis entradas**. Debajo, el catálogo de conciertos con reservas abiertas.
2. **Sacar entradas** → mail.
   - Mail conocido: sesión y catálogo, sin código ni contraseña.
   - Mail nuevo: código al mail (sin enlace). Al validarlo se crea el usuario y un perfil mínimo; la próxima vez ese mail ya es conocido.
3. **Gestionar mis entradas** (accesible, texto grande):
   - Solo el mail → Continuar (`check_login_options`).
   - **Link rápido** (botón corto en login): envía enlace mágico primero + OTP 8 dígitos como alternativa. El mail aclara «link de acceso rápido o código único»; el CTA del mail dice «Link rápido».
   - **Ingresar contraseña** si ya tiene (`password_set_at` o clave OFRN usable).
   - **Crear / recuperar contraseña** según el caso.
4. Con sesión: el nombre en el header abre menú con **Ver mi perfil** y **Cerrar sesión**; el ícono de tema queda aparte. Cerrar sesión vuelve a la pantalla de los dos botones.

## Sesión larga en el dispositivo

- Cliente `supabaseEntradasPublic`: `persistSession: true`, `autoRefreshToken: true`, storage key propia (`sb-ofrn-entradas-public-session`).
- No se borra al cerrar sesión de la intranet OFRN.
- Se recuerda el último mail en `localStorage` (`entradas_login_email`) para no reescribirlo.
- El JWT se renueva en background mientras el refresh token siga válido; no hace falta volver a loguearse en cada visita.

## Sesión del enlace / código

`verify_magic_link` / `verify_code` devuelven `token_hash` **y** `password` broker (si existe), para que el cliente use `verifyOtp` o `signInWithPassword` según disponibilidad.

## Backend

Edge Function `entradas-auth-email`:

| Acción | Uso |
|--------|-----|
| `start_ticket_by_email` | Sacar entradas: si el mail existe, sesión (`status: known`); si no, código de un solo uso (`status: code_sent`). |
| `verify_code` + `ticket: true` | Valida ese código y, si falta, crea perfil mínimo para reservar. |
| `check_login_options` | `{ has_password }` para el login de **Gestionar** (sin filtrar por existencia de cuenta). |
| `request_code` | OTP 8 dígitos + enlace en el mismo mail (gestionar, SCRN, viáticos). |
| `request_magic_link` | Enlace de acceso sin código (flujos legacy / otros). |
| `request_password_reset` | Enlace de restauración (`purpose=reset`). |
| `verify_magic_link` | Consume el token; sesión vía `generateLink` + `token_hash`. |
| `verify_code` | Valida OTP 8 dígitos. |
| `bootstrap_ofrn_password` | Siembra `clave_acceso` de OFRN en GoTrue si aún no hay clave propia en Entradas. |
| `sso_ofrn` | Login desde la app OFRN: verifica `integrantes` y emite sesión. |

RPC `entrada_mark_password_set()` marca `entrada_usuario.password_set_at`.

## Migración (aplicar a mano)

`supabase/migrations/20260818180000_entradas_auth_password_magic_link.sql`

- `entrada_auth_email_otp.code_hash` nullable; `purpose` (`access` \| `reset`).
- `entrada_usuario.password_set_at`.
- RPC `entrada_mark_password_set()`.

**Orden:** 1) aplicar el SQL en el proyecto linked, 2) desplegar `entradas-auth-email`, 3) frontend.

## UI

- `EntradasAccesoInicio.jsx` — **Sacar entradas** / **Gestionar mis entradas**; mail y código de primera vez.
- `LoginEntradas.jsx` — gestionar: mail primero; luego opciones; tipografía/botones más grandes.
- `EntradasLoginCatalogPreview.jsx` — debajo del acceso (sin sesión): tarjetas de conciertos con reservas abiertas + barra de disponibilidad.
- `EntradasSetPasswordForm.jsx` / `EntradasPasswordModal.jsx` (portal `z-[100]`; flujo post-login opcional).
- `EntradasPerfilModal.jsx` — cambiar nombre/apellido y contraseña.
- Header de `EntradasMain.jsx`: el **nombre** abre menú con **Ver mi perfil** y **Cerrar sesión**.
- `EntradasAyudaFlotante.jsx` — botón flotante abajo izquierda «¿Necesitás ayuda?» en toda `/entradas`. Al cargar arranca como un círculo con el signo de pregunta y se expande a la derecha hasta el tamaño del botón; con `prefers-reduced-motion` aparece directo en ese tamaño. Modal con **Enviar correo directo** (`mailto:` + plantilla) arriba y **formulario web** abajo (Edge `entradas-send-ayuda` → guarda `entrada_ayuda_consulta` + mail a staff con botón **Reservar en Entradas**; `Reply-To` = mail del consultante; **acuse al consultante** con aviso de revisar Spam / Correo no deseado).
- Si el mail del formulario ya tiene **reservas activas** en conciertos con reservas abiertas: aviso + **Descargar PDF** (si hay sesión) / **Reenviar al mail** (`action: check_reservas` / `reenviar_entradas`); la consulta sigue disponible **sin** elegir cantidad ni función (solo comentarios).
- Staff: cola en **🎫 Terceros** (`EntradasAyudaConsultasPanel`); deep link `?view=entradas-terceros&ayuda=<uuid>` precarga el formulario o avisa si ya está resuelta/descartada.
- Teléfono de ayuda → formato WhatsApp (AR +54/549 si falta país); botón **WhatsApp** en mail a staff, cola y banner de consulta. Mensaje: `Hola {nombre}, te enviamos las entradas para la Filarmónica que solicitaste. ¡Que disfrutes!` más día, hora, lugar, cantidad y, si ya hay reserva, el link al PDF (`wa.me` + `text=`).
- Si la consulta ya tiene `reserva_id`, el WhatsApp incluye link a `/entradas/pdf?t=<pdf_share_token>`: la webapp (sin login) llama RPC `entrada_pdf_share_payload` y descarga el **mismo PDF** (`descargarPdfDesdeReservaRow` / jsPDF). La Edge `entradas-pdf-share` solo redirige a esa ruta.

## Recordatorio pre-concierto (BCC + mi entrada)

- Cron `entradas-cron-mails` (`*/30`): un SMTP por concierto vía **BCC** (sin QR/PDF personalizado; Gmail no aguanta 400–600 individuales).
- Copy: aclara que **ese mail no trae QR/PDF**; CTA **Abrir mi entrada** → `/entradas/mi-entrada?concierto=<slug>`.
- Pantalla pública: un campo mail + «Ver mi entrada» → RPC `entrada_lookup_mi_entrada_pdf` (rate limit 10/10 min por mail) → **QR en pantalla** (variante door, móvil) + descarga PDF opcional vía `entrada_pdf_share_payload`. Si el dispositivo ya tiene sesión de Entradas, usa ese mail y abre el QR sin pedir el formulario.
- Secundario: PDF del mail de reserva / Mis entradas (login). Mail de prueba admin (`entradas-send-test-mail`) usa el mismo template (`to` opcional).

## Usuarios OFRN (`integrantes`)

Quienes ya tienen mail + `clave_acceso` en `integrantes` entran a `/entradas` con **la misma clave**, sin tener que crear otra.

- Se aplica como **primera contraseña** si todavía no hay `entrada_usuario.password_set_at` (cuentas nuevas y las que solo usaron el código/enlace).
- Si ya definieron una contraseña propia en Entradas, no se pisa.
- GoTrue pide al menos 6 caracteres: si `clave_acceso` es más corta, siguen entrando con el código/enlace o por SSO desde la app.
- El perfil (nombre/apellido) se completa desde el integrante cuando coincide el mail (`mail` o `email_acceso`).
- Acción `bootstrap_ofrn_password`: si el login con clave falla, el cliente la dispara y reintenta.
- Acción `sso_ofrn`: verifica mail + `clave_acceso` contra `integrantes` y emite sesión GoTrue. El botón **Entradas** del sidebar abre `/entradas` ya logueado.
- Pre-registro admin (`entradas-admin-invite-user`) también siembra la clave OFRN.

**Importante:** no se escribe `clave_acceso` en `auth_password_plain` (el broker del enlace mágico sigue siendo interno).

## Completado

- [x] Puerta inicial: Sacar entradas (mail; código solo si el mail no está) / Gestionar mis entradas (login).
- [x] Sesión directa si el dispositivo ya está logueado.
- [x] Acceso por código al mail en gestionar (OTP 8 dígitos + enlace en el mismo correo).
- [x] Contraseña opcional + restaurar / crear.
- [x] Flujo accesible de gestionar: primero mail, después opciones según `has_password`.
- [x] Sesión persistente en el dispositivo (`persistSession` + auto-refresh + mail recordado).
- [x] Contraseña por defecto = `integrantes.clave_acceso` para UX OFRN.
- [x] SSO: desde el sidebar de la app OFRN, Entradas abre con sesión.
- [x] Header: menú en el nombre → Ver mi perfil / Cerrar sesión.
