/**
 * Mails y helpers de cambio de atril / silla (cuerdas).
 */

import { seatingItemMatrixPosition } from "../services/giraService";
import { seatingApellidoNombre } from "./integranteDisplayName";
import { integranteKey } from "./integranteIds";

export const SEATING_ATRIL_CAMBIO_VARIANT = "SEATING_ATRIL_CAMBIO";
export const SEATING_CAMBIO_JEFE_RESUMEN_VARIANT = "SEATING_CAMBIO_JEFE_RESUMEN";
export const SEATING_JEFE_RESUMEN_TO = "marko.scrn@gmail.com";

/** lado 0 = silla a (interna); lado 1 = silla b (externa). */
export function formatAtrilSillaLabel(atril_num, lado) {
  const atril = Number(atril_num);
  const side = Number(lado) === 1 ? "b" : "a";
  const atrilTxt = Number.isFinite(atril) && atril > 0 ? String(atril) : "?";
  return `atril ${atrilTxt}, silla ${side}`;
}

export function formatAtrilSillaShort(atril_num, lado) {
  const atril = Number(atril_num);
  const side = Number(lado) === 1 ? "b" : "a";
  const atrilTxt = Number.isFinite(atril) && atril > 0 ? String(atril) : "?";
  return `${atrilTxt}${side}`;
}

/**
 * Diff de asientos antes/después (placements = [{id, atril_num, lado}]).
 * @returns {Array<{itemId, musicianId, fromAtril, fromLado, toAtril, toLado, fromLabel, toLabel}>}
 */
export function diffContainerSeatMoves(beforeItems = [], placements = []) {
  const beforeById = new Map();
  (beforeItems || []).forEach((it, idx) => {
    if (it?.id == null) return;
    const pos = seatingItemMatrixPosition(it, idx);
    beforeById.set(String(it.id), {
      musicianId: it.id_musico,
      atril_num: Number(pos.atril_num),
      lado: Number(pos.lado),
    });
  });

  const moves = [];
  (placements || []).forEach((p) => {
    const prev = beforeById.get(String(p.id));
    if (!prev || prev.musicianId == null) return;
    const toAtril = Number(p.atril_num);
    const toLado = Number(p.lado);
    if (prev.atril_num === toAtril && prev.lado === toLado) return;
    moves.push({
      itemId: p.id,
      musicianId: prev.musicianId,
      fromAtril: prev.atril_num,
      fromLado: prev.lado,
      toAtril,
      toLado,
      fromLabel: formatAtrilSillaLabel(prev.atril_num, prev.lado),
      toLabel: formatAtrilSillaLabel(toAtril, toLado),
    });
  });
  return moves;
}

/**
 * Fusiona moves por músico (queda el from más antiguo y el to más reciente).
 */
export function mergeAtrilMoves(existing = [], incoming = []) {
  const byMusician = new Map();
  [...(existing || []), ...(incoming || [])].forEach((m) => {
    const key = integranteKey(m.musicianId);
    if (!key) return;
    const prev = byMusician.get(key);
    if (!prev) {
      byMusician.set(key, { ...m });
      return;
    }
    byMusician.set(key, {
      ...prev,
      toAtril: m.toAtril,
      toLado: m.toLado,
      toLabel: m.toLabel,
      // conservar from original de la sesión
      fromAtril: prev.fromAtril,
      fromLado: prev.fromLado,
      fromLabel: prev.fromLabel,
      containerId: m.containerId ?? prev.containerId,
      containerName: m.containerName ?? prev.containerName,
    });
  });
  return [...byMusician.values()].filter(
    (m) =>
      Number(m.fromAtril) !== Number(m.toAtril) ||
      Number(m.fromLado) !== Number(m.toLado),
  );
}

export function buildSeatingAtrilCambioMailTask(
  musician,
  move,
  {
    now = Date.now(),
    bloqueNombre = "",
    contenedorNombre = "",
    actor = null,
  } = {},
) {
  const mail = String(musician?.mail || "").trim();
  if (!mail || musician?.id == null || !move) return null;
  const nombre = String(musician.nombre || "").trim();
  const apellido = String(musician.apellido || "").trim();
  const nombreCompleto =
    musician.nombreCompleto ||
    (nombre && apellido ? `${nombre} ${apellido}` : "") ||
    musician.displayName ||
    seatingApellidoNombre(musician) ||
    "Participante";
  const bloque = String(bloqueNombre || "").trim() || "el bloque actual";
  const contenedor = String(
    contenedorNombre || move.containerName || "",
  ).trim();
  const actorJefe =
    actor?.esJefeDeFila && actor?.nombre
      ? String(actor.nombre).trim()
      : "";
  const asiento = move.toLabel || formatAtrilSillaLabel(move.toAtril, move.toLado);
  const asientoPrev =
    move.fromLabel || formatAtrilSillaLabel(move.fromAtril, move.fromLado);

  return {
    id: `seating-atril-${musician.id}-${now}`,
    variant: SEATING_ATRIL_CAMBIO_VARIANT,
    emails: [mail],
    nombres: [nombreCompleto],
    nombrePrimero: nombre,
    apellidoPrimero: apellido,
    actorJefe: actorJefe || undefined,
    vars: {
      bloque,
      contenedor,
      asiento,
      asiento_previo: asientoPrev,
      atril: String(move.toAtril ?? ""),
      silla: Number(move.toLado) === 1 ? "b" : "a",
      actor_jefe: actorJefe,
    },
    atrilDetalle: {
      bloque,
      contenedor,
      asiento,
      asiento_previo: asientoPrev,
      atril: move.toAtril,
      silla: Number(move.toLado) === 1 ? "b" : "a",
    },
  };
}

/**
 * Resumen único a Marko: particellas y/o cambios de atril/silla.
 * @param {object} opts
 * @param {Array} [opts.musicians] músicos con `.changes` de particella
 * @param {Array} [opts.atrilMoves] moves de atril (diffContainerSeatMoves + meta)
 * @param {Array} [opts.roster] para resolver nombres de atrilMoves
 * @param {string} [opts.bloqueNombre]
 */
export function buildSeatingCambioJefeResumenMailTask(
  musiciansOrOpts,
  maybeOpts = {},
) {
  // Compat: buildSeatingCambioJefeResumenMailTask(musicians, { actor })
  const legacyMusicians = Array.isArray(musiciansOrOpts)
    ? musiciansOrOpts
    : null;
  const opts = legacyMusicians
    ? { musicians: legacyMusicians, ...maybeOpts }
    : musiciansOrOpts || {};

  const list = (opts.musicians || []).filter(Boolean);
  const atrilMoves = opts.atrilMoves || [];
  const roster = opts.roster || [];
  const bloqueNombre = String(opts.bloqueNombre || "").trim();
  const now = opts.now ?? Date.now();
  const actor = opts.actor || null;

  const rosterById = new Map();
  roster.forEach((m) => {
    const k = integranteKey(m?.id);
    if (k) rosterById.set(k, m);
  });

  const actorNombre =
    actor?.nombre || actor?.displayName || "jefe/a de fila";
  const resumenItems = [];

  list.forEach((m) => {
    const who =
      m.displayName ||
      seatingApellidoNombre(m) ||
      m.nombreCompleto ||
      `ID ${m.id}`;
    (m.changes || []).forEach((c) => {
      resumenItems.push({
        tipo: "particella",
        musico: who,
        obra: c.obraTitle || "Obra",
        from: c.fromLabel || "sin asignación",
        to: c.toLabel || "sin asignación",
        cambio: `${c.fromLabel || "sin asignación"} → ${c.toLabel || "sin asignación"}`,
      });
    });
  });

  atrilMoves.forEach((move) => {
    const person = rosterById.get(integranteKey(move.musicianId));
    const who =
      seatingApellidoNombre(person) ||
      person?.nombre_completo ||
      person?.displayName ||
      `ID ${move.musicianId}`;
    const from =
      move.fromLabel || formatAtrilSillaLabel(move.fromAtril, move.fromLado);
    const to =
      move.toLabel || formatAtrilSillaLabel(move.toAtril, move.toLado);
    const contenedor = String(move.containerName || "").trim();
    const bloqueBit = bloqueNombre ? `bloque ${bloqueNombre}` : "";
    const lugarBits = [bloqueBit, contenedor].filter(Boolean).join(" · ");
    resumenItems.push({
      tipo: "atril",
      musico: who,
      obra: lugarBits || "Ubicación",
      from,
      to,
      cambio: `${from} → ${to}`,
      bloque: bloqueNombre,
      contenedor,
    });
  });

  if (!resumenItems.length) return null;

  const reasonLines = resumenItems
    .map((r) => {
      const tag = r.tipo === "atril" ? "atril/silla" : "particella";
      return `- [${tag}] ${r.musico} | ${r.obra}: ${r.cambio}`;
    })
    .join("\n");

  const nPart = resumenItems.filter((r) => r.tipo === "particella").length;
  const nAtril = resumenItems.filter((r) => r.tipo === "atril").length;

  return {
    id: `seating-cambio-jefe-resumen-${now}`,
    variant: SEATING_CAMBIO_JEFE_RESUMEN_VARIANT,
    emails: [SEATING_JEFE_RESUMEN_TO],
    nombres: ["Marko"],
    nombrePrimero: "Marko",
    apellidoPrimero: "",
    reason: reasonLines,
    actorJefe: String(actorNombre).trim() || undefined,
    novedadesResumen: resumenItems,
    vars: {
      actor_jefe: String(actorNombre).trim(),
      cantidad: String(resumenItems.length),
      cantidad_particella: String(nPart),
      cantidad_atril: String(nAtril),
    },
  };
}

/**
 * Solo resumen a Marko (sin mails a músicos). Usar cuando el jefe omite notificar.
 * @returns {object|null} task o null si no hay cambios / no es jefe
 */
export function buildMarkoResumenOnlyTask(opts) {
  if (!opts?.actor?.esJefeDeFila) return null;
  return buildSeatingCambioJefeResumenMailTask(opts);
}
