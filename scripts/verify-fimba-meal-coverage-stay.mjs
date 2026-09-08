/**
 * Cobertura A/M/C FIMBA: estadía check-in/out + Early/Late + fallback tagged.
 * Standalone (sin importar src).
 *
 * Run: node scripts/verify-fimba-meal-coverage-stay.mjs
 */

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("ok:", msg);
  }
}

const MEAL_SERVICE_ORDER = {
  Desayuno: 0,
  Almuerzo: 1,
  Merienda: 2,
  Cena: 3,
  Catering: 4,
};

function mealSlotKey(date, servicio) {
  const d = String(date || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const slot = MEAL_SERVICE_ORDER[servicio];
  if (slot == null) return null;
  return Date.parse(`${d}T12:00:00`) + slot;
}

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

function enumerateStayDays(checkin, checkout) {
  const a = parseIso(checkin);
  const b = parseIso(checkout);
  if (!a || !b || a.iso > b.iso) return [];
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

function mealFlagsForDay(fecha, checkin, checkout, opts = {}) {
  const early = opts.early === true;
  const late = opts.late === true;
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
    return { desayuno: false, almuerzo: early || late, cena: false };
  }
  return {
    desayuno: !isArrival,
    almuerzo:
      (isArrival && early) ||
      (!isArrival && !isDeparture) ||
      (isDeparture && late),
    cena: !isDeparture,
  };
}

function amcFlagsForStayDay(fecha, checkin, checkout, opts = {}) {
  const early = opts.early === true;
  const late = opts.late === true;
  const f = String(fecha || "").slice(0, 10);
  const ci = String(checkin || "").slice(0, 10);
  const co = String(checkout || "").slice(0, 10);
  if (!f || !ci || !co || f < ci || f > co) {
    return { almuerzo: false, merienda: false, cena: false };
  }
  const isArrival = f === ci;
  const isDeparture = f === co;
  const isSameDay = ci === co;
  const hotel = mealFlagsForDay(fecha, checkin, checkout, { early, late });
  if (isSameDay) {
    const lunch = hotel.almuerzo;
    return { almuerzo: lunch, merienda: lunch, cena: false };
  }
  return {
    almuerzo: hotel.almuerzo,
    merienda: isArrival || (!isArrival && !isDeparture),
    cena: hotel.cena,
  };
}

function enumerateExpectedAmcSlotsForStay(checkin, checkout, opts = {}) {
  const days = enumerateStayDays(checkin, checkout);
  const out = [];
  for (const fecha of days) {
    const flags = amcFlagsForStayDay(fecha, checkin, checkout, opts);
    if (flags.almuerzo) out.push({ fecha, servicio: "Almuerzo" });
    if (flags.merienda) out.push({ fecha, servicio: "Merienda" });
    if (flags.cena) out.push({ fecha, servicio: "Cena" });
  }
  return out;
}

// --- Bookends: 3-night stay, no Early/Late ---
{
  const slots = enumerateExpectedAmcSlotsForStay("2026-09-10", "2026-09-13", {
    early: false,
    late: false,
  });
  const keys = slots.map((s) => `${s.fecha}|${s.servicio}`);
  assert(
    keys.includes("2026-09-10|Merienda") &&
      keys.includes("2026-09-10|Cena") &&
      !keys.includes("2026-09-10|Almuerzo"),
    "llegada sin Early: Merienda+Cena, no Almuerzo",
  );
  assert(
    keys.includes("2026-09-11|Almuerzo") &&
      keys.includes("2026-09-11|Merienda") &&
      keys.includes("2026-09-11|Cena"),
    "día intermedio: A+M+C",
  );
  assert(
    !keys.some((k) => k.startsWith("2026-09-13|")),
    "salida sin Late: sin A/M/C",
  );
}

// --- Early + Late ---
{
  const slots = enumerateExpectedAmcSlotsForStay("2026-09-10", "2026-09-12", {
    early: true,
    late: true,
  });
  const keys = slots.map((s) => `${s.fecha}|${s.servicio}`);
  assert(keys.includes("2026-09-10|Almuerzo"), "Early → Almuerzo llegada");
  assert(
    keys.includes("2026-09-12|Almuerzo") &&
      !keys.includes("2026-09-12|Merienda") &&
      !keys.includes("2026-09-12|Cena"),
    "Late → solo Almuerzo salida",
  );
}

// --- Same day without flags ---
{
  const slots = enumerateExpectedAmcSlotsForStay("2026-09-10", "2026-09-10", {});
  assert(slots.length === 0, "mismo día sin Early/Late: 0 slots A/M/C");
}

// --- Coverage: stay window pending vs tagged ---
function findGaps(mealRows, propuestas) {
  const byArtist = new Map();
  for (const p of propuestas || []) {
    if (p.requiere_comidas === false) continue;
    byArtist.set(String(p.id), {
      id: String(p.id),
      nombre: p.nombre,
      propuesta: p,
      slots: [],
    });
  }
  for (const row of mealRows || []) {
    for (const p of row.propuestas || []) {
      const id = String(p.id);
      if (!byArtist.has(id)) {
        byArtist.set(id, { id, nombre: p.nombre, propuesta: p, slots: [] });
      }
      const sk = mealSlotKey(row.fecha, row.servicio);
      byArtist.get(id).slots.push({
        fecha: row.fecha,
        servicio: row.servicio,
        slotKey: sk,
      });
    }
  }
  const results = [];
  for (const a of byArtist.values()) {
    const ci = a.propuesta?.checkin_at
      ? String(a.propuesta.checkin_at).slice(0, 10)
      : null;
    const co = a.propuesta?.checkout_at
      ? String(a.propuesta.checkout_at).slice(0, 10)
      : null;
    const present = new Set(
      a.slots
        .filter((s) => ["Almuerzo", "Merienda", "Cena"].includes(s.servicio))
        .map((s) => `${s.fecha}|${s.servicio}`),
    );
    if (ci && co) {
      const expected = enumerateExpectedAmcSlotsForStay(ci, co, {
        early: a.propuesta.checkin_early === true,
        late: a.propuesta.checkout_late === true,
      });
      const missing = expected.filter(
        (e) => !present.has(`${e.fecha}|${e.servicio}`),
      );
      results.push({
        id: a.id,
        windowSource: "stay",
        missing,
        skipped: false,
      });
    } else if (!a.slots.length) {
      results.push({
        id: a.id,
        windowSource: "none",
        missing: [],
        skipped: true,
      });
    } else {
      results.push({
        id: a.id,
        windowSource: "tagged",
        missing: [],
        skipped: false,
      });
    }
  }
  return results;
}

{
  const props = [
    {
      id: 1,
      nombre: "Alpha",
      checkin_at: "2026-09-10",
      checkout_at: "2026-09-12",
      checkin_early: false,
      checkout_late: false,
    },
    {
      id: 2,
      nombre: "Beta",
      requiere_comidas: false,
      checkin_at: "2026-09-10",
      checkout_at: "2026-09-12",
    },
    { id: 3, nombre: "Gamma" },
  ];
  const rows = [
    {
      fecha: "2026-09-10",
      servicio: "Cena",
      propuestas: [{ id: 1, nombre: "Alpha" }],
    },
  ];
  const gaps = findGaps(rows, props);
  const alpha = gaps.find((g) => g.id === "1");
  const beta = gaps.find((g) => g.id === "2");
  const gamma = gaps.find((g) => g.id === "3");
  assert(alpha && alpha.windowSource === "stay", "Alpha usa ventana estadía");
  assert(
    alpha.missing.some((m) => m.servicio === "Merienda" && m.fecha === "2026-09-10"),
    "Alpha: Merienda llegada pendiente",
  );
  assert(
    alpha.missing.some((m) => m.fecha === "2026-09-11"),
    "Alpha: día intermedio pendiente aunque no haya tags",
  );
  assert(!alpha.missing.some((m) => m.fecha === "2026-09-10" && m.servicio === "Cena"), "Alpha: Cena llegada ya tagged");
  assert(!beta, "requiere_comidas false excluido");
  assert(gamma && gamma.skipped, "Gamma sin stay ni tags → skipped");
}

if (process.exitCode) {
  console.error("\nverify-fimba-meal-coverage-stay FAILED");
} else {
  console.log("\nverify-fimba-meal-coverage-stay PASSED");
}
