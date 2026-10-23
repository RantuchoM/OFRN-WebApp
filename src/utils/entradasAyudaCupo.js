/**
 * Selección de consultas de ayuda que entran en el cupo de un concierto.
 */

export function cantidadEntradasAyudaConsulta(row) {
  const n = Number(row?.cantidad);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(4, Math.round(n));
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
  const list = Array.isArray(rows) ? rows : [];
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
      best = { concierto, picked, skipped, disponibles, ticketsPicked, score };
    }
  }
  if (!best) return null;
  const { score: _score, ...rest } = best;
  return rest;
}
