/**
 * Unicidad de alojamiento en Rooming:
 * misma gira + mismo tramo + mismo hotel → cada persona a lo sumo una vez.
 * En otro tramo de la misma gira puede volver a alojarse en el mismo hotel.
 */

export function normalizeIntegranteId(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function sameIntegranteId(a, b) {
  const na = normalizeIntegranteId(a);
  const nb = normalizeIntegranteId(b);
  return na != null && nb != null && na === nb;
}

/** Deduplica IDs dentro de un array (preserva orden, normaliza a number). */
export function uniqueIntegranteIds(ids) {
  const seen = new Set();
  const out = [];
  for (const id of ids || []) {
    const n = normalizeIntegranteId(id);
    if (n == null || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

/**
 * Filtra IDs ya vistos (p.ej. al importar habitaciones de un hotel).
 * Mutates `seenSet` con los IDs aceptados.
 */
export function takeUniqueIntegranteIds(ids, seenSet) {
  const out = [];
  for (const id of ids || []) {
    const n = normalizeIntegranteId(id);
    if (n == null || seenSet.has(n)) continue;
    seenSet.add(n);
    out.push(n);
  }
  return out;
}

export function occupantId(occupant) {
  return normalizeIntegranteId(occupant?.id);
}

export function roomHasOccupant(room, personId) {
  const nid = normalizeIntegranteId(personId);
  if (nid == null) return false;
  return (room?.occupants || []).some((o) => sameIntegranteId(o.id, nid));
}

/**
 * Quita a una persona de todas las habitaciones cuyo id_hospedaje esté en
 * `bookingIds` (si se omite, de todas).
 * @returns {{ rooms: any[], changedRoomIds: number[] }}
 */
export function removePersonFromScopedRooms(rooms, personId, bookingIds = null) {
  const nid = normalizeIntegranteId(personId);
  if (nid == null) return { rooms, changedRoomIds: [] };
  const scope =
    bookingIds == null ? null : new Set([...bookingIds].map((id) => Number(id)));
  const changedRoomIds = [];
  const next = (rooms || []).map((room) => {
    if (scope && !scope.has(Number(room.id_hospedaje))) return room;
    const before = room.occupants || [];
    const after = before.filter((o) => !sameIntegranteId(o.id, nid));
    if (after.length === before.length) return room;
    changedRoomIds.push(room.id);
    return { ...room, occupants: after };
  });
  return { rooms: next, changedRoomIds };
}

function assignmentsFromOccupants(occupants) {
  return (occupants || []).map((m) => ({
    id: normalizeIntegranteId(m.id) ?? m.id,
    ocupa_cama: m.ocupa_cama !== false,
  }));
}

/**
 * Dentro de cada hotel (id_hospedaje), cada persona queda en una sola habitación.
 * También elimina IDs repetidos dentro de la misma habitación.
 * Preferencia: primera aparición en el orden del array `rooms` (ordenar por
 * `orden` desc antes de llamar para conservar la habitación más nueva).
 *
 * @returns {{ rooms: any[], changedRoomIds: number[] }}
 */
export function enforceUniquePersonPerHotel(rooms) {
  const seenByBooking = new Map();
  const changedRoomIds = [];

  const next = (rooms || []).map((room) => {
    const bookingId = Number(room.id_hospedaje);
    if (!seenByBooking.has(bookingId)) seenByBooking.set(bookingId, new Set());
    const seen = seenByBooking.get(bookingId);

    const hasHydratedOccupants = Array.isArray(room.occupants);
    let roomChanged = false;

    if (hasHydratedOccupants) {
      const occupants = [];
      const seenInRoom = new Set();
      for (const occ of room.occupants) {
        const nid = occupantId(occ);
        if (nid == null) {
          roomChanged = true;
          continue;
        }
        if (seenInRoom.has(nid) || seen.has(nid)) {
          roomChanged = true;
          continue;
        }
        seenInRoom.add(nid);
        seen.add(nid);
        if (occ.id !== nid) {
          roomChanged = true;
          occupants.push({ ...occ, id: nid });
        } else {
          occupants.push(occ);
        }
      }

      const nextIds = occupants.map((o) => o.id);
      const prevIds = Array.isArray(room.id_integrantes_asignados)
        ? room.id_integrantes_asignados
        : [];
      if (
        nextIds.length !== prevIds.length ||
        nextIds.some((id, i) => Number(id) !== Number(prevIds[i]))
      ) {
        roomChanged = true;
      }

      if (!roomChanged) return room;
      changedRoomIds.push(room.id);
      return {
        ...room,
        occupants,
        id_integrantes_asignados: nextIds,
        asignaciones_config: assignmentsFromOccupants(occupants),
      };
    }

    // Sin occupants hidratados: dedupe del array crudo contra el set del hotel.
    const rawIds = Array.isArray(room.id_integrantes_asignados)
      ? room.id_integrantes_asignados
      : [];
    const filtered = [];
    const seenInRoom = new Set();
    for (const id of rawIds) {
      const nid = normalizeIntegranteId(id);
      if (nid == null || seenInRoom.has(nid) || seen.has(nid)) {
        roomChanged = true;
        continue;
      }
      seenInRoom.add(nid);
      seen.add(nid);
      filtered.push(nid);
    }
    if (
      !roomChanged &&
      filtered.length === rawIds.length &&
      filtered.every((id, i) => Number(id) === Number(rawIds[i]))
    ) {
      return room;
    }
    changedRoomIds.push(room.id);
    const asignacionesRaw = Array.isArray(room.asignaciones_config)
      ? room.asignaciones_config
      : [];
    const idSet = new Set(filtered);
    const asignaciones_config = [];
    const cfgSeen = new Set();
    for (const cfg of asignacionesRaw) {
      const nid = normalizeIntegranteId(cfg?.id);
      if (nid == null || !idSet.has(nid) || cfgSeen.has(nid)) continue;
      cfgSeen.add(nid);
      asignaciones_config.push({
        ...cfg,
        id: nid,
        ocupa_cama: cfg.ocupa_cama !== false,
      });
    }
    for (const id of filtered) {
      if (!cfgSeen.has(id)) {
        asignaciones_config.push({ id, ocupa_cama: true });
        cfgSeen.add(id);
      }
    }
    return {
      ...room,
      id_integrantes_asignados: filtered,
      asignaciones_config,
    };
  });

  return { rooms: next, changedRoomIds };
}

/**
 * Prepara asignaciones al importar habitaciones de un hotel:
 * una persona no puede repetirse entre habitaciones del mismo hotel.
 */
export function sanitizeImportedRoomAssignments(srcRooms) {
  const seen = new Set();
  return (srcRooms || []).map((r) => {
    const rawIds = Array.isArray(r.id_integrantes_asignados)
      ? r.id_integrantes_asignados
      : [];
    const ids = takeUniqueIntegranteIds(rawIds, seen);
    const idSet = new Set(ids);
    const asignacionesRaw = Array.isArray(r.asignaciones_config)
      ? r.asignaciones_config
      : [];
    const asignaciones_config = [];
    const cfgSeen = new Set();
    for (const cfg of asignacionesRaw) {
      const nid = normalizeIntegranteId(cfg?.id);
      if (nid == null || !idSet.has(nid) || cfgSeen.has(nid)) continue;
      cfgSeen.add(nid);
      asignaciones_config.push({
        ...cfg,
        id: nid,
        ocupa_cama: cfg.ocupa_cama !== false,
      });
    }
    for (const id of ids) {
      if (!cfgSeen.has(id)) {
        asignaciones_config.push({ id, ocupa_cama: true });
        cfgSeen.add(id);
      }
    }
    return {
      ...r,
      id_integrantes_asignados: ids,
      asignaciones_config,
    };
  });
}
