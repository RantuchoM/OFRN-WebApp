# Entradas — acceso (contraseña o código al mail)

## Objetivo

Login de `/entradas` pensado para **personas mayores**: pocos campos a la vez, texto grande, y el dispositivo **queda logueado** el mayor tiempo posible (sesión en `localStorage` + auto-refresh).

- Primero solo el **mail**; después aparecen las opciones.
- **Código de 8 dígitos** al mail (también incluye botón/enlace en el mismo correo).
- **Contraseña opcional**: crear / ingresar / recuperar según el mail.
- Quien tiene usuario OFRN usa la misma `clave_acceso`.

SCRN y Viáticos Manual siguen con código de 8 dígitos + enlace (misma edge function, `app !== entradas`).

## Flujo público (accesibilidad)

1. Pantalla inicial: **solo input de mail** → Continuar.
2. Tras validar el mail (`check_login_options`):
   - **Enviar código único** (siempre; mismo estilo que crear/ingresar contraseña).
   - **Ingresar contraseña** si ya tiene (`password_set_at` o clave OFRN usable).
   - **Crear contraseña** si aún no tiene → mail de reset; al abrir, pide la nueva clave.
   - Abajo: **Recuperar contraseña** (si ya tiene) o texto aclaratorio.
3. Tras enviar el código: pantalla grande para tipear los 8 dígitos (o abrir el enlace del mismo mail).
4. Con sesión: el nombre en el header abre menú con **Ver mi perfil** y **Cerrar sesión**; el ícono de tema queda aparte.

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
| `check_login_options` | `{ has_password }` para armar el paso de opciones (sin filtrar por existencia de cuenta). |
| `request_code` | OTP 8 dígitos + enlace en el mismo mail (también `app=entradas`). |
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

- `LoginEntradas.jsx` — mail primero; luego opciones; tipografía/botones más grandes.
- `EntradasSetPasswordForm.jsx` / `EntradasPasswordModal.jsx` (portal `z-[100]`; flujo post-login opcional).
- `EntradasPerfilModal.jsx` — cambiar nombre/apellido y contraseña.
- Header de `EntradasMain.jsx`: el **nombre** abre menú con **Ver mi perfil** y **Cerrar sesión**.

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

- [x] Acceso por código al mail (OTP 8 dígitos + enlace en el mismo correo).
- [x] Contraseña opcional + restaurar / crear.
- [x] Flujo accesible: primero mail, después opciones según `has_password`.
- [x] Sesión persistente en el dispositivo (`persistSession` + auto-refresh + mail recordado).
- [x] Contraseña por defecto = `integrantes.clave_acceso` para UX OFRN.
- [x] SSO: desde el sidebar de la app OFRN, Entradas abre con sesión.
- [x] Header: menú en el nombre → Ver mi perfil / Cerrar sesión.
