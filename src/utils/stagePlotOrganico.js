import { countsTowardInstrumentationConvoked } from "./instrumentation";

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
