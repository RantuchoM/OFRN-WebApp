/**
 * Tipo de habitación OFRN según camas ocupadas (ocupa_cama !== false).
 * Quíntuple / séxtuple / séptuple son tipos propios; 8+ queda como Múltiple.
 */

export const ROOM_REPORT_CAPACITY_ORDER = [
  "Simple",
  "Doble",
  "Triple",
  "Cuádruple",
  "Quíntuple",
  "Séxtuple",
  "Séptuple",
  "Múltiple",
];

/** Chips del encabezado de RoomingManager (1–7 camas). */
export const ROOM_MANAGER_CAPACITY_CHIPS = [
  { key: "SGL", beds: 1, label: "SGL", title: "Single", dot: "bg-blue-400" },
  { key: "DBL", beds: 2, label: "DBL", title: "Doble", dot: "bg-emerald-400" },
  { key: "TPL", beds: 3, label: "TPL", title: "Triple", dot: "bg-amber-400" },
  { key: "QAD", beds: 4, label: "QAD", title: "Cuádruple", dot: "bg-rose-400" },
  { key: "QNT", beds: 5, label: "QNT", title: "Quíntuple", dot: "bg-violet-400" },
  { key: "SXT", beds: 6, label: "SXT", title: "Séxtuple", dot: "bg-fuchsia-400" },
  { key: "SPT", beds: 7, label: "SPT", title: "Séptuple", dot: "bg-cyan-400" },
];

const CARD_LABEL_BY_BEDS = {
  0: "Vacía",
  1: "Single",
  2: "Doble",
  3: "Triple",
  4: "Cuádruple",
  5: "Quíntuple",
  6: "Séxtuple",
  7: "Séptuple",
};

const REPORT_LABEL_BY_BEDS = {
  1: "Simple",
  2: "Doble",
  3: "Triple",
  4: "Cuádruple",
  5: "Quíntuple",
  6: "Séxtuple",
  7: "Séptuple",
};

/** Etiqueta de la tarjeta en RoomingManager. */
export function cardCapacityLabel(bedCount) {
  const n = Number(bedCount) || 0;
  if (CARD_LABEL_BY_BEDS[n] != null) return CARD_LABEL_BY_BEDS[n];
  if (n > 7) return `Múltiple (${n})`;
  return "Vacía";
}

/** Tipo del reporte / Excel (Simple … Séptuple, o Múltiple si hay 8+ camas). */
export function reportCapacityType(bedCount) {
  const n = Number(bedCount) || 0;
  if (n <= 0) return "Vacía";
  return REPORT_LABEL_BY_BEDS[n] || "Múltiple";
}

/** Plural del desglose por fechas: «quíntuples básico», «séxtuples superior». */
export function pluralizeCapacityType(capacityType) {
  const capLower = String(capacityType || "").toLowerCase();
  if (!capLower) return "";
  if (capLower.endsWith("e")) return `${capLower}s`;
  return `${capLower}es`;
}

export function roomCardColorClass(bedCount) {
  const n = Number(bedCount) || 0;
  if (n <= 0) return "bg-slate-50 border-slate-200";
  if (n === 1) return "bg-blue-50 border-blue-200 text-blue-800";
  if (n === 2) return "bg-emerald-50 border-emerald-200 text-emerald-800";
  if (n === 3) return "bg-amber-50 border-amber-200 text-amber-800";
  if (n === 4) return "bg-rose-50 border-rose-200 text-rose-800";
  if (n === 5) return "bg-violet-50 border-violet-200 text-violet-800";
  if (n === 6) return "bg-fuchsia-50 border-fuchsia-200 text-fuchsia-800";
  if (n === 7) return "bg-cyan-50 border-cyan-200 text-cyan-800";
  return "bg-slate-100 border-slate-300 text-slate-800";
}
