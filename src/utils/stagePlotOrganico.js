import { countsTowardInstrumentationConvoked } from "./instrumentation";
import {
  stagePlotItemHasInstrumentFootprint,
  stagePlotItemUsesBanqueta,
} from "./stagePlotCatalog";

/**
 * Filas de orgánico para comparar plano vs roster convocado.
 * `types` = tipos del catálogo stage-plot que suman al dibujado.
 * Cuerdas se desglosan por id_instr (01–04); piano+celesta agrupan teclado.
 */
export const STAGE_PLOT_ORGANICO_ROWS = [
  { key: "violin", label: "Violín", types: ["violin"], idInstr: ["01"] },
  { key: "viola", label: "Viola", types: ["viola"], idInstr: ["02"] },
  { key: "cello", label: "Cello", types: ["cello"], idInstr: ["03"] },
  { key: "bass", label: "Contrabajo", types: ["bass"], idInstr: ["04"] },
  { key: "harp", label: "Arpa", types: ["harp"], nameMatch: ["arpa"] },
  {
    key: "guitar",
    label: "Guitarra",
    types: ["guitar"],
    idInstr: ["21"],
    nameMatch: ["guitar"],
  },
  {
    key: "bandoneon",
    label: "Bandoneón",
    types: ["bandoneon"],
    idInstr: ["22b"],
    nameMatch: ["bandone"],
  },
  { key: "flute", label: "Flauta", types: ["flute"], nameMatch: ["flaut", "picc"] },
  { key: "oboe", label: "Oboe", types: ["oboe"], nameMatch: ["oboe", "corno ing"] },
  {
    key: "clarinet",
    label: "Clarinete",
    types: ["clarinet"],
    nameMatch: ["clarin", "requinto", "basset"],
  },
  {
    key: "bassoon",
    label: "Fagot",
    types: ["bassoon"],
    nameMatch: ["fagot", "contraf"],
  },
  {
    key: "horn",
    label: "Trompa",
    types: ["horn"],
    nameMatch: ["corno", "trompa"],
  },
  {
    key: "trumpet",
    label: "Trompeta",
    types: ["trumpet"],
    nameMatch: ["trompet", "fliscorno"],
  },
  {
    key: "trombone",
    label: "Trombón",
    types: ["trombone"],
    nameMatch: ["trombon", "trombón"],
  },
  {
    key: "tuba",
    label: "Tuba",
    types: ["tuba"],
    nameMatch: ["tuba", "bombard"],
  },
  {
    key: "timpani",
    label: "Timbales",
    types: ["timpani"],
    nameMatch: ["timbal"],
  },
  {
    key: "perc",
    label: "Percusión",
    types: ["perc"],
    nameMatch: ["perc", "bombo", "platillo", "caja"],
  },
  {
    key: "keyboard",
    label: "Piano / Celesta",
    types: ["piano", "celesta"],
    nameMatch: ["piano", "teclado", "celesta", "órgano", "organo"],
  },
];

/** Claves que comparten atril de a 2 (ceil(n/2)): vn, va, vc, contrabajo. */
export const STAGE_PLOT_SHARED_ATRIL_KEYS = new Set([
  "violin",
  "viola",
  "cello",
  "bass",
]);

/** Claves de orgánico que cuentan como banqueta (no silla). */
export const STAGE_PLOT_BANQUETA_ORGANICO_KEYS = new Set([
  "bass",
  "timpani",
  "perc",
]);

const TYPE_TO_KEY = new Map();
for (const row of STAGE_PLOT_ORGANICO_ROWS) {
  for (const t of row.types) TYPE_TO_KEY.set(t, row.key);
}

/** @param {Array<{ type?: string }>} items */
export function countStagePlotDrawnByOrganico(items = []) {
  const acc = Object.fromEntries(
    STAGE_PLOT_ORGANICO_ROWS.map((r) => [r.key, 0]),
  );
  for (const it of items) {
    const key = TYPE_TO_KEY.get(it?.type);
    if (key) acc[key] += 1;
  }
  return acc;
}

/**
 * Orgánico convocado (misma regla de ausencia/rol que seating),
 * con cuerdas desglosadas por id_instr.
 * @param {Array} roster
 */
export function computeStagePlotOrganicoFromRoster(roster = []) {
  const acc = Object.fromEntries(
    STAGE_PLOT_ORGANICO_ROWS.map((r) => [r.key, 0]),
  );

  for (const m of roster) {
    if (m.estado_gira === "ausente") continue;
    if (!countsTowardInstrumentationConvoked(m.rol_gira)) continue;

    const idInstr = String(m.id_instr || "");
    const name = (m.instrumentos?.instrumento || "").toLowerCase();

    const byId = STAGE_PLOT_ORGANICO_ROWS.find(
      (r) => r.idInstr && r.idInstr.includes(idInstr),
    );
    if (byId) {
      acc[byId.key] += 1;
      continue;
    }

    const byName = STAGE_PLOT_ORGANICO_ROWS.find(
      (r) =>
        !r.idInstr &&
        Array.isArray(r.nameMatch) &&
        r.nameMatch.some((frag) => name.includes(frag)),
    );
    if (byName) {
      acc[byName.key] += 1;
    }
  }

  return acc;
}

/**
 * Clasifica un músico del roster para mobiliario / atriles.
 * @returns {"bass"|"perc"|"chair"|null}
 */
export function classifyStagePlotMusicianSeat(member) {
  if (!member) return null;
  if (member.estado_gira === "ausente") return null;
  if (!countsTowardInstrumentationConvoked(member.rol_gira)) return null;

  const idInstr = String(member.id_instr || "");
  const name = (member.instrumentos?.instrumento || "").toLowerCase();
  const familia = (member.instrumentos?.familia || "").toLowerCase();

  if (idInstr === "04" || name.includes("contrabaj")) return "bass";
  if (
    familia.includes("percus") ||
    name.includes("timbal") ||
    name.includes("perc") ||
    name.includes("bombo") ||
    name.includes("platillo") ||
    name.includes("caja") ||
    name.includes("xilof") ||
    name.includes("vibraf") ||
    name.includes("marimba") ||
    name.includes("campana")
  ) {
    return "perc";
  }
  return "chair";
}

/**
 * Clave organico para atril compartido (vn/va/vc/bass) o null.
 * @param {object} member
 */
function organicoKeyForAtrilShare(member) {
  const idInstr = String(member?.id_instr || "");
  if (idInstr === "01") return "violin";
  if (idInstr === "02") return "viola";
  if (idInstr === "03") return "cello";
  if (idInstr === "04") return "bass";
  return null;
}

/**
 * Atriles necesarios desde conteos por clave organico.
 * vn/va/vc/bass → ceil(n/2); resto 1:1.
 * @param {Record<string, number>} countsByKey
 * @param {number} [extraOnes=0] instrumentistas sin fila organico (1:1)
 */
export function atrilesFromOrganicoCounts(countsByKey = {}, extraOnes = 0) {
  let n = Math.max(0, Number(extraOnes) || 0);
  for (const row of STAGE_PLOT_ORGANICO_ROWS) {
    const c = Number(countsByKey[row.key]) || 0;
    if (c <= 0) continue;
    if (STAGE_PLOT_SHARED_ATRIL_KEYS.has(row.key)) {
      n += Math.ceil(c / 2);
    } else {
      n += c;
    }
  }
  return n;
}

/**
 * Mobiliario + atriles: needed (roster) vs drawn (plano).
 * - Sillas: 1 × instrumentista que no es contrabajo ni percusión.
 * - Banquetas needed: #contrabajo + #percusionistas.
 * - Banquetas drawn: ítems `bass` (auto) + ítems `banqueta` (manual perc).
 * - Atriles: 1/instr salvo vn/va/vc/bass = ceil(n/2); drawn desde huellas.
 *
 * @param {Array} items
 * @param {Array} roster
 */
export function computeStagePlotFurnitureSummary(items = [], roster = []) {
  let sillasNeeded = 0;
  let banquetasNeeded = 0;
  const atrilBuckets = Object.fromEntries(
    STAGE_PLOT_ORGANICO_ROWS.map((r) => [r.key, 0]),
  );
  let atrilExtraNeeded = 0;

  for (const m of roster) {
    const seat = classifyStagePlotMusicianSeat(m);
    if (!seat) continue;
    if (seat === "bass" || seat === "perc") {
      banquetasNeeded += 1;
    } else {
      sillasNeeded += 1;
    }

    const shareKey = organicoKeyForAtrilShare(m);
    if (shareKey) {
      atrilBuckets[shareKey] += 1;
      continue;
    }
    const idInstr = String(m.id_instr || "");
    const name = (m.instrumentos?.instrumento || "").toLowerCase();
    const byId = STAGE_PLOT_ORGANICO_ROWS.find(
      (r) => r.idInstr && r.idInstr.includes(idInstr),
    );
    if (byId) {
      atrilBuckets[byId.key] += 1;
      continue;
    }
    const byName = STAGE_PLOT_ORGANICO_ROWS.find(
      (r) =>
        !r.idInstr &&
        Array.isArray(r.nameMatch) &&
        r.nameMatch.some((frag) => name.includes(frag)),
    );
    if (byName) atrilBuckets[byName.key] += 1;
    else atrilExtraNeeded += 1;
  }

  let sillasDrawn = 0;
  let banquetasDrawnBass = 0;
  let banquetasDrawnManual = 0;
  const drawnBuckets = Object.fromEntries(
    STAGE_PLOT_ORGANICO_ROWS.map((r) => [r.key, 0]),
  );
  let atrilExtraDrawn = 0;

  for (const it of items) {
    const type = it?.type;
    if (type === "banqueta") {
      banquetasDrawnManual += 1;
      continue;
    }
    if (type === "bass") banquetasDrawnBass += 1;
    if (!stagePlotItemHasInstrumentFootprint(type)) continue;

    if (!stagePlotItemUsesBanqueta(type)) sillasDrawn += 1;

    const key = TYPE_TO_KEY.get(type);
    if (key) drawnBuckets[key] += 1;
    else atrilExtraDrawn += 1;
  }

  const banquetasDrawn = banquetasDrawnBass + banquetasDrawnManual;
  const atrilesNeeded = atrilesFromOrganicoCounts(atrilBuckets, atrilExtraNeeded);
  const atrilesDrawn = atrilesFromOrganicoCounts(drawnBuckets, atrilExtraDrawn);

  const row = (key, label, drawn, required) => {
    const delta = drawn - required;
    return {
      key,
      label,
      drawn,
      required,
      delta,
      status: delta === 0 ? "ok" : delta < 0 ? "missing" : "excess",
    };
  };

  return {
    sillas: row("sillas", "Sillas", sillasDrawn, sillasNeeded),
    banquetas: row("banquetas", "Banquetas", banquetasDrawn, banquetasNeeded),
    atriles: row("atriles", "Atriles", atrilesDrawn, atrilesNeeded),
    rows: [
      row("sillas", "Sillas", sillasDrawn, sillasNeeded),
      row("banquetas", "Banquetas", banquetasDrawn, banquetasNeeded),
      row("atriles", "Atriles", atrilesDrawn, atrilesNeeded),
    ],
  };
}

/**
 * Filas de comparación plano vs orgánico (solo donde hay algo dibujado o convocado).
 * @param {Array} items
 * @param {Array} roster
 */
export function buildStagePlotOrganicoCompare(items = [], roster = []) {
  const drawn = countStagePlotDrawnByOrganico(items);
  const required = computeStagePlotOrganicoFromRoster(roster);

  return STAGE_PLOT_ORGANICO_ROWS.map((row) => {
    const d = drawn[row.key] || 0;
    const r = required[row.key] || 0;
    const delta = d - r;
    return {
      key: row.key,
      label: row.label,
      types: row.types,
      drawn: d,
      required: r,
      delta,
      status: delta === 0 ? "ok" : delta < 0 ? "missing" : "excess",
    };
  }).filter((row) => row.drawn > 0 || row.required > 0);
}

/** Índice estable de fila (para apilar inserciones en esquina superior derecha). */
export function organicoRowIndex(key) {
  const i = STAGE_PLOT_ORGANICO_ROWS.findIndex((r) => r.key === key);
  return i >= 0 ? i : 0;
}

/** Cantidad faltante en el plano para una fila de comparación. */
export function organicoRowMissingCount(row) {
  const required = row?.required ?? 0;
  const drawn = row?.drawn ?? 0;
  return Math.max(0, required - drawn);
}

/** Tipo de catálogo principal para insertar desde una fila (primer `types`). */
export function pickOrganicoRowCatalogType(row) {
  const types = row?.types;
  if (!Array.isArray(types) || !types.length) return null;
  return types[0];
}

/**
 * Posiciones stage (centro del ítem) para insertar ítems en la esquina superior derecha.
 * @param {number} count
 * @param {{ width?: number, height?: number }} stage
 * @param {number} rowIndex — índice de fila orgánico (evita solapar entre tipos)
 */
export function computeOrganicoInsertPositions(count, stage = {}, rowIndex = 0) {
  const sw = stage.width || 900;
  const margin = 44;
  const colStep = 38;
  const rowStep = 38;
  const cols = 3;
  const bandHeight = rowStep * 2 + 16;
  const baseY = margin + rowIndex * bandHeight;
  const baseX = sw - margin;

  const out = [];
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const subRow = Math.floor(i / cols);
    out.push({
      x: baseX - col * colStep,
      y: baseY + subRow * rowStep,
    });
  }
  return out;
}

/** Totales agregados para el encabezado. */
export function summarizeStagePlotOrganico(compareRows = []) {
  const drawn = compareRows.reduce((s, r) => s + r.drawn, 0);
  const required = compareRows.reduce((s, r) => s + r.required, 0);
  return {
    drawn,
    required,
    delta: drawn - required,
    missingKeys: compareRows.filter((r) => r.status === "missing").length,
    excessKeys: compareRows.filter((r) => r.status === "excess").length,
    okKeys: compareRows.filter((r) => r.status === "ok").length,
  };
}
