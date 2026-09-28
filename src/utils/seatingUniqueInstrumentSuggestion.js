/**
 * Identidad de instrumento en Seating: id de catálogo
 * (`integrantes.id_instr` / `obras_particellas.id_instrumento`).
 * Oboe y Corno Inglés son filas distintas; no se colapsa por familia.
 * Se compara como texto para que 7 y "7" coincidan, igual que el fondo de celda.
 */
export function seatingInstrumentIdentity(id) {
  if (id == null || id === "") return null;
  return String(id);
}

export function isSameSeatingInstrument(a, b) {
  const left = seatingInstrumentIdentity(a);
  const right = seatingInstrumentIdentity(b);
  return left != null && right != null && left === right;
}

/** Cuántos músicos del roster visible tocan cada id de instrumento. */
export function countMusiciansByInstrument(musicians) {
  const counts = new Map();
  for (const musician of musicians || []) {
    const identity = seatingInstrumentIdentity(musician?.id_instr);
    if (!identity) continue;
    counts.set(identity, (counts.get(identity) || 0) + 1);
  }
  return counts;
}

/**
 * Sugerencia 1:1 de vinculación.
 * Aplica solo si hay exactamente un músico de ese instrumento en el roster
 * visible y exactamente una particella asignable de ese instrumento en la obra,
 * y esa particella todavía no está asignada.
 * Oboe 1 + Oboe 2 (dos partes) o dos oboístas no entran.
 * Devuelve el id de la particella, o null.
 */
export function uniqueUnassignedInstrumentPartId({
  musician,
  playerCountByInstrument,
  parts,
  assignedPartIds,
}) {
  const identity = seatingInstrumentIdentity(musician?.id_instr);
  if (!identity) return null;
  if (playerCountByInstrument?.get(identity) !== 1) return null;

  const instrumentParts = (parts || []).filter((part) =>
    isSameSeatingInstrument(part?.id_instrumento, identity),
  );
  if (instrumentParts.length !== 1) return null;

  const part = instrumentParts[0];
  if (part?.id == null) return null;
  if (assignedPartIds?.has(String(part.id))) return null;
  return part.id;
}
