import { countsTowardInstrumentationConvoked } from "./instrumentation";
import { dedupeSeatingStringItems } from "./seatingStringItemsDedupe";

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
    .select("id, nombre, orden")
    .eq("id_programa", programId)
    .order("orden");

  if (e1) throw e1;
  if (!conts?.length) return map;

  const idToNombre = new Map(
    conts.map((c) => [Number(c.id), String(c.nombre ?? "").trim() || `Grupo ${c.id}`]),
  );

  const contIds = conts.map((c) => c.id);
  const { data: items, error: e2 } = await supabase
    .from("seating_contenedores_items")
    .select("id, id_musico, id_contenedor, orden, atril_num, lado")
    .in("id_contenedor", contIds);

  if (e2) throw e2;

  const dedupedItems = dedupeSeatingStringItems(items || [], conts);
  for (const it of dedupedItems) {
    const mid = Number(it.id_musico);
    if (Number.isNaN(mid)) continue;
    if (map.has(mid)) continue;
    const nom =
      idToNombre.get(Number(it.id_contenedor)) ?? "Sin nombre";
    map.set(mid, nom);
  }

  return map;
}

/**
 * Etiquetas id_musico → contenedor para varios programas (2 consultas totales).
 * @returns {Map<number, Map<number, string>>} programId → mapa de músico
 */
export async function batchFetchMusicianSeatingContainerLabels(
  supabase,
  programIds = [],
) {
  const out = new Map();
  const ids = [...new Set(programIds.map((id) => Number(id)).filter(Number.isFinite))];
  if (!ids.length) return out;

  const { data: conts, error: e1 } = await supabase
    .from("seating_contenedores")
    .select("id, id_programa, nombre, orden")
    .in("id_programa", ids)
    .order("orden");

  if (e1) throw e1;
  if (!conts?.length) return out;

  const contsByProgram = new Map();
  const idToNombre = new Map();
  const contIds = [];
  for (const c of conts) {
    const pid = Number(c.id_programa);
    if (!contsByProgram.has(pid)) contsByProgram.set(pid, []);
    contsByProgram.get(pid).push(c);
    idToNombre.set(
      Number(c.id),
      String(c.nombre ?? "").trim() || `Grupo ${c.id}`,
    );
    contIds.push(c.id);
  }

  const { data: items, error: e2 } = await supabase
    .from("seating_contenedores_items")
    .select("id, id_musico, id_contenedor, orden, atril_num, lado")
    .in("id_contenedor", contIds);

  if (e2) throw e2;

  const itemsByCont = new Map();
  for (const it of items || []) {
    const cid = Number(it.id_contenedor);
    if (!itemsByCont.has(cid)) itemsByCont.set(cid, []);
    itemsByCont.get(cid).push(it);
  }

  for (const [pid, programConts] of contsByProgram) {
    const flatItems = programConts.flatMap(
      (c) => itemsByCont.get(Number(c.id)) || [],
    );
    const dedupedItems = dedupeSeatingStringItems(flatItems, programConts);
    const map = new Map();
    for (const it of dedupedItems) {
      const mid = Number(it.id_musico);
      if (Number.isNaN(mid) || map.has(mid)) continue;
      map.set(
        mid,
        idToNombre.get(Number(it.id_contenedor)) ?? "Sin nombre",
      );
    }
    out.set(pid, map);
  }

  return out;
}

/**
 * Etiquetas de contenedor para el borrador sandbox: parte del seating productivo y
 * ubica tentativamente cuerdas nuevas en el contenedor que ya concentra ese id_instr.
 *
 * @param {Array} roster — roster efectivo del borrador
 * @param {Map<number|string, string>} baseLabels — seating productivo
 * @param {Array<{ id: number, nombre?: string, orden?: number, id_instrumento?: string|null }>} containers
 * @returns {Map<number, string>}
 */
export function buildSandboxStringsContainerLabels(
  roster,
  baseLabels,
  containers = [],
) {
  const labels = new Map(baseLabels);

  const sortedContainers = [...containers].sort(
    (a, b) =>
      (a.orden || 0) - (b.orden || 0) || Number(a.id) - Number(b.id),
  );
  if (!sortedContainers.length) return labels;

  const containerNameById = new Map(
    sortedContainers.map((c) => [
      Number(c.id),
      String(c.nombre ?? "").trim() || `Grupo ${c.id}`,
    ]),
  );

  const containersForInstrument = (instrCode) => {
    const code = String(instrCode ?? "").trim().padStart(2, "0");
    const matched = sortedContainers.filter((c) => {
      const ci = String(c.id_instrumento ?? "").trim();
      if (!ci) return code === "01";
      return ci.padStart(2, "0") === code;
    });
    return matched.length ? matched : sortedContainers;
  };

  const hasLabel = (mid) => labels.has(mid) || labels.has(String(mid));

  const countByContainerName = (instrCode, labelsMap) => {
    const counts = new Map();
    for (const m of roster || []) {
      if (!passesRosterFilters(m)) continue;
      if (seatingInstrumentCode(m.id_instr) !== String(instrCode).trim().padStart(2, "0")) {
        continue;
      }
      const mid = Number(m.id);
      const lbl = labelsMap.get(mid) ?? labelsMap.get(String(mid));
      if (!lbl) continue;
      counts.set(lbl, (counts.get(lbl) || 0) + 1);
    }
    return counts;
  };

  const pickContainerName = (instrCode, labelsMap) => {
    const code = String(instrCode ?? "").trim().padStart(2, "0");
    const candidates = containersForInstrument(code);
    const counts = countByContainerName(code, labelsMap);

    let bestName = containerNameById.get(Number(candidates[0].id));
    let bestCount = -1;
    for (const c of candidates) {
      const name = containerNameById.get(Number(c.id));
      const cnt = counts.get(name) || 0;
      if (cnt > bestCount) {
        bestCount = cnt;
        bestName = name;
      }
    }
    return bestName;
  };

  const unassigned = (roster || [])
    .filter(
      (m) =>
        passesRosterFilters(m) &&
        SEATING_STRING_INSTR_IDS.includes(seatingInstrumentCode(m.id_instr)),
    )
    .filter((m) => !hasLabel(Number(m.id)))
    .sort((a, b) =>
      `${a.apellido || ""}, ${a.nombre || ""}`.localeCompare(
        `${b.apellido || ""}, ${b.nombre || ""}`,
        "es",
      ),
    );

  for (const m of unassigned) {
    const name = pickContainerName(m.id_instr, labels);
    if (name) labels.set(Number(m.id), name);
  }

  return labels;
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
