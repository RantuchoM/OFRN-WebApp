/**
 * Noches y comidas FIMBA a partir de check-in / check-out.
 *
 * Convención operativa (por persona; PAX hotel = cantidad_planificada):
 * - Noches = checkout − checkin (fechas calendario).
 * - Día de llegada (check-in): Cena; Almuerzo solo si Early.
 * - Días intermedios: Desayuno + Almuerzo + Cena.
 * - Día de salida (check-out): Desayuno; Almuerzo solo si Late. Sin cena.
 * - Si un participante tiene checkin_at/checkout_at propios, se usan esas fechas;
 *   si no, hereda el rango del artista. Cupos sin nominar usan el rango del artista.
 *
 * No se modela merienda (queda fuera del pedido estándar).
 */

import {
  isoDateOrNull,
  nightsBetweenStay,
  resolveParticipanteStay,
} from "./fimbaStay.js";

export { nightsBetweenStay } from "./fimbaStay.js";

export const FIMBA_MEAL_SERVICES = [
  { key: "desayuno", label: "Desayuno" },
  { key: "almuerzo", label: "Almuerzo" },
  { key: "cena", label: "Cena" },
];

function parseIso(iso) {
  const s = String(iso || "").slice(0, 10);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]), iso: s };
}

function addDaysIso(iso, delta) {
  const p = parseIso(iso);
  if (!p) return null;
  const dt = new Date(p.y, p.mo - 1, p.d);
  dt.setDate(dt.getDate() + delta);
  const y = dt.getFullYear();
  const mo = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${mo}-${d}`;
}

/**
 * Días calendario del stay inclusive (check-in … check-out).
 * @returns {string[]}
 */
export function enumerateStayDays(checkin, checkout) {
  const a = parseIso(checkin);
  const b = parseIso(checkout);
  if (!a || !b) return [];
  if (a.iso > b.iso) return [];
  const out = [];
  let cur = a.iso;
  let guard = 0;
  while (cur <= b.iso && guard < 400) {
    out.push(cur);
    cur = addDaysIso(cur, 1);
    guard += 1;
  }
  return out;
}

/**
 * Flags de servicio para un día del stay.
 * @returns {{ desayuno: boolean, almuerzo: boolean, cena: boolean }}
 */
export function mealFlagsForDay(fecha, checkin, checkout, opts = {}) {
  const early = opts.early === true || opts.checkin_early === true;
  const late = opts.late === true || opts.checkout_late === true;
  const f = String(fecha || "").slice(0, 10);
  const ci = String(checkin || "").slice(0, 10);
  const co = String(checkout || "").slice(0, 10);
  if (!f || !ci || !co || f < ci || f > co) {
    return { desayuno: false, almuerzo: false, cena: false };
  }
  const isArrival = f === ci;
  const isDeparture = f === co;
  const isSameDay = ci === co;

  if (isSameDay) {
    // 0 noches: Early → almuerzo; Late no agrega cena; sin desayuno/cena estándar
    return {
      desayuno: false,
      almuerzo: early || late,
      cena: false,
    };
  }

  return {
    desayuno: !isArrival,
    almuerzo: (isArrival && early) || (!isArrival && !isDeparture) || (isDeparture && late),
    cena: !isDeparture,
  };
}

function emptyMealCounts() {
  return { desayuno: 0, almuerzo: 0, cena: 0 };
}

function addMealCounts(target, flags, pax) {
  const n = Math.max(0, Number(pax) || 0);
  if (!n) return target;
  if (flags.desayuno) target.desayuno += n;
  if (flags.almuerzo) target.almuerzo += n;
  if (flags.cena) target.cena += n;
  return target;
}

/**
 * Distribución de PAX por régimen (nominados + cupo «sin nombre»).
 * @returns {Record<string, number>}
 */
export function paxByRegimenFromParticipantes(participantes, paxPlanificada) {
  const pax = Math.max(0, Number(paxPlanificada) || 0);
  const map = {};
  let nominados = 0;
  for (const p of participantes || []) {
    if (p.activo === false) continue;
    nominados += 1;
    const key = String(p.tipo_alimentacion || "regular").toLowerCase() || "regular";
    map[key] = (map[key] || 0) + 1;
  }
  const sinNombre = Math.max(0, pax - nominados);
  if (sinNombre > 0) {
    map.por_confirmar = (map.por_confirmar || 0) + sinNombre;
  }
  // Si planificada = 0 pero hay nominados, usar nominados (datos inconsistentes)
  if (pax === 0 && nominados > 0) {
    return map;
  }
  return map;
}

/**
 * Unidades de comida: nominados (con estadía propia o heredada) + cupos sin nombre.
 */
function mealStayUnits(input) {
  const artistCheckin = isoDateOrNull(input.checkin_at);
  const artistCheckout = isoDateOrNull(input.checkout_at);
  const pax = Math.max(0, Number(input.pax) || 0);
  const activos = (input.participantes || []).filter((p) => p.activo !== false);
  const porConfirmar = Math.max(0, pax - activos.length);
  const artistRef = {
    checkin_at: artistCheckin,
    checkout_at: artistCheckout,
    checkin_early: input.checkin_early,
    checkout_late: input.checkout_late,
  };

  const units = [];
  for (const p of activos) {
    const stay = resolveParticipanteStay(p, artistRef);
    if (!stay.checkin_at || !stay.checkout_at) continue;
    units.push({
      checkin: stay.checkin_at,
      checkout: stay.checkout_at,
      regimen: String(p.tipo_alimentacion || "regular").toLowerCase() || "regular",
    });
  }
  if (artistCheckin && artistCheckout) {
    for (let i = 0; i < porConfirmar; i += 1) {
      units.push({
        checkin: artistCheckin,
        checkout: artistCheckout,
        regimen: "por_confirmar",
      });
    }
  }
  return { units, artistCheckin, artistCheckout };
}

/**
 * Plan de comidas de un artista.
 * @param {object} input
 * @param {string|null} input.checkin_at
 * @param {string|null} input.checkout_at
 * @param {boolean} [input.checkin_early]
 * @param {boolean} [input.checkout_late]
 * @param {number} input.pax
 * @param {Array} [input.participantes]
 * @param {string} [input.artistaNombre]
 * @param {number|string} [input.id_propuesta]
 */
export function computeArtistaMealsPlan(input = {}) {
  const early = input.checkin_early === true;
  const late = input.checkout_late === true;
  const pax = Math.max(0, Number(input.pax) || 0);
  const { units, artistCheckin, artistCheckout } = mealStayUnits(input);

  let minIn = artistCheckin;
  let maxOut = artistCheckout;
  for (const u of units) {
    if (!minIn || u.checkin < minIn) minIn = u.checkin;
    if (!maxOut || u.checkout > maxOut) maxOut = u.checkout;
  }

  const checkin = artistCheckin || minIn;
  const checkout = artistCheckout || maxOut;
  const noches = nightsBetweenStay(checkin, checkout);
  const daysIso = enumerateStayDays(minIn, maxOut);

  const totals = emptyMealCounts();
  const days = [];
  let paxNoches = 0;
  for (const u of units) {
    const n = nightsBetweenStay(u.checkin, u.checkout);
    if (n != null) paxNoches += n;
  }

  for (const fecha of daysIso) {
    const flags = { desayuno: false, almuerzo: false, cena: false };
    const counts = emptyMealCounts();
    const byRegimen = {};
    for (const u of units) {
      const uFlags = mealFlagsForDay(fecha, u.checkin, u.checkout, { early, late });
      addMealCounts(counts, uFlags, 1);
      if (uFlags.desayuno) flags.desayuno = true;
      if (uFlags.almuerzo) flags.almuerzo = true;
      if (uFlags.cena) flags.cena = true;
      if (uFlags.desayuno || uFlags.almuerzo || uFlags.cena) {
        if (!byRegimen[u.regimen]) byRegimen[u.regimen] = emptyMealCounts();
        addMealCounts(byRegimen[u.regimen], uFlags, 1);
      }
    }
    totals.desayuno += counts.desayuno;
    totals.almuerzo += counts.almuerzo;
    totals.cena += counts.cena;
    days.push({
      fecha,
      flags,
      ...counts,
      byRegimen,
    });
  }

  return {
    id_propuesta: input.id_propuesta ?? null,
    artista: input.artistaNombre || "",
    checkin_at: checkin,
    checkout_at: checkout,
    checkin_early: early,
    checkout_late: late,
    pax,
    noches,
    pax_noches: paxNoches,
    days,
    totals: {
      ...totals,
      noches: noches ?? 0,
      pax_noches: paxNoches,
      comidas: totals.desayuno + totals.almuerzo + totals.cena,
    },
  };
}

/**
 * Agrega planes de varios artistas → vista general por día + totales.
 * @param {Array<object>} artistPlans  resultados de computeArtistaMealsPlan
 */
export function aggregateMealsPlans(artistPlans = []) {
  const byFecha = new Map();
  const totals = emptyMealCounts();
  let paxNoches = 0;
  let nochesSum = 0;

  for (const plan of artistPlans) {
    if (!plan) continue;
    paxNoches += plan.pax_noches || 0;
    nochesSum += plan.totals?.noches || plan.noches || 0;
    totals.desayuno += plan.totals?.desayuno || 0;
    totals.almuerzo += plan.totals?.almuerzo || 0;
    totals.cena += plan.totals?.cena || 0;

    for (const day of plan.days || []) {
      if (!byFecha.has(day.fecha)) {
        byFecha.set(day.fecha, {
          fecha: day.fecha,
          desayuno: 0,
          almuerzo: 0,
          cena: 0,
          byRegimen: {},
          byArtista: [],
        });
      }
      const slot = byFecha.get(day.fecha);
      slot.desayuno += day.desayuno || 0;
      slot.almuerzo += day.almuerzo || 0;
      slot.cena += day.cena || 0;
      slot.byArtista.push({
        id_propuesta: plan.id_propuesta,
        artista: plan.artista,
        desayuno: day.desayuno || 0,
        almuerzo: day.almuerzo || 0,
        cena: day.cena || 0,
      });
      for (const [reg, c] of Object.entries(day.byRegimen || {})) {
        if (!slot.byRegimen[reg]) slot.byRegimen[reg] = emptyMealCounts();
        slot.byRegimen[reg].desayuno += c.desayuno || 0;
        slot.byRegimen[reg].almuerzo += c.almuerzo || 0;
        slot.byRegimen[reg].cena += c.cena || 0;
      }
    }
  }

  const days = [...byFecha.values()].sort((a, b) =>
    String(a.fecha).localeCompare(String(b.fecha)),
  );

  return {
    days,
    artists: artistPlans,
    totals: {
      ...totals,
      noches_sum_artistas: nochesSum,
      pax_noches: paxNoches,
      comidas: totals.desayuno + totals.almuerzo + totals.cena,
    },
  };
}

/**
 * Construye plan desde filas de listFimbaHoteleria.
 * @param {Array} hoteleriaRows
 */
export function buildFimbaMealsStayFromHoteleria(hoteleriaRows = []) {
  const artists = (hoteleriaRows || [])
    .filter((r) => r?.requiere_comidas !== false && r?.propuesta?.requiere_comidas !== false)
    .map((r) =>
      r.meals_stay ||
      computeArtistaMealsPlan({
        id_propuesta: r.propuesta?.id,
        artistaNombre: r.propuesta?.nombre || "",
        checkin_at: r.checkin_at,
        checkout_at: r.checkout_at,
        checkin_early: r.checkin_early === true,
        checkout_late: r.checkout_late === true,
        pax: r.pax_planificada ?? r.para_hotel_comida ?? 0,
        participantes: r.personas || r.participantes || [],
      }),
    );
  return aggregateMealsPlans(artists);
}

export function formatFechaMealDdMm(iso) {
  if (!iso) return "—";
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  if (!d) return String(iso);
  return `${d}/${m}`;
}
