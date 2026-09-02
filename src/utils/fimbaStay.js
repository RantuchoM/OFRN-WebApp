/**
 * Estadía FIMBA: fechas del artista (propuesta) + override opcional por persona.
 *
 * Fuente de verdad: `id_evento_checkin` / `id_evento_checkout` (tipos 22/23),
 * igual que OFRN en `giras_logistica_reglas`. `checkin_at` / `checkout_at` son
 * espejo denormalizado de `eventos.fecha`.
 *
 * Vacío en el participante = hereda check-in/out del artista.
 * Early/Late siguen siendo flags del artista (no se modelan por persona).
 */

/** Paridad OFRN LogisticsManager: Check-in / Check-Out. */
export const FIMBA_TIPO_EVENTO_CHECKIN = 22;
export const FIMBA_TIPO_EVENTO_CHECKOUT = 23;
export const FIMBA_HORA_CHECKIN = "14:00";
export const FIMBA_HORA_CHECKOUT = "10:00";

function parseIso(iso) {
  const s = String(iso || "").slice(0, 10);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]), iso: s };
}

/** YYYY-MM-DD o null. Años fuera de 2000–2100 se tratan como inválidos (no persistir). */
export function isoDateOrNull(value) {
  const p = parseIso(value);
  if (!p) return null;
  if (p.y < 2000 || p.y > 2100) return null;
  return p.iso;
}

/** Vacío (hereda artista) o ISO completa con año razonable. */
export function isCommitableStayDate(value) {
  const s = String(value || "").trim();
  if (!s) return true;
  return Boolean(isoDateOrNull(s));
}

/** Misma regla que `nightsBetween` en fimbaService. */
export function nightsBetweenStay(checkin, checkout) {
  const a = parseIso(checkin);
  const b = parseIso(checkout);
  if (!a || !b) return null;
  const da = new Date(a.y, a.mo - 1, a.d);
  const db = new Date(b.y, b.mo - 1, b.d);
  const diff = Math.round((db - da) / 86400000);
  return Math.max(0, diff);
}

/** Fecha efectiva desde evento vinculado o columna espejo. */
export function stayDateFromEventOrMirror(row, kind) {
  if (!row) return null;
  const embed =
    kind === "checkout"
      ? row.evento_checkout || row.eventos_checkout
      : row.evento_checkin || row.eventos_checkin;
  const fromEvent = isoDateOrNull(embed?.fecha);
  if (fromEvent) return fromEvent;
  return isoDateOrNull(kind === "checkout" ? row.checkout_at : row.checkin_at);
}

function propuestaFrom(propuestaOrRow) {
  if (!propuestaOrRow) return {};
  if (propuestaOrRow.propuesta && typeof propuestaOrRow.propuesta === "object") {
    const base = propuestaOrRow.propuesta;
    return {
      ...base,
      checkin_at:
        stayDateFromEventOrMirror(propuestaOrRow, "checkin") ??
        stayDateFromEventOrMirror(base, "checkin"),
      checkout_at:
        stayDateFromEventOrMirror(propuestaOrRow, "checkout") ??
        stayDateFromEventOrMirror(base, "checkout"),
      id_evento_checkin:
        propuestaOrRow.id_evento_checkin ?? base.id_evento_checkin ?? null,
      id_evento_checkout:
        propuestaOrRow.id_evento_checkout ?? base.id_evento_checkout ?? null,
      evento_checkin: propuestaOrRow.evento_checkin ?? base.evento_checkin,
      evento_checkout: propuestaOrRow.evento_checkout ?? base.evento_checkout,
      checkin_early:
        propuestaOrRow.checkin_early ?? base.checkin_early,
      checkout_late:
        propuestaOrRow.checkout_late ?? base.checkout_late,
    };
  }
  return {
    ...propuestaOrRow,
    checkin_at: stayDateFromEventOrMirror(propuestaOrRow, "checkin"),
    checkout_at: stayDateFromEventOrMirror(propuestaOrRow, "checkout"),
  };
}

/**
 * Fechas efectivas de un participante (override o rango del artista).
 * @returns {{
 *   checkin_at: string|null,
 *   checkout_at: string|null,
 *   id_evento_checkin: number|null,
 *   id_evento_checkout: number|null,
 *   checkin_early: boolean,
 *   checkout_late: boolean,
 *   inherited_checkin: boolean,
 *   inherited_checkout: boolean,
 *   noches: number|null,
 * }}
 */
export function resolveParticipanteStay(participante, propuestaOrRow) {
  const prop = propuestaFrom(propuestaOrRow);
  const ownIn = stayDateFromEventOrMirror(participante, "checkin");
  const ownOut = stayDateFromEventOrMirror(participante, "checkout");
  const ownInEvent =
    participante?.id_evento_checkin != null && participante?.id_evento_checkin !== ""
      ? Number(participante.id_evento_checkin)
      : null;
  const ownOutEvent =
    participante?.id_evento_checkout != null &&
    participante?.id_evento_checkout !== ""
      ? Number(participante.id_evento_checkout)
      : null;
  const checkin = ownIn || isoDateOrNull(prop.checkin_at);
  const checkout = ownOut || isoDateOrNull(prop.checkout_at);
  return {
    checkin_at: checkin,
    checkout_at: checkout,
    id_evento_checkin:
      ownInEvent ||
      (prop.id_evento_checkin != null ? Number(prop.id_evento_checkin) : null),
    id_evento_checkout:
      ownOutEvent ||
      (prop.id_evento_checkout != null ? Number(prop.id_evento_checkout) : null),
    checkin_early: prop.checkin_early === true || prop.checkin_early === "true",
    checkout_late: prop.checkout_late === true || prop.checkout_late === "true",
    inherited_checkin: !ownIn && !ownInEvent,
    inherited_checkout: !ownOut && !ownOutEvent,
    noches: nightsBetweenStay(checkin, checkout),
  };
}

/**
 * Cupos + noches de un artista. `noches` = rango del grupo;
 * `pax_noches` suma estadías individuales (unnamed usan el rango del artista).
 */
export function computeStayOccupancy(propuesta, participantes) {
  const pax = Math.max(0, Number(propuesta?.cantidad_planificada) || 0);
  const nominados = (participantes || []).filter((p) => p.activo !== false);
  const nominadosCount = nominados.length;
  const porConfirmar = Math.max(0, pax - nominadosCount);
  const envelopeIn = stayDateFromEventOrMirror(propuesta, "checkin");
  const envelopeOut = stayDateFromEventOrMirror(propuesta, "checkout");
  const envelopeNoches = nightsBetweenStay(envelopeIn, envelopeOut);

  let paxNoches = 0;
  let stayStaggered = false;
  for (const p of nominados) {
    const stay = resolveParticipanteStay(p, propuesta);
    if (stay.noches != null) paxNoches += stay.noches;
    if (!stay.inherited_checkin || !stay.inherited_checkout) stayStaggered = true;
  }
  if (porConfirmar > 0 && envelopeNoches != null) {
    paxNoches += porConfirmar * envelopeNoches;
  }

  return {
    pax_planificada: pax,
    nominados: nominadosCount,
    por_confirmar: porConfirmar,
    noches: envelopeNoches,
    pax_noches: paxNoches,
    stay_staggered: stayStaggered,
  };
}
