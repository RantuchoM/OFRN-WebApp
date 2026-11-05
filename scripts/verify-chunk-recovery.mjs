/**
 * Un chunk 404 no recarga el mismo documento en bucle.
 * Run: node scripts/verify-chunk-recovery.mjs
 */
import fs from "node:fs";
import vm from "node:vm";
import {
  CHUNK_RESCUE_KEY,
  CHUNK_RESCUE_SHELL_KEY,
  CHUNK_RESCUE_WINDOW_MS,
  installChunkRescue,
  renderChunkRescueInlineScript,
} from "../src/utils/chunkLoadRecovery.js";
import { freshStartDestination } from "../src/utils/freshStart.js";

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("ok:", msg);
  }
}

function isRescueUrl(url, next) {
  const prefix = "/refrescar.html?next=" + encodeURIComponent(next) + "&r=";
  return typeof url === "string" && url.startsWith(prefix);
}

function rescueHtml() {
  return `<!doctype html><html><body><main><h1>Un momento</h1><p id="msg">listo</p></main></body></html>`;
}

function createHost({
  pathname = "/giras",
  search = "",
  online = true,
  now = 1_700_000_000_000,
  stamp = null,
} = {}) {
  const nodes = new Map();

  function makeEl(tag) {
    return {
      tagName: String(tag || "").toUpperCase(),
      id: "",
      src: "",
      href: "",
      style: {},
      attrs: {},
      children: [],
      _text: "",
      _href: "",
      _listeners: [],
      setAttribute(name, value) {
        this.attrs[name] = value;
      },
      addEventListener(type, fn) {
        this._listeners.push({ type, fn });
      },
      dispatchEvent(event) {
        for (const item of this._listeners) {
          if (item.type === event.type) item.fn(event);
        }
      },
      appendChild(child) {
        this.children.push(child);
        if (child.id) nodes.set(child.id, child);
        return child;
      },
      removeChild(child) {
        this.children = this.children.filter((item) => item !== child);
        return child;
      },
      get firstChild() {
        return this.children[0] || null;
      },
      set textContent(value) {
        this._text = String(value);
        this.children = [];
      },
      get textContent() {
        if (this.children.length === 0) return this._text || "";
        return this.children.map((child) => child.textContent || "").join("");
      },
      set href(value) {
        this._href = String(value);
      },
      get href() {
        return this._href;
      },
    };
  }

  const body = makeEl("body");
  const storage = new Map();
  if (stamp != null) storage.set(CHUNK_RESCUE_KEY, String(stamp));
  const listeners = [];
  const replaced = [];
  const written = [];
  const host = {
    document: {
      body,
      documentElement: body,
      getElementById: (id) => nodes.get(id) || null,
      createElement: (tag) => makeEl(tag),
      createTextNode: (text) => ({ textContent: String(text), children: [] }),
      open() {},
      write(html) {
        written.push(String(html));
      },
      close() {},
    },
    history: {
      replaceState(_state, _title, url) {
        host.historyUrl = url;
      },
    },
    location: {
      pathname,
      search,
      replace(url) {
        replaced.push(url);
      },
      reload() {
        throw new Error("no reload");
      },
    },
    navigator: { onLine: online },
    Date: { now: () => now },
    sessionStorage: {
      getItem: (key) => (storage.has(key) ? storage.get(key) : null),
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key),
    },
    addEventListener(type, fn, capture) {
      listeners.push({ type, fn, capture });
    },
    fire(type, event) {
      for (const item of listeners) {
        if (item.type === type) item.fn(event);
      }
    },
    replaced,
    written,
    storage,
    listeners,
  };
  return host;
}

function overlayText(host) {
  const el = host.document.getElementById("ofrn-preload-reload-msg");
  return el ? el.textContent : "";
}

function overlayLink(host) {
  const el = host.document.getElementById("ofrn-preload-reload-msg");
  const box = el?.children?.[0];
  return box?.children?.find((child) => child.href) || null;
}

function scriptError(src) {
  return { target: { tagName: "SCRIPT", src } };
}

function flush() {
  return new Promise((resolve) => setImmediate(resolve));
}

{
  const host = createHost({ pathname: "/transporte-scrn", search: "?tab=viajes" });
  installChunkRescue(host);
  installChunkRescue(host);
  let prevented = 0;
  host.fire("vite:preloadError", {
    preventDefault() {
      prevented += 1;
    },
  });
  host.fire("vite:preloadError", {
    preventDefault() {
      prevented += 1;
    },
  });
  assert(host.listeners.length === 2, "instalar dos veces no duplica listeners");
  assert(prevented === 2, "cada preloadError se previene");
  assert(host.replaced.length === 1, "varios chunks rotos navegan una sola vez");
  assert(
    isRescueUrl(host.replaced[0], "/transporte-scrn?tab=viajes"),
    "el destino conserva la ruta",
  );
  assert(
    freshStartDestination(host.replaced[0].slice(host.replaced[0].indexOf("?"))) ===
      "/transporte-scrn?tab=viajes",
    "refrescar abre esa misma ruta",
  );
  assert(
    overlayText(host).includes("Hay una versión nueva. Recargando para continuar"),
    "avisa antes de salir",
  );
  assert(host.storage.get(CHUNK_RESCUE_KEY) === "1700000000000", "deja el sello anti-bucle");
  assert(overlayLink(host)?.textContent === "Abrir de nuevo", "el recargando también deja el botón");
}

{
  const now = 1_700_000_000_000;
  const host = createHost({ now, stamp: now - 1_000, pathname: "/entradas", search: "" });
  installChunkRescue(host);
  host.fire("error", scriptError("https://ofrn.example/assets/index-old.js"));
  host.fire("error", scriptError("https://ofrn.example/assets/vendor-old.js"));
  assert(host.replaced.length === 0, "si ya se intentó, no vuelve a navegar");
  assert(overlayText(host).includes("No se pudo cargar la versión nueva."), "el aviso queda quieto");
  assert(overlayText(host).includes("cerrá la app del todo"), "explica cómo destrabar en el celular");
  assert(overlayLink(host)?.textContent === "Abrir de nuevo", "ofrece abrir de nuevo");
  assert(
    isRescueUrl(overlayLink(host)?.href, "/entradas"),
    "el enlace manual también va a refrescar",
  );
  assert(host.storage.get(CHUNK_RESCUE_KEY) === String(now - 1_000), "no borra el sello al frenar");
}

{
  const now = 1_700_000_000_000;
  const host = createHost({ now, stamp: now - CHUNK_RESCUE_WINDOW_MS });
  installChunkRescue(host);
  host.fire("vite:preloadError", { preventDefault() {} });
  assert(host.replaced.length === 1, "pasado el minuto puede reintentar");
}

{
  const now = 1_700_000_000_000;
  const host = createHost({ now, stamp: now - (CHUNK_RESCUE_WINDOW_MS - 1) });
  installChunkRescue(host);
  host.fire("vite:preloadError", { preventDefault() {} });
  assert(host.replaced.length === 0, "dentro del minuto no reintenta solo");
}

{
  const host = createHost({ online: false, pathname: "/giras", search: "?id=4" });
  installChunkRescue(host);
  host.fire("vite:preloadError", { preventDefault() {} });
  assert(host.replaced.length === 0, "sin conexión no manda a refrescar");
  assert(!host.storage.has(CHUNK_RESCUE_KEY), "sin conexión no gasta el intento");
  assert(overlayText(host).includes("Sin conexión"), "avisa que no hay red");
  assert(overlayLink(host)?.href === "/giras?id=4", "reintentar vuelve a esta pantalla");
  assert(overlayLink(host)?.textContent === "Reintentar", "el reintento es un tap");
}

{
  const host = createHost();
  installChunkRescue(host);
  host.fire("error", { target: host });
  host.fire("error", scriptError("https://ofrn.example/sw.js"));
  host.fire("error", { target: { tagName: "IMG", src: "https://ofrn.example/assets/a.png" } });
  assert(host.replaced.length === 0, "un error cualquiera no dispara el rescate");
  assert(overlayText(host) === "", "no tapa la app si el chunk no es el que falló");
}

{
  const host = createHost({ pathname: "/refrescar.html", search: "?next=/giras" });
  installChunkRescue(host);
  assert(host.replaced.length === 1, "si el SW sirvió el shell en /refrescar.html, se rescata");
  assert(isRescueUrl(host.replaced[0], "/giras"), "conserva el next original");
}

{
  const now = 1_700_000_000_000;
  const host = createHost({
    now,
    stamp: now - 1000,
    pathname: "/refrescar.html",
    search: "?next=/giras",
  });
  host.fetch = async () => ({ ok: true, text: async () => rescueHtml() });
  installChunkRescue(host);
  await flush();
  await flush();
  assert(host.replaced.length === 0, "el shell en /refrescar.html no se navega otra vez");
  assert(
    host.written.some((html) => html.includes("Un momento")),
    "con el sello fresco igual escribe la página de rescate",
  );
  assert(
    host.storage.get(CHUNK_RESCUE_SHELL_KEY) === String(now),
    "marca que el shell ya se vio en esta URL",
  );
  assert(
    host.storage.get(CHUNK_RESCUE_KEY) === String(now - 1000),
    "no renueva el sello de la página anterior",
  );
}

{
  const now = 1_700_000_000_000;
  let fetches = 0;
  const host = createHost({
    now,
    stamp: now - 1000,
    pathname: "/refrescar.html",
    search: "?next=/giras",
  });
  host.storage.set(CHUNK_RESCUE_SHELL_KEY, String(now - 1000));
  host.fetch = async () => {
    fetches += 1;
    return { ok: true, text: async () => rescueHtml() };
  };
  installChunkRescue(host);
  await flush();
  assert(
    fetches === 0 && host.written.length === 0 && host.replaced.length === 0,
    "un segundo shell dentro del minuto no se reintenta solo",
  );
  assert(overlayText(host).includes("No se pudo cargar la versión nueva."), "queda el cartel para el tap");
  let prevented = false;
  overlayLink(host).dispatchEvent({
    type: "click",
    preventDefault() {
      prevented = true;
    },
  });
  await flush();
  await flush();
  assert(prevented && fetches === 1 && host.written.length === 1, "el tap sí vuelve a pedir la página");
  assert(host.replaced.length === 0, "ese tap no navega al mismo shell");
}

{
  const host = createHost({ pathname: "/refrescar.html", search: "?next=/giras" });
  host.fetch = async () => ({
    ok: true,
    text: async () => `<!doctype html><html><body><div id="root"></div>Un momento</body></html>`,
  });
  installChunkRescue(host);
  await flush();
  await flush();
  assert(host.written.length === 0, "no escribe el shell otra vez");
  assert(host.replaced.length === 0, "si el fetch sigue trayendo la app, no navega en círculo");
  assert(overlayText(host).includes("No se pudo cargar la versión nueva."), "avisa que no pudo");
}

{
  const inline = renderChunkRescueInlineScript();
  assert(inline.startsWith("<script>(") && inline.endsWith(")(window);</script>"), "el inline llama al instalador");
  assert(!inline.includes("location.reload"), "el inline no recarga el mismo documento");
  assert(!/<\/script/i.test(inline.slice(8, -9)), "el cuerpo no cierra el tag");
  assert(inline.includes(CHUNK_RESCUE_KEY), "el inline lleva el mismo sello");
  assert(inline.includes(CHUNK_RESCUE_SHELL_KEY), "el inline lleva el sello del shell");
  assert(inline.includes("fetch"), "el inline pide el HTML de rescate sin navegar");

  const host = createHost({ pathname: "/manual", search: "?p=2" });
  const code = inline.replace(/^<script>/, "").replace(/<\/script>$/, "");
  vm.runInNewContext(code, {
    window: host,
    encodeURIComponent,
    Date,
    Number,
    String,
    Promise,
  });
  host.fire("error", scriptError("/assets/index-abc.js"));
  assert(host.replaced.length === 1, "el script inyectado navega sin depender del módulo");
  assert(host.replaced[0].startsWith("/refrescar.html?next="), "el script inyectado abre refrescar");
}

{
  const main = fs.readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
  assert(!main.includes("vite:preloadError"), "main.jsx ya no recarga por preloadError");
  assert(!main.includes("location.reload"), "main.jsx no recarga la página");

  const vite = fs.readFileSync(new URL("../vite.config.js", import.meta.url), "utf8");
  assert(vite.includes("renderChunkRescueInlineScript"), "el build inyecta este script");
  assert(!vite.includes("ofrn:main-chunk-reload"), "ya no está el reload ciego del entry");

  const fresh = fs.readFileSync(new URL("../src/utils/freshStart.js", import.meta.url), "utf8");
  const shellStart = fresh.indexOf("const SHELL_SESSION_KEYS");
  const shell = fresh.slice(shellStart, fresh.indexOf("];", shellStart));
  assert(shell.includes(`"${CHUNK_RESCUE_KEY}"`), "refrescar borra el sello al soltar el SW");
  assert(shell.includes(`"${CHUNK_RESCUE_SHELL_KEY}"`), "refrescar borra el sello del shell");

  const prompt = fs.readFileSync(new URL("../src/components/ui/ReloadPrompt.jsx", import.meta.url), "utf8");
  const clear = prompt.slice(prompt.indexOf("function clearReloadGuards"), prompt.indexOf("function readTransporteAutoStamp"));
  assert(!clear.includes(`removeItem("${CHUNK_RESCUE_KEY}")`), "el match de versión no borra el sello");
}

{
  const host = createHost({ pathname: "/giras" });
  host.fetch = async () => ({ ok: true, text: async () => rescueHtml() });
  installChunkRescue(host);
  host.fire("vite:preloadError", { preventDefault() {} });
  await flush();
  await flush();
  assert(host.replaced.length === 0, "si llega el HTML de rescate, no navega");
  assert(host.written.some((html) => html.includes("Un momento")), "escribe la página de rescate");
  assert(String(host.historyUrl || "").startsWith("/refrescar.html"), "deja la URL en refrescar");
}

{
  const host = createHost({ pathname: "/giras" });
  host.fetch = async () => ({
    ok: true,
    text: async () => `<!doctype html><html><body><div id="root"></div></body></html>`,
  });
  installChunkRescue(host);
  host.fire("vite:preloadError", { preventDefault() {} });
  await flush();
  await flush();
  assert(host.written.length === 0, "no escribe el shell SPA como si fuera el rescate");
  assert(isRescueUrl(host.replaced[0], "/giras"), "si el fetch trae el SPA, navega igual");
}

{
  const now = 1_700_000_000_000;
  const host = createHost({ now, stamp: now - 1_000, pathname: "/entradas" });
  host.fetch = async () => ({ ok: true, text: async () => rescueHtml() });
  installChunkRescue(host);
  host.fire("error", scriptError("https://ofrn.example/assets/index-old.js"));
  assert(host.replaced.length === 0 && host.written.length === 0, "el cartel quieto no dispara solo");
  let prevented = false;
  overlayLink(host).dispatchEvent({
    type: "click",
    preventDefault() {
      prevented = true;
    },
  });
  await flush();
  await flush();
  assert(prevented, "el tap no deja que el SW hijackee el href");
  assert(host.written.some((html) => html.includes('id="msg"')), "Abrir de nuevo escribe el rescate");
  assert(host.replaced.length === 0, "el tap no recarga el mismo shell");
}

if (process.exitCode) process.exit(process.exitCode);
console.log("chunk recovery ok");
