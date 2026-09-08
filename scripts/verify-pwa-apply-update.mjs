/**
 * Apply PWA update: waiting / updatefound / skipWaiting / nuke.
 * Run: node scripts/verify-pwa-apply-update.mjs
 */
import { EventEmitter } from "node:events";
import {
  applyPwaUpdate,
  postSkipWaiting,
  resolveServiceWorkerRegistration,
  unregisterAndClearCaches,
  waitForControllerChange,
  waitForWaitingWorker,
} from "../src/utils/pwaApplyUpdate.js";

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("ok:", msg);
  }
}

class FakeWorker extends EventEmitter {
  constructor(state = "installing") {
    super();
    this.state = state;
    this.messages = [];
  }
  postMessage(msg) {
    this.messages.push(msg);
  }
  addEventListener(type, fn) {
    this.on(type, fn);
  }
  removeEventListener(type, fn) {
    this.off(type, fn);
  }
  setState(state) {
    this.state = state;
    this.emit("statechange");
  }
}

class FakeRegistration extends EventEmitter {
  constructor() {
    super();
    this.waiting = null;
    this.installing = null;
    this.active = { state: "activated" };
    this.updateCalls = 0;
  }
  addEventListener(type, fn) {
    this.on(type, fn);
  }
  removeEventListener(type, fn) {
    this.off(type, fn);
  }
  async update() {
    this.updateCalls += 1;
  }
}

function fakeServiceWorker(registration) {
  const sw = new EventEmitter();
  sw.getRegistration = async () => registration;
  sw.ready = Promise.resolve(registration);
  sw.addEventListener = (type, fn) => sw.on(type, fn);
  sw.removeEventListener = (type, fn) => sw.off(type, fn);
  return sw;
}

// --- postSkipWaiting ---
{
  const worker = new FakeWorker("installed");
  assert(postSkipWaiting(worker) === true, "postSkipWaiting sends");
  assert(worker.messages[0]?.type === "SKIP_WAITING", "SKIP_WAITING payload");
  assert(postSkipWaiting(null) === false, "postSkipWaiting null");
}

// --- resolveServiceWorkerRegistration ---
{
  const hinted = { waiting: { state: "installed" } };
  const resolved = await resolveServiceWorkerRegistration(hinted, null);
  assert(resolved === hinted, "hint with waiting wins");

  const emptyHint = {};
  const fallback = { installing: { state: "installing" } };
  const fromGet = await resolveServiceWorkerRegistration(
    emptyHint,
    fakeServiceWorker(fallback),
  );
  assert(fromGet === fallback, "getRegistration fallback when hint empty");
}

// --- waitForWaitingWorker: already waiting ---
{
  const reg = new FakeRegistration();
  const waiting = new FakeWorker("installed");
  reg.waiting = waiting;
  const got = await waitForWaitingWorker(reg, 50);
  assert(got === waiting, "returns existing waiting");
}

// --- waitForWaitingWorker: installing → installed ---
{
  const reg = new FakeRegistration();
  const installing = new FakeWorker("installing");
  reg.installing = installing;
  const pending = waitForWaitingWorker(reg, 500);
  setTimeout(() => {
    installing.setState("installed");
    reg.waiting = installing;
  }, 20);
  const got = await pending;
  assert(got === installing, "waits installing → installed");
}

// --- waitForWaitingWorker: updatefound ---
{
  const reg = new FakeRegistration();
  const pending = waitForWaitingWorker(reg, 500);
  setTimeout(() => {
    const installing = new FakeWorker("installing");
    reg.installing = installing;
    reg.emit("updatefound");
    installing.setState("installed");
    reg.waiting = installing;
  }, 20);
  const got = await pending;
  assert(got?.state === "installed", "updatefound then installed");
}

// --- waitForControllerChange ---
{
  const sw = fakeServiceWorker(null);
  const pending = waitForControllerChange(sw, 500);
  setTimeout(() => sw.emit("controllerchange"), 15);
  assert((await pending) === true, "controllerchange resolves true");

  const timedOut = await waitForControllerChange(fakeServiceWorker(null), 30);
  assert(timedOut === false, "controllerchange timeout is false");
}

// --- apply: waiting exists → skipWaiting + reload ---
{
  const reg = new FakeRegistration();
  const waiting = new FakeWorker("installed");
  reg.waiting = waiting;
  const sw = fakeServiceWorker(reg);
  let reloads = 0;
  const result = await applyPwaUpdate({
    registration: reg,
    serviceWorker: sw,
    allowNuke: false,
    controllerTimeoutMs: 20,
    reload: () => {
      reloads += 1;
      return true;
    },
  });
  assert(result.ok && result.via === "skip-waiting", "apply via skip-waiting");
  assert(waiting.messages[0]?.type === "SKIP_WAITING", "skipWaiting posted");
  assert(reloads === 1, "reloads once after skipWaiting");
}

// --- apply: no waiting → update() then wait ---
{
  const reg = new FakeRegistration();
  const sw = fakeServiceWorker(reg);
  let reloads = 0;
  const applyPromise = applyPwaUpdate({
    registration: reg,
    serviceWorker: sw,
    allowNuke: false,
    waitingTimeoutMs: 400,
    controllerTimeoutMs: 20,
    reload: () => {
      reloads += 1;
      return true;
    },
  });
  setTimeout(() => {
    const installing = new FakeWorker("installing");
    reg.installing = installing;
    reg.emit("updatefound");
    installing.setState("installed");
    reg.waiting = installing;
  }, 30);
  const result = await applyPromise;
  assert(reg.updateCalls === 1, "calls registration.update() when no waiting");
  assert(result.ok && result.via === "skip-waiting", "waits for updatefound then skipWaiting");
  assert(reloads === 1, "reload after delayed waiting");
}

// --- apply: no waiting + allowNuke → unregister + clear + reload ---
{
  const reg = new FakeRegistration();
  const sw = fakeServiceWorker(reg);
  sw.getRegistrations = async () => [reg];
  let unregistered = false;
  reg.unregister = async () => {
    unregistered = true;
    return true;
  };
  const deleted = [];
  const cacheStorage = {
    keys: async () => ["workbox-precache", "runtime"],
    delete: async (key) => {
      deleted.push(key);
      return true;
    },
  };
  let reloads = 0;
  const result = await applyPwaUpdate({
    registration: reg,
    serviceWorker: sw,
    cacheStorage,
    allowNuke: true,
    waitingTimeoutMs: 20,
    controllerTimeoutMs: 10,
    reload: () => {
      reloads += 1;
      return true;
    },
  });
  assert(result.ok && result.via === "unregister-reload", "last resort unregister-reload");
  assert(unregistered, "unregisters SW");
  assert(deleted.length === 2, "clears caches");
  assert(reloads === 1, "reloads after nuke");
}

// --- apply: no waiting + no nuke → fail (the old silent no-op) ---
{
  const reg = new FakeRegistration();
  const result = await applyPwaUpdate({
    registration: reg,
    serviceWorker: fakeServiceWorker(reg),
    allowNuke: false,
    waitingTimeoutMs: 15,
    reload: () => {
      throw new Error("should not reload");
    },
  });
  assert(result.ok === false && result.via === "no-waiting", "fails instead of silent no-op");
}

// --- unregisterAndClearCaches ---
{
  const reg = new FakeRegistration();
  reg.unregister = async () => true;
  const sw = {
    getRegistrations: async () => [reg],
  };
  const cacheStorage = {
    keys: async () => ["a"],
    delete: async () => true,
  };
  const cleared = await unregisterAndClearCaches({ serviceWorker: sw, cacheStorage });
  assert(cleared.ok, "unregisterAndClearCaches ok");
}

if (process.exitCode) {
  console.error("verify-pwa-apply-update FAILED");
  process.exit(process.exitCode);
} else {
  console.log("verify-pwa-apply-update passed");
}
