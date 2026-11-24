import { countsTowardInstrumentationConvoked } from "./instrumentation";
import { seatingApellidoNombre } from "./integranteDisplayName";
import {
  fetchCuerdasConfigsForProgram,
  sortCuerdasConfigs,
} from "./seatingCuerdasConfig";
import { dedupeSeatingStringItems } from "./seatingStringItemsDedupe";

/** Códigos de pupitre en BD (solo estos cuatro). */
export const SEATING_STRING_INSTR_IDS = ["01", "02", "03", "04"];

function seatingInstrumentCode(id) {
  return String(id ?? "").trim();
}

function passesRosterFilters(m) {
  if (m.estado_gira === "ausente") return false;
  if (!countsTowardInstrumentationConvoked(m.rol_gira)) return false;
  return true;
}

/**
 * Para un programa: mapa id_musico → nombre del contenedor de seating.
 * Usa la primera config (sort_order) para evitar choques multi-config.
 */
export async function fetchMusicianSeatingContainerLabels(supabase, programId) {
  const map = new Map();
  if (programId == null) return map;

  const configs = await fetchCuerdasConfigsForProgram(supabase, programId);
  const primary = sortCuerdasConfigs(configs)[0];

  let contsQuery = supabase
    .from("seating_contenedores")
    .select("id, nombre, orden, id_config")
    .eq("id_programa", programId)
    .order("orden");
  if (primary?.id != null) {
    contsQuery = contsQuery.eq("id_config", primary.id);
  }

  const { data: conts, error: e1 } = await contsQuery;

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
    .select("id, id_programa, id_config, nombre, orden")
    .in("id_programa", ids)
    .order("orden");

  if (e1) throw e1;
  if (!conts?.length) return out;

  // Una config primaria por programa (sort_order mínimo)
  const primaryConfigByProgram = new Map();
  await Promise.all(
    ids.map(async (pid) => {
      const cfgs = await fetchCuerdasConfigsForProgram(supabase, pid);
      const primary = sortCuerdasConfigs(cfgs)[0];
      if (primary) primaryConfigByProgram.set(pid, Number(primary.id));
    }),
  );

  const filteredConts = conts.filter((c) => {
    const primaryId = primaryConfigByProgram.get(Number(c.id_programa));
    if (primaryId == null) return true;
    return Number(c.id_config) === primaryId;
  });

  const contsByProgram = new Map();
  const idToNombre = new Map();
  const contIds = [];
  for (const c of filteredConts) {
    const pid = Number(c.id_programa);
    if (!contsByProgram.has(pid)) contsByProgram.set(pid, []);
    contsByProgram.get(pid).push(c);
    idToNombre.set(
      Number(c.id),
      String(c.nombre ?? "").trim() || `Grupo ${c.id}`,
    );
    contIds.push(c.id);
  }

  if (!contIds.length) return out;

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
      seatingApellidoNombre(a).localeCompare(seatingApellidoNombre(b), "es"),
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
 * ¿El nombre de contenedor apunta a Violín 1 / primeros?
 * (Violín 1, Vn1, 1ros, Primeros…)
 */
export function isViolin1ContainerName(name) {
  const n = String(name || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
  if (!n || n === UNASSIGNED_LABEL.toLowerCase()) return false;
  if (/\b(2|ii|segund)/i.test(n) && !/\b(1|i|primer)/i.test(n)) return false;
  return (
    /\bviol[ií]n\s*1\b/.test(n) ||
    /\bvn\s*1\b/.test(n) ||
    /\b1ros?\b/.test(n) ||
    /\bprimer/.test(n) ||
    (/\bi\b/.test(n) && /\bviol/.test(n))
  );
}

/** ¿Nombre de contenedor = Violín 2 / segundos? */
export function isViolin2ContainerName(name) {
  const n = String(name || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
  if (!n || n === UNASSIGNED_LABEL.toLowerCase()) return false;
  return (
    /\bviol[ií]n\s*2\b/.test(n) ||
    /\bvn\s*2\b/.test(n) ||
    /\b2dos?\b/.test(n) ||
    /\bsegund/.test(n) ||
    (/\bii\b/.test(n) && /\bviol/.test(n))
  );
}

function countByInstr(roster, code) {
  return (roster || []).filter(
    (m) =>
      passesRosterFilters(m) &&
      seatingInstrumentCode(m.id_instr) === String(code).trim(),
  ).length;
}

function violinMembersByContainer(roster, musicianContainerLabels) {
  const byContainer = new Map();
  for (const m of roster || []) {
    if (!passesRosterFilters(m)) continue;
    if (seatingInstrumentCode(m.id_instr) !== "01") continue;
    const mid = Number(m.id);
    const label =
      musicianContainerLabels?.get?.(mid) ??
      musicianContainerLabels?.get?.(String(mid)) ??
      UNASSIGNED_LABEL;
    byContainer.set(label, (byContainer.get(label) || 0) + 1);
  }
  return byContainer;
}

/**
 * Divide violines en 1ros / 2dos.
 * - Si hay contenedores reales de seating (Violín 1 / 2 u otros ≥2 bloques),
 *   usa esos conteos (`vnEstimated: false`).
 * - Si todos están sin dividir (un solo bloque o Sin contenedor),
 *   parte a la mitad (impar → +1 a 1ros) y marca `vnEstimated: true` (UI en itálica).
 *
 * @returns {{ vn1: number, vn2: number, va: number, vc: number, cb: number, vnEstimated: boolean, total: number } | null}
 */
export function buildStringsCompositionDetail(
  roster,
  musicianContainerLabels = null,
) {
  const va = countByInstr(roster, "02");
  const vc = countByInstr(roster, "03");
  const cb = countByInstr(roster, "04");
  const byVn = violinMembersByContainer(roster, musicianContainerLabels);
  const vnTotal = [...byVn.values()].reduce((a, b) => a + b, 0);
  const total = vnTotal + va + vc + cb;
  if (total <= 0) return null;

  const entries = [...byVn.entries()].filter(([, n]) => n > 0);
  const onlyUnassigned =
    entries.length === 0 ||
    (entries.length === 1 && entries[0][0] === UNASSIGNED_LABEL);

  let vn1 = 0;
  let vn2 = 0;
  let vnEstimated = false;

  if (vnTotal === 0) {
    vn1 = 0;
    vn2 = 0;
  } else if (onlyUnassigned || entries.length === 1) {
    // Sin división real en contenedores → mitad calculada.
    vn1 = Math.ceil(vnTotal / 2);
    vn2 = Math.floor(vnTotal / 2);
    vnEstimated = true;
  } else {
    let named1 = 0;
    let named2 = 0;
    let other = 0;
    const unnamed = [];
    for (const [label, n] of entries) {
      if (isViolin1ContainerName(label)) named1 += n;
      else if (isViolin2ContainerName(label)) named2 += n;
      else unnamed.push([label, n]);
    }
    if (named1 > 0 || named2 > 0) {
      unnamed.sort(([a], [b]) =>
        a.localeCompare(b, "es", { sensitivity: "base" }),
      );
      // Contenedores no nombrados: el primero va a 1ros, el resto a 2dos.
      unnamed.forEach(([, n], idx) => {
        if (idx === 0 && named1 === 0) named1 += n;
        else named2 += n;
      });
      vn1 = named1;
      vn2 = named2;
      vnEstimated = false;
    } else {
      // Varios contenedores sin nombre canónico: orden alfabético → 1ros / 2dos.
      entries.sort(([a], [b]) =>
        a.localeCompare(b, "es", { sensitivity: "base" }),
      );
      vn1 = entries[0][1];
      vn2 = entries.slice(1).reduce((acc, [, n]) => acc + n, 0);
      vnEstimated = false;
    }
  }

  return { vn1, vn2, va, vc, cb, vnEstimated, total };
}

/** Texto plano `(5.5.4.3.3)` o null. */
export function formatStringsCompositionParen(detail) {
  if (!detail || !(detail.total > 0)) return null;
  return `(${detail.vn1}.${detail.vn2}.${detail.va}.${detail.vc}.${detail.cb})`;
}

/**
 * Mapa id_musico → nombre de contenedor a partir de containers + items ya cargados
 * (p. ej. GiraRoster / ProgramSeating sin refetch).
 */
export function buildMusicianContainerLabelsFromSeating(
  containers = [],
  items = [],
) {
  const map = new Map();
  const idToNombre = new Map(
    (containers || []).map((c) => [
      Number(c.id),
      String(c.nombre ?? "").trim() || `Grupo ${c.id}`,
    ]),
  );
  const deduped = dedupeSeatingStringItems(items || [], containers || []);
  for (const it of deduped) {
    const mid = Number(it.id_musico);
    if (Number.isNaN(mid) || map.has(mid)) continue;
    map.set(mid, idToNombre.get(Number(it.id_contenedor)) ?? UNASSIGNED_LABEL);
  }
  return map;
}

/**
 * Ej.: Str: (8.6).4.2.1 — orden fijo 01 Violín, 02 Viola, 03 Cello, 04 Cb.
 * `musicianContainerLabels`: Map(id_musico → nombre contenedor) desde seating de la gira.
 * Preferí `formatStringsCompositionParen` / `buildStringsCompositionDetail` para el
 * formato fijo Vn1.Vn2.Va.Vc.Cb con itálica en badges.
 */
export function formatStringsCompositionLabel(roster, musicianContainerLabels) {
  const detail = buildStringsCompositionDetail(
    roster,
    musicianContainerLabels,
  );
  const paren = formatStringsCompositionParen(detail);
  if (paren) return `Str ${paren}`;
  const parts = SEATING_STRING_INSTR_IDS.map((idc) =>
    formatSegmentForInstrumentCode(roster, idc, musicianContainerLabels),
  );
  return `Str: ${parts.join(".")}`;
}
