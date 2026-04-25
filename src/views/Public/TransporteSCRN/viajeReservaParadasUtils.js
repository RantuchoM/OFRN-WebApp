const PARADAS_KEYS = [
  "tramo",
  "localidad_subida",
  "localidad_bajada",
  "obs_subida",
  "obs_bajada",
];

export function normEstado(v) {
  return String(v == null || v === "" ? "pendiente" : v).trim();
}

/**
 * @param {string} key  Incluye "estado" además de paradas
 */
export function getFilaVal(r, edits, key) {
  if (edits[r.id] && Object.prototype.hasOwnProperty.call(edits[r.id], key)) {
    return edits[r.id][key];
  }
  if (key === "estado") {
    return r.estado == null || r.estado === "" ? "pendiente" : r.estado;
  }
  const v = r[key];
  if (v == null) return "";
  return v;
}

/** @deprecated use getFilaVal */
export function getParadasVal(r, edits, key) {
  return getFilaVal(r, edits, key);
}

export function isParadasDirty(r, edits) {
  const e = edits[r.id];
  if (!e) return false;
  const merged = { ...r, ...e };
  return PARADAS_KEYS.some((k) => {
    const a = String(r[k] ?? "").trim();
    const b = String(merged[k] ?? "").trim();
    return a !== b;
  });
}

export function isFilaDirty(r, edits) {
  if (isParadasDirty(r, edits)) return true;
  const e = edits[r.id];
  if (!e) return false;
  if (Object.prototype.hasOwnProperty.call(e, "estado")) {
    return normEstado(r.estado) !== normEstado(e.estado);
  }
  return false;
}

/** Columnas de parada propias del pasajero (NULL en BD = heredar del titular de la reserva). */
export const PAX_PARADAS_KEYS = [
  "tramo",
  "localidad_subida",
  "localidad_bajada",
  "obs_subida",
  "obs_bajada",
];

export function normParadaStr(v) {
  return String(v == null ? "" : v).trim();
}

/** Valor persistido “efectivo” solo desde filas BD (sin borradores de UI). */
export function savedPaxParadasVal(p, reserva, key) {
  const pv = p?.[key];
  if (pv != null && normParadaStr(pv) !== "") return pv;
  return getFilaVal(reserva, {}, key);
}

/**
 * Valor en UI: borrador pax > columna pax > titular (con borrador de fila reserva si aplica).
 */
export function getPaxParadasVal(p, reserva, reservaEdits, paxEdits, key) {
  if (paxEdits?.[p.id]?.[key] !== undefined) {
    return paxEdits[p.id][key];
  }
  const pv = p?.[key];
  if (pv != null && normParadaStr(pv) !== "") {
    return pv;
  }
  return getFilaVal(reserva, reservaEdits || {}, key);
}

export function hasPaxParadasDraftChanges(p, reserva, reservaEdits, paxEdits) {
  const e = paxEdits?.[p.id];
  if (!e) return false;
  return PAX_PARADAS_KEYS.some((k) => {
    if (!Object.prototype.hasOwnProperty.call(e, k)) return false;
    return normParadaStr(e[k]) !== normParadaStr(savedPaxParadasVal(p, reserva, k));
  });
}
