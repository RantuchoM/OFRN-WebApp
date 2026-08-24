/**
 * Caché local (IndexedDB) del snapshot de recepción + cola de ingresos offline.
 */

import { entradaQrTokenHash } from "./entradaQrHash";

const DB_NAME = "ofrn-entradas-recepcion";
const DB_VERSION = 2;
const STORE_SNAP = "snapshots";
const STORE_QUEUE = "ingestQueue";

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB no disponible."));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error || new Error("No se pudo abrir IndexedDB."));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (ev) => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_SNAP)) {
        db.createObjectStore(STORE_SNAP, { keyPath: "conciertoId" });
      }
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        const q = db.createObjectStore(STORE_QUEUE, { keyPath: "clientOpId" });
        q.createIndex("byConciertoStatus", ["conciertoId", "status"], { unique: false });
        q.createIndex("byStatus", "status", { unique: false });
      }
      // Upgrade from v1: ensure queue store exists (handled above).
      void ev;
    };
  });
}

function idbReq(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("Error IndexedDB."));
  });
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Transacción abortada."));
  });
}

function digitsOnly(s) {
  return String(s || "").replace(/\D/g, "");
}

function codigoManual10(codigoReserva) {
  const d = digitsOnly(codigoReserva);
  if (d.length < 10) return d;
  return d.slice(-10);
}

/**
 * @param {number|string} conciertoId
 */
export async function getRecepcionSnapshotLocal(conciertoId) {
  const cid = Number(conciertoId);
  if (!Number.isFinite(cid) || cid <= 0) return null;
  try {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE_SNAP, "readonly");
      const row = await idbReq(tx.objectStore(STORE_SNAP).get(cid));
      return row || null;
    } finally {
      db.close();
    }
  } catch {
    return null;
  }
}

export async function saveRecepcionSnapshotLocal(payload) {
  const cid = Number(payload?.concierto_id);
  if (!Number.isFinite(cid) || cid <= 0) {
    throw new Error("Snapshot sin concierto_id.");
  }
  const reservasRemote = Array.isArray(payload.reservas) ? payload.reservas : [];
  const prev = await getRecepcionSnapshotLocal(cid);
  const reservas = mergeReservasPreserveLocalIngresos(prev?.reservas, reservasRemote);
  let plazaCount = 0;
  for (const r of reservas) {
    plazaCount += Array.isArray(r?.entradas) ? r.entradas.length : 0;
  }
  const row = {
    conciertoId: cid,
    generatedAt: payload.generated_at || new Date().toISOString(),
    savedAt: new Date().toISOString(),
    reservas,
    plazaCount,
  };
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_SNAP, "readwrite");
    await idbReq(tx.objectStore(STORE_SNAP).put(row));
    await txDone(tx);
  } finally {
    db.close();
  }
  return row;
}

/**
 * Al bajar roster del servidor, no pisar ingresos optimistas locales
 * (pendiente remoto + ingresada local → se mantiene ingresada).
 * Si el remoto ya figura ingresada/anulada, gana el remoto.
 */
export function mergeReservasPreserveLocalIngresos(prevReservas, remoteReservas) {
  const prevByReserva = new Map();
  for (const r of prevReservas || []) {
    prevByReserva.set(Number(r.id), r);
  }
  return (remoteReservas || []).map((remote) => {
    const prev = prevByReserva.get(Number(remote.id));
    if (!prev?.entradas?.length) return remote;
    const prevByOrden = new Map();
    for (const e of prev.entradas) {
      prevByOrden.set(Number(e.orden), e);
    }
    return {
      ...remote,
      entradas: (remote.entradas || []).map((e) => {
        const local = prevByOrden.get(Number(e.orden));
        if (
          local
          && local.estado_ingreso === "ingresada"
          && e.estado_ingreso === "pendiente"
        ) {
          return { ...e, estado_ingreso: "ingresada" };
        }
        return e;
      }),
    };
  });
}

export async function clearRecepcionSnapshotLocal(conciertoId) {
  const cid = Number(conciertoId);
  if (!Number.isFinite(cid) || cid <= 0) return;
  try {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE_SNAP, "readwrite");
      await idbReq(tx.objectStore(STORE_SNAP).delete(cid));
      await txDone(tx);
    } finally {
      db.close();
    }
  } catch {
    /* ignore */
  }
}

/**
 * Contraste del token contra el snapshot local del concierto.
 * @returns {{ ok: true, tipo, reservaId, codigoReserva, ordenes, pendientes, yaUsada?: boolean } | { ok: false, reason: string }}
 */
export function matchTokenEnSnapshot(snapshot, token) {
  const t = String(token || "").trim();
  if (!snapshot?.reservas?.length || !t) {
    return { ok: false, reason: "sin_snapshot" };
  }
  const reservas = snapshot.reservas;
  const manual10 = /^\d{10}$/.test(t) ? t : null;
  const upper = t.toUpperCase();
  const hash = entradaQrTokenHash(t);

  // Código manual 10 dígitos
  if (manual10) {
    const hits = reservas.filter((r) => codigoManual10(r.codigo_reserva) === manual10);
    if (!hits.length) return { ok: false, reason: "token_no_encontrado" };
    if (hits.length > 1) return { ok: false, reason: "codigo_ambiguo" };
    return matchReservaLocal(hits[0]);
  }

  // Código reserva texto completo (ej. ENTR-C000018-…)
  const byCodigo = reservas.find((r) => String(r.codigo_reserva || "").toUpperCase() === upper);
  if (byCodigo) return matchReservaLocal(byCodigo);

  // Plaza individual por hash
  for (const r of reservas) {
    for (const e of r.entradas || []) {
      if (e.qr_entrada_hash === hash) {
        if (String(r.estado) !== "activa" && e.estado_ingreso === "pendiente") {
          return { ok: false, reason: "reserva_no_activa", codigoReserva: r.codigo_reserva };
        }
        if (e.estado_ingreso !== "pendiente") {
          return {
            ok: true,
            yaUsada: true,
            tipo: "entrada",
            reservaId: r.id,
            codigoReserva: r.codigo_reserva,
            ordenes: [Number(e.orden)],
            entradaOrden: Number(e.orden),
          };
        }
        return {
          ok: true,
          yaUsada: false,
          tipo: "entrada",
          reservaId: r.id,
          codigoReserva: r.codigo_reserva,
          ordenes: [Number(e.orden)],
          entradaOrden: Number(e.orden),
        };
      }
    }
  }

  // QR grupal por hash
  const byGrupo = reservas.find((r) => r.qr_reserva_hash === hash);
  if (byGrupo) return matchReservaLocal(byGrupo);

  return { ok: false, reason: "token_no_encontrado" };
}

function matchReservaLocal(r) {
  if (String(r.estado) !== "activa") {
    return { ok: false, reason: "reserva_no_activa", codigoReserva: r.codigo_reserva };
  }
  const pendientes = (r.entradas || [])
    .filter((e) => e.estado_ingreso === "pendiente")
    .map((e) => Number(e.orden))
    .filter((n) => Number.isFinite(n));
  if (!pendientes.length) {
    return {
      ok: true,
      yaUsada: true,
      tipo: "reserva",
      reservaId: r.id,
      codigoReserva: r.codigo_reserva,
      ordenes: [],
    };
  }
  return {
    ok: true,
    yaUsada: false,
    tipo: "reserva",
    reservaId: r.id,
    codigoReserva: r.codigo_reserva,
    ordenes: pendientes,
  };
}

/** Marca plazas como ingresadas en el snapshot local (optimista). */
export async function markSnapshotOrdenesIngresadas(conciertoId, reservaId, ordenes) {
  const snap = await getRecepcionSnapshotLocal(conciertoId);
  if (!snap) return null;
  const ordSet = new Set((ordenes || []).map(Number));
  const reservas = (snap.reservas || []).map((r) => {
    if (Number(r.id) !== Number(reservaId)) return r;
    return {
      ...r,
      entradas: (r.entradas || []).map((e) =>
        ordSet.has(Number(e.orden)) ? { ...e, estado_ingreso: "ingresada" } : e,
      ),
    };
  });
  const row = { ...snap, reservas, savedAt: new Date().toISOString() };
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_SNAP, "readwrite");
    await idbReq(tx.objectStore(STORE_SNAP).put(row));
    await txDone(tx);
  } finally {
    db.close();
  }
  return row;
}

export function newRecepcionClientOpId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback UUID v4 (Postgres `p_client_op_id uuid` no acepta ids libres).
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * @param {{ clientOpId: string, conciertoId: number, token: string, ordenes?: number[], match: object }} item
 */
export async function enqueueRecepcionIngreso(item) {
  const row = {
    clientOpId: item.clientOpId,
    conciertoId: Number(item.conciertoId),
    token: String(item.token || "").trim(),
    ordenes: Array.isArray(item.ordenes) ? item.ordenes.map(Number) : [],
    match: item.match || null,
    status: "pending",
    createdAt: new Date().toISOString(),
    attempts: 0,
    lastError: null,
  };
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_QUEUE, "readwrite");
    await idbReq(tx.objectStore(STORE_QUEUE).put(row));
    await txDone(tx);
  } finally {
    db.close();
  }
  return row;
}

export async function listRecepcionIngresosPendientes(conciertoId = null) {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_QUEUE, "readonly");
    const store = tx.objectStore(STORE_QUEUE);
    const all = await idbReq(store.getAll());
    const rows = (all || []).filter((r) => r.status === "pending" || r.status === "syncing");
    if (conciertoId == null) return rows;
    const cid = Number(conciertoId);
    return rows.filter((r) => Number(r.conciertoId) === cid);
  } finally {
    db.close();
  }
}

export async function countRecepcionIngresosPendientes(conciertoId = null) {
  const rows = await listRecepcionIngresosPendientes(conciertoId);
  return rows.length;
}

export async function updateRecepcionIngresoQueueItem(clientOpId, patch) {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_QUEUE, "readwrite");
    const store = tx.objectStore(STORE_QUEUE);
    const cur = await idbReq(store.get(clientOpId));
    if (!cur) return null;
    const next = { ...cur, ...patch };
    await idbReq(store.put(next));
    await txDone(tx);
    return next;
  } finally {
    db.close();
  }
}

export async function removeRecepcionIngresoQueueItem(clientOpId) {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_QUEUE, "readwrite");
    await idbReq(tx.objectStore(STORE_QUEUE).delete(clientOpId));
    await txDone(tx);
  } finally {
    db.close();
  }
}

export function formatRecepcionActualizadoAt(isoOrDate) {
  if (!isoOrDate) return null;
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}
