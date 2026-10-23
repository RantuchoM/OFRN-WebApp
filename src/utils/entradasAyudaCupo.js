/**
 * Selección de consultas de ayuda que entran en el cupo de un concierto,
 * y colapso de consultas duplicadas (mismo email).
 */

export function cantidadEntradasAyudaConsulta(row) {
  const n = Number(row?.cantidad);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(4, Math.round(n));
}

export function normalizeAyudaEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function sortAyudaPorLlegada(rows) {
  return [...(Array.isArray(rows) ? rows : [])].sort((a, b) => {
    const ta = new Date(a?.created_at || 0).getTime();
    const tb = new Date(b?.created_at || 0).getTime();
    return ta - tb;
  });
}

/**
 * Agrupa pendientes por email normalizado.
 * @param {object[]} rows
 * @returns {Map<string, object[]>}
 */
export function groupAyudaConsultasByEmail(rows) {
  const map = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const key = normalizeAyudaEmail(row?.email) || `__id:${row?.id}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  for (const [key, list] of map) {
    map.set(key, sortAyudaPorLlegada(list));
  }
  return map;
}

/**
 * Grupos con 2+ consultas del mismo mail.
 * @param {object[]} rows
 * @returns {object[][]}
 */
export function findAyudaDuplicateGroups(rows) {
  const out = [];
  for (const [, list] of groupAyudaConsultasByEmail(rows)) {
    if (list.length >= 2) out.push(list);
  }
  return out;
}

/**
 * id → tamaño del grupo si está duplicado (≥2).
 * @param {object[]} rows
 * @returns {Map<string, number>}
 */
export function indexAyudaDuplicateGroupSize(rows) {
  const map = new Map();
  for (const group of findAyudaDuplicateGroups(rows)) {
    for (const row of group) {
      map.set(String(row.id), group.length);
    }
  }
  return map;
}

/**
 * Una fila por email: la más antigua se mantiene; cantidad = máx del grupo;
 * las demás van en `_descartarDuplicados` para descartar al emitir.
 * @param {object[]} rows
 * @returns {{ keepers: object[], discardedCount: number, groupsWithDupes: number, duplicateGroups: object[][] }}
 */
export function collapseAyudaConsultasDuplicadas(rows) {
  const duplicateGroups = findAyudaDuplicateGroups(rows);
  const keepers = [];
  let discardedCount = 0;
  let groupsWithDupes = 0;

  for (const [, group] of groupAyudaConsultasByEmail(rows)) {
    const sorted = sortAyudaPorLlegada(group);
    const keeperBase = sorted[0];
    const rest = sorted.slice(1);
    if (rest.length) {
      groupsWithDupes += 1;
      discardedCount += rest.length;
    }

    let maxCant = cantidadEntradasAyudaConsulta(keeperBase);
    let telefono = keeperBase.telefono;
    let conciertoId = keeperBase.concierto_id;
    let funcionLabel = keeperBase.funcion_label;
    const comentarios = [];
    const c0 = String(keeperBase.comentarios || "").trim();
    if (c0) comentarios.push(c0);

    for (const dup of rest) {
      maxCant = Math.max(maxCant, cantidadEntradasAyudaConsulta(dup));
      if (!telefono && dup.telefono) telefono = dup.telefono;
      if (conciertoId == null && dup.concierto_id != null) conciertoId = dup.concierto_id;
      if (!funcionLabel && dup.funcion_label) funcionLabel = dup.funcion_label;
      const c = String(dup.comentarios || "").trim();
      if (c && !comentarios.includes(c)) comentarios.push(c);
    }

    keepers.push({
      ...keeperBase,
      cantidad: maxCant,
      telefono: telefono || keeperBase.telefono,
      concierto_id: conciertoId,
      funcion_label: funcionLabel || keeperBase.funcion_label,
      comentarios: comentarios.length ? comentarios.join(" | ") : keeperBase.comentarios,
      _descartarDuplicados: rest.map((r) => r.id),
      _duplicadosCount: rest.length,
    });
  }

  return {
    keepers: sortAyudaPorLlegada(keepers),
    discardedCount,
    groupsWithDupes,
    duplicateGroups,
  };
}

/**
 * Toma consultas en orden de llegada mientras entren en `disponibles`.
 * @param {object[]} rows
 * @param {number} disponibles
 * @returns {{ picked: object[], skipped: object[], restantes: number, ticketsPicked: number }}
 */
export function pickAyudaConsultasQueEntranEnCupo(rows, disponibles) {
  let left = Math.max(0, Number(disponibles) || 0);
  const picked = [];
  const skipped = [];
  const sorted = [...(Array.isArray(rows) ? rows : [])].sort((a, b) => {
    const ta = new Date(a?.created_at || 0).getTime();
    const tb = new Date(b?.created_at || 0).getTime();
    return ta - tb;
  });
  for (const row of sorted) {
    const cant = cantidadEntradasAyudaConsulta(row);
    if (cant <= left) {
      picked.push(row);
      left -= cant;
    } else {
      skipped.push(row);
    }
  }
  const ticketsPicked = picked.reduce((s, r) => s + cantidadEntradasAyudaConsulta(r), 0);
  return { picked, skipped, restantes: left, ticketsPicked };
}

/**
 * Elige el concierto abierto que más consultas puede absorber (prioriza el más pedido en la cola).
 * @param {object[]} rows
 * @param {object[]} conciertosSelect
 * @param {(c: object) => number} getDisponibles
 * @returns {{ concierto: object, picked: object[], skipped: object[], disponibles: number, ticketsPicked: number } | null}
 */
export function elegirConciertoYConsultasParaCupo(rows, conciertosSelect, getDisponibles) {
  const raw = Array.isArray(rows) ? rows : [];
  const { keepers, discardedCount, groupsWithDupes } = collapseAyudaConsultasDuplicadas(raw);
  const list = keepers;
  const conciertos = Array.isArray(conciertosSelect) ? conciertosSelect : [];
  if (!list.length || !conciertos.length) return null;

  const countByCid = new Map();
  for (const row of list) {
    if (row?.concierto_id == null) continue;
    const key = String(row.concierto_id);
    countByCid.set(key, (countByCid.get(key) || 0) + 1);
  }
  let preferredCid = null;
  let preferredN = 0;
  for (const [key, n] of countByCid) {
    if (n > preferredN) {
      preferredCid = key;
      preferredN = n;
    }
  }

  let best = null;
  for (const concierto of conciertos) {
    const disponibles = Math.max(0, Number(getDisponibles?.(concierto)) || 0);
    const { picked, skipped, ticketsPicked } = pickAyudaConsultasQueEntranEnCupo(list, disponibles);
    if (!picked.length) continue;
    const isPreferred = preferredCid != null && String(concierto.id) === preferredCid;
    const score = ticketsPicked * 1000 + picked.length * 10 + (isPreferred ? 5 : 0);
    if (!best || score > best.score) {
      best = {
        concierto,
        picked,
        skipped,
        disponibles,
        ticketsPicked,
        score,
        discardedDuplicates: discardedCount,
        groupsWithDupes,
        rawTotal: raw.length,
      };
    }
  }
  if (!best) return null;
  const { score: _score, ...rest } = best;
  return rest;
}
