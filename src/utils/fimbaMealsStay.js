/**
 * Noches y comidas FIMBA a partir de check-in / check-out del artista.
 *
 * Convención operativa (por persona / PAX hotel = cantidad_planificada):
 * - Noches = checkout − checkin (fechas calendario).
 * - Día de llegada (check-in): Cena; Almuerzo solo si Early.
 * - Días intermedios: Desayuno + Almuerzo + Cena.
 * - Día de salida (check-out): Desayuno; Almuerzo solo si Late. Sin cena.
 *
 * No se modela merienda (queda fuera del pedido estándar).
 */

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

/** Misma regla que `nightsBetween` en fimbaService (sin import circular). */
export function nightsBetweenStay(checkin, checkout) {
  const a = parseIso(checkin);
  const b = parseIso(checkout);
  if (!a || !b) return null;
  const da = new Date(a.y, a.mo - 1, a.d);
  const db = new Date(b.y, b.mo - 1, b.d);
  const diff = Math.round((db - da) / 86400000);
  return Math.max(0, diff);
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
  const checkin = input.checkin_at ? String(input.checkin_at).slice(0, 10) : null;
  const checkout = input.checkout_at
    ? String(input.checkout_at).slice(0, 10)
    : null;
  const early = input.checkin_early === true;
  const late = input.checkout_late === true;
  const pax = Math.max(0, Number(input.pax) || 0);
  const noches = nightsBetweenStay(checkin, checkout);
  const daysIso = enumerateStayDays(checkin, checkout);
  const regimenPax = paxByRegimenFromParticipantes(input.participantes, pax);

  const totals = emptyMealCounts();
  const days = [];

  for (const fecha of daysIso) {
    const flags = mealFlagsForDay(fecha, checkin, checkout, { early, late });
    const counts = emptyMealCounts();
    addMealCounts(counts, flags, pax);

    const byRegimen = {};
    for (const [reg, n] of Object.entries(regimenPax)) {
      const c = emptyMealCounts();
      addMealCounts(c, flags, n);
      if (c.desayuno || c.almuerzo || c.cena) {
        byRegimen[reg] = c;
      }
    }

    addMealCounts(totals, flags, pax);
    days.push({
      fecha,
      flags,
      ...counts,
      byRegimen,
    });
  }

  const paxNoches = noches != null ? pax * noches : 0;

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
      comidas:
        totals.desayuno + totals.almuerzo + totals.cena,
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
  const artists = (hoteleriaRows || []).map((r) =>
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
