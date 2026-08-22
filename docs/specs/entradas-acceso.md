# Entradas — acceso (contraseña o enlace al mail)

## Objetivo

Simplificar el login de `/entradas`: **contraseña opcional** o **enlace directo al mail**. Se quita el código numérico de 8 dígitos.

- Quien no quiere contraseña entra solo con el enlace.
- Quien sí la define puede usar **Entrar** con mail + contraseña.
- **Restaurar contraseña** manda un enlace al mail y, al abrirlo, pide la nueva clave.

SCRN y Viáticos Manual siguen con código de 8 dígitos + enlace (misma edge function, `app !== entradas`).

## Flujo público

1. **Entrar con contraseña** (mail + clave, si ya la creó).
2. **Enviame un enlace para entrar** → mail con botón (TTL 10 min). Al abrir, si no tiene clave, se ofrece **crear una contraseña** (se puede saltear).
3. **Crear o restaurar contraseña** → mail de reset; al abrir, pide la nueva clave (obligatorio).
4. Con sesión: candado en el header para definir o cambiar contraseña (mín. 8 caracteres).

## Sesión del enlace

`verify_magic_link` devuelve `token_hash` **y** `password` broker (si existe), para que el cliente nuevo use `verifyOtp` y el frontend viejo no se quede en «No se pudo completar el acceso».

## Backend

Edge Function `entradas-auth-email`:

| Acción | Uso |
|--------|-----|
| `request_magic_link` | Enlace de acceso (sin código). También si `request_code` + `app=entradas`. |
| `request_password_reset` | Enlace de restauración (`purpose=reset`). |
| `verify_magic_link` | Consume el token; sesión vía `generateLink` + `token_hash` (no rota la clave del usuario). |
| `request_code` / `verify_code` | Solo SCRN / viáticos (OTP 8 dígitos). |
| `bootstrap_ofrn_password` | Siembra `clave_acceso` de OFRN en GoTrue si aún no hay clave propia en Entradas. |
| `sso_ofrn` | Login desde la app OFRN: verifica `integrantes` y emite sesión. |

RPC `entrada_mark_password_set()` marca `entrada_usuario.password_set_at`.

## Migración (aplicar a mano)

`supabase/migrations/20260818180000_entradas_auth_password_magic_link.sql`

- `entrada_auth_email_otp.code_hash` nullable; `purpose` (`access` \| `reset`).
- `entrada_usuario.password_set_at`.
- RPC `entrada_mark_password_set()`.

**Orden:** 1) aplicar el SQL en el proyecto linked, 2) desplegar `entradas-auth-email`, 3) frontend de este branch.

## UI

- `LoginEntradas.jsx` — login sin campo de código.
- `EntradasSetPasswordForm.jsx` / `EntradasPasswordModal.jsx` (portal `z-[100]`; flujo post-login opcional).
- `EntradasPerfilModal.jsx` — cambiar nombre/apellido y contraseña.
- Header de `EntradasMain.jsx`: el **nombre** abre menú con **Ver mi perfil** y **Cerrar sesión**; el ícono de tema queda aparte.

## Usuarios OFRN (`integrantes`)

Quienes ya tienen mail + `clave_acceso` en `integrantes` entran a `/entradas` con **la misma clave**, sin tener que crear otra.

- Se aplica como **primera contraseña** si todavía no hay `entrada_usuario.password_set_at` (cuentas nuevas y las que solo usaron el enlace).
- Si ya definieron una contraseña propia en Entradas, no se pisa.
- GoTrue pide al menos 6 caracteres: si `clave_acceso` es más corta, siguen entrando con el enlace al mail o por SSO desde la app.
- El perfil (nombre/apellido) se completa desde el integrante cuando coincide el mail (`mail` o `email_acceso`).
- Acción `bootstrap_ofrn_password`: si el login con clave falla, el cliente la dispara y reintenta.
- Acción `sso_ofrn`: verifica mail + `clave_acceso` contra `integrantes` y emite sesión GoTrue. El botón **Entradas** del sidebar abre `/entradas` ya logueado.
- Pre-registro admin (`entradas-admin-invite-user`) también siembra la clave OFRN.

**Importante:** no se escribe `clave_acceso` en `auth_password_plain` (el broker del enlace mágico sigue siendo interno).

## Completado

- [x] Quitar código numérico en Entradas.
- [x] Enlace de acceso por mail.
- [x] Contraseña opcional + restaurar.
- [x] Migración en el repo (sin aplicar a BD en este cambio).
- [x] Contraseña por defecto = `integrantes.clave_acceso` para UX OFRN (también cuentas ya existentes sin clave propia).
- [x] SSO: desde el sidebar de la app OFRN, Entradas abre con sesión.
- [x] Header: menú en el nombre → Ver mi perfil (nombre + contraseña) / Cerrar sesión (con confirmación).
