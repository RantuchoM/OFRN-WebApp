/**
 * Jefe de fila = primer asiento del contenedor (atril 1, lado 0).
 * Sin columna persistente: se deriva de seating_contenedores_items.
 */

import {
  seatingItemMatrixPosition,
  seatingMatrixToOrder,
  sortSeatingItems,
} from "../services/giraService";

export const JEFE_ATRIL = 1;
export const JEFE_LADO = 0;

export function isJefeSeat(atril_num, lado) {
  return Number(atril_num) === JEFE_ATRIL && Number(lado) === JEFE_LADO;
}

/**
 * @param {Array<object>} items
 * @returns {object|null}
 */
export function getJefeItem(items = []) {
  const list = Array.isArray(items) ? items : [];
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    const pos = seatingItemMatrixPosition(item, i);
    if (isJefeSeat(pos.atril_num, pos.lado)) return item;
  }
  return null;
}

export function getJefeMusicianId(items = []) {
  const jefe = getJefeItem(items);
  return jefe?.id_musico != null ? Number(jefe.id_musico) : null;
}

export function isJefeDeFila(userId, containerItems = []) {
  if (userId == null) return false;
  const jefeId = getJefeMusicianId(containerItems);
  return jefeId != null && String(jefeId) === String(userId);
}

/**
 * Contenedores donde `userId` es 1a.
 * @param {string|number} userId
 * @param {Array<{id: any, items?: Array}>} containers
 * @returns {Array<string|number>}
 */
export function containersLedBy(userId, containers = []) {
  if (userId == null) return [];
  return (containers || [])
    .filter((c) => isJefeDeFila(userId, c?.items || c?.validItems || []))
    .map((c) => c.id)
    .filter((id) => id != null);
}

export function wouldChangeJefe(beforeItems = [], afterItems = []) {
  const before = getJefeMusicianId(beforeItems);
  const after = getJefeMusicianId(afterItems);
  return String(before ?? "") !== String(after ?? "");
}

/**
 * Predicción alineada al editor (shift_seating_line): quien cae en 1a
 * se vuelve jefe; si el jefe sale de 1a, el asiento queda vacío.
 */
export function predictJefeMusicianIdAfterEditorMove(
  items = [],
  itemId,
  targetAtril,
  targetLado,
) {
  const list = Array.isArray(items) ? items : [];
  const movingIdx = list.findIndex((it) => String(it.id) === String(itemId));
  if (movingIdx < 0) return getJefeMusicianId(list);
  const moving = list[movingIdx];
  const from = seatingItemMatrixPosition(moving, movingIdx);
  const current = getJefeMusicianId(list);

  if (isJefeSeat(targetAtril, targetLado)) {
    return moving?.id_musico != null ? Number(moving.id_musico) : null;
  }
  if (isJefeSeat(from.atril_num, from.lado)) {
    return null;
  }
  return current;
}

export function editorMoveWouldChangeJefe(
  items,
  itemId,
  targetAtril,
  targetLado,
) {
  const before = getJefeMusicianId(items);
  const after = predictJefeMusicianIdAfterEditorMove(
    items,
    itemId,
    targetAtril,
    targetLado,
  );
  return String(before ?? "") !== String(after ?? "");
}

/**
 * Simula un move dentro del mismo contenedor (swap si destino ocupado,
 * o reubicación si vacío) para predecir cambio de jefe.
 */
export function simulateIntraContainerMove(
  items = [],
  itemId,
  targetAtril,
  targetLado,
) {
  const list = (items || []).map((it, idx) => {
    const pos = seatingItemMatrixPosition(it, idx);
    return {
      ...it,
      atril_num: pos.atril_num,
      lado: pos.lado,
      orden: seatingMatrixToOrder(pos.atril_num, pos.lado),
    };
  });
  const moving = list.find((it) => String(it.id) === String(itemId));
  if (!moving) return list;

  const dest = list.find(
    (it) =>
      String(it.id) !== String(itemId) &&
      Number(it.atril_num) === Number(targetAtril) &&
      Number(it.lado) === Number(targetLado),
  );

  if (dest) {
    const fromAtril = moving.atril_num;
    const fromLado = moving.lado;
    moving.atril_num = Number(targetAtril);
    moving.lado = Number(targetLado);
    moving.orden = seatingMatrixToOrder(moving.atril_num, moving.lado);
    dest.atril_num = fromAtril;
    dest.lado = fromLado;
    dest.orden = seatingMatrixToOrder(dest.atril_num, dest.lado);
  } else {
    moving.atril_num = Number(targetAtril);
    moving.lado = Number(targetLado);
    moving.orden = seatingMatrixToOrder(moving.atril_num, moving.lado);
  }
  return list;
}

export function formatJefeDisplayName(item, rosterById = null) {
  if (!item) return "sin asignar";
  const fromItem =
    item.integrantes?.apellido_nombre ||
    item.integrantes?.nombre_completo ||
    [
      item.integrantes?.apellido || item.apellido,
      item.integrantes?.nombre || item.nombre,
    ]
      .filter(Boolean)
      .join(", ");
  if (fromItem) return fromItem;
  const mid = item.id_musico;
  if (rosterById && mid != null) {
    const m = rosterById.get(String(mid)) || rosterById[String(mid)];
    if (m) {
      return (
        m.apellido_nombre ||
        m.nombre_completo ||
        [m.apellido, m.nombre].filter(Boolean).join(", ") ||
        `ID ${mid}`
      );
    }
  }
  return mid != null ? `ID ${mid}` : "sin asignar";
}

/**
 * ¿Puede este actor editar (como jefe) al músico target en alguno de los contenedores?
 */
export function canJefeEditMusician(actorId, targetMusicianId, containers = []) {
  if (actorId == null || targetMusicianId == null) return false;
  return (containers || []).some((c) => {
    const items = c?.items || c?.validItems || [];
    if (!isJefeDeFila(actorId, items)) return false;
    return items.some(
      (it) => String(it.id_musico) === String(targetMusicianId),
    );
  });
}

/**
 * Swap adyacente en el orden visual, sin tocar el asiento 1a.
 * Si `allItems` tiene más filas (p. ej. contenedor completo vs filtro de bloque),
 * el payload incluye a todos: solo cambian los dos intercambiados.
 * @param {Array<object>} items lista visible (orden UI)
 * @param {number} index índice en `sortSeatingItems(items)`
 * @param {'up'|'down'} direction
 * @param {Array<object>|null} [allItems] universo completo del contenedor (RPC)
 * @returns {Array<{id:number, atril_num:number, lado:number}>|null}
 */
export function buildPlacementsAfterAdjacentSwap(
  items = [],
  index,
  direction,
  allItems = null,
) {
  const sorted = sortSeatingItems(items || []);
  if (!sorted.length) return null;
  const from = Number(index);
  if (!Number.isFinite(from) || from < 0 || from >= sorted.length) return null;
  const to = direction === "up" ? from - 1 : from + 1;
  if (to < 0 || to >= sorted.length) return null;

  const withPos = sorted.map((it, idx) => {
    const pos = seatingItemMatrixPosition(it, idx);
    return {
      ...it,
      atril_num: Number(pos.atril_num),
      lado: Number(pos.lado),
    };
  });

  const a = withPos[from];
  const b = withPos[to];
  if (isJefeSeat(a.atril_num, a.lado) || isJefeSeat(b.atril_num, b.lado)) {
    return null;
  }

  const tmpAtril = a.atril_num;
  const tmpLado = a.lado;
  a.atril_num = b.atril_num;
  a.lado = b.lado;
  b.atril_num = tmpAtril;
  b.lado = tmpLado;

  const swappedById = new Map(
    withPos.map((it) => [
      String(it.id),
      {
        id: Number(it.id),
        atril_num: Number(it.atril_num),
        lado: Number(it.lado),
      },
    ]),
  );

  // Sin universo completo: solo el set visible (p. ej. canJefeMoveItem).
  if (!Array.isArray(allItems) || allItems.length === 0) {
    return withPos.map((it) => swappedById.get(String(it.id)));
  }

  // Payload RPC: todos los ítems del contenedor; solo cambian los del swap.
  return sortSeatingItems(allItems).map((it, idx) => {
    const hit = swappedById.get(String(it.id));
    if (hit) return hit;
    const pos = seatingItemMatrixPosition(it, idx);
    return {
      id: Number(it.id),
      atril_num: Number(pos.atril_num),
      lado: Number(pos.lado),
    };
  });
}

export function canJefeMoveItem(items, index, direction) {
  return buildPlacementsAfterAdjacentSwap(items, index, direction) != null;
}
