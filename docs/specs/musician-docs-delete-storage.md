# Spec: Borrado confiable de docs/firma en ficha de integrante

## Problema

Al eliminar una foto/documento desde `MusicianForm` (pestaña Documentación), a veces el archivo no desaparecía o hacía falta varios intentos. No se mostraba error.

## Causas

1. **RLS del bucket `firmas`**: las policies `Subida Firmas` / `Borrado Firmas` solo permitían rol `anon`. El formulario usa sesión `authenticated`, así que `storage.remove` fallaba por permisos.
2. **Cliente silencioso**: `deleteOldFile` no chequeaba `error` de Storage.
3. **Persistencia débil**: tras borrar, el UI hacía `updateField("", …)` con debounce (800 ms) y **no** sincronizaba el padre con `onSave` (a diferencia del upload, que actualiza BD al instante).

## Solución

| Pieza | Cambio |
|-------|--------|
| Migración `20261126123000_storage_firmas_authenticated.sql` | INSERT/DELETE/UPDATE en `firmas` para `anon` **y** `authenticated` |
| `useMusicianForm` | `resolveStorageTarget` (bucket desde URL), `deleteOldFile` retorna `{ ok, error }`, nuevo `clearDocumentField` (Storage + BD inmediata + `onSave`) |
| `MusicianFileUploader` | Usa `clearDocumentField`, feedback de carga, confirm con `z-[110]` |

## Criterios de aceptación

- [x] Usuario autenticado puede borrar firma del bucket `firmas` en un intento.
- [x] Si Storage falla, toast de error y el campo **no** se limpia.
- [x] Tras borrar OK, el campo queda vacío en UI y en `integrantes` sin esperar debounce.
- [x] Reemplazo al subir otro archivo sigue usando `deleteOldFile` del path anterior.
