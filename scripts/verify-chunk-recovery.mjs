/**
 * Un chunk 404 no recarga el mismo documento en bucle.
 * Run: node scripts/verify-chunk-recovery.mjs
 */
import fs from "node:fs";
import vm from "node:vm";
import {
  CHUNK_RESCUE_KEY,
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
      style: {},
      attrs: {},
      children: [],
      _text: "",
      _href: "",
      setAttribute(name, value) {
        this.attrs[name] = value;
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
  const host = {
    document: {
      body,
      documentElement: body,
      getElementById: (id) => nodes.get(id) || null,
      createElement: (tag) => makeEl(tag),
      createTextNode: (text) => ({ textContent: String(text), children: [] }),
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
    host.replaced[0] ===
      "/refrescar.html?next=" + encodeURIComponent("/transporte-scrn?tab=viajes"),
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
  assert(!overlayLink(host), "la salida automática no espera un click");
}

{
  const now = 1_700_000_000_000;
  const host = createHost({ now, stamp: now - 1_000, pathname: "/entradas", search: "" });
  installChunkRescue(host);
  host.fire("error", scriptError("https://ofrn.example/assets/index-old.js"));
  host.fire("error", scriptError("https://ofrn.example/assets/vendor-old.js"));
  assert(host.replaced.length === 0, "si ya se intentó, no vuelve a navegar");
  assert(overlayText(host).includes("No se pudo cargar la versión nueva."), "el aviso queda quieto");
  assert(overlayLink(host)?.textContent === "Abrir de nuevo", "ofrece abrir de nuevo");
  assert(
    overlayLink(host)?.href === "/refrescar.html?next=" + encodeURIComponent("/entradas"),
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
  const inline = renderChunkRescueInlineScript();
  assert(inline.startsWith("<script>(") && inline.endsWith(")(window);</script>"), "el inline llama al instalador");
  assert(!inline.includes("location.reload"), "el inline no recarga el mismo documento");
  assert(!/<\/script/i.test(inline.slice(8, -9)), "el cuerpo no cierra el tag");
  assert(inline.includes(CHUNK_RESCUE_KEY), "el inline lleva el mismo sello");

  const host = createHost({ pathname: "/manual", search: "?p=2" });
  const code = inline.replace(/^<script>/, "").replace(/<\/script>$/, "");
  vm.runInNewContext(code, {
    window: host,
    encodeURIComponent,
    Date,
    Number,
    String,
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
  const shell = fresh.slice(fresh.indexOf("const SHELL_SESSION_KEYS"), fresh.indexOf("];"));
  assert(!shell.includes(`"${CHUNK_RESCUE_KEY}"`), "refrescar no borra el sello");

  const prompt = fs.readFileSync(new URL("../src/components/ui/ReloadPrompt.jsx", import.meta.url), "utf8");
  const clear = prompt.slice(prompt.indexOf("function clearReloadGuards"), prompt.indexOf("function readTransporteAutoStamp"));
  assert(!clear.includes(`removeItem("${CHUNK_RESCUE_KEY}")`), "el match de versión no borra el sello");
}

if (process.exitCode) process.exit(process.exitCode);
console.log("chunk recovery ok");
