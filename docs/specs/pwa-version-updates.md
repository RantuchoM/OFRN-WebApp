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
6. **Reload del mismo documento (2026-11):** con el SW viejo en control, `location.reload()` vuelve a servir el `index.html` precacheado y los chunks siguen en 404. Varios `vite:preloadError` en la misma carga hacían `removeItem` del contador, así que el tope no frenaba: el cartel titilaba unos segundos y el navegador terminaba cortando la navegación (pantalla gris, la app no monta).
7. **Tap no-op (2026-09)**: el banner se mostraba por `needRefresh` (evento Workbox `waiting`) **o** por `version.json` desfasado, pero el click hacía `if (!registration?.waiting && !buildOutdated) { registration?.update(); return; }`. Sin `waiting` en el ref (register() aún pendiente, `onRegistered` tarde, `update()` en curso) el tap era silencio. Un `location.reload()` **antes** de que el SW nuevo controle sigue sirviendo el precache viejo. `updateServiceWorker(true)` de vite-plugin-pwa 1.2 solo hace `messageSkipWaiting()`: sin waiting, no-op. iOS PWA a menudo no dispara `controllerchange` / `controlling` (`event.isUpdate`).

## Comportamiento actual (producto)
| Contexto | Qué pasa |
|----------|----------|
| Staff mid-sesión (misma ruta) | Banner **«Nueva versión disponible — Actualizar versión»**; **no** reload forzado |
| Staff pulsa **Actualizar versión** | Un tap: `location.replace` a `/refrescar.html?next=` (ruta actual). Esa página suelta el SW, borra la caché y vuelve. Sin red: toast, no navega. El tap no espera un SW en `waiting`. |
| Staff cambia de ruta, sin dirty | Misma ida a `/refrescar.html?next=`. Si esta sesión ya salió hacia ahí hace menos de 60 s (`ofrn:fresh-nav-at`), no se repite sola: queda el banner. |
| Staff cambia de ruta o pulsa Actualizar **con dirty** | No auto-aplica; confirm si el usuario fuerza Actualizar |
| `/entradas/*`, `/viaticos-manual`, `/rendiciones-manual` (público) | Al cargar, si `version.json` o el service worker traen un build nuevo, van a `/refrescar.html?next=` sin banner ni toast. Mismo camino si el build nuevo aparece con la pestaña abierta. El sello de 60 s corta un segundo intento automático. |
| `/transporte-scrn` | Al cargar (o al detectar build nuevo con la pestaña abierta), si hay versión nueva va al **mismo** `/refrescar.html?next=` del botón, sin esperar el click. El botón queda para reintentar, con estética SCRN (borde `#c5d0dc`, azul `#0054a6`, `IconRefresh`, `scrn-btn-primary`). Viáticos y rendiciones no usan este banner. Anti-bucle: `ofrn:transporte-auto-apply-at` (60 s, se limpia al salir de la ruta o cuando el build coincide) y `ofrn:fresh-nav-at`. |
| `vite:preloadError` o el entry `/assets/*.js` no carga | Un aviso y pide `/refrescar.html` por `fetch` (el SW viejo no intercepta eso como navegación) y escribe ese HTML en el documento. Si esta sesión ya lo intentó hace menos de 60 s, el aviso queda quieto con **Abrir de nuevo** (ese tap hace el mismo `fetch`+write). Excepción: si el SW devolvió el shell en `/refrescar.html`, ese sello no frena el primer `fetch`+write. Un segundo shell dentro del minuto sí queda quieto (`ofrn:chunk-rescue-shell-at`), y ese `fetch` no navega si vuelve a traer la app. Si el aviso vuelve, hay que cerrar la app del todo. Sin conexión no navega ni borra caché. |
| Entry `/assets/index-*.js` 404/MIME tras deploy | Rewrite Vercel solo si `Accept` incluye `text/html`; SW `navigateFallbackDenylist` incluye `/assets/`. El script inline de `index.html` no recarga el mismo documento: va a `/refrescar.html`. |
| Pantalla trabada (shell viejo) | Abrir `/refrescar.html` (opcional `?next=/ruta`). Muestra cada paso, desregistra el SW, borra Cache Storage, activa el SW nuevo y entra a esa versión sin el botón «Actualizar versión». Si `register("/sw.js")` no termina en 4 s, avisa y abre igual. No toca `localStorage` ni IndexedDB. |

### Ruta de apply (un tap)
El botón, la navegación limpia, Transporte y las rutas silenciosas abren `/refrescar.html?next=` (`freshStartHref` en `src/utils/freshStart.js`). No hay overlay esperando `waiting`: un `location.reload()` con el SW viejo volvía a servir el precache, y borrar la caché mientras ese SW seguía en control dejaba la navegación rota.

`/refrescar.html` hace el trabajo (desregistrar, borrar Cache Storage recién sin controlador, activar `/sw.js`, volver al `next`). `src/utils/pwaApplyUpdate.js` queda para el probe de Transporte en `npm run dev` (`allowNuke: false`, sin reload) y para la limpieza que llama esa página.

Auto-update usa el mismo destino. Si `ofrn:fresh-nav-at` tiene menos de 60 s, no se repite solo. El tap del usuario sí puede reintentar. En staff no se sale del formulario si hay trabajo sin guardar. Sin red no navega.

Dirty detectado vía:
- Registro `src/utils/unsavedWork.js` (`markUnsavedWork` / `clearUnsavedWork`)
- DOM: `.fimba-row-dirty`, `.fimba-sync-pending`, `[data-unsaved-work="true"]`
- `FimbaEventoFormModal` registra token mientras `isDirty`

Detección de build: `VITE_APP_BUILD_ID` embebido + poll de `/version.json` (focus / visibility / **15 min solo si la pestaña está visible**) + `registration.update()`. No se usa cache-buster (`?_=Date.now()`) ni `cache: no-store`: el browser respeta `Cache-Control: public, max-age=60` de `/version.json` para no generar un Edge Request en cada navegación. Tras un deploy, el aviso puede tardar hasta ~15 min en idle, o aparecer al foco / al cambiar de ruta (con hasta 60 s de cache del browser).

## Archivos clave
- `src/components/ui/ReloadPrompt.jsx`
- `src/utils/pwaApplyUpdate.js`
- `src/utils/unsavedWork.js`
- `src/utils/chunkLoadRecovery.js` (script inline de `index.html`; no recarga el mismo documento)
- `vite.config.js` (`appVersionPlugin`, PWA `skipWaiting: false`)
- `src/utils/freshStart.js` (`/refrescar.html`)
- `vercel.json` (headers `version.json`, `index.html`, `refrescar.html`, `assets` immutable)
- `scripts/verify-pwa-apply-update.mjs`
- `scripts/verify-fresh-start.mjs`
- `scripts/verify-chunk-recovery.mjs`

## Nota operativa (deploys)
- Preferir deploys cuando el staff no esté en picos de edición masiva; igual ya no se fuerza mid-form.
- Un dismiss del banner no cancela el SW waiting: al navegar limpio o al volver a detectar build, puede reaparecer / aplicarse.
- Assets en `/assets/*` son immutable; no hace falta busting manual.
- `/version.json` tiene `max-age=60` (no `no-store`) para recortar Edge Requests; el poll idle es 15 min y no corre con la pestaña oculta.
- Tras cambiar iconos/manifest PWA en Android, el usuario puede necesitar reinstalar el acceso directo (ver `pwa-android-icons.md`).
- El last resort (unregister + borrar caches) deja la app sin SW hasta la próxima carga; es intencional para desatascar un precache viejo.
- Quien queda en pantalla en blanco puede abrir `https://ofrn-web-app.vercel.app/refrescar.html`. El cartel **Abrir de nuevo** pide esa página por `fetch` y la escribe en el documento: así un SW viejo no puede interceptar la navegación y devolver el shell. Esa página no entra al precache (`globIgnores`) y el `navigateFallbackDenylist` la deja pasar a la red (también por la extensión `.html`, así que un SW ya instalado desde junio 2026 también la pide al servidor). Tras soltar el SW, borra los sellos `ofrn:chunk-rescue-at` y `ofrn:chunk-rescue-shell-at` para que el cartel no quede clavado. Con un SW en control, primero lo desregistra y se recarga a sí misma; recién sin controlador borra Cache Storage, registra `/sw.js` y le manda `SKIP_WAITING` para que `/` abra ya en esa versión. Va a `/` (o a `?next=`, solo path interno). La entrada deja `sessionStorage` `ofrn:fresh-open`: el banner no se muestra en esa carga, y `version.json` se revalida una vez (su `max-age=60` podía seguir diciendo el build anterior y volver a sacar «Actualizar versión» con la app ya nueva). La página habla en presente mientras trabaja (barra y giro) y deja arriba, en pasado, lo que ya hizo; ese historial vive en `sessionStorage` para sobrevivir la recarga intermedia. Si el borrado pasa de 8 s, o si registrar `/sw.js` pasa de 4 s, avisa y abre igual. El `register()` no puede dejar la barra girando. No se borra la caché mientras el SW sigue en control: el fallback de `/` dejaría la navegación rota. Tope: 2 recargas; si sigue en control, pide cerrar las pestañas y reabrir el enlace. Sesión y borradores (`localStorage` / IndexedDB) quedan.

## Dev local (`npm run dev`)
- `ReloadPrompt` **no corre** en DEV (`import.meta.env.DEV`): el poll de `/version.json` + auto-reload al navegar era un falso positivo cuando Vite reiniciaba con un `APP_BUILD_ID` nuevo (`Date.now()`).
- `APP_BUILD_ID` en `vite` serve es estable (`local-dev`); en `vite build` sigue siendo único por build.
- El script inline de chunks rotos **solo se inyecta en el build** (en DEV el HMR no debe mandar a `/refrescar.html`). `src/main.jsx` ya no recarga por `vite:preloadError`.
- Remounts “tipo restart” por HMR: ver Fast Refresh (no mezclar helpers no-componente en el mismo `.jsx` que UI); `AuthProvider` hidrata sesión desde `localStorage` sin desmontar el árbol.
- El flujo de apply se verifica con `node scripts/verify-pwa-apply-update.mjs` (SW de producción no corre en `vite` serve).
- La página de rescate se verifica con `node scripts/verify-fresh-start.mjs`. En `vite` serve y en el build responde `GET /refrescar.html`.
- El corte del titileo se verifica con `node scripts/verify-chunk-recovery.mjs`.

## Estado
- [x] Sin auto-reload mid-sesión en staff
- [x] Banner ES + respeto dirty FIMBA
- [x] Apply en navegación limpia
- [x] Mensaje en preloadError
- [x] **Sin titileo (2026-11-04):** un chunk 404 no recarga el mismo documento. Abre `/refrescar.html?next=` una vez por minuto; si ya se intentó, queda el aviso con «Abrir de nuevo».
- [x] **Cartel trabado (2026-11-04):** un SW anterior a la denylist `.html` (sept 2026) interceptaba la navegación a `/refrescar.html` y volvía a servir el shell: **Abrir de nuevo** no destrababa. Ahora el aviso pide esa página por `fetch` y la escribe acá; si el SW sirvió el SPA en `/refrescar.html`, se auto-rescata. Tras soltar el SW de verdad, `/refrescar.html` borra `ofrn:chunk-rescue-at` para no dejar el cartel. El match de `version.json` no lo borra.
- [x] **Shell con sello fresco (2026-11-05):** quien llega a `/refrescar.html` y el SW le sirve la app ya trae el sello de 60 s de la ruta anterior, así que el rescate no arrancaba. Ahora ese primer shell igual pide el HTML y lo escribe. No navega si el `fetch` vuelve a traer la app. Un segundo shell dentro del minuto queda en el cartel (`ofrn:chunk-rescue-shell-at`, se borra junto con el otro sello al soltar el SW).
- [x] **Barra colgada (2026-11-05):** `register("/sw.js")` tenía espera infinita en «Estoy borrando lo que el navegador tenía guardado». A los 4 s corta, avisa y abre la app.
- [x] Headers Vercel para version/index/assets
- [x] Rewrite SPA condicionado por `Accept: text/html` (no devolver HTML en peticiones de chunks)
- [x] Recuperación inline si falla el entry script hasheado
- [x] DEV: sin ReloadPrompt / preload hard-reload; build id estable en serve
- [x] Poll de versión menos agresivo (15 min + skip hidden + cache 60 s) para bajar Edge Requests de Hobby/Pro
- [x] Un tap en «Actualizar versión» abre `/refrescar.html?next=` (2026-11-05). El auto-apply usa el mismo destino y no se repite dentro de 60 s. Sin red: toast. Ya no espera `skipWaiting` ni recarga el documento en control del SW viejo.
- [x] **Viáticos y rendiciones manuales (2026-09-25):** `/viaticos-manual` y `/rendiciones-manual` actualizan en silencio al detectar versión nueva (`isSilentVersionUpdateRoute`), igual que `/entradas`. El formulario vive en `localStorage`, así que la recarga no descarta lo ya escrito. El staff sigue con banner.
- [x] **Transporte SCRN (2026-10-01):** `/transporte-scrn` auto-aplica la versión nueva al entrar (`isTransporteScrnRoute`), con el mismo apply del botón y banner restilado. En `npm run dev` no hay banner ni reload: se llama `applyPwaUpdate({ allowNuke: false, reload: () => false })` una vez por entrada para no disparar el falso positivo de `version.json`.
- [x] **Rescate por URL (2026-11-02):** `/refrescar.html` desregistra el service worker, borra Cache Storage y abre `/` de cero. No precacheada; `Cache-Control: no-cache`. No borra sesión ni borradores.
- [x] **Escenario no vuelve al inicio (2026-11-06):** un SW viejo servía el shell en `/refrescar.html`. La app montaba el inicio y el aviso armaba el enlace sin `next`, así que quien entraba a Escenario (chunk nuevo) quedaba en un bucle actualizar → inicio. El shell no monta la app en esa URL. Si `next` es otra vez `/refrescar.html?next=…`, se desempaqueta. Si el query viene vacío, se usa el referrer misma-origen. Tras soltar el SW se espera a que deje de controlar antes de recargar.
- [x] **Query de Escenario en la misma URL (2026-11-06):** Workbox compara la denylist con `pathname + search`. `/^\/refrescar\.html$/` no excluía `/refrescar.html?next=` ni `/refrescar.html?tab=giras&view=REPERTOIRE&giraId=14&subTab=seating&seatingView=escenario`, y el SW volvía a servir el shell. Esa query sin `next` (el path cambió y los params de la gira quedaron) hacía que el rescate abriera `/`. Ahora la denylist acepta el `?`, esos params son el destino, y si `next` se parte en el primer `&` se rearman. El destino se guarda dos minutos para la recarga intermedia.
