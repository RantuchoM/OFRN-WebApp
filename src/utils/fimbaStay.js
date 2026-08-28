/**
 * Estadía FIMBA: fechas del artista (propuesta) + override opcional por persona.
 *
 * Vacío en el participante = hereda check-in/out del artista.
 * Early/Late siguen siendo flags del artista (no se modelan por persona).
 */

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

function propuestaFrom(propuestaOrRow) {
  if (!propuestaOrRow) return {};
  if (propuestaOrRow.propuesta && typeof propuestaOrRow.propuesta === "object") {
    return {
      ...propuestaOrRow.propuesta,
      checkin_at: propuestaOrRow.checkin_at ?? propuestaOrRow.propuesta.checkin_at,
      checkout_at:
        propuestaOrRow.checkout_at ?? propuestaOrRow.propuesta.checkout_at,
      checkin_early:
        propuestaOrRow.checkin_early ?? propuestaOrRow.propuesta.checkin_early,
      checkout_late:
        propuestaOrRow.checkout_late ?? propuestaOrRow.propuesta.checkout_late,
    };
  }
  return propuestaOrRow;
}

/**
 * Fechas efectivas de un participante (override o rango del artista).
 * @returns {{
 *   checkin_at: string|null,
 *   checkout_at: string|null,
 *   checkin_early: boolean,
 *   checkout_late: boolean,
 *   inherited_checkin: boolean,
 *   inherited_checkout: boolean,
 *   noches: number|null,
 * }}
 */
export function resolveParticipanteStay(participante, propuestaOrRow) {
  const prop = propuestaFrom(propuestaOrRow);
  const ownIn = isoDateOrNull(participante?.checkin_at);
  const ownOut = isoDateOrNull(participante?.checkout_at);
  const checkin = ownIn || isoDateOrNull(prop.checkin_at);
  const checkout = ownOut || isoDateOrNull(prop.checkout_at);
  return {
    checkin_at: checkin,
    checkout_at: checkout,
    checkin_early: prop.checkin_early === true || prop.checkin_early === "true",
    checkout_late: prop.checkout_late === true || prop.checkout_late === "true",
    inherited_checkin: !ownIn,
    inherited_checkout: !ownOut,
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
  const envelopeNoches = nightsBetweenStay(
    propuesta?.checkin_at,
    propuesta?.checkout_at,
  );

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
