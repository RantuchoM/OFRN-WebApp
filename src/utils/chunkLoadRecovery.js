/**
 * Recuperación cuando un chunk hasheado ya no existe (deploy con SW viejo).
 *
 * Un `location.reload()` vuelve a pedir el mismo documento. Si el service worker
 * sigue en control, responde con el `index.html` precacheado y los chunks 404
 * otra vez: el cartel aparece y desaparece (titila) hasta que el navegador corta
 * la navegación y la app no llega a montar.
 *
 * Acá se sale una sola vez hacia `/refrescar.html`, que suelta el SW. Si en esta
 * sesión ya se intentó (sello de 60 s), el aviso queda quieto con un enlace.
 * Ese sello no lo borra `/refrescar.html` ni el match de `version.json`: si el
 * chunk sigue faltando, borrarlo reabriría el bucle.
 */

export const CHUNK_RESCUE_KEY = "ofrn:chunk-rescue-at";
export const CHUNK_RESCUE_WINDOW_MS = 60000;

/**
 * Se inyecta en el HTML de producción (también como texto). Tiene que ser
 * autocontenida: sin cierres de módulo ni `location.reload()`.
 * @param {Window} host
 */
export function installChunkRescue(host) {
  if (!host || host.__ofrnChunkRescueInstalled) return;
  host.__ofrnChunkRescueInstalled = true;

  var KEY = "ofrn:chunk-rescue-at";
  var WINDOW_MS = 60000;
  var OVERLAY_ID = "ofrn-preload-reload-msg";
  var BACKDROP_STYLE =
    "position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,.45);padding:1.5rem;font-family:system-ui,sans-serif";
  var CARD_STYLE =
    "background:#fff;border:2px solid #4f46e5;border-radius:1rem;padding:1.5rem 1.75rem;max-width:20rem;text-align:center;font-size:.875rem;font-weight:700;color:#1e293b;line-height:1.45";
  var LINK_STYLE =
    "display:inline-block;margin-top:0.9rem;padding:0.55rem 0.9rem;background:#4f46e5;color:#fff;border-radius:0.6rem;text-decoration:none;font-size:0.75rem;letter-spacing:0.04em;text-transform:uppercase";

  function here() {
    var loc = host.location || {};
    return (loc.pathname || "/") + (loc.search || "");
  }

  function rescueUrl() {
    return "/refrescar.html?next=" + encodeURIComponent(here());
  }

  function readStamp() {
    try {
      return Number(host.sessionStorage.getItem(KEY) || 0);
    } catch (e) {
      return 0;
    }
  }

  function writeStamp(now) {
    try {
      host.sessionStorage.setItem(KEY, String(now));
    } catch (e) {
      /* sin storage no hay sello: igual navegamos una sola vez por carga */
    }
  }

  function card() {
    var doc = host.document;
    var el = doc.getElementById(OVERLAY_ID);
    if (!el) {
      el = doc.createElement("div");
      el.id = OVERLAY_ID;
      el.setAttribute("role", "status");
      el.style.cssText = BACKDROP_STYLE;
      (doc.body || doc.documentElement).appendChild(el);
    }
    while (el.firstChild) el.removeChild(el.firstChild);
    var box = doc.createElement("div");
    box.style.cssText = CARD_STYLE;
    el.appendChild(box);
    return box;
  }

  function show(text, linkHref, linkText) {
    var doc = host.document;
    var box = card();
    box.appendChild(doc.createTextNode(text));
    if (!linkHref) return;
    var link = doc.createElement("a");
    link.href = linkHref;
    link.textContent = linkText;
    link.style.cssText = LINK_STYLE;
    box.appendChild(link);
  }

  var handled = false;

  function onFail() {
    if (handled) return;
    handled = true;
    var online = !host.navigator || host.navigator.onLine !== false;
    if (!online) {
      show(
        "Sin conexión no se puede cargar la versión nueva. Reintentá cuando vuelva la red.",
        here(),
        "Reintentar",
      );
      return;
    }
    var now = (host.Date || Date).now();
    var prev = readStamp();
    if (prev && now - prev < WINDOW_MS) {
      show("No se pudo cargar la versión nueva.", rescueUrl(), "Abrir de nuevo");
      return;
    }
    writeStamp(now);
    show("Hay una versión nueva. Recargando para continuar…");
    host.location.replace(rescueUrl());
  }

  host.addEventListener(
    "error",
    function (ev) {
      var target = ev && ev.target;
      if (!target || target.tagName !== "SCRIPT" || !target.src) return;
      if (String(target.src).indexOf("/assets/") === -1) return;
      onFail();
    },
    true,
  );

  host.addEventListener("vite:preloadError", function (ev) {
    if (ev && ev.preventDefault) ev.preventDefault();
    onFail();
  });
}

export function renderChunkRescueInlineScript() {
  const body = installChunkRescue.toString();
  if (/<\/script/i.test(body)) {
    throw new Error("El script de rescate no puede cerrar el tag script");
  }
  return `<script>(${body})(window);</script>`;
}
