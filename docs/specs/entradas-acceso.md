# Entradas — acceso (contraseña o enlace al mail)

## Objetivo

Simplificar el login de `/entradas`: **contraseña opcional** o **enlace directo al mail**. Se quita el código numérico de 8 dígitos.

- Quien no quiere contraseña entra solo con el enlace.
- Quien sí la define puede usar **Entrar** con mail + contraseña.
- **Restaurar contraseña** manda un enlace al mail y, al abrirlo, pide la nueva clave.

SCRN y Viáticos Manual siguen con código de 8 dígitos + enlace (misma edge function, `app !== entradas`).

## Flujo público

1. Mail + contraseña → `signInWithPassword` (si nunca definió clave, el mensaje indica pedir el enlace).
2. **Enviame un enlace de acceso** → mail con botón (TTL 10 min, un solo uso).
3. **Restaurar contraseña** → mail con enlace `?magic=…&reset=1`; al entrar, formulario de nueva clave.
4. Con sesión: candado en el header para definir o cambiar contraseña (mín. 8 caracteres).

## Backend

Edge Function `entradas-auth-email`:

| Acción | Uso |
|--------|-----|
| `request_magic_link` | Enlace de acceso (sin código). También si `request_code` + `app=entradas`. |
| `request_password_reset` | Enlace de restauración (`purpose=reset`). |
| `verify_magic_link` | Consume el token; sesión vía `generateLink` + `token_hash` (no rota la clave del usuario). |
| `request_code` / `verify_code` | Solo SCRN / viáticos (OTP 8 dígitos). |

RPC `entrada_mark_password_set()` marca `entrada_usuario.password_set_at`.

## Migración (aplicar a mano)

`supabase/migrations/20260818180000_entradas_auth_password_magic_link.sql`

- `entrada_auth_email_otp.code_hash` nullable; `purpose` (`access` \| `reset`).
- `entrada_usuario.password_set_at`.
- RPC `entrada_mark_password_set()`.

**Orden:** 1) aplicar el SQL en el proyecto linked, 2) desplegar `entradas-auth-email`, 3) frontend de este branch.

## UI

- `LoginEntradas.jsx` — login sin campo de código.
- `EntradasSetPasswordForm.jsx` / `EntradasPasswordModal.jsx` (portal `z-[100]`).
- Header de `EntradasMain.jsx` — ícono de candado.

## Completado

- [x] Quitar código numérico en Entradas.
- [x] Enlace de acceso por mail.
- [x] Contraseña opcional + restaurar.
- [x] Migración en el repo (sin aplicar a BD en este cambio).
