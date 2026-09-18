/**
 * Unificación visual del MealsReport FIMBA (fecha + tipo + lugar).
 * Espejo de `unifyMealsReportRowsByTypeAndPlace` / `buildMealsPedidoText`
 * en src/utils/mealsReportText.js (Node no resuelve imports Vite sin .js).
 *
 * Run: node scripts/verify-meals-report-unify.mjs
 */

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("ok:", msg);
  }
}

function mealTurnoKey(row) {
  const fecha = String(row?.fecha || "").slice(0, 10);
  const servicio = row?.servicio || "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !servicio) return null;
  return `${fecha}|${servicio}`;
}

function mealCoincidenceKey(row) {
  const turno = mealTurnoKey(row);
  if (!turno) return null;
  const locRaw = row.id_locacion;
  const loc =
    locRaw == null || locRaw === "" ? "\u2205" : String(Number(locRaw) || locRaw);
  return `${turno}|${loc}`;
}

function uniquePropuestas(rows = []) {
  const map = new Map();
  for (const row of rows) {
    for (const p of row?.propuestas || []) {
      if (p?.requiere_comidas === false) continue;
      if (p?.id == null) continue;
      const key = String(p.id);
      if (!map.has(key)) map.set(key, p);
    }
  }
  return Array.from(map.values());
}

function uniqueOfrnPeople(rows = []) {
  const map = new Map();
  for (const row of rows) {
    for (const p of row?.ofrnPeople || []) {
      if (p?.id == null) continue;
      const key = String(p.id);
      if (!map.has(key)) map.set(key, p);
    }
  }
  return Array.from(map.values());
}

function ofrnCountsFromPeople(people = []) {
  const counts = { Total: 0 };
  for (const p of people) {
    const diet = p.diet || "Estándar";
    counts[diet] = (counts[diet] || 0) + 1;
    counts.Total += 1;
  }
  return counts;
}

function mergeHoras(rows = []) {
  const horas = [
    ...new Set(
      (rows || [])
        .map((r) => String(r?.hora || "").trim().slice(0, 5))
        .filter(Boolean),
    ),
  ].sort();
  if (horas.length === 0) return rows[0]?.hora || "";
  if (horas.length === 1) return horas[0];
  return horas.join(" / ");
}

function mockDietBreakdown(propuestas = []) {
  const dietCounts = {};
  let total = 0;
  for (const p of propuestas) {
    const n = Math.max(0, Number(p.cantidad_planificada) || 0);
    if (!n) continue;
    const diet = p._diet || "Regular";
    dietCounts[diet] = (dietCounts[diet] || 0) + n;
    total += n;
  }
  return { dietCounts, residualArt: 0, total };
}

function unifyMealsReportRowsByTypeAndPlace(rows = [], opts = {}) {
  const { includeArtists = false, dietBreakdownFn = mockDietBreakdown } = opts;
  const groups = new Map();
  const keyOrder = [];
  for (const row of rows || []) {
    if (!row) continue;
    const key = mealCoincidenceKey(row) || `solo:${row.id}`;
    if (!groups.has(key)) {
      groups.set(key, []);
      keyOrder.push(key);
    }
    groups.get(key).push(row);
  }

  return keyOrder.map((key) => {
    const group = groups.get(key) || [];
    if (group.length <= 1) return group[0];
    const first = group[0];
    const ofrnPeople = uniqueOfrnPeople(group);
    const ofrnCounts = ofrnCountsFromPeople(ofrnPeople);
    const propuestas = uniquePropuestas(group);
    const counts = { ...ofrnCounts };
    if (includeArtists) {
      const { dietCounts, residualArt, total: artistTotal } =
        dietBreakdownFn(propuestas);
      for (const [diet, n] of Object.entries(dietCounts || {})) {
        if (!n) continue;
        counts[diet] = (counts[diet] || 0) + n;
      }
      if (residualArt > 0) {
        counts["Artistas FIMBA"] = (counts["Artistas FIMBA"] || 0) + residualArt;
      }
      counts.Total =
        (Number(ofrnCounts.Total) || 0) + (Number(artistTotal) || 0);
    }
    const eventIds = group.flatMap((r) =>
      Array.isArray(r.eventIds) && r.eventIds.length
        ? r.eventIds
        : r.id != null
          ? [r.id]
          : [],
    );
    return {
      ...first,
      id: `u:${key}`,
      eventIds,
      merged: true,
      hora: mergeHoras(group),
      propuestas,
      ofrnPeople,
      ofrnCounts,
      counts,
    };
  });
}

function mealsReportPlaceLabel(row) {
  const name = String(row?.locacionLabel || "").trim();
  if (name && name !== "Sin ubicación") return name;
  const lugar = String(row?.lugar || "").trim();
  if (lugar && lugar !== "Sin ubicación") return lugar;
  return "";
}

function buildMealsPedidoText(filteredRows = [], opts = {}) {
  const { groupByLugar = false } = opts;
  const perDate = {};
  for (const row of filteredRows) {
    if (!perDate[row.fecha]) perDate[row.fecha] = {};
    const typeKey = row.servicioLabel || row.servicio;
    const placeKey = groupByLugar
      ? String(row.locKey ?? row.id_locacion ?? "")
      : "";
    const groupKey = groupByLugar ? `${typeKey}\0${placeKey}` : typeKey;
    if (!perDate[row.fecha][groupKey]) {
      perDate[row.fecha][groupKey] = {
        Total: 0,
        label: typeKey,
        place: groupByLugar ? mealsReportPlaceLabel(row) : "",
      };
    }
    perDate[row.fecha][groupKey].Total += row.counts?.Total || 0;
  }
  const lines = [];
  for (const dateKey of Object.keys(perDate).sort()) {
    for (const counts of Object.values(perDate[dateKey])) {
      if (!counts.Total) continue;
      const placeSuffix = counts.place ? ` en ${counts.place}` : "";
      lines.push(`${counts.Total} ${String(counts.label).toLowerCase()}s${placeSuffix}`);
    }
  }
  return lines.join("\n");
}

function row(partial) {
  return {
    ofrnPeople: [],
    ofrnCounts: { Total: 0 },
    propuestas: [],
    convocados: [],
    counts: { Total: 0 },
    locacionLabel: "Hotel NH",
    lugar: "Hotel NH - Córdoba",
    locKey: "82",
    id_locacion: 82,
    hora: "13:00",
    servicioLabel: "Almuerzo",
    servicio: "Almuerzo",
    fecha: "2026-09-15",
    ...partial,
  };
}

const samePlaceA = row({
  id: 101,
  eventIds: [101],
  ofrnPeople: [
    { id: 1, diet: "Estándar" },
    { id: 2, diet: "Estándar" },
  ],
  ofrnCounts: { Total: 2, Estándar: 2 },
  propuestas: [{ id: 10, nombre: "A", cantidad_planificada: 4, _diet: "Regular" }],
  counts: { Total: 6, Estándar: 2, Regular: 4 },
});

const samePlaceB = row({
  id: 102,
  eventIds: [102],
  hora: "13:30",
  ofrnPeople: [
    { id: 2, diet: "Estándar" },
    { id: 3, diet: "Vegetariano" },
  ],
  ofrnCounts: { Total: 2, Estándar: 1, Vegetariano: 1 },
  propuestas: [{ id: 11, nombre: "B", cantidad_planificada: 3, _diet: "Regular" }],
  counts: { Total: 5, Estándar: 1, Vegetariano: 1, Regular: 3 },
});

const otherPlace = row({
  id: 103,
  eventIds: [103],
  locKey: "99",
  id_locacion: 99,
  locacionLabel: "Breogan",
  lugar: "Breogan - Córdoba",
  ofrnPeople: [{ id: 9, diet: "Estándar" }],
  ofrnCounts: { Total: 1, Estándar: 1 },
  counts: { Total: 1, Estándar: 1 },
});

const otherDay = row({
  id: 104,
  eventIds: [104],
  fecha: "2026-09-16",
  ofrnPeople: [{ id: 1, diet: "Estándar" }],
  ofrnCounts: { Total: 1, Estándar: 1 },
  counts: { Total: 1, Estándar: 1 },
});

const unified = unifyMealsReportRowsByTypeAndPlace(
  [samePlaceA, samePlaceB, otherPlace, otherDay],
  { includeArtists: true },
);

assert(unified.length === 3, "misma fecha+tipo+lugar → 1 fila; distinto lugar/día se conservan");

const merged = unified.find((r) => r.merged);
assert(Boolean(merged), "el grupo coincidente queda marcado merged");
assert(merged.counts.Total === 10, "OFRN únicos (ids 1,2,3) + artistas 4+3 = 10");
assert(merged.counts.Estándar === 2, "persona 2 no se duplica en Estándar");
assert(merged.counts.Vegetariano === 1, "dieta OFRN del 2º evento se conserva");
assert(merged.counts.Regular === 7, "artistas A+B se suman (propuestas distintas)");
assert(merged.hora === "13:00 / 13:30", "horas distintas se listan");
assert(
  JSON.stringify([...(merged.eventIds || [])].map(Number).sort()) ===
    JSON.stringify([101, 102]),
  "conserva ids de eventos origen (solo vista)",
);

const stillTwoPlaces = unified.filter((r) => r.fecha === "2026-09-15");
assert(stillTwoPlaces.length === 2, "mismo tipo en otro lugar no se mezcla");

const sameArtistTwice = unifyMealsReportRowsByTypeAndPlace(
  [
    row({
      id: 201,
      propuestas: [{ id: 10, nombre: "A", cantidad_planificada: 4, _diet: "Regular" }],
    }),
    row({
      id: 202,
      propuestas: [{ id: 10, nombre: "A", cantidad_planificada: 4, _diet: "Regular" }],
    }),
  ],
  { includeArtists: true },
);
assert(sameArtistTwice.length === 1, "mismo artista en dos eventos → una fila");
assert(
  sameArtistTwice[0].counts.Regular === 4,
  "propuesta duplicada no infla pax de artistas",
);

const textUnified = buildMealsPedidoText(
  unifyMealsReportRowsByTypeAndPlace([samePlaceA, samePlaceB], {
    includeArtists: true,
  }),
  { groupByLugar: true },
);
assert(
  /10 almuerzos en Hotel NH/.test(textUnified),
  "texto FIMBA: un renglón con lugar para el grupo unificado",
);
assert(
  (textUnified.match(/almuerzos/g) || []).length === 1,
  "texto no repite almuerzo del mismo lugar",
);

const textTwoPlaces = buildMealsPedidoText(
  unifyMealsReportRowsByTypeAndPlace([samePlaceA, otherPlace], {
    includeArtists: true,
  }),
  { groupByLugar: true },
);
assert(
  /en Hotel NH/.test(textTwoPlaces) && /en Breogan/.test(textTwoPlaces),
  "texto FIMBA: lugares distintos del mismo tipo quedan separados",
);

if (process.exitCode) {
  console.error("verify-meals-report-unify FAILED");
} else {
  console.log("verify-meals-report-unify OK");
}
