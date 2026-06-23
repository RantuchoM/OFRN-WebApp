import { localidadesToSearchableOptions, normalizeLocalidadKey } from "./localidadesSearchable";

/** @param {object[]|null|undefined} rows Respuesta de scrn_paradas_entre */
export function parseParadasEntre(rows) {
  const byCamino = new Map();
  for (const row of rows || []) {
    const id = row.id_camino;
    if (!byCamino.has(id)) byCamino.set(id, []);
    byCamino.get(id).push(row);
  }
  for (const stops of byCamino.values()) {
    stops.sort((a, b) => a.orden_en_camino - b.orden_en_camino);
  }
  return byCamino;
}

function findStopIndex(stops, nombre) {
  const k = normalizeLocalidadKey(nombre);
  return stops.findIndex((s) => normalizeLocalidadKey(s.localidad) === k);
}

/** @param {Map<number, object[]>} caminoPorId */
export function esParadaParValida(caminoPorId, subida, bajada) {
  if (!caminoPorId?.size) return true;
  const su = String(subida || "").trim();
  const bj = String(bajada || "").trim();
  if (!su || !bj) return false;
  if (normalizeLocalidadKey(su) === normalizeLocalidadKey(bj)) return false;
  for (const stops of caminoPorId.values()) {
    const iSu = findStopIndex(stops, su);
    const iBj = findStopIndex(stops, bj);
    if (iSu >= 0 && iBj >= 0 && iSu < iBj) return true;
  }
  return false;
}

/** @param {Map<number, object[]>} caminoPorId */
function nombresSubidaValidos(caminoPorId, bajadaSeleccionada) {
  const nombres = new Set();
  const bj = String(bajadaSeleccionada || "").trim();
  for (const stops of caminoPorId.values()) {
    if (!bj) {
      for (const s of stops) nombres.add(s.localidad);
      continue;
    }
    const iBj = findStopIndex(stops, bj);
    if (iBj <= 0) continue;
    for (let i = 0; i < iBj; i += 1) nombres.add(stops[i].localidad);
  }
  return nombres;
}

/** @param {Map<number, object[]>} caminoPorId */
function nombresBajadaValidos(caminoPorId, subidaSeleccionada) {
  const nombres = new Set();
  const su = String(subidaSeleccionada || "").trim();
  for (const stops of caminoPorId.values()) {
    if (!su) {
      for (const s of stops) nombres.add(s.localidad);
      continue;
    }
    const iSu = findStopIndex(stops, su);
    if (iSu < 0) continue;
    for (let i = iSu + 1; i < stops.length; i += 1) nombres.add(stops[i].localidad);
  }
  return nombres;
}

function filterOptionsByNames(allOptions, allowedNames) {
  const allowed = allowedNames instanceof Set ? allowedNames : new Set(allowedNames);
  if (!allowed.size) return allOptions;
  return allOptions.filter((o) => allowed.has(o.label));
}

/**
 * @param {object[]} localidades
 * @param {Map<number, object[]>|null} caminoPorId
 * @param {{ subida?: string, bajada?: string, role: 'subida'|'bajada' }} ctx
 */
export function buildParadasLocOptions(localidades, caminoPorId, { subida, bajada, role }) {
  const allOptions = localidadesToSearchableOptions(localidades);
  if (!caminoPorId?.size) return allOptions;

  if (role === "subida") {
    return filterOptionsByNames(allOptions, nombresSubidaValidos(caminoPorId, bajada));
  }
  return filterOptionsByNames(allOptions, nombresBajadaValidos(caminoPorId, subida));
}

export const MSG_PARADA_PAR_INVALIDA =
  "La localidad de subida debe estar antes que la de bajada en el recorrido del viaje.";
