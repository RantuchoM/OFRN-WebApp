/**
 * Rescate /refrescar.html: plan, destino, limpieza y HTML inline.
 * Run: node scripts/verify-fresh-start.mjs
 */
import {
  FRESH_OPEN_KEY,
  FRESH_START_LOG_KEY,
  FRESH_START_MAX_ATTEMPTS,
  FRESH_START_STORAGE_KEY,
  activateLatestServiceWorker,
  FRESH_NAV_KEY,
  clearFreshNav,
  freshNavRecently,
  freshStartDestination,
  freshStartHref,
  freshStartReferrerDestination,
  resolveFreshStartDestination,
  freshStartStatusBusy,
  freshStartStatusLabel,
  planFreshStart,
  readFreshStartLog,
  runFreshStart,
} from "../src/utils/freshStart.js";
import { renderFreshStartHtml } from "../src/utils/freshStartPage.js";
import { isNavigationDenylisted } from "../src/utils/pwaNavigateDenylist.js";

const ESCENARIO =
  "/?tab=giras&view=REPERTOIRE&giraId=14&subTab=seating&seatingView=escenario";

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("ok:", msg);
  }
}

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (key) => (Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null),
    setItem: (key, value) => {
      data[key] = String(value);
    },
    removeItem: (key) => {
      delete data[key];
    },
    dump: () => data,
  };
}

function swWith(regs, { controller = null } = {}) {
  return {
    controller,
    getRegistrations: async () => regs,
  };
}

function registration() {
  return {
    unregister: async () => {
      registration.calls += 1;
      return true;
    },
  };
}
registration.calls = 0;

function watchStatus() {
  const codes = [];
  return {
    codes,
    onStatus(code) {
      codes.push(code);
    },
  };
}

function cacheBox(keys = ["precache"]) {
  const deleted = [];
  return {
    deleted,
    keys: async () => keys,
    delete: async (key) => {
      deleted.push(key);
      return true;
    },
  };
}

assert(planFreshStart({ controlled: false, step: 0 }) === "clear-then-redirect", "sin SW: limpiar y entrar");
assert(planFreshStart({ controlled: true, step: 0 }) === "unregister-then-reload", "con SW: soltar y recargar");
assert(
  planFreshStart({ controlled: true, step: FRESH_START_MAX_ATTEMPTS }) === "stuck",
  "con SW tras el tope: no seguir",
);

assert(freshStartDestination("") === "/", "sin next va a /");
assert(freshStartDestination("?next=/entradas") === "/entradas", "next interno");
assert(
  freshStartDestination("?next=" + encodeURIComponent("/entradas?view=mis-reservas")) ===
    "/entradas?view=mis-reservas",
  "next con query",
);
assert(freshStartDestination("?next=https://evil.test/x") === "/", "rechaza absoluta");
assert(freshStartDestination("?next=//evil.test") === "/", "rechaza protocol-relative");
assert(freshStartDestination("?next=/refrescar.html") === "/", "no vuelve a la misma página");
assert(
  freshStartDestination(
    "?next=" + encodeURIComponent("/refrescar.html?next=/stage-plots/9"),
  ) === "/stage-plots/9",
  "desempaqueta el next si el shell se sirvió en /refrescar.html",
);
assert(
  freshStartHref("/refrescar.html?next=/fimba/edicion/3/escenario/4") ===
    "/refrescar.html?next=" + encodeURIComponent("/fimba/edicion/3/escenario/4"),
  "no tira el escenario si la ruta actual ya es refrescar",
);
assert(
  freshStartReferrerDestination(
    "https://ofrn.local/?tab=giras&seatingView=escenario",
    "https://ofrn.local",
  ) === "/?tab=giras&seatingView=escenario",
  "sin next, el referrer misma-origen es el destino",
);
assert(
  freshStartReferrerDestination("https://evil.test/stage-plots/1", "https://ofrn.local") === "",
  "el referrer de otro origen no cuenta",
);
assert(
  resolveFreshStartDestination({
    search: "",
    referrer: "https://ofrn.local/refrescar.html?next=" + encodeURIComponent("/stage-plots/9"),
    origin: "https://ofrn.local",
  }) === "/stage-plots/9",
  "si el enlace perdió el next, lo recupera del referrer",
);
assert(freshStartDestination("?next=/%2e%2e/secreto") === "/", "rechaza ..");
assert(
  freshStartDestination(ESCENARIO.slice(1)) === ESCENARIO,
  "el query de Escenario sin next vuelve a esa pantalla",
);
assert(
  freshStartDestination(
    "?next=" + encodeURIComponent(ESCENARIO) + "&r=1700000000000",
  ) === ESCENARIO,
  "el next codificado de Escenario no arrastra el cache-buster",
);
assert(
  freshStartDestination(
    "?next=/?tab=giras&view=REPERTOIRE&giraId=14&subTab=seating&seatingView=escenario",
  ) === ESCENARIO,
  "si next se cortó en el primer &, se rearman los params",
);
assert(
  freshStartReferrerDestination(
    "https://ofrn.local/refrescar.html?tab=giras&view=REPERTOIRE&giraId=14&subTab=seating&seatingView=escenario",
    "https://ofrn.local",
  ) === ESCENARIO,
  "el referrer con el query pegado a refrescar también es Escenario",
);
assert(
  !isNavigationDenylisted(ESCENARIO),
  "la pantalla de Escenario sigue siendo navegación de la app",
);
assert(
  isNavigationDenylisted("/refrescar.html"),
  "refrescar pelado no lo sirve el shell",
);
assert(
  isNavigationDenylisted("/refrescar.html?next=" + encodeURIComponent(ESCENARIO)),
  "refrescar con next no lo sirve el shell",
);
assert(
  isNavigationDenylisted("/refrescar.html?tab=giras&view=REPERTOIRE&giraId=14&subTab=seating&seatingView=escenario"),
  "refrescar con el query de la app no lo sirve el shell",
);
{
  const storage = memoryStorage();
  const now = 1_700_000_000_000;
  assert(
    resolveFreshStartDestination({
      search: "?tab=giras&view=REPERTOIRE&giraId=14&subTab=seating&seatingView=escenario",
      storage,
      now,
    }) === ESCENARIO,
    "resolver guarda el destino de Escenario",
  );
  assert(
    resolveFreshStartDestination({ search: "", storage, now: now + 1000 }) === ESCENARIO,
    "la recarga intermedia recupera el destino guardado",
  );
  assert(
    resolveFreshStartDestination({ search: "", storage, now: now + 3 * 60 * 1000 }) === "/",
    "el destino guardado caduca",
  );
}
assert(freshStartHref("/giras") === "/refrescar.html?next=" + encodeURIComponent("/giras"), "el botón vuelve a la ruta");
assert(
  freshStartHref("/entradas?view=mis-reservas") ===
    "/refrescar.html?next=" + encodeURIComponent("/entradas?view=mis-reservas"),
  "el botón conserva el query",
);
assert(freshStartHref("https://evil.test/x") === "/refrescar.html", "el botón no acepta una URL externa");
assert(freshStartHref("/refrescar.html") === "/refrescar.html", "el botón no se apunta a sí mismo");
{
  const storage = memoryStorage();
  const now = 1_700_000_000_000;
  assert(!freshNavRecently(storage, now), "sin sello el auto-apply puede ir a refrescar");
  storage.setItem(FRESH_NAV_KEY, String(now));
  assert(freshNavRecently(storage, now + 1000), "el sello frena un segundo auto-apply");
  assert(!freshNavRecently(storage, now + 61_000), "pasado el minuto el auto-apply puede repetir");
  clearFreshNav(storage);
  assert(!freshNavRecently(storage, now + 1000), "al coincidir la versión se borra el sello");
}

{
  registration.calls = 0;
  const caches = cacheBox();
  const storage = memoryStorage({
    "ofrn:pwa-reload-guard": "1",
    "ofrn:chunk-rescue-at": "1700000000000",
    "ofrn:chunk-rescue-shell-at": "1700000000000",
  });
  const status = watchStatus();
  let replaced = "";
  const plan = await runFreshStart({
    serviceWorker: swWith([registration()], { controller: null }),
    cacheStorage: caches,
    sessionStorage: storage,
    onStatus: status.onStatus,
    location: {
      search: "?next=/entradas",
      replace: (url) => {
        replaced = url;
      },
      reload() {
        throw new Error("no reload");
      },
    },
    timeoutMs: 1000,
  });
  assert(plan === "clear-then-redirect", "run sin controlador");
  assert(replaced === "/entradas", "redirige al next");
  assert(registration.calls === 1, "desregistra igual");
  assert(caches.deleted.includes("precache"), "borra Cache Storage");
  assert(!storage.dump()["ofrn:pwa-reload-guard"], "limpia el tope de recargas");
  assert(!storage.dump()["ofrn:chunk-rescue-at"], "limpia el sello del cartel para no dejarlo trabado");
  assert(
    !storage.dump()["ofrn:chunk-rescue-shell-at"],
    "limpia el sello del shell servido en /refrescar.html",
  );
  assert(!storage.dump()[FRESH_START_STORAGE_KEY], "limpia el paso");
  assert(!storage.dump()[FRESH_START_LOG_KEY], "al abrir la app no deja el historial");
  assert(storage.dump()[FRESH_OPEN_KEY] === "1", "marca la entrada para no mostrar Actualizar");
  assert(
    status.codes.join(",") === "check,caches,open",
    "avisa revisar, borrar y abrir",
  );
}

{
  registration.calls = 0;
  const caches = cacheBox();
  const storage = memoryStorage({
    "ofrn:chunk-rescue-at": "9",
    "ofrn:chunk-rescue-shell-at": "8",
  });
  const status = watchStatus();
  let reloaded = 0;
  const plan = await runFreshStart({
    serviceWorker: swWith([registration()], { controller: {} }),
    cacheStorage: caches,
    sessionStorage: storage,
    onStatus: status.onStatus,
    location: {
      search: "",
      replace() {
        throw new Error("no replace mientras controla");
      },
      reload() {
        reloaded += 1;
      },
    },
    timeoutMs: 1000,
    controllerReleaseMs: 0,
  });
  assert(plan === "unregister-then-reload", "run con controlador");
  assert(reloaded === 1, "se recarga a sí misma");
  assert(registration.calls === 1, "desregistra antes de recargar");
  assert(caches.deleted.length === 0, "no borra la caché mientras el SW controla");
  assert(storage.dump()[FRESH_START_STORAGE_KEY] === "1", "cuenta el intento");
  assert(
    storage.dump()["ofrn:chunk-rescue-at"] === "9",
    "mientras el SW controla no borra el sello",
  );
  assert(
    storage.dump()["ofrn:chunk-rescue-shell-at"] === "8",
    "mientras el SW controla no borra el sello del shell",
  );
  assert(
    status.codes.join(",") === "check,release,reload",
    "avisa revisar, soltar y confirmar",
  );
  assert(
    readFreshStartLog(storage).join(",") === "check,release,reload",
    "el historial sobrevive para la recarga",
  );

  const status2 = watchStatus();
  const caches2 = cacheBox(["precache"]);
  let replaced = "";
  const plan2 = await runFreshStart({
    serviceWorker: swWith([registration()], { controller: null }),
    cacheStorage: caches2,
    sessionStorage: storage,
    onStatus: status2.onStatus,
    location: {
      search: "",
      replace: (url) => {
        replaced = url;
      },
      reload() {
        throw new Error("no reload");
      },
    },
    timeoutMs: 1000,
  });
  assert(plan2 === "clear-then-redirect" && replaced === "/", "segunda carga abre /");
  assert(status2.codes.join(",") === "caches,open", "no repite los pasos ya hechos");
  assert(caches2.deleted.includes("precache"), "en la segunda carga borra la caché");
}

{
  const sw = {
    controller: { id: 1 },
    onChange: null,
    addEventListener(type, fn) {
      if (type === "controllerchange") this.onChange = fn;
    },
    removeEventListener() {},
    getRegistrations: async () => [
      {
        unregister: async () => {
          sw.controller = null;
          sw.onChange?.();
          return true;
        },
      },
    ],
  };
  let controlledAtReload = "pending";
  const plan = await runFreshStart({
    serviceWorker: sw,
    cacheStorage: cacheBox(),
    sessionStorage: memoryStorage(),
    location: {
      search: "?next=/stage-plots/9",
      replace() {
        throw new Error("no replace");
      },
      reload() {
        controlledAtReload = sw.controller;
      },
    },
    timeoutMs: 500,
    minStepMs: 0,
    closingMs: 0,
    controllerReleaseMs: 1500,
  });
  assert(plan === "unregister-then-reload", "espera a soltar el SW antes de recargar");
  assert(controlledAtReload == null, "la recarga ocurre cuando ya no hay controlador");
}

{
  registration.calls = 0;
  const caches = cacheBox();
  let replaced = 0;
  let reloaded = 0;
  const status = watchStatus();
  const plan = await runFreshStart({
    serviceWorker: swWith([registration()], { controller: {} }),
    cacheStorage: caches,
    sessionStorage: memoryStorage({ [FRESH_START_STORAGE_KEY]: String(FRESH_START_MAX_ATTEMPTS) }),
    onStatus: status.onStatus,
    location: {
      search: "",
      replace() {
        replaced += 1;
      },
      reload() {
        reloaded += 1;
      },
    },
    timeoutMs: 200,
    controllerReleaseMs: 0,
  });
  assert(plan === "stuck", "tope con SW todavía en control");
  assert(replaced === 0 && reloaded === 0, "no navega si sigue trabado");
  assert(caches.deleted.length === 0 && registration.calls === 0, "no deja / sin shell");
  assert(status.codes.join(",") === "check,stuck", "avisa que no pudo soltarla");
}

{
  let replaced = false;
  const status = watchStatus();
  const plan = await runFreshStart({
    serviceWorker: {
      controller: null,
      getRegistrations: () => new Promise(() => {}),
    },
    cacheStorage: { keys: () => new Promise(() => {}) },
    sessionStorage: memoryStorage(),
    onStatus: status.onStatus,
    location: {
      search: "",
      replace() {
        replaced = true;
      },
      reload() {},
    },
    timeoutMs: 40,
  });
  assert(plan === "clear-then-redirect" && replaced, "si la limpieza cuelga, igual abre /");
  assert(status.codes.at(-1) === "openTimeout", "avisa que el borrado tardó");
}

{
  let skipped = 0;
  const sw = {
    controller: null,
    addEventListener(type, fn) {
      if (type === "controllerchange") this.onControl = fn;
    },
    async register(url) {
      sw.registered = url;
      const installing = {
        state: "installing",
        postMessage(msg) {
          skipped += 1;
          sw.skip = msg?.type;
        },
        addEventListener(type, fn) {
          if (type !== "statechange") return;
          queueMicrotask(() => {
            installing.state = "activated";
            sw.controller = { scriptURL: url };
            fn();
            sw.onControl?.();
          });
        },
      };
      return { installing, waiting: null, active: null };
    },
  };
  const ok = await activateLatestServiceWorker({ serviceWorker: sw }, 1000);
  assert(ok === true, "el SW nuevo queda en control");
  assert(sw.registered === "/sw.js", "registra el SW del servidor");
  assert(skipped >= 1 && sw.skip === "SKIP_WAITING", "le pide que no espere");
}

{
  const started = Date.now();
  const hung = await activateLatestServiceWorker(
    {
      serviceWorker: {
        controller: null,
        register() {
          return new Promise(() => {});
        },
      },
    },
    40,
  );
  assert(hung === "timeout", "si registrar el SW cuelga, corta");
  assert(Date.now() - started < 1000, "el corte no espera más que el tope");
}

{
  let replaced = false;
  const status = watchStatus();
  const plan = await runFreshStart({
    serviceWorker: {
      controller: null,
      getRegistrations: async () => [],
      register() {
        return new Promise(() => {});
      },
    },
    cacheStorage: cacheBox(),
    sessionStorage: memoryStorage(),
    onStatus: status.onStatus,
    location: {
      search: "",
      replace() {
        replaced = true;
      },
      reload() {},
    },
    timeoutMs: 40,
    swTimeoutMs: 40,
  });
  assert(plan === "clear-then-redirect" && replaced, "si registrar el SW cuelga, igual abre la app");
  assert(status.codes.at(-1) === "openTimeout", "avisa que activar la versión tardó");
}

const html = renderFreshStartHtml();
assert(html.includes('id="msg"'), "la página muestra el estado");
assert(html.includes('id="done"'), "la página lista los pasos ya hechos");
assert(html.includes('id="spin"'), "hay un giro mientras trabaja");
assert(freshStartStatusBusy("release") === true, "soltar la versión se muestra en curso");
assert(freshStartStatusBusy("open") === false, "abrir la app ya no gira");
assert(
  html.includes(freshStartStatusLabel("release", "now")),
  "el texto de soltar la versión viaja en la página",
);
assert(
  freshStartStatusLabel("release", "done") === "Solté la versión vieja",
  "lo ya hecho se dice en pasado",
);
assert(html.includes(FRESH_START_STORAGE_KEY), "el script inline lleva la lógica");
assert(html.includes("unregister"), "el script desregistra");
assert(!html.includes("localStorage"), "no borra la sesión");
assert(!/<\/script>/i.test(html.slice(html.indexOf("<script>") + 8, html.lastIndexOf("</script>"))), "el bundle no cierra el script");

if (process.exitCode) {
  console.error("verify-fresh-start: falló");
  process.exit(process.exitCode);
}
console.log("verify-fresh-start: ok");
