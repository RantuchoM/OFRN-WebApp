/**
 * Recuperación cuando un chunk hasheado ya no existe (deploy con SW viejo).
 *
 * Un `location.reload()` vuelve a pedir el mismo documento. Si el service worker
 * sigue en control, responde con el `index.html` precacheado y los chunks 404
 * otra vez: el cartel aparece y desaparece (titila) hasta que el navegador corta
 * la navegación y la app no llega a montar.
 *
 * Ir a `/refrescar.html` con `location.replace` tampoco alcanza: un SW viejo
 * (sin denylist `.html`) intercepta esa navegación y vuelve a servir el shell.
 * Por eso el aviso pide el HTML por `fetch` (no es navigate) y lo escribe en
 * este documento. Si esta sesión ya lo intentó (sello de 60 s), no se dispara
 * solo: queda el cartel con «Abrir de nuevo». Excepción: si el SW sirvió el
 * shell en `/refrescar.html`, el sello de la página anterior no alcanza para
 * quedarse quieto. Se intenta una vez escribir el HTML de verdad. Un segundo
 * shell dentro del minuto sí queda quieto, para no recargar en círculo.
 * Tras un rescate que sí soltó el SW, `/refrescar.html` borra los sellos para
 * no dejar a la gente trabada.
 */

export const CHUNK_RESCUE_KEY = "ofrn:chunk-rescue-at";
/** El shell de la app ya se vio en `/refrescar.html` durante esta ventana. */
export const CHUNK_RESCUE_SHELL_KEY = "ofrn:chunk-rescue-shell-at";
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
  var SHELL_KEY = "ofrn:chunk-rescue-shell-at";
  var WINDOW_MS = 60000;
  var OVERLAY_ID = "ofrn-preload-reload-msg";
  var BACKDROP_STYLE =
    "position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,.45);padding:1.5rem;font-family:system-ui,sans-serif";
  var CARD_STYLE =
    "background:#fff;border:2px solid #4f46e5;border-radius:1rem;padding:1.5rem 1.75rem;max-width:20rem;text-align:center;font-size:.875rem;font-weight:700;color:#1e293b;line-height:1.45";
  var DETAIL_STYLE =
    "margin-top:0.65rem;font-size:0.75rem;font-weight:500;color:#475569;line-height:1.4";
  var LINK_STYLE =
    "display:inline-block;margin-top:0.9rem;padding:0.55rem 0.9rem;background:#4f46e5;color:#fff;border-radius:0.6rem;text-decoration:none;font-size:0.75rem;letter-spacing:0.04em;text-transform:uppercase";
  var STUCK_DETAIL =
    "Tocá el botón. Si el aviso vuelve, cerrá la app del todo (desde las apps recientes) y abrila de nuevo.";

  function rescueDestination(search, depth) {
    var raw = String(search || "");
    if (raw.charAt(0) === "?") raw = raw.slice(1);
    var params;
    try {
      params = new URLSearchParams(raw);
    } catch (e0) {
      return "/";
    }
    var next = params.get("next") || "";
    var dest = "/";
    if (
      next.indexOf("/") === 0 &&
      next.indexOf("//") !== 0 &&
      next.indexOf("\\") < 0 &&
      next.indexOf("..") < 0
    ) {
      if (next.indexOf("/refrescar.html") === 0) {
        if ((depth || 0) < 3) {
          var q = next.indexOf("?");
          if (q >= 0) {
            var inner = rescueDestination(next.slice(q), (depth || 0) + 1);
            if (inner !== "/") dest = inner;
          }
        }
      } else {
        dest = next;
      }
    }
    var extra = [];
    params.forEach(function (value, key) {
      if (key === "next" || key === "r") return;
      if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(key)) return;
      if (String(value).indexOf("\\") >= 0 || String(value).indexOf("..") >= 0) return;
      extra.push([key, value]);
    });
    if (!extra.length) return dest || "/";
    try {
      var url = new URL(dest && dest.indexOf("/") === 0 ? dest : "/", "https://ofrn.local");
      for (var i = 0; i < extra.length; i += 1) {
        if (!url.searchParams.has(extra[i][0])) url.searchParams.append(extra[i][0], extra[i][1]);
      }
      return url.pathname + url.search;
    } catch (e1) {
      return dest || "/";
    }
  }

  function here() {
    var loc = host.location || {};
    var path = loc.pathname || "/";
    var search = loc.search || "";
    // Misma regla que freshStartDestination: el query de la app en esta URL
    // (`?tab=giras&…`) es la pantalla, aunque no venga dentro de `next`.
    if (path === "/refrescar.html") return rescueDestination(search, 0);
    return path + search;
  }

  function rescueUrl() {
    var now = (host.Date || Date).now();
    return "/refrescar.html?next=" + encodeURIComponent(here()) + "&r=" + now;
  }

  function readStamp(key) {
    try {
      return Number(host.sessionStorage.getItem(key || KEY) || 0);
    } catch (e) {
      return 0;
    }
  }

  function writeStamp(now, key) {
    try {
      host.sessionStorage.setItem(key || KEY, String(now));
    } catch (e) {
      /* sin storage no hay sello: igual navegamos una sola vez por carga */
    }
  }

  function onRescueShell() {
    return ((host.location && host.location.pathname) || "") === "/refrescar.html";
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

  function looksLikeRescue(html) {
    return (
      html &&
      html.indexOf('id="msg"') !== -1 &&
      html.indexOf("Un momento") !== -1 &&
      html.indexOf('id="root"') === -1
    );
  }

  var launched = false;

  function navigateToRescue(url) {
    try {
      host.location.replace(url);
    } catch (e) {
      try {
        host.location.href = url;
      } catch (e2) {
        /* el cartel queda con el enlace */
      }
    }
  }

  function writeRescue(html, url) {
    try {
      if (host.history && host.history.replaceState) {
        host.history.replaceState(null, "", url);
      }
    } catch (e1) {
      /* el write igual corre en este documento */
    }
    var doc = host.document;
    if (!doc || typeof doc.open !== "function" || typeof doc.write !== "function") {
      return false;
    }
    try {
      doc.open();
      doc.write(html);
      doc.close();
      return true;
    } catch (e2) {
      return false;
    }
  }

  function showStuck(url) {
    show(
      "No se pudo cargar la versión nueva.",
      url,
      "Abrir de nuevo",
      STUCK_DETAIL,
    );
  }

  function openRescue() {
    var url = rescueUrl();
    var shell = onRescueShell();
    // En el shell, navegar a la misma URL vuelve a servir la app. Reintentar es otro fetch.
    if (launched && !shell) {
      navigateToRescue(url);
      return;
    }
    launched = true;
    var fetchFn = host.fetch;
    if (typeof fetchFn !== "function") {
      navigateToRescue(url);
      return;
    }
    Promise.resolve(
      fetchFn.call(host, url, { cache: "reload", credentials: "same-origin" }),
    )
      .then(function (res) {
        if (!res || !res.ok || typeof res.text !== "function") {
          if (shell) {
            showStuck(url);
            return null;
          }
          navigateToRescue(url);
          return null;
        }
        return res.text();
      })
      .then(function (html) {
        if (html == null) return;
        if (looksLikeRescue(html) && writeRescue(html, url)) return;
        if (shell) {
          showStuck(url);
          return;
        }
        navigateToRescue(url);
      })
      .catch(function () {
        if (shell) {
          showStuck(url);
          return;
        }
        navigateToRescue(url);
      });
  }

  function show(text, linkHref, linkText, detail) {
    var doc = host.document;
    var box = card();
    box.appendChild(doc.createTextNode(text));
    if (detail) {
      var note = doc.createElement("div");
      note.style.cssText = DETAIL_STYLE;
      note.appendChild(doc.createTextNode(detail));
      box.appendChild(note);
    }
    if (!linkHref) return;
    var link = doc.createElement("a");
    link.href = linkHref;
    link.textContent = linkText;
    link.style.cssText = LINK_STYLE;
    link.addEventListener("click", function (ev) {
      if (ev && ev.preventDefault) ev.preventDefault();
      openRescue();
    });
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
    var url = rescueUrl();
    var shell = onRescueShell();
    if (shell) {
      var shellPrev = readStamp(SHELL_KEY);
      if (shellPrev && now - shellPrev < WINDOW_MS) {
        showStuck(url);
        return;
      }
      // El sello de la ruta anterior no cuenta: este documento todavía es la app.
      writeStamp(now, SHELL_KEY);
      if (!prev || now - prev >= WINDOW_MS) writeStamp(now);
      show("Hay una versión nueva. Recargando para continuar…", url, "Abrir de nuevo");
      openRescue();
      return;
    }
    if (prev && now - prev < WINDOW_MS) {
      showStuck(url);
      return;
    }
    writeStamp(now);
    show("Hay una versión nueva. Recargando para continuar…", url, "Abrir de nuevo");
    openRescue();
  }

  host.addEventListener(
    "error",
    function (ev) {
      var target = ev && ev.target;
      if (!target) return;
      var tag = target.tagName;
      var src = String(target.src || target.href || "");
      if (tag !== "SCRIPT" && tag !== "LINK") return;
      if (src.indexOf("/assets/") === -1) return;
      onFail();
    },
    true,
  );

  host.addEventListener("vite:preloadError", function (ev) {
    if (ev && ev.preventDefault) ev.preventDefault();
    onFail();
  });

  if (onRescueShell()) onFail();
}

export function renderChunkRescueInlineScript() {
  const body = installChunkRescue.toString();
  if (/<\/script/i.test(body)) {
    throw new Error("El script de rescate no puede cerrar el tag script");
  }
  return `<script>(${body})(window);</script>`;
}
