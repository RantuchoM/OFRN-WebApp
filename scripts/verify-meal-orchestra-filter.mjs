/**
 * Filtro Solo orquesta + destildado de convocados en agenda de comidas.
 * Standalone (sin importar src: Node exige extensiones en ESM).
 *
 * Run: node scripts/verify-meal-orchestra-filter.mjs
 */

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("ok:", msg);
  }
}

const ROSTER_CATEGORIES = {
  NONE: "GRP:NONE",
  TUTTI: "GRP:TUTTI",
  PRODUCCION: "GRP:PRODUCCION",
  LOCALES: "GRP:LOCALES",
};

const MEAL_FILTER_NO_ARTIST = "__none__";
const MEAL_FILTER_ORCHESTRA_ONLY = "__orchestra__";
const EXCLUSIVE_MEAL_CONV_TAGS = new Set([
  ROSTER_CATEGORIES.NONE,
  ROSTER_CATEGORIES.TUTTI,
]);

function isNobodyConvocados(convocadosList) {
  return (
    Array.isArray(convocadosList) &&
    convocadosList.some((tag) => String(tag) === ROSTER_CATEGORIES.NONE)
  );
}

function mealRowGrupoIds(row) {
  if (!row || row.isTemp) return [];
  if (Array.isArray(row.selectedGrupos)) {
    return [
      ...new Set(row.selectedGrupos.map(Number).filter(Number.isFinite)),
    ];
  }
  const fromEmbed = (row.eventos_grupos || [])
    .map((eg) => Number(eg?.id_grupo ?? eg?.giras_grupos?.id ?? eg))
    .filter(Number.isFinite);
  if (fromEmbed.length) return [...new Set(fromEmbed)];
  return [];
}

function mealRowHasOfrnAudience(row) {
  if (!row || row.isTemp) return false;
  if (isNobodyConvocados(row.convocados)) return false;
  const hasConv = Array.isArray(row.convocados) && row.convocados.length > 0;
  if (hasConv) return true;
  return mealRowGrupoIds(row).length > 0;
}

function mealRowHasArtistTags(row) {
  return (row?.propuestas || []).some((p) => p?.id != null);
}

function mealRowIsSoloOrquesta(row) {
  if (!row || row.isTemp) return false;
  if (mealRowHasArtistTags(row)) return false;
  return mealRowHasOfrnAudience(row);
}

function mealRowMatchesArtistFilter(row, artistIds) {
  const list = artistIds || [];
  if (list.length === 0) return true;
  const artistSet = list instanceof Set ? list : new Set([...list].map(String));
  if (artistSet.has(MEAL_FILTER_ORCHESTRA_ONLY) && mealRowIsSoloOrquesta(row)) {
    return true;
  }
  const ids = (row?.propuestas || [])
    .map((p) => (p?.id != null ? String(p.id) : null))
    .filter(Boolean);
  if (ids.length === 0 && artistSet.has(MEAL_FILTER_NO_ARTIST)) return true;
  return ids.some((id) => artistSet.has(id));
}

function isExclusiveMealConvocadoTag(id) {
  return EXCLUSIVE_MEAL_CONV_TAGS.has(String(id || ""));
}

function toggleMealConvocadosSelection(current = [], id) {
  const tag = String(id || "");
  if (!tag) return [...(current || [])].map(String);
  const selected = (current || []).map(String);
  if (selected.includes(tag)) {
    return selected.filter((x) => x !== tag);
  }
  if (isExclusiveMealConvocadoTag(tag)) return [tag];
  const withoutExclusive = selected.filter(
    (x) => !isExclusiveMealConvocadoTag(x),
  );
  if (withoutExclusive.includes(tag)) return withoutExclusive;
  return [...withoutExclusive, tag];
}

function toggleMealOrchestraOnlyFilter(artistaIds = []) {
  const current = (artistaIds || []).map(String);
  if (current.includes(MEAL_FILTER_ORCHESTRA_ONLY)) {
    return current.filter((id) => id !== MEAL_FILTER_ORCHESTRA_ONLY);
  }
  return [MEAL_FILTER_ORCHESTRA_ONLY];
}

function buildMealArtistFilterOptions({ propuestas = [], rows = [] } = {}) {
  const map = new Map();
  const seedFrom = (list) => {
    for (const p of list || []) {
      if (p?.id == null) continue;
      const key = String(p.id);
      if (map.has(key)) continue;
      map.set(key, { value: key, label: p.nombre || `Artista ${p.id}` });
    }
  };
  seedFrom(propuestas);
  for (const r of rows || []) {
    if (r?.isTemp) continue;
    seedFrom(r.propuestas);
  }
  const opts = Array.from(map.values()).sort((a, b) =>
    a.label.localeCompare(b.label, "es", { sensitivity: "base" }),
  );
  opts.unshift({
    value: MEAL_FILTER_ORCHESTRA_ONLY,
    label: "Solo orquesta",
  });
  return opts;
}

function filterMealManagerRows(rows, filters = {}) {
  const list = rows || [];
  const serviceSet = filters.serviceFilter
    ? new Set(filters.serviceFilter)
    : null;
  const artistSet =
    (filters.artistaIds || []).length > 0
      ? new Set((filters.artistaIds || []).map(String))
      : null;
  return list.filter((r) => {
    if (serviceSet && !serviceSet.has(r?.servicio)) return false;
    if (r?.isTemp) return true;
    if (artistSet && !mealRowMatchesArtistFilter(r, artistSet)) return false;
    return true;
  });
}

const orchestraTutti = {
  id: 1,
  servicio: "Almuerzo",
  convocados: [ROSTER_CATEGORIES.TUTTI],
  propuestas: [],
};
const orchestraGrupos = {
  id: 2,
  servicio: "Almuerzo",
  convocados: [],
  selectedGrupos: [10],
  propuestas: [],
};
const mixedArtists = {
  id: 3,
  servicio: "Almuerzo",
  convocados: [ROSTER_CATEGORIES.TUTTI],
  propuestas: [{ id: 77, nombre: "Crimson" }],
};
const nobody = {
  id: 4,
  servicio: "Almuerzo",
  convocados: [ROSTER_CATEGORIES.NONE],
  propuestas: [],
};
const emptyBoth = {
  id: 5,
  servicio: "Almuerzo",
  convocados: [],
  propuestas: [],
};
const artistOnly = {
  id: 6,
  servicio: "Almuerzo",
  convocados: [ROSTER_CATEGORIES.NONE],
  propuestas: [{ id: 88, nombre: "Soloist" }],
};
const vacancy = {
  id: "tmp-1",
  isTemp: true,
  servicio: "Almuerzo",
  convocados: [],
  propuestas: [],
};

assert(mealRowIsSoloOrquesta(orchestraTutti) === true, "Tutti sin artistas = solo orquesta");
assert(mealRowIsSoloOrquesta(orchestraGrupos) === true, "Grupos OFRN sin artistas = solo orquesta");
assert(mealRowIsSoloOrquesta(mixedArtists) === false, "Con artista no es solo orquesta");
assert(mealRowIsSoloOrquesta(nobody) === false, "Nadie (GRP:NONE) no es solo orquesta");
assert(mealRowIsSoloOrquesta(emptyBoth) === false, "Ambos ejes vacíos no es solo orquesta");
assert(mealRowIsSoloOrquesta(vacancy) === false, "Vacante no es solo orquesta");

assert(
  mealRowMatchesArtistFilter(orchestraTutti, [MEAL_FILTER_ORCHESTRA_ONLY]),
  "Match filtro Solo orquesta (Tutti)",
);
assert(
  !mealRowMatchesArtistFilter(mixedArtists, [MEAL_FILTER_ORCHESTRA_ONLY]),
  "Artista no pasa Solo orquesta",
);
assert(
  mealRowMatchesArtistFilter(mixedArtists, ["77"]),
  "Id de artista sigue matcheando",
);
assert(
  mealRowMatchesArtistFilter(emptyBoth, [MEAL_FILTER_NO_ARTIST]),
  "Sin artistas (legacy __none__) cubre vacíos",
);
assert(
  !mealRowMatchesArtistFilter(emptyBoth, [MEAL_FILTER_ORCHESTRA_ONLY]),
  "Legacy vacío no pasa Solo orquesta",
);

const filtered = filterMealManagerRows(
  [orchestraTutti, mixedArtists, nobody, vacancy, artistOnly],
  {
    serviceFilter: ["Almuerzo"],
    artistaIds: [MEAL_FILTER_ORCHESTRA_ONLY],
  },
);
assert(
  filtered.map((r) => r.id).join(",") === "1,tmp-1",
  "filterMealManagerRows Solo orquesta deja orquesta + vacante",
);

const opts = buildMealArtistFilterOptions({
  propuestas: [{ id: 77, nombre: "Crimson" }],
  rows: [orchestraTutti, mixedArtists],
});
assert(opts[0].value === MEAL_FILTER_ORCHESTRA_ONLY, "Solo orquesta es la 1ª opción");
assert(
  opts.some((o) => o.value === "77"),
  "Incluye artistas presentes",
);

assert(
  JSON.stringify(toggleMealOrchestraOnlyFilter([])) ===
    JSON.stringify([MEAL_FILTER_ORCHESTRA_ONLY]),
  "Chip Orquesta enciende exclusivo",
);
assert(
  JSON.stringify(
    toggleMealOrchestraOnlyFilter([MEAL_FILTER_ORCHESTRA_ONLY, "77"]),
  ) === JSON.stringify(["77"]),
  "Chip Orquesta apaga sin borrar otros ids residuales",
);

assert(
  JSON.stringify(
    toggleMealConvocadosSelection([ROSTER_CATEGORIES.TUTTI], ROSTER_CATEGORIES.TUTTI),
  ) === "[]",
  "Destildar Tutti deja vacío (sin mínimo de 1)",
);
assert(
  JSON.stringify(
    toggleMealConvocadosSelection([ROSTER_CATEGORIES.NONE], ROSTER_CATEGORIES.NONE),
  ) === "[]",
  "Destildar Nadie deja vacío",
);
assert(
  JSON.stringify(
    toggleMealConvocadosSelection(
      [ROSTER_CATEGORIES.LOCALES, ROSTER_CATEGORIES.PRODUCCION],
      ROSTER_CATEGORIES.LOCALES,
    ),
  ) === JSON.stringify([ROSTER_CATEGORIES.PRODUCCION]),
  "Destildar un chip de varios deja el resto",
);
assert(
  JSON.stringify(
    toggleMealConvocadosSelection(
      [ROSTER_CATEGORIES.LOCALES],
      ROSTER_CATEGORIES.PRODUCCION,
    ),
  ) ===
    JSON.stringify([
      ROSTER_CATEGORIES.LOCALES,
      ROSTER_CATEGORIES.PRODUCCION,
    ]),
  "Se pueden combinar categorías no exclusivas",
);
assert(
  JSON.stringify(
    toggleMealConvocadosSelection(
      [ROSTER_CATEGORIES.LOCALES, ROSTER_CATEGORIES.PRODUCCION],
      ROSTER_CATEGORIES.TUTTI,
    ),
  ) === JSON.stringify([ROSTER_CATEGORIES.TUTTI]),
  "Encender Tutti sigue exclusivo",
);
assert(
  JSON.stringify(
    toggleMealConvocadosSelection([ROSTER_CATEGORIES.TUTTI], ROSTER_CATEGORIES.LOCALES),
  ) === JSON.stringify([ROSTER_CATEGORIES.LOCALES]),
  "Elegir Locales apaga Tutti y deja Locales",
);

if (process.exitCode) {
  console.error("verify-meal-orchestra-filter: FAILED");
  process.exit(1);
}
console.log("verify-meal-orchestra-filter: all ok");
