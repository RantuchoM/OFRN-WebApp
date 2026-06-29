import { formatSecondsToHm } from "./time";
import { isRepertorioPlaceholder } from "./repertorioRowDisplay";

/** Indica si el string de instrumentación incluye cuerdas. */
export const hasStrings = (text) => {
  if (!text) return false;
  return /str|cuerd|viol|vln|vla|vlc|cb|arco|contrab/i.test(text);
};

/** Solo `musico` y `mus_prod` cuentan en chips convocados vs requerido (ej. productor puro no suma por instrumento). */
export function countsTowardInstrumentationConvoked(rolGira) {
  const r = String(rolGira || "musico").toLowerCase().trim();
  return r === "musico" || r === "mus_prod";
}

/** Hay al menos un integrante presente que aporta a la instrumentación convocada. */
export function rosterHasInstrumentationMembers(roster) {
  return (roster || []).some(
    (m) =>
      m.estado_gira !== "ausente" &&
      countsTowardInstrumentationConvoked(m.rol_gira),
  );
}

/** El mapa de columnas tiene al menos un instrumento con conteo > 0. */
export function hasInstrumentationMapContent(map) {
  if (!map) return false;
  return Object.values(map).some((value) => (Number(value) || 0) > 0);
}

/** Badge convocado sin obras cargadas: informativo, sin alerta de desajuste. */
export const INSTRUMENTATION_BADGE_NEUTRAL_CLASS =
  "bg-white text-slate-600 border-slate-200 hover:bg-slate-50";

export function getInstrumentationBadgeBaseClass({
  hasWorks = true,
  organicoRevisado = false,
  mismatch = false,
  hasVacancies = false,
} = {}) {
  if (!hasWorks) return INSTRUMENTATION_BADGE_NEUTRAL_CLASS;
  if (organicoRevisado) {
    return "bg-sky-100 text-sky-700 border-sky-300 hover:bg-sky-200";
  }
  if (mismatch) {
    return "bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200";
  }
  if (hasVacancies) {
    return "bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200";
  }
  return "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100";
}

/** Obtiene el valor numérico de un instrumento desde el string de instrumentación (para filtros analíticos). */
export const getInstrumentValue = (workString, instrumentKey) => {
  if (!workString) return 0;
  const key = String(instrumentKey).toLowerCase();

  if (key === "timp") return /timp/i.test(workString) ? 1 : 0;
  if (key === "perc") {
    const match = workString.match(/perc(?:\.x|x|\+)?(\d+)?/i);
    return match ? (match[1] ? parseInt(match[1], 10) : 1) : 0;
  }
  if (key === "harp") return /hp|arp|harp/i.test(workString) ? 1 : 0;
  if (key === "key") return /key|pno|pf|cel/i.test(workString) ? 1 : 0;
  if (key === "str") return hasStrings(workString) ? 1 : 0;

  const cleanStr = workString.replace(/\([^)]*\)/g, "");
  const allParts = cleanStr
    .replace(/-/g, ".")
    .split(".")
    .map((p) => p.trim())
    .filter((p) => p !== "" && !Number.isNaN(Number(p)));

  const indexMap = {
    fl: 0, ob: 1, cl: 2, bn: 3, fg: 3, hn: 4, tpt: 5, tp: 5, tbn: 6, tb: 6, tba: 7, tu: 7,
  };

  const index = indexMap[key];
  if (index === undefined || index >= allParts.length) return 0;
  const val = parseInt(allParts[index], 10);
  return Number.isNaN(val) ? 0 : val;
};

/** Total de percusionistas en un string de instrumentación (Timp / Timp.+n / Perc / Perc.xn). */
export function parsePercussionTotalFromString(instString) {
  if (!instString) return 0;

  let total = 0;
  const timpMatch = instString.match(/Timp\.\s*(?:\+(\d+))?/i);
  if (timpMatch) {
    const extra = parseInt(timpMatch[1] || "0", 10) || 0;
    total += 1 + extra;
  }

  const percMatch = instString.match(/Perc(?:\.x(\d+))?/i);
  if (percMatch) {
    const explicitPerc = percMatch[1] ? parseInt(percMatch[1], 10) || 0 : 1;
    total += explicitPerc;
  }

  if (!timpMatch && !percMatch) {
    total =
      (getInstrumentValue(instString, "timp") || 0) +
      (getInstrumentValue(instString, "perc") || 0);
  }

  return total;
}

/** Etiqueta estándar Perc / Perc.xN para un total de percusionistas. */
export function formatPercussionLabel(total) {
  if (!total || total <= 0) return "";
  if (total === 1) return "Perc";
  return `Perc.x${total}`;
}

/** Devuelve la etiqueta corta del instrumento para la lista de solistas (ej: Sax, Vc).
 *  Prioriza la abreviatura proveniente de la tabla `instrumentos` (p.instrumentos.abreviatura
 *  o p.instrumento_abreviatura) y solo si no existe usa heurísticas.
 */
function getSolistaLabel(baseName, rawBaseName, abreviaturaFromDb) {
  if (abreviaturaFromDb && typeof abreviaturaFromDb === "string") {
    return abreviaturaFromDb.trim();
  }

  if (baseName.includes("flaut") || baseName.includes("picc")) return "Fl";
  if (baseName.includes("oboe") || baseName.includes("corno ing")) return "Ob";
  if (baseName.includes("clarin") || baseName.includes("requinto") || baseName.includes("basset")) return "Cl";
  if (baseName.includes("fagot") || baseName.includes("contraf")) return "Fg";
  if (baseName.includes("corno") || baseName.includes("trompa")) return "Cor";
  if (baseName.includes("trompet") || baseName.includes("fliscorno")) return "Tpt";
  if (baseName.includes("trombon") || baseName.includes("trombón")) return "Tbn";
  if (baseName.includes("tuba") || baseName.includes("bombard")) return "Tba";
  if (baseName.includes("timbal") || baseName.includes("perc timb") || baseName.includes("perc timp")) return "Timp";
  if (baseName.includes("perc") || baseName.includes("bombo") || baseName.includes("platillo") || baseName.includes("caja")) return "Perc";
  if (baseName.includes("arpa")) return "Hp";
  if (baseName.includes("piano") || baseName.includes("celesta") || baseName.includes("clavec") || baseName.includes("órgano")) return "Key";
  if (baseName.includes("violonc") || baseName.includes("vc")) return "Vc";
  if (baseName.includes("viol") || baseName.includes("contrab")) return "Vn";
  return rawBaseName.charAt(0).toUpperCase() + rawBaseName.slice(1);
}

export const calculateInstrumentation = (parts) => {
  if (!parts || parts.length === 0) return "";

  const families = {
    fl: { count: 0, notes: [] },
    ob: { count: 0, notes: [] },
    cl: { count: 0, notes: [] },
    bn: { count: 0, notes: [] },
    hn: { count: 0, notes: [] },
    tpt: { count: 0, notes: [] },
    tbn: { count: 0, notes: [] },
    tba: { count: 0, notes: [] }, // Tuba
    timp: false,
    perc: { count: 0, notes: [] },
    str: false,
    key: { count: 0, notes: [] },
    harp: { count: 0, notes: [] },
  };

  const others = {};
  const solistas = [];

  parts.forEach((p) => {
    const name = (p.nombre_archivo || "").toLowerCase();
    const rawBaseName =
      p.instrumento_nombre || p.instrumentos?.instrumento || "Desconocido";
    const baseName = rawBaseName.toLowerCase();
    const abreviaturaFromDb =
      p.instrumentos?.abreviatura || p.instrumento_abreviatura || null;
    const note = p.nota_organico ? p.nota_organico.trim() : null;

    if (
      baseName.includes("director") ||
      baseName.includes("conductor") ||
      baseName.includes("score") ||
      baseName.includes("partitura")
    ) {
      return;
    }

    if (p.es_solista) {
      solistas.push(getSolistaLabel(baseName, rawBaseName, abreviaturaFromDb));
      return;
    }

    const add = (famKey) => {
      families[famKey].count++;
      if (note) families[famKey].notes.push(note);
    };

    if (
      name.includes("perc timb") ||
      name.includes("perc timp") ||
      name.includes("perc. timb") ||
      baseName.includes("timbal")
    ) {
      families.timp = true;
    } else if (
      name.startsWith("perc") ||
      baseName.includes("perc") ||
      baseName.includes("bombo") ||
      baseName.includes("platillo") ||
      baseName.includes("caja")
    ) {
      add("perc");
    } else if (baseName.includes("flaut") || baseName.includes("picc"))
      add("fl");
    else if (baseName.includes("oboe") || baseName.includes("corno ing"))
      add("ob");
    else if (
      baseName.includes("clarin") ||
      baseName.includes("requinto") ||
      baseName.includes("basset")
    )
      add("cl");
    else if (baseName.includes("fagot") || baseName.includes("contraf"))
      add("bn");
    else if (baseName.includes("corno") || baseName.includes("trompa"))
      add("hn");
    else if (baseName.includes("trompet") || baseName.includes("fliscorno"))
      add("tpt");
    else if (baseName.includes("trombon") || baseName.includes("trombón"))
      add("tbn");
    else if (baseName.includes("tuba") || baseName.includes("bombard"))
      add("tba");
    else if (baseName.includes("arpa")) add("harp");
    else if (
      baseName.includes("piano") ||
      baseName.includes("celesta") ||
      baseName.includes("clavec") ||
      baseName.includes("órgano")
    )
      add("key");
    else if (baseName.includes("viol") || baseName.includes("contrab"))
      families.str = true;
    else {
      const cleanName =
        rawBaseName.charAt(0).toUpperCase() + rawBaseName.slice(1);
      if (!others[cleanName]) others[cleanName] = 0;
      others[cleanName]++;
    }
  });

  const fmt = (fam) => {
    if (fam.count === 0) return "0";
    let s = `${fam.count}`;
    if (fam.notes.length > 0) s += `(${fam.notes.join(", ")})`;
    return s;
  };

  // Construir string estándar (Maderas - Metales)
  let standardStr = `${fmt(families.fl)}.${fmt(families.ob)}.${fmt(families.cl)}.${fmt(families.bn)} - ${fmt(families.hn)}.${fmt(families.tpt)}.${fmt(families.tbn)}.${fmt(families.tba)}`;

  // Percusión: total de percusionistas como Perc / Perc.xN
  const percTotal = (families.timp ? 1 : 0) + families.perc.count;
  let percStr = formatPercussionLabel(percTotal);
  if (families.perc.notes.length > 0 && percStr !== "") {
    percStr += `(${families.perc.notes.join(", ")})`;
  }
  if (percStr) standardStr += ` - ${percStr}`;

  // Otros estándar (Arpa, Teclados, Cuerdas)
  if (families.harp.count > 0)
    standardStr += ` - ${families.harp.count > 1 ? families.harp.count : ""}Hp`;
  if (families.key.count > 0) standardStr += ` - Key`;
  if (families.str) standardStr += " - Str";

  // Verificar si la parte estándar está vacía (todo ceros)
  const isStandardEmpty =
    standardStr.startsWith("0.0.0.0 - 0.0.0.0") &&
    percTotal === 0 &&
    !families.str &&
    families.harp.count === 0 &&
    families.key.count === 0;

  // Formatear "Otros"
  const otherKeys = Object.keys(others);
  let othersStr = "";
  if (otherKeys.length > 0) {
    othersStr = otherKeys
      .map((k) => (others[k] > 1 ? `${k} x${others[k]}` : k))
      .join(", ");
  }

  let finalStr = "";
  if (isStandardEmpty) {
    finalStr = othersStr;
  } else {
    finalStr = standardStr
      .replace("0.0.0.0 - 0.0.0.0 - ", "")
      .replace("0.0.0.0 - 0.0.0.0", "");
    if (othersStr) finalStr += ` + ${othersStr}`;
  }

  // Agrupar solistas por etiqueta: "Fl, Fl" -> "2xFl"
  const solistaCounts = {};
  solistas.forEach((label) => {
    solistaCounts[label] = (solistaCounts[label] || 0) + 1;
  });
  const solistasStr =
    Object.keys(solistaCounts).length > 0
      ? Object.entries(solistaCounts)
          .map(([label, n]) => (n > 1 ? `${n}x${label}` : label))
          .join(", ")
      : "";
  if (solistasStr) {
    const rest = (finalStr || "").trim().replace(/^\s*-\s*|\s*-\s*$/g, "").trim();
    return rest ? `${solistasStr} - ${rest}` : solistasStr;
  }
  return finalStr || "";
};

const UNDETERMINED_INSTR_RE =
  /(?:sin\s+determin|a\s+definir|por\s+definir|desconocid|indetermin|\bs\/d\b|s\.d\.|\btbd\b|^n\/?a$|pendiente)/i;

/** True si el string de orgánico es parseable para filtrar (no vacío ni texto vago). */
export function isInstrumentationClearlyDetermined(instrRaw) {
  const instr = String(instrRaw || "").trim();
  if (!instr || instr === "-" || instr === "—") return false;
  if (UNDETERMINED_INSTR_RE.test(instr)) return false;

  if (/\d+\.\d+(?:\.\d+){0,3}/.test(instr)) return true;

  if (
    /\b(?:Str|Cuerd|Perc|Timp|Hp|Harp|Key|Pno|Pf|Cel)\b/i.test(instr) ||
    /Perc\.x\d+/i.test(instr)
  ) {
    return true;
  }

  if (
    /\d+\s*(?:Fl|Ob|Cl|Fg|Bn|Hn|Cor|Tpt|Tp|Tbn|Tb|Tba)/i.test(instr) ||
    /(?:Fl|Ob|Cl|Fg|Bn|Hn|Cor|Tpt|Tp|Tbn|Tb|Tba)\s*\.?\s*x\s*\d+/i.test(instr)
  ) {
    return true;
  }

  return false;
}

/** Mejor orgánico disponible para filtrar (campo explícito o inferido de particellas). */
export function resolveWorkInstrumentationForFilter(obra) {
  if (!obra) return "";
  const explicit = String(obra.instrumentacion || "").trim();
  const fromParts = calculateInstrumentation(obra.obras_particellas) || "";

  if (explicit && isInstrumentationClearlyDetermined(explicit)) return explicit;
  if (fromParts && isInstrumentationClearlyDetermined(fromParts)) return fromParts;
  return "";
}

export function isWorkInstrumentationClearlyDetermined(obra) {
  return !!resolveWorkInstrumentationForFilter(obra);
}

/** Filtro de orgánico: obras sin orgánico claro no se excluyen. */
export function workMatchesInstrumentationFilter(
  obra,
  { instrFilters = [], stringsFilter = "all", strictMode = false } = {},
) {
  if (!isWorkInstrumentationClearlyDetermined(obra)) return true;

  const instr = resolveWorkInstrumentationForFilter(obra);
  const hasStr = hasStrings(instr);

  if (stringsFilter !== "all") {
    if (stringsFilter === "with" && !hasStr) return false;
    if (stringsFilter === "without" && hasStr) return false;
  }

  const passActiveRules = instrFilters.every((rule) => {
    const countInWork = getInstrumentValue(instr, rule.instrument);
    const targetVal = parseInt(rule.value, 10) || 0;
    if (rule.operator === "eq") return countInWork === targetVal;
    if (rule.operator === "gte") return countInWork >= targetVal;
    if (rule.operator === "lte") return countInWork <= targetVal;
    return true;
  });
  if (!passActiveRules) return false;

  if (strictMode) {
    const activeKeys = new Set(instrFilters.map((r) => r.instrument));
    const masterList = [
      "fl",
      "ob",
      "cl",
      "bn",
      "hn",
      "tpt",
      "tbn",
      "tba",
      "timp",
      "perc",
      "harp",
      "key",
    ];
    for (const key of masterList) {
      if (!activeKeys.has(key) && (getInstrumentValue(instr, key) || 0) > 0) {
        return false;
      }
    }
    if (stringsFilter === "all" && hasStr) return false;
    if (instr.includes("+")) return false;
  }

  return true;
}

/** Clasifica una particella en familia de instrumentación estándar (o null si no aplica). */
export function classifyParticellaToInstrumentationFamily(part) {
  if (!part) return null;
  if (part.es_solista) return null;

  const name = (part.nombre_archivo || "").toLowerCase();
  const rawBaseName =
    part.instrumento_nombre || part.instrumentos?.instrumento || "";
  const baseName = rawBaseName.toLowerCase();

  if (
    baseName.includes("director") ||
    baseName.includes("conductor") ||
    baseName.includes("score") ||
    baseName.includes("partitura")
  ) {
    return null;
  }

  if (
    name.includes("perc timb") ||
    name.includes("perc timp") ||
    name.includes("perc. timb") ||
    baseName.includes("timbal")
  ) {
    return "timp";
  }
  if (
    name.startsWith("perc") ||
    baseName.includes("perc") ||
    baseName.includes("bombo") ||
    baseName.includes("platillo") ||
    baseName.includes("caja")
  ) {
    return "perc";
  }
  if (baseName.includes("flaut") || baseName.includes("picc")) return "fl";
  if (baseName.includes("oboe") || baseName.includes("corno ing")) return "ob";
  if (
    baseName.includes("clarin") ||
    baseName.includes("requinto") ||
    baseName.includes("basset")
  ) {
    return "cl";
  }
  if (baseName.includes("fagot") || baseName.includes("contraf")) return "bn";
  if (baseName.includes("corno") || baseName.includes("trompa")) return "hn";
  if (baseName.includes("trompet") || baseName.includes("fliscorno")) return "tpt";
  if (baseName.includes("trombon") || baseName.includes("trombón")) return "tbn";
  if (baseName.includes("tuba") || baseName.includes("bombard")) return "tba";
  if (baseName.includes("arpa")) return "harp";
  if (
    baseName.includes("piano") ||
    baseName.includes("celesta") ||
    baseName.includes("clavec") ||
    baseName.includes("órgano") ||
    baseName.includes("organo")
  ) {
    return "key";
  }
  if (baseName.includes("viol") || baseName.includes("contrab")) return "str";
  return null;
}

function buildFamilyCountsInstrumentationString(counts) {
  const fmt = (n) => String(n || 0);
  let standardStr = `${fmt(counts.fl)}.${fmt(counts.ob)}.${fmt(counts.cl)}.${fmt(counts.bn)} - ${fmt(counts.hn)}.${fmt(counts.tpt)}.${fmt(counts.tbn)}.${fmt(counts.tba)}`;

  const percPlayers = counts.percPlayers || 0;
  const percStr = formatPercussionLabel(percPlayers);
  if (percStr) standardStr += ` - ${percStr}`;

  if (counts.harp > 0) {
    standardStr += ` - ${counts.harp > 1 ? counts.harp : ""}Hp`;
  }
  if (counts.key > 0) standardStr += " - Key";
  if (counts.hasStr) standardStr += " - Str";

  const isStandardEmpty =
    standardStr.startsWith("0.0.0.0 - 0.0.0.0") &&
    percPlayers === 0 &&
    !counts.hasStr &&
    (counts.harp || 0) === 0 &&
    (counts.key || 0) === 0;

  if (isStandardEmpty) return "";

  return standardStr
    .replace("0.0.0.0 - 0.0.0.0 - ", "")
    .replace("0.0.0.0 - 0.0.0.0", "");
}

function createEmptyColumnMap() {
  return {
    Fl: 0,
    Ob: 0,
    Cl: 0,
    Fg: 0,
    Cr: 0,
    Tp: 0,
    Tb: 0,
    Tba: 0,
    Tim: 0,
    Perc: 0,
    Har: 0,
    Pno: 0,
    Str: 0,
  };
}

/** Mapa vacío Fl/Ob/…/Str (misma forma que seating y auditoría). */
export function createEmptyInstrumentationMap() {
  return createEmptyColumnMap();
}

/** Orgánico convocado por roster de gira (confirmados, no ausentes, rol músico). */
export function computeInstrumentationConvokedFromRoster(roster = []) {
  const acc = createEmptyInstrumentationMap();
  roster.forEach((m) => {
    if (m.estado_gira === "ausente") return;
    if (!countsTowardInstrumentationConvoked(m.rol_gira)) return;

    const idInstr = String(m.id_instr || "");
    const name = (m.instrumentos?.instrumento || "").toLowerCase();
    const familia = (m.instrumentos?.familia || "").toLowerCase();

    const add = (key) => {
      acc[key] += 1;
    };

    if (["01", "02", "03", "04"].includes(idInstr)) {
      add("Str");
      return;
    }

    if (name.includes("flaut") || name.includes("picc")) {
      add("Fl");
      return;
    }
    if (name.includes("oboe") || name.includes("corno ing")) {
      add("Ob");
      return;
    }
    if (
      name.includes("clarin") ||
      name.includes("requinto") ||
      name.includes("basset")
    ) {
      add("Cl");
      return;
    }
    if (name.includes("fagot") || name.includes("contraf")) {
      add("Fg");
      return;
    }
    if (name.includes("corno") || name.includes("trompa")) {
      add("Cr");
      return;
    }
    if (name.includes("trompet") || name.includes("fliscorno")) {
      add("Tp");
      return;
    }
    if (name.includes("trombon") || name.includes("trombón")) {
      add("Tb");
      return;
    }
    if (name.includes("tuba") || name.includes("bombard")) {
      add("Tba");
      return;
    }
    if (name.includes("timbal")) {
      add("Tim");
      return;
    }
    if (
      name.includes("perc") ||
      name.includes("bombo") ||
      name.includes("platillo") ||
      name.includes("caja")
    ) {
      add("Perc");
      return;
    }
    if (name.includes("arpa")) {
      add("Har");
      return;
    }
    if (
      name.includes("piano") ||
      name.includes("teclado") ||
      name.includes("celesta") ||
      name.includes("órgano") ||
      name.includes("organo")
    ) {
      add("Pno");
      return;
    }

    if (familia.includes("cuerd")) {
      add("Str");
    }
  });

  return acc;
}

function getPercComparableTotal(columnMap) {
  return (columnMap.Tim || 0) + (columnMap.Perc || 0);
}

const FAMILY_TO_COLUMN = {
  fl: "Fl",
  ob: "Ob",
  cl: "Cl",
  bn: "Fg",
  hn: "Cr",
  tpt: "Tp",
  tbn: "Tb",
  tba: "Tba",
  timp: "Perc",
  perc: "Perc",
  harp: "Har",
  key: "Pno",
  str: "Str",
};

export { getPercComparableTotal };

function internalAssignmentCountsToColumnMap(counts) {
  const map = createEmptyColumnMap();
  map.Fl = counts.fl || 0;
  map.Ob = counts.ob || 0;
  map.Cl = counts.cl || 0;
  map.Fg = counts.bn || 0;
  map.Cr = counts.hn || 0;
  map.Tp = counts.tpt || 0;
  map.Tb = counts.tbn || 0;
  map.Tba = counts.tba || 0;
  map.Har = counts.harp || 0;
  map.Pno = counts.key || 0;
  map.Str = counts.hasStr ? 1 : 0;
  map.Tim = 0;
  map.Perc = counts.percPlayers || 0;
  return map;
}

/**
 * Conteo por archivo de particella (slots de parte en la obra).
 */
export function calculateInstrumentationCountsFromParts(parts = []) {
  const tallies = {
    fl: 0,
    ob: 0,
    cl: 0,
    bn: 0,
    hn: 0,
    tpt: 0,
    tbn: 0,
    tba: 0,
    harp: 0,
    key: 0,
    timpPartFiles: 0,
    percPartFiles: 0,
    hasStr: false,
  };

  (parts || []).forEach((part) => {
    const familyKey = classifyParticellaToInstrumentationFamily(part);
    if (!familyKey) return;
    if (familyKey === "str") {
      tallies.hasStr = true;
      return;
    }
    if (familyKey === "timp") {
      tallies.timpPartFiles += 1;
      return;
    }
    if (familyKey === "perc") {
      tallies.percPartFiles += 1;
      return;
    }
    if (tallies[familyKey] !== undefined) tallies[familyKey] += 1;
  });

  const map = createEmptyColumnMap();
  map.Fl = tallies.fl;
  map.Ob = tallies.ob;
  map.Cl = tallies.cl;
  map.Fg = tallies.bn;
  map.Cr = tallies.hn;
  map.Tp = tallies.tpt;
  map.Tb = tallies.tbn;
  map.Tba = tallies.tba;
  map.Har = tallies.harp;
  map.Pno = tallies.key;
  map.Str = tallies.hasStr ? 1 : 0;
  const percTotal = tallies.timpPartFiles + tallies.percPartFiles;
  map.Tim = 0;
  map.Perc = percTotal;
  return map;
}

/** Convierte mapa de columnas (Fl, Ob, …) a string estándar de instrumentación. */
export function instrumentationColumnMapToString(columnMap) {
  if (!columnMap) return "";
  return buildFamilyCountsInstrumentationString({
    fl: columnMap.Fl || 0,
    ob: columnMap.Ob || 0,
    cl: columnMap.Cl || 0,
    bn: columnMap.Fg || 0,
    hn: columnMap.Cr || 0,
    tpt: columnMap.Tp || 0,
    tbn: columnMap.Tb || 0,
    tba: columnMap.Tba || 0,
    harp: columnMap.Har || 0,
    key: columnMap.Pno || 0,
    hasStr: (columnMap.Str || 0) > 0,
    percPlayers: getPercComparableTotal(columnMap),
    hasTimp: false,
  });
}

/**
 * Requerido efectivo por obra:
 * - Familia con particellas sin asignar → conteo real por archivos de parte.
 * - Familia consolidada (todas asignadas, varias partes en un músico) → músicos asignados.
 * - Resto → máximo entre archivos y asignados.
 */
export function getEffectiveRequiredColumnMap(
  partsColumnMap,
  assignedColumnMap,
  unassignedFamilies = [],
  consolidatedFamilies = [],
) {
  const unassigned = new Set(unassignedFamilies);
  const consolidated = new Set(consolidatedFamilies);
  const result = createEmptyColumnMap();
  const keys = ["Fl", "Ob", "Cl", "Fg", "Cr", "Tp", "Tb", "Tba", "Har", "Pno", "Str"];

  keys.forEach((key) => {
    const partsCount = partsColumnMap?.[key] || 0;
    const assignedCount = assignedColumnMap?.[key] || 0;

    if (!assignedColumnMap) {
      result[key] = partsCount;
      return;
    }

    if (unassigned.has(key)) {
      result[key] = partsCount;
    } else if (consolidated.has(key)) {
      result[key] = assignedCount;
    } else if (partsCount > 0 || assignedCount > 0) {
      result[key] = Math.max(partsCount, assignedCount);
    }
  });

  const partsPerc = getPercComparableTotal(partsColumnMap || {});
  const assignedPerc = getPercComparableTotal(assignedColumnMap || {});

  if (!assignedColumnMap) {
    result.Tim = 0;
    result.Perc = partsPerc;
  } else if (unassigned.has("Perc")) {
    result.Tim = 0;
    result.Perc = partsPerc;
  } else if (consolidated.has("Perc")) {
    result.Tim = 0;
    result.Perc = assignedPerc;
  } else if (partsPerc > 0 || assignedPerc > 0) {
    result.Tim = 0;
    result.Perc = Math.max(partsPerc, assignedPerc);
  }

  return result;
}

/** Familias con al menos una particella sin asignar en seating. */
export function getInstrumentationUnassignedFamilies(parts = [], particellaCounts = {}) {
  const unassigned = new Set();

  (parts || []).forEach((part) => {
    if (particellaCounts?.[part.id]) return;
    const familyKey = classifyParticellaToInstrumentationFamily(part);
    const column = familyKey ? FAMILY_TO_COLUMN[familyKey] : null;
    if (column) unassigned.add(column);
  });

  return Array.from(unassigned);
}

/**
 * Familias cubiertas al 100% pero con menos músicos que archivos de parte
 * (asignación múltiple / consolidación).
 */
export function getInstrumentationConsolidatedFamilies(
  partsColumnMap,
  assignedColumnMap,
  unassignedFamilies = [],
) {
  if (!partsColumnMap || !assignedColumnMap) return [];

  const blocked = new Set(unassignedFamilies);
  const consolidated = new Set();
  const keys = ["Fl", "Ob", "Cl", "Fg", "Cr", "Tp", "Tb", "Tba", "Har", "Pno", "Str"];

  keys.forEach((key) => {
    if (blocked.has(key)) return;
    const partsCount = partsColumnMap[key] || 0;
    const assignedCount = assignedColumnMap[key] || 0;
    if (partsCount > 0 && assignedCount > 0 && partsCount > assignedCount) {
      consolidated.add(key);
    }
  });

  if (!blocked.has("Perc")) {
    const partsPerc = getPercComparableTotal(partsColumnMap);
    const assignedPerc = getPercComparableTotal(assignedColumnMap);
    if (partsPerc > 0 && assignedPerc > 0 && partsPerc > assignedPerc) {
      consolidated.add("Perc");
    }
  }

  return Array.from(consolidated);
}

export function maxInstrumentationColumnMap(maps = []) {
  const acc = createEmptyColumnMap();
  maps.forEach((map) => {
    if (!map) return;
    ["Fl", "Ob", "Cl", "Fg", "Cr", "Tp", "Tb", "Tba", "Har", "Pno", "Str"].forEach(
      (key) => {
        if ((map[key] || 0) > (acc[key] || 0)) acc[key] = map[key];
      },
    );
    if (getPercComparableTotal(map) > getPercComparableTotal(acc)) {
      acc.Tim = 0;
      acc.Perc = getPercComparableTotal(map);
    }
  });
  return acc;
}

/**
 * Instrumentación requerida por obra a partir del seating asignado.
 * Varias partes del mismo instrumento en una persona cuentan como un jugador.
 */
export function calculateInstrumentationFromSeatingAssignments({
  obraId,
  containers = [],
  assignments = {},
  musicianAssignments = {},
  particellas = [],
}) {
  const findPart = (partId) =>
    particellas.find((p) => String(p.id) === String(partId));

  const playersByFamily = {
    fl: new Set(),
    ob: new Set(),
    cl: new Set(),
    bn: new Set(),
    hn: new Set(),
    tpt: new Set(),
    tbn: new Set(),
    tba: new Set(),
    harp: new Set(),
    key: new Set(),
  };
  const percussionMusicians = new Set();
  let hasTimp = false;
  let hasStr = false;
  let hasAssignments = false;

  const registerMusicianPart = (musicianKey, familyKey) => {
    if (!familyKey) return;
    hasAssignments = true;

    if (familyKey === "str") {
      hasStr = true;
      return;
    }

    if (familyKey === "timp") {
      hasTimp = true;
      percussionMusicians.add(musicianKey);
    } else if (familyKey === "perc") {
      percussionMusicians.add(musicianKey);
    } else if (playersByFamily[familyKey]) {
      playersByFamily[familyKey].add(musicianKey);
    }
  };

  containers.forEach((container) => {
    const partId = assignments[`C-${container.id}-${obraId}`];
    if (!partId) return;
    const part = findPart(partId);
    registerMusicianPart(`container:${container.id}`, classifyParticellaToInstrumentationFamily(part));
  });

  Object.entries(musicianAssignments).forEach(([key, partIds]) => {
    const suffix = `-${obraId}`;
    if (!key.startsWith("M-") || !key.endsWith(suffix)) return;
    const musicianId = key.slice(2, -suffix.length);
    if (!musicianId) return;

    (partIds || []).forEach((partId) => {
      const part = findPart(partId);
      registerMusicianPart(String(musicianId), classifyParticellaToInstrumentationFamily(part));
    });
  });

  if (!hasAssignments) {
    return {
      instrumentation: "",
      hasAssignments: false,
      consolidatedFamilies: [],
      columnMap: createEmptyColumnMap(),
    };
  }

  const counts = {
    fl: playersByFamily.fl.size,
    ob: playersByFamily.ob.size,
    cl: playersByFamily.cl.size,
    bn: playersByFamily.bn.size,
    hn: playersByFamily.hn.size,
    tpt: playersByFamily.tpt.size,
    tbn: playersByFamily.tbn.size,
    tba: playersByFamily.tba.size,
    harp: playersByFamily.harp.size,
    key: playersByFamily.key.size,
    hasTimp,
    percPlayers: percussionMusicians.size,
    hasStr,
  };

  return {
    instrumentation: buildFamilyCountsInstrumentationString(counts),
    hasAssignments: true,
    consolidatedFamilies: [],
    columnMap: internalAssignmentCountsToColumnMap(counts),
  };
}

export function instrumentationStringToColumnMap(instString) {
  if (!instString) return createEmptyColumnMap();
  return {
    Fl: getInstrumentValue(instString, "fl") || 0,
    Ob: getInstrumentValue(instString, "ob") || 0,
    Cl: getInstrumentValue(instString, "cl") || 0,
    Fg: getInstrumentValue(instString, "bn") || 0,
    Cr: getInstrumentValue(instString, "hn") || 0,
    Tp: getInstrumentValue(instString, "tpt") || 0,
    Tb: getInstrumentValue(instString, "tbn") || 0,
    Tba: getInstrumentValue(instString, "tba") || 0,
    Tim: 0,
    Perc: parsePercussionTotalFromString(instString),
    Har: getInstrumentValue(instString, "harp") || 0,
    Pno: getInstrumentValue(instString, "key") || 0,
    Str: getInstrumentValue(instString, "str") || 0,
  };
}

export function parseSeatingAssignmentsFromRows(rows = []) {
  const assignments = {};
  const musicianAssignments = {};
  rows.forEach((row) => {
    const obraId = row.id_obra;
    if (row.id_contenedor) {
      assignments[`C-${row.id_contenedor}-${obraId}`] = row.id_particella;
    } else if (row.id_musicos_asignados) {
      row.id_musicos_asignados.forEach((mId) => {
        const key = `M-${mId}-${obraId}`;
        if (!musicianAssignments[key]) musicianAssignments[key] = [];
        if (
          !musicianAssignments[key].some(
            (partId) => String(partId) === String(row.id_particella),
          )
        ) {
          musicianAssignments[key].push(row.id_particella);
        }
      });
    }
  });
  return { assignments, musicianAssignments };
}

export function buildParticellaAssignmentCounts(rows = []) {
  const counts = {};
  rows.forEach((row) => {
    if (!row.id_particella) return;
    counts[row.id_particella] = (counts[row.id_particella] || 0) + 1;
  });
  return counts;
}

export function buildWorkInstrumentationAuditRow({
  obraId,
  manualInstrumentacion = "",
  parts = [],
  particellaCounts = {},
  containers = [],
  assignments = {},
  musicianAssignments = {},
  particellas = [],
}) {
  const partsColumnMap = calculateInstrumentationCountsFromParts(parts);
  const unassignedFamilies = getInstrumentationUnassignedFamilies(
    parts,
    particellaCounts,
  );
  const fromAssignments = calculateInstrumentationFromSeatingAssignments({
    obraId,
    containers,
    assignments,
    musicianAssignments,
    particellas,
  });

  let effectiveColumnMap = partsColumnMap;
  let consolidatedFamilies = [];
  let instString = "";

  if (fromAssignments.hasAssignments) {
    consolidatedFamilies = getInstrumentationConsolidatedFamilies(
      partsColumnMap,
      fromAssignments.columnMap,
      unassignedFamilies,
    );
    effectiveColumnMap = getEffectiveRequiredColumnMap(
      partsColumnMap,
      fromAssignments.columnMap,
      unassignedFamilies,
      consolidatedFamilies,
    );
    instString = instrumentationColumnMapToString(effectiveColumnMap);
  } else if (parts.length > 0) {
    instString = calculateInstrumentation(parts) || "";
    effectiveColumnMap = partsColumnMap;
  } else if (manualInstrumentacion) {
    instString = manualInstrumentacion;
    effectiveColumnMap = instrumentationStringToColumnMap(manualInstrumentacion);
  }

  if (
    manualInstrumentacion &&
    (!instString ||
      instString === "s/d" ||
      !hasInstrumentationMapContent(effectiveColumnMap))
  ) {
    instString = manualInstrumentacion;
    effectiveColumnMap = instrumentationStringToColumnMap(manualInstrumentacion);
    consolidatedFamilies = [];
  }

  return {
    instrumentacion_effective: instString,
    instrumentation_effective_column_map: effectiveColumnMap,
    instrumentation_consolidated_families: consolidatedFamilies,
    instrumentation_unassigned_families: unassignedFamilies,
    instrumentation_parts_column_map: partsColumnMap,
  };
}

export function buildProgramInstrumentationAudit(blocks = [], seatingContext = {}) {
  const {
    assigns = [],
    containers = [],
    particellasByObra = {},
    particellas = [],
  } = seatingContext;

  const particellaCounts = buildParticellaAssignmentCounts(assigns);
  const { assignments, musicianAssignments } =
    parseSeatingAssignmentsFromRows(assigns);

  const workRows = [];
  (blocks || []).forEach((block) => {
    (block.repertorio_obras || []).forEach((ro) => {
      if (!ro || ro.excluir) return;

      if (isRepertorioPlaceholder(ro)) {
        const audit = buildWorkInstrumentationAuditRow({
          obraId: `placeholder-${ro.id}`,
          manualInstrumentacion: ro.instrumentacion_placeholder || "",
          parts: [],
          particellaCounts,
          containers,
          assignments,
          musicianAssignments,
          particellas,
        });

        workRows.push({
          id: ro.id,
          obra_id: null,
          is_placeholder: true,
          title: ro.titulo_placeholder || "Reserva",
          composerLabel: null,
          estado: null,
          instrumentacion: ro.instrumentacion_placeholder || "",
          link_drive: null,
          ...audit,
        });
        return;
      }

      const obra = ro.obras;
      if (!obra) return;

      const parts =
        particellasByObra[obra.id] ||
        particellas.filter((p) => String(p.id_obra) === String(obra.id));

      const audit = buildWorkInstrumentationAuditRow({
        obraId: obra.id,
        manualInstrumentacion: obra.instrumentacion || "",
        parts,
        particellaCounts,
        containers,
        assignments,
        musicianAssignments,
        particellas,
      });

      const ocList = Array.isArray(obra.obras_compositores)
        ? obra.obras_compositores
        : obra.obras_compositores
          ? [obra.obras_compositores]
          : [];
      const composerEntry =
        ocList.find((oc) => oc.rol === "compositor") || ocList[0];
      const comp = composerEntry?.compositores;
      const composerLabel = comp
        ? `${comp.apellido || ""}, ${comp.nombre || ""}`.trim()
        : "";

      workRows.push({
        id: ro.id,
        obra_id: obra.id,
        title: obra.titulo || "Obra",
        composerLabel: composerLabel || null,
        estado: obra.estado || null,
        instrumentacion: obra.instrumentacion || "",
        link_drive: obra.link_drive || null,
        ...audit,
      });
    });
  });

  const required = maxInstrumentationColumnMap(
    workRows.map((w) => w.instrumentation_effective_column_map),
  );
  const partsMax = maxInstrumentationColumnMap(
    workRows.map((w) => w.instrumentation_parts_column_map),
  );

  return { required, workRows, partsMax };
}

export function computeInstrumentationRequiredConsolidated(
  instrumentationRequired,
  instrumentationConvoked,
  instrumentationPartsMax,
) {
  const consolidated = {};
  const keys = [
    "Fl",
    "Ob",
    "Cl",
    "Fg",
    "Cr",
    "Tp",
    "Tb",
    "Tba",
    "Har",
    "Pno",
    "Str",
    "Perc",
  ];

  keys.forEach((key) => {
    if (key === "Perc") {
      const reqP = getPercComparableTotal(instrumentationRequired || {});
      const convP = getPercComparableTotal(instrumentationConvoked || {});
      const partsP = getPercComparableTotal(instrumentationPartsMax || {});
      consolidated.Perc = reqP === convP && partsP > reqP;
      return;
    }
    const req = instrumentationRequired?.[key] || 0;
    const conv = instrumentationConvoked?.[key] || 0;
    consolidated[key] =
      req === conv && (instrumentationPartsMax?.[key] || 0) > req;
  });

  return consolidated;
}

export function hasInstrumentationDeficit(required, convoked) {
  const requiredPerc = getPercComparableTotal(required || {});
  const convokedPerc = getPercComparableTotal(convoked || {});
  const keys = [
    "Fl",
    "Ob",
    "Cl",
    "Fg",
    "Cr",
    "Tp",
    "Tb",
    "Tba",
    "Perc",
    "Har",
    "Pno",
  ];

  return keys.some((k) => {
    if (k === "Perc") return requiredPerc > convokedPerc;
    return (required?.[k] || 0) > (convoked?.[k] || 0);
  });
}

/** Segundos efectivos en fila de repertorio: override por programa o catálogo. */
export const effectiveRepertorioObraDurationSeconds = (item) => {
  if (!item) return 0;
  const ov = item.duracion_segundos_concierto;
  if (ov !== null && ov !== undefined && ov !== "") {
    const n = Number(ov);
    if (Number.isFinite(n) && n >= 0) return Math.floor(n);
  }
  return item.obras?.duracion_segundos || 0;
};

/** Hay duración solo para este programa/bloque (distinta del uso del catálogo). */
export const hasRepertorioObraDurationOverride = (item) => {
  if (!item) return false;
  const ov = item.duracion_segundos_concierto;
  if (ov === null || ov === undefined) return false;
  const n = Number(ov);
  return Number.isFinite(n) && n >= 0;
};

export const calculateTotalDuration = (works) => {
  if (!works) return "0h 0m";
  const totalSeconds = works.reduce(
    (acc, item) => acc + effectiveRepertorioObraDurationSeconds(item),
    0,
  );
  return formatSecondsToHm(totalSeconds);
};

/** Duración sin obras marcadas como excluidas de la programación (`excluir`). */
export const calculateNetDuration = (works) => {
  if (!works) return "0h 0m";
  const totalSeconds = works.reduce((acc, item) => {
    if (item.excluir) return acc;
    return acc + effectiveRepertorioObraDurationSeconds(item);
  }, 0);
  return formatSecondsToHm(totalSeconds);
};
