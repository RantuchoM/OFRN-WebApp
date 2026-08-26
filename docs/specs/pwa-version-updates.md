# Spec: Actualizaciones de versión (Vite SPA + PWA en Vercel)

## Problema
Tras un deploy en Vercel, a veces la app se **recargaba sola mid-sesión** (usuario editando). En otros casos la versión nueva solo aparecía al **F5** o al **navegar** a otra sección (chunk hashado 404 → pantalla en blanco / reload).

## Causas (Vite SPA + `vite-plugin-pwa`)
1. **Service Worker** (`registerType: "prompt"`, `skipWaiting: false`, `clientsClaim: true`): el SW nuevo queda en *waiting* hasta que el cliente llama `skipWaiting`.
2. **Bug de UX previo**: `ReloadPrompt` marcaba `entryAutoReloadRef = true` al montar y en **cada** cambio de ruta, y ante `needRefresh` **aplicaba la update sin banner**. Como el flag no caducaba, el **primer** update detectado (poll SW / `version.json` cada ~2 min) forzaba reload mid-trabajo.
3. **Chunks hasheados**: sesión vieja + navigate a lazy route → `vite:preloadError` (404 del `.js` viejo).
4. Sin `Cache-Control` explícito en `/version.json` e `/index.html`, CDN/browser podían retrasar la detección.

## Comportamiento actual (producto)
| Contexto | Qué pasa |
|----------|----------|
| Staff mid-sesión (misma ruta) | Banner **«Nueva versión disponible — Actualizar»**; **no** reload forzado |
| Staff cambia de ruta, sin dirty | Aplica SW waiting / reload con overlay breve |
| Staff cambia de ruta o pulsa Actualizar **con dirty** | No auto-aplica; confirm si el usuario fuerza Actualizar |
| `/entradas/*` (público) | Update silenciosa (sin banner) |
| `vite:preloadError` | Overlay «Hay una versión nueva. Recargando…» + reload (tope anti-bucle) |

Dirty detectado vía:
- Registro `src/utils/unsavedWork.js` (`markUnsavedWork` / `clearUnsavedWork`)
- DOM: `.fimba-row-dirty`, `.fimba-sync-pending`, `[data-unsaved-work="true"]`
- `FimbaEventoFormModal` registra token mientras `isDirty`

Detección de build: `VITE_APP_BUILD_ID` embebido + poll de `/version.json` (focus / visibility / 2 min) + `registration.update()`.

## Archivos clave
- `src/components/ui/ReloadPrompt.jsx`
- `src/utils/unsavedWork.js`
- `src/main.jsx` (`vite:preloadError`)
- `vite.config.js` (`appVersionPlugin`, PWA `skipWaiting: false`)
- `vercel.json` (headers `version.json`, `index.html`, `assets` immutable)

## Nota operativa (deploys)
- Preferir deploys cuando el staff no esté en picos de edición masiva; igual ya no se fuerza mid-form.
- Un dismiss del banner no cancela el SW waiting: al navegar limpio o al volver a detectar build, puede reaparecer / aplicarse.
- Assets en `/assets/*` son immutable; no hace falta busting manual.
- Tras cambiar iconos/manifest PWA en Android, el usuario puede necesitar reinstalar el acceso directo (ver `pwa-android-icons.md`).

## Estado
- [x] Sin auto-reload mid-sesión en staff
- [x] Banner ES + respeto dirty FIMBA
- [x] Apply en navegación limpia
- [x] Mensaje en preloadError
- [x] Headers Vercel para version/index/assets
