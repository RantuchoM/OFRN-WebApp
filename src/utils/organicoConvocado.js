import { countsTowardInstrumentationConvoked } from "./instrumentation";
import {
  buildStringsCompositionDetail,
  formatStringsCompositionParen,
} from "./seatingStringsComposition";

export const ORGANICO_KEYS = [
  "Fl",
  "Ob",
  "Cl",
  "Fg",
  "Cr",
  "Tp",
  "Tb",
  "Tba",
  "Tim",
  "Perc",
  "Har",
  "Pno",
  "Str",
];

export function createEmptyOrganicoMap() {
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

/** Mapa de familias convocado. Misma regla que los badges de instrumentación. */
export function computeConvoked(roster) {
  const acc = createEmptyOrganicoMap();
  if (!roster || roster.length === 0) return acc;

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

export function normalizeOrganicoMap(value) {
  const acc = createEmptyOrganicoMap();
  if (!value || typeof value !== "object") return acc;
  ORGANICO_KEYS.forEach((key) => {
    const n = Number(value[key]);
    acc[key] = Number.isFinite(n) ? n : 0;
  });
  return acc;
}

/** Detalle Vn1.Vn2.Va.Vc.Cb guardado junto al mapa (opcional). */
export function normalizeStringsComposition(value) {
  const src = value?.strings;
  if (!src || typeof src !== "object") return null;
  const vn1 = Number(src.vn1) || 0;
  const vn2 = Number(src.vn2) || 0;
  const va = Number(src.va) || 0;
  const vc = Number(src.vc) || 0;
  const cb = Number(src.cb) || 0;
  const total = vn1 + vn2 + va + vc + cb;
  if (total <= 0) return null;
  return {
    vn1,
    vn2,
    va,
    vc,
    cb,
    vnEstimated: !!src.vnEstimated,
    total,
  };
}

export function organicoMapsEqual(a, b) {
  const left = normalizeOrganicoMap(a);
  const right = normalizeOrganicoMap(b);
  if (!ORGANICO_KEYS.every((key) => left[key] === right[key])) return false;
  const ls = normalizeStringsComposition(a);
  const rs = normalizeStringsComposition(b);
  if (!ls && !rs) return true;
  if (!ls || !rs) return false;
  return (
    ls.vn1 === rs.vn1 &&
    ls.vn2 === rs.vn2 &&
    ls.va === rs.va &&
    ls.vc === rs.vc &&
    ls.cb === rs.cb &&
    ls.vnEstimated === rs.vnEstimated
  );
}

/**
 * Mapa para la matriz de Gestión. Las cuerdas no entran en Conv
 * (solo en vacantes); el cache sí las cuenta para el texto y los badges.
 */
export function organicoMapForAudit(stored) {
  if (!stored || typeof stored !== "object") return null;
  const map = normalizeOrganicoMap(stored);
  map.Str = 0;
  return map;
}

export function formatInstrumentationStandard(map, stringsDetail = null) {
  const source = map || createEmptyOrganicoMap();
  const fl = source.Fl || 0;
  const ob = source.Ob || 0;
  const cl = source.Cl || 0;
  const bn = source.Fg || 0;
  const hn = source.Cr || 0;
  const tpt = source.Tp || 0;
  const tbn = source.Tb || 0;
  const tba = source.Tba || 0;

  const percTotal = (source.Tim || 0) + (source.Perc || 0);
  const harpCount = source.Har || 0;
  const keyCount = source.Pno || 0;
  const hasStr = (source.Str || 0) > 0;
  const strings =
    stringsDetail ||
    normalizeStringsComposition(source) ||
    null;
  const stringsParen = formatStringsCompositionParen(strings);

  let standardStr = `${fl}.${ob}.${cl}.${bn} - ${hn}.${tpt}.${tbn}.${tba}`;

  let percStr = "";
  if (percTotal === 1) percStr = "Perc";
  else if (percTotal > 1) percStr = `Perc.x${percTotal}`;
  if (percStr) standardStr += ` - ${percStr}`;

  if (harpCount > 0) standardStr += ` - ${harpCount > 1 ? harpCount : ""}Hp`;
  if (keyCount > 0) standardStr += " - Key";
  if (hasStr) {
    standardStr += stringsParen ? ` - Str ${stringsParen}` : " - Str";
  }

  const isStandardEmpty =
    standardStr.startsWith("0.0.0.0 - 0.0.0.0") &&
    percTotal === 0 &&
    !hasStr &&
    harpCount === 0 &&
    keyCount === 0;

  if (isStandardEmpty) return "s/d";

  return standardStr
    .replace("0.0.0.0 - 0.0.0.0 - ", "")
    .replace("0.0.0.0 - 0.0.0.0", "");
}

/**
 * @param {Array} roster
 * @param {Map|null} [musicianContainerLabels] — seating; sin labels → violines a mitad estimada
 */
export function snapshotFromRoster(roster, musicianContainerLabels = null) {
  const map = computeConvoked(roster);
  let strings = buildStringsCompositionDetail(
    roster,
    musicianContainerLabels,
  );
  // Si hay Str en el mapa pero falló el detalle (p. ej. labels raros),
  // reintenta sin contenedores → mitad estimada de violines.
  if (!strings && (map.Str || 0) > 0) {
    strings = buildStringsCompositionDetail(roster, null);
  }
  if (strings) {
    map.strings = {
      vn1: strings.vn1,
      vn2: strings.vn2,
      va: strings.va,
      vc: strings.vc,
      cb: strings.cb,
      vnEstimated: strings.vnEstimated,
      total: strings.total,
    };
  }
  const formatted = formatInstrumentationStandard(map, strings);
  const text = formatted === "s/d" ? "" : formatted;
  return { text, map, strings };
}
