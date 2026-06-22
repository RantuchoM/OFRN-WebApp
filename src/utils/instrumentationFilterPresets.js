const makeRule = (instrument, operator, value) => ({
  instrument,
  operator,
  value,
});

export const INSTRUMENTATION_FILTER_PRESETS = [
  {
    id: "solo_cuerdas",
    label: "Solo cuerdas",
    stringsFilter: "with",
    strictMode: true,
    rules: [],
  },
  {
    id: "quinteto_maderas",
    label: "Quinteto de maderas",
    stringsFilter: "without",
    strictMode: true,
    rules: [
      makeRule("fl", "eq", 1),
      makeRule("ob", "eq", 1),
      makeRule("cl", "eq", 1),
      makeRule("bn", "eq", 1),
      makeRule("hn", "eq", 1),
    ],
  },
  {
    id: "quinteto_metales",
    label: "Quinteto de metales",
    stringsFilter: "without",
    strictMode: true,
    rules: [
      makeRule("hn", "eq", 1),
      makeRule("tpt", "eq", 2),
      makeRule("tbn", "eq", 1),
      makeRule("tba", "eq", 1),
    ],
  },
  {
    id: "vientos_sin_cuerdas",
    label: "Vientos (sin cuerdas)",
    stringsFilter: "without",
    strictMode: false,
    rules: [],
  },
  {
    id: "solo_percusion",
    label: "Solo percusión",
    stringsFilter: "without",
    strictMode: true,
    rules: [makeRule("perc", "gte", 1)],
  },
];

const normalizeRules = (rules = []) =>
  rules
    .map((r) => ({
      instrument: r.instrument,
      operator: r.operator,
      value: Number(r.value),
    }))
    .sort((a, b) =>
      `${a.instrument}:${a.operator}:${a.value}`.localeCompare(
        `${b.instrument}:${b.operator}:${b.value}`,
      ),
    );

export const findMatchingInstrumentationPreset = (
  rules = [],
  stringsFilter = "all",
  strictMode = false,
) =>
  INSTRUMENTATION_FILTER_PRESETS.find((preset) => {
    if (preset.stringsFilter !== stringsFilter) return false;
    if (preset.strictMode !== strictMode) return false;
    const a = JSON.stringify(normalizeRules(preset.rules));
    const b = JSON.stringify(normalizeRules(rules));
    return a === b;
  }) || null;

export const getInstrumentationFilterLabel = (
  rules = [],
  stringsFilter = "all",
  strictMode = false,
) => {
  const preset = findMatchingInstrumentationPreset(rules, stringsFilter, strictMode);
  if (preset) return preset.label;
  if (rules.length > 0) return `${rules.length} reglas`;
  if (stringsFilter === "with") return "Con Cuerdas";
  if (stringsFilter === "without") return "Sin Cuerdas";
  return "Filtrar";
};

const COLUMN_TO_FILTER_INSTR = {
  Fl: "fl",
  Ob: "ob",
  Cl: "cl",
  Fg: "bn",
  Cr: "hn",
  Tp: "tpt",
  Tb: "tbn",
  Tba: "tba",
  Har: "harp",
  Pno: "key",
};

/**
 * Filtros por defecto para buscar obras que no superen el orgánico convocado en la gira.
 * Usa operador `lte` por familia; cuerdas: "without" si no hay convocados de arco.
 */
export function buildMaxInstrumentationFilterDefaults(convokedMap = {}) {
  const rules = [];

  Object.entries(COLUMN_TO_FILTER_INSTR).forEach(([colKey, filterKey]) => {
    const count = Number(convokedMap[colKey]) || 0;
    rules.push(makeRule(filterKey, "lte", count));
  });

  const timCount = Number(convokedMap.Tim) || 0;
  rules.push(makeRule("timp", "lte", timCount > 0 ? 1 : 0));

  const percCount = Number(convokedMap.Perc) || 0;
  rules.push(makeRule("perc", "lte", percCount));

  const stringsFilter = (Number(convokedMap.Str) || 0) > 0 ? "all" : "without";

  return { rules, stringsFilter, strictMode: false };
};
