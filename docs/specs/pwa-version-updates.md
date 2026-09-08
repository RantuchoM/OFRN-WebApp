# Spec: Actualizaciones de versión (Vite SPA + PWA en Vercel)

## Problema
Tras un deploy en Vercel, a veces la app se **recargaba sola mid-sesión** (usuario editando). En otros casos la versión nueva solo aparecía al **F5** o al **navegar** a otra sección (chunk hashado 404 → pantalla en blanco / reload).

El control **«Actualizar versión»** (banner) a menudo **no hacía nada en el primer tap** (ni en varios): el usuario tenía que pulsar 5–6 veces hasta que coincidía un SW en `waiting`.

## Causas (Vite SPA + `vite-plugin-pwa`)
1. **Service Worker** (`registerType: "prompt"`, `skipWaiting: false`, `clientsClaim: true`): el SW nuevo queda en *waiting* hasta que el cliente llama `skipWaiting`.
2. **Bug de UX previo**: `ReloadPrompt` marcaba `entryAutoReloadRef = true` al montar y en **cada** cambio de ruta, y ante `needRefresh` **aplicaba la update sin banner**. Como el flag no caducaba, el **primer** update detectado (poll SW / `version.json` cada ~2 min) forzaba reload mid-trabajo.
3. **Chunks hasheados**: sesión vieja + navigate a lazy route → `vite:preloadError` (404 del `.js` viejo).
4. Sin `Cache-Control` explícito en `/version.json` e `/index.html`, CDN/browser podían retrasar la detección.
5. **Rewrite SPA catch-all en Vercel** (`/(.*) → index.html`): si un chunk hasheado ya no existe, la petición `GET /assets/index-*.js` recibía **HTML** → error de consola *«Expected a JavaScript module script but the server responded with MIME type text/html»* (antes de montar React; `vite:preloadError` no aplica al entry).
6. **Tap no-op (2026-09)**: el banner se mostraba por `needRefresh` (evento Workbox `waiting`) **o** por `version.json` desfasado, pero el click hacía `if (!registration?.waiting && !buildOutdated) { registration?.update(); return; }`. Sin `waiting` en el ref (register() aún pendiente, `onRegistered` tarde, `update()` en curso) el tap era silencio. Un `location.reload()` **antes** de que el SW nuevo controle sigue sirviendo el precache viejo. `updateServiceWorker(true)` de vite-plugin-pwa 1.2 solo hace `messageSkipWaiting()`: sin waiting, no-op. iOS PWA a menudo no dispara `controllerchange` / `controlling` (`event.isUpdate`).

## Comportamiento actual (producto)
| Contexto | Qué pasa |
|----------|----------|
| Staff mid-sesión (misma ruta) | Banner **«Nueva versión disponible — Actualizar versión»**; **no** reload forzado |
| Staff pulsa **Actualizar versión** | Un tap: overlay → espera `waiting` (`update()` + `updatefound` → `installed` si hace falta) → `SKIP_WAITING` → espera `controllerchange` (timeout 3.5 s) → reload. Si no hay waiting y hay red: last resort **unregister + clear caches + reload**. Si falla: toast y se puede reintentar (no más clicks ciegos). |
| Staff cambia de ruta, sin dirty | Misma ruta fiable de apply (no reload prematuro) |
| Staff cambia de ruta o pulsa Actualizar **con dirty** | No auto-aplica; confirm si el usuario fuerza Actualizar |
| `/entradas/*` (público) | Update silenciosa (sin banner ni toast) |
| `vite:preloadError` | Overlay «Hay una versión nueva. Recargando…» + reload (tope anti-bucle) |
| Entry `/assets/index-*.js` 404/MIME tras deploy | Rewrite Vercel solo si `Accept` incluye `text/html`; SW `navigateFallbackDenylist` incluye `/assets/`; script inline en `index.html` recarga una vez |

### Ruta de apply (un tap)
Implementada en `src/utils/pwaApplyUpdate.js`, usada por `ReloadPrompt`:

1. Resolver el `ServiceWorkerRegistration` (ref Workbox **o** `navigator.serviceWorker.getRegistration()` / `ready`). No depender de que `onRegistered` haya corrido.
2. Si hay `waiting`: `postMessage({ type: "SKIP_WAITING" })` + `updateServiceWorker(true)` (plugin).
3. Si solo hay `installing`: esperar `statechange` → `installed`.
4. Si no hay ninguno: `await registration.update()` y esperar `updatefound` → `installed`/`waiting` (hasta 20 s). Overlay visible todo el tiempo.
5. Esperar `controllerchange` (3.5 s; iOS a menudo no lo dispara) y recargar **después**, no antes.
6. Last resort (online, sin waiting): `unregister()` de todos los SW + `caches.delete` + reload, para no seguir sirviendo precache viejo.
7. Si el apply no puede completar: toast (staff) y se resetea el overlay. Tope anti-bucle de reload (2 en 15 s) se mantiene.

Auto-update (navegación limpia, `/entradas`) usa **la misma** ruta; no se cambia la política de “no recargar mid-form”.

Dirty detectado vía:
- Registro `src/utils/unsavedWork.js` (`markUnsavedWork` / `clearUnsavedWork`)
- DOM: `.fimba-row-dirty`, `.fimba-sync-pending`, `[data-unsaved-work="true"]`
- `FimbaEventoFormModal` registra token mientras `isDirty`

Detección de build: `VITE_APP_BUILD_ID` embebido + poll de `/version.json` (focus / visibility / **15 min solo si la pestaña está visible**) + `registration.update()`. No se usa cache-buster (`?_=Date.now()`) ni `cache: no-store`: el browser respeta `Cache-Control: public, max-age=60` de `/version.json` para no generar un Edge Request en cada navegación. Tras un deploy, el aviso puede tardar hasta ~15 min en idle, o aparecer al foco / al cambiar de ruta (con hasta 60 s de cache del browser).

## Archivos clave
- `src/components/ui/ReloadPrompt.jsx`
- `src/utils/pwaApplyUpdate.js`
- `src/utils/unsavedWork.js`
- `src/main.jsx` (`vite:preloadError`)
- `vite.config.js` (`appVersionPlugin`, PWA `skipWaiting: false`)
- `vercel.json` (headers `version.json`, `index.html`, `assets` immutable)
- `scripts/verify-pwa-apply-update.mjs`

## Nota operativa (deploys)
- Preferir deploys cuando el staff no esté en picos de edición masiva; igual ya no se fuerza mid-form.
- Un dismiss del banner no cancela el SW waiting: al navegar limpio o al volver a detectar build, puede reaparecer / aplicarse.
- Assets en `/assets/*` son immutable; no hace falta busting manual.
- `/version.json` tiene `max-age=60` (no `no-store`) para recortar Edge Requests; el poll idle es 15 min y no corre con la pestaña oculta.
- Tras cambiar iconos/manifest PWA en Android, el usuario puede necesitar reinstalar el acceso directo (ver `pwa-android-icons.md`).
- El last resort (unregister + borrar caches) deja la app sin SW hasta la próxima carga; es intencional para desatascar un precache viejo.

## Dev local (`npm run dev`)
- `ReloadPrompt` **no corre** en DEV (`import.meta.env.DEV`): el poll de `/version.json` + auto-reload al navegar era un falso positivo cuando Vite reiniciaba con un `APP_BUILD_ID` nuevo (`Date.now()`).
- `APP_BUILD_ID` en `vite` serve es estable (`local-dev`); en `vite build` sigue siendo único por build.
- `vite:preloadError` hard-reload y el script inline de recovery del entry **solo aplican fuera de DEV**.
- Remounts “tipo restart” por HMR: ver Fast Refresh (no mezclar helpers no-componente en el mismo `.jsx` que UI); `AuthProvider` hidrata sesión desde `localStorage` sin desmontar el árbol.
- El flujo de apply se verifica con `node scripts/verify-pwa-apply-update.mjs` (SW de producción no corre en `vite` serve).

## Estado
- [x] Sin auto-reload mid-sesión en staff
- [x] Banner ES + respeto dirty FIMBA
- [x] Apply en navegación limpia
- [x] Mensaje en preloadError
- [x] Headers Vercel para version/index/assets
- [x] Rewrite SPA condicionado por `Accept: text/html` (no devolver HTML en peticiones de chunks)
- [x] Recuperación inline si falla el entry script hasheado
- [x] DEV: sin ReloadPrompt / preload hard-reload; build id estable en serve
- [x] Poll de versión menos agresivo (15 min + skip hidden + cache 60 s) para bajar Edge Requests de Hobby/Pro
- [x] Un tap en «Actualizar versión» espera waiting + skipWaiting + controllerchange (o last resort); toast si falla
