import { extractDriveFileId } from "./repertoireSelectionDriveService";
import { sortFamiliasParticipantes } from "../utils/participantesSort";

/**
 * Presencia de una obra en programas vivos (`repertorio_obras`) y/o legacy.
 * `liveCount`/`legacyCount` = programas/giras DISTINTOS (no filas); `programCount` = suma.
 * @typedef {{ hasLive: boolean, hasLegacy: boolean, liveCount: number, legacyCount: number, programCount: number }} ObraProgramPresence
 */

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {Array<number|string>} obraIds
 * @returns {Promise<Map<number, ObraProgramPresence>>}
 */
export async function fetchObraProgramPresence(supabase, obraIds = []) {
  const ids = [
    ...new Set(
      (obraIds || [])
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0),
    ),
  ];
  const map = new Map(
    ids.map((id) => [
      id,
      { hasLive: false, hasLegacy: false, liveCount: 0, legacyCount: 0, programCount: 0 },
    ]),
  );
  if (!supabase || ids.length === 0) return map;

  const [liveRes, legacyRes] = await Promise.all([
    supabase
      .from("repertorio_obras")
      .select("id, id_obra, programas_repertorios(id_programa)")
      .in("id_obra", ids),
    supabase
      .from("obras_repertorios_legacy")
      .select("id, id_obra, nombre_gira, fecha_desde, drive_folder_id")
      .in("id_obra", ids)
      .not("id_obra", "is", null),
  ]);

  if (liveRes.error) throw liveRes.error;
  if (legacyRes.error) {
    // Tabla aún no desplegada / sin permisos: no tumbar la UI de pickers.
    if (legacyRes.error.code !== "42P01" && legacyRes.error.code !== "PGRST205") {
      console.warn("obras_repertorios_legacy presence:", legacyRes.error);
    }
  }

  // Contar programas/giras DISTINTOS por obra (una obra puede repetirse en varios bloques).
  const liveSeen = new Map(ids.map((id) => [id, new Set()]));
  const legacySeen = new Map(ids.map((id) => [id, new Set()]));
  for (const row of liveRes.data || []) {
    const set = liveSeen.get(Number(row.id_obra));
    if (!set) continue;
    const pid = row.programas_repertorios?.id_programa;
    set.add(pid != null ? `p${pid}` : `r${row.id}`);
  }
  for (const row of legacyRes.data || []) {
    const set = legacySeen.get(Number(row.id_obra));
    if (!set) continue;
    set.add(
      row.drive_folder_id ||
        (row.nombre_gira
          ? `${row.nombre_gira}|${row.fecha_desde || ""}`
          : `r${row.id}`),
    );
  }
  for (const [id, entry] of map) {
    entry.liveCount = liveSeen.get(id).size;
    entry.legacyCount = legacySeen.get(id).size;
    entry.hasLive = entry.liveCount > 0;
    entry.hasLegacy = entry.legacyCount > 0;
    entry.programCount = entry.liveCount + entry.legacyCount;
  }
  return map;
}

/** @param {ObraProgramPresence | null | undefined} presence */
export function obraHasProgramHistory(presence) {
  return !!(presence?.hasLive || presence?.hasLegacy);
}

/** @param {ObraProgramPresence | null | undefined} presence */
export function formatObraProgramPresenceLabel(presence) {
  if (!obraHasProgramHistory(presence)) return null;
  const n = (presence.liveCount || 0) + (presence.legacyCount || 0);
  return n === 1 ? `En ${n} programa más` : `En ${n} programas más`;
}

/**
 * Filas legacy de una obra (snapshot de gira fantasma).
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {number|string} obraId
 */
export async function fetchLegacyAssignmentsForObra(supabase, obraId) {
  if (!supabase || !obraId) return [];
  const { data, error } = await supabase
    .from("obras_repertorios_legacy")
    .select(
      "id, nombre_gira, fecha_desde, fecha_hasta, tipo, zona, nomenclador, mes_letra, ensambles, fuente, drive_folder_id, link_drive",
    )
    .eq("id_obra", obraId)
    .order("fecha_desde", { ascending: false });
  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") return [];
    throw error;
  }
  return data || [];
}

/**
 * Convocatoria de un programa en el historial: ensambles (PILTRI, CFMar…)
 * y familias instrumentales (Cuerdas, Maderas…) son conceptos distintos.
 * @typedef {{ ensambles: string[], excluidos: string[], familias: string[] }} HistoryConvocatoria
 */

/** @returns {HistoryConvocatoria} */
export function emptyConvocatoria() {
  return { ensambles: [], excluidos: [], familias: [] };
}

function normalizeLabel(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Familias (y agrupaciones orgánicas) que NO son ensambles. */
const FAMILY_LABELS = new Set([
  "cuerdas",
  "maderas",
  "bronces",
  "percusion",
  "vientos",
  "vientos y percusion",
  "teclados",
  "produccion",
  "prod",
  "prod.",
]);

/** `Producción` no se muestra (igual que GirasTableList / GiraCard). */
function isHiddenFamily(label) {
  const n = normalizeLabel(label);
  return n === "produccion" || n === "prod" || n === "prod.";
}

export function isFamiliaLabel(label) {
  return FAMILY_LABELS.has(normalizeLabel(label));
}

function pushUnique(list, label) {
  if (label && !list.includes(label)) list.push(label);
}

/**
 * Parsea el texto libre legacy (`obras_repertorios_legacy.ensambles`), que
 * mezcla ensambles (`PILTRI;TREPUN`, `CFMon`) y familias (`Cuerdas;Bronces`),
 * y lo separa en dos listas.
 * @param {string|null|undefined} text
 * @returns {HistoryConvocatoria}
 */
export function parseLegacyConvocatoria(text) {
  const out = emptyConvocatoria();
  for (const raw of String(text || "").split(/[;|,]/)) {
    const label = raw.trim();
    if (!label) continue;
    if (isFamiliaLabel(label)) {
      if (!isHiddenFamily(label)) pushUnique(out.familias, label);
    } else {
      pushUnique(out.ensambles, label);
    }
  }
  out.familias = sortFamiliasParticipantes(out.familias);
  return out;
}

/**
 * Convocatoria viva por id de programa desde `giras_fuentes`:
 * `ENSAMBLE` → ensambles, `EXCL_ENSAMBLE` → excluidos, `FAMILIA` → familias.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {Array<number|string>} programIds
 * @returns {Promise<Map<number, HistoryConvocatoria>>}
 */
export async function fetchConvocatoriaByProgramIds(supabase, programIds = []) {
  const ids = [
    ...new Set(
      (programIds || [])
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0),
    ),
  ];
  const map = new Map(ids.map((id) => [id, emptyConvocatoria()]));
  if (!supabase || ids.length === 0) return map;

  const { data: fuentes, error } = await supabase
    .from("giras_fuentes")
    .select("id_gira, tipo, valor_id, valor_texto")
    .in("tipo", ["ENSAMBLE", "EXCL_ENSAMBLE", "FAMILIA"])
    .in("id_gira", ids);
  if (error) throw error;

  const ensambleIds = [
    ...new Set(
      (fuentes || [])
        .filter((f) => f.tipo === "ENSAMBLE" || f.tipo === "EXCL_ENSAMBLE")
        .map((f) => Number(f.valor_id))
        .filter((id) => Number.isFinite(id) && id > 0),
    ),
  ];

  let nameById = new Map();
  if (ensambleIds.length > 0) {
    const { data: ensambles, error: ensErr } = await supabase
      .from("ensambles")
      .select("id, ensamble")
      .in("id", ensambleIds);
    if (ensErr) throw ensErr;
    nameById = new Map(
      (ensambles || []).map((e) => [Number(e.id), String(e.ensamble || "").trim()]),
    );
  }

  for (const f of fuentes || []) {
    const entry = map.get(Number(f.id_gira));
    if (!entry) continue;
    const texto = f.valor_texto ? String(f.valor_texto).trim() : "";
    if (f.tipo === "FAMILIA") {
      if (texto && !isHiddenFamily(texto)) pushUnique(entry.familias, texto);
      continue;
    }
    const label = nameById.get(Number(f.valor_id)) || texto;
    pushUnique(f.tipo === "EXCL_ENSAMBLE" ? entry.excluidos : entry.ensambles, label);
  }
  for (const entry of map.values()) {
    entry.familias = sortFamiliasParticipantes(entry.familias);
  }
  return map;
}
export { extractDriveFileId };
