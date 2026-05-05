import { countsTowardInstrumentationConvoked } from "./instrumentation";

/** Códigos de pupitre en BD (solo estos cuatro). */
export const SEATING_STRING_INSTR_IDS = ["01", "02", "03", "04"];

function seatingInstrumentCode(id) {
  return String(id ?? "").trim();
}

function passesRosterFilters(m) {
  if (m.estado_gira === "ausente") return false;
  if (m.es_simulacion) return false;
  if (!countsTowardInstrumentationConvoked(m.rol_gira)) return false;
  return true;
}

/**
 * Para un programa: mapa id_musico → nombre del contenedor de seating (primera fila si hubiera duplicados).
 */
export async function fetchMusicianSeatingContainerLabels(supabase, programId) {
  const map = new Map();
  if (programId == null) return map;

  const { data: conts, error: e1 } = await supabase
    .from("seating_contenedores")
    .select("id, nombre")
    .eq("id_programa", programId);

  if (e1) throw e1;
  if (!conts?.length) return map;

  const idToNombre = new Map(
    conts.map((c) => [Number(c.id), String(c.nombre ?? "").trim() || `Grupo ${c.id}`]),
  );

  const contIds = conts.map((c) => c.id);
  const { data: items, error: e2 } = await supabase
    .from("seating_contenedores_items")
    .select("id_musico, id_contenedor")
    .in("id_contenedor", contIds);

  if (e2) throw e2;

  for (const it of items || []) {
    const mid = Number(it.id_musico);
    if (Number.isNaN(mid)) continue;
    if (map.has(mid)) continue;
    const nom =
      idToNombre.get(Number(it.id_contenedor)) ?? "Sin nombre";
    map.set(mid, nom);
  }

  return map;
}

const UNASSIGNED_LABEL = "Sin contenedor";

/**
 * Un tramo del informe: si hay más de un contenedor con músicos de ese id_instr,
 * devuelve "(n1.n2...)" con cantidades ordenadas alfabéticamente por nombre de contenedor.
 * Si hay un solo bloque (o todos sin contenedor), devuelve solo la cifra total.
 */
function formatSegmentForInstrumentCode(roster, instrumentCode, musicianContainerLabels) {
  const code = String(instrumentCode).trim();
  const members = (roster || []).filter(
    (m) => passesRosterFilters(m) && seatingInstrumentCode(m.id_instr) === code,
  );

  const byContainer = {};
  for (const m of members) {
    const mid = Number(m.id);
    const label =
      musicianContainerLabels?.get?.(mid) ??
      musicianContainerLabels?.get?.(String(mid)) ??
      UNASSIGNED_LABEL;
    byContainer[label] = (byContainer[label] || 0) + 1;
  }

  const entries = Object.entries(byContainer).filter(([, n]) => n > 0);
  const total = entries.reduce((acc, [, n]) => acc + n, 0);
  if (total === 0) return "0";

  entries.sort(([a], [b]) =>
    a.localeCompare(b, "es", { sensitivity: "base" }),
  );
  const nums = entries.map(([, n]) => n);

  if (nums.length <= 1) return String(nums[0]);
  return `(${nums.join(".")})`;
}

/**
 * Ej.: Str: (8.6).4.2.1 — orden fijo 01 Violín, 02 Viola, 03 Cello, 04 Cb.
 * `musicianContainerLabels`: Map(id_musico → nombre contenedor) desde seating de la gira.
 */
export function formatStringsCompositionLabel(roster, musicianContainerLabels) {
  const parts = SEATING_STRING_INSTR_IDS.map((idc) =>
    formatSegmentForInstrumentCode(roster, idc, musicianContainerLabels),
  );
  return `Str: ${parts.join(".")}`;
}
