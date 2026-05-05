import { formatSecondsToHm } from "./time";

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

  // Percusión (criterio original: Timp.+n o Perc.xn)
  let percStr = "";
  if (families.timp) {
    percStr = families.perc.count > 0 ? `Timp.+${families.perc.count}` : "Timp";
  } else {
    if (families.perc.count === 1) percStr = "Perc";
    else if (families.perc.count > 1) percStr = `Perc.x${families.perc.count}`;
  }
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
    !families.timp &&
    families.perc.count === 0 &&
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

export const calculateTotalDuration = (works) => {
  if (!works) return "0h 0m";
  const totalSeconds = works.reduce(
    (acc, item) => acc + (item.obras?.duracion_segundos || 0),
    0,
  );
  return formatSecondsToHm(totalSeconds);
};

/** Duración sin obras marcadas como excluidas de la programación (`excluir`). */
export const calculateNetDuration = (works) => {
  if (!works) return "0h 0m";
  const totalSeconds = works.reduce((acc, item) => {
    if (item.excluir) return acc;
    return acc + (item.obras?.duracion_segundos || 0);
  }, 0);
  return formatSecondsToHm(totalSeconds);
};
