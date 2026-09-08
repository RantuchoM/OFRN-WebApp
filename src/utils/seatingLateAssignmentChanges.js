import { format, parseISO, subDays } from "date-fns";
import { getPartDisplayName } from "./partNameDisplay";
import { integranteKey } from "./integranteIds";
import { getTodayDateStringLocal } from "./dates";
import { seatingApellidoNombre } from "./integranteDisplayName";

/** Ventana previa al inicio de gira (`programas.fecha_desde`) en la que aplica el aviso. */
export const SEATING_LATE_ASSIGNMENT_WINDOW_DAYS = 18;

function toDateOnly(value) {
  if (!value) return "";
  const s = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
}

/**
 * Hoy (local) está entre fecha_desde − 18 días y fecha_desde inclusive.
 */
export function isWithinSeatingLateChangeWindow(
  fechaDesde,
  todayStr = getTodayDateStringLocal(),
) {
  const start = toDateOnly(fechaDesde);
  const today = toDateOnly(todayStr);
  if (!start || !today) return false;
  try {
    const windowOpen = format(
      subDays(parseISO(start), SEATING_LATE_ASSIGNMENT_WINDOW_DAYS),
      "yyyy-MM-dd",
    );
    return today >= windowOpen && today <= start;
  } catch {
    return false;
  }
}

export function normalizePartIds(ids) {
  if (!Array.isArray(ids)) {
    if (ids == null || ids === "") return [];
    return [String(ids)];
  }
  const seen = new Set();
  const out = [];
  for (const id of ids) {
    if (id == null || id === "") continue;
    const s = String(id);
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

export function partIdsSignature(ids) {
  return normalizePartIds(ids).slice().sort().join(",");
}

const MUSICIAN_ASSIGN_KEY = /^M-(.+)-(\d+)$/;
const CONTAINER_ASSIGN_KEY = /^C-(\d+)-(\d+)$/;

export function assignmentMusicianObraKey(musicianId, obraId) {
  return `${integranteKey(musicianId)}::${String(obraId)}`;
}

/**
 * Une ítems persistidos de todos los contenedores del programa con la
 * disposición viva de la config abierta (para no perder cuerdas de otras configs).
 */
export function buildContainerMusicianMap(persistedItems = [], liveContainers = []) {
  const map = new Map();
  for (const item of persistedItems || []) {
    const cid = String(item.id_contenedor ?? "");
    const mid = integranteKey(item.id_musico);
    if (!cid || !mid) continue;
    if (!map.has(cid)) map.set(cid, new Set());
    map.get(cid).add(mid);
  }
  for (const container of liveContainers || []) {
    const cid = String(container.id ?? "");
    if (!cid) continue;
    const set = new Set();
    for (const item of container.items || []) {
      const mid = integranteKey(item.id_musico);
      if (mid) set.add(mid);
    }
    map.set(cid, set);
  }
  return map;
}

/**
 * Asignación efectiva por músico y obra: particella individual (M-) manda;
 * si no hay, hereda la del contenedor de cuerdas (C-).
 * @returns {Map<string, string[]>} clave `musicianId::obraId` → ids de particella
 */
export function buildEffectiveAssignments({
  musicianAssignments = {},
  assignments = {},
  containerMusicianMap,
  rosterKeys,
} = {}) {
  const result = new Map();
  const allowed = rosterKeys instanceof Set ? rosterKeys : null;

  const setParts = (musicianId, obraId, partIds) => {
    const mid = integranteKey(musicianId);
    if (!mid) return;
    if (allowed && !allowed.has(mid)) return;
    result.set(assignmentMusicianObraKey(mid, obraId), normalizePartIds(partIds));
  };

  Object.entries(musicianAssignments || {}).forEach(([key, ids]) => {
    const match = String(key).match(MUSICIAN_ASSIGN_KEY);
    if (!match) return;
    const parts = normalizePartIds(ids);
    if (parts.length === 0) return;
    setParts(match[1], match[2], parts);
  });

  Object.entries(assignments || {}).forEach(([key, partId]) => {
    const match = String(key).match(CONTAINER_ASSIGN_KEY);
    if (!match || partId == null || partId === "") return;
    const members = containerMusicianMap?.get(String(match[1]));
    if (!members) return;
    const obraId = match[2];
    members.forEach((mid) => {
      const existing = result.get(assignmentMusicianObraKey(mid, obraId));
      if (existing && existing.length > 0) return;
      setParts(mid, obraId, [partId]);
    });
  });

  return result;
}

export function diffEffectiveAssignments(baseline, current) {
  const fromMap = baseline instanceof Map ? baseline : new Map();
  const toMap = current instanceof Map ? current : new Map();
  const keys = new Set([...fromMap.keys(), ...toMap.keys()]);
  const changes = [];
  keys.forEach((key) => {
    const fromIds = fromMap.get(key) || [];
    const toIds = toMap.get(key) || [];
    if (partIdsSignature(fromIds) === partIdsSignature(toIds)) return;
    const sep = key.indexOf("::");
    if (sep < 0) return;
    changes.push({
      musicianId: key.slice(0, sep),
      obraId: key.slice(sep + 2),
      fromIds,
      toIds,
    });
  });
  return changes;
}

export function formatPartsLabel(ids, particellasById) {
  const names = normalizePartIds(ids).map((id) => {
    const part = particellasById?.get?.(String(id));
    return getPartDisplayName(part) || `Particella ${id}`;
  });
  if (names.length === 0) return "sin asignación";
  return names.join(", ");
}

export function formatAssignmentChangeLine(obraTitle, fromLabel, toLabel) {
  return `- ${obraTitle}: ${fromLabel} → ${toLabel}`;
}

export function formatLateAssignmentDetalle(musicians) {
  return (musicians || [])
    .map((m) => {
      const header = m.displayName || seatingApellidoNombre(m) || "Músico";
      const lines = (m.changes || []).map((c) =>
        formatAssignmentChangeLine(
          c.obraTitle || "Obra",
          c.fromLabel || "sin asignación",
          c.toLabel || "sin asignación",
        ),
      );
      return [header, ...lines].join("\n");
    })
    .join("\n\n");
}

export function collectMusicianEmails(musicians) {
  const seen = new Set();
  const emails = [];
  (musicians || []).forEach((m) => {
    const mail = String(m.mail || "").trim();
    if (!mail || seen.has(mail.toLowerCase())) return;
    seen.add(mail.toLowerCase());
    emails.push(mail);
  });
  return emails;
}

export async function fetchProgramContainerItems(supabase, programId) {
  if (!supabase || programId == null) return [];
  const { data: conts, error: contsError } = await supabase
    .from("seating_contenedores")
    .select("id")
    .eq("id_programa", programId);
  if (contsError) throw contsError;
  const ids = (conts || []).map((c) => c.id).filter((id) => id != null);
  if (ids.length === 0) return [];
  const { data: items, error: itemsError } = await supabase
    .from("seating_contenedores_items")
    .select("id_contenedor, id_musico")
    .in("id_contenedor", ids);
  if (itemsError) throw itemsError;
  return items || [];
}
