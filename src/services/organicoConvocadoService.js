import { fetchRosterForGira } from "../hooks/useGiraRoster";
import {
  organicoMapsEqual,
  snapshotFromRoster,
} from "../utils/organicoConvocado";

const queue = [];
const pendingIds = new Set();
let running = 0;

function drainOrganicoQueue() {
  while (running < 2 && queue.length > 0) {
    const job = queue.shift();
    running += 1;
    Promise.resolve()
      .then(job)
      .finally(() => {
        running -= 1;
        drainOrganicoQueue();
      });
  }
}

export async function persistOrganicoFromRoster(supabase, programaId, roster) {
  if (!supabase || programaId == null) return null;
  const snap = snapshotFromRoster(roster);
  const { data: current, error: readErr } = await supabase
    .from("programas")
    .select("organico_convocado, organico_convocado_map")
    .eq("id", programaId)
    .maybeSingle();
  if (readErr) throw readErr;

  const sameText = (current?.organico_convocado || "") === snap.text;
  const sameMap =
    current?.organico_convocado_map &&
    organicoMapsEqual(current.organico_convocado_map, snap.map);
  if (sameText && sameMap) return snap;

  const { error } = await supabase
    .from("programas")
    .update({
      organico_convocado: snap.text || null,
      organico_convocado_map: snap.map,
      organico_convocado_at: new Date().toISOString(),
    })
    .eq("id", programaId);
  if (error) throw error;
  return snap;
}

/** Recalcula con el roster de gira y guarda el texto y el mapa. */
export async function refreshOrganicoConvocado(supabase, gira, options = {}) {
  if (!supabase || !gira?.id) return null;
  const { roster } = await fetchRosterForGira(supabase, gira, {
    lite: true,
    ...options,
  });
  return persistOrganicoFromRoster(supabase, gira.id, roster);
}

export async function touchOrganicoConvocado(supabase, programaId) {
  if (!supabase || programaId == null) return null;
  const { data, error } = await supabase
    .from("programas")
    .select("id, fecha_desde, fecha_hasta")
    .eq("id", programaId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return refreshOrganicoConvocado(supabase, data);
}

function todayArt() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date());
}

function vigenteOrganicoQuery(supabase) {
  const today = todayArt();
  return supabase
    .from("programas")
    .select("id, fecha_desde, fecha_hasta")
    .or(`fecha_hasta.gte.${today},fecha_hasta.is.null`)
    .order("organico_convocado_at", { ascending: true, nullsFirst: true });
}

async function loadInstrumentCatalog(supabase) {
  const { data, error } = await supabase
    .from("instrumentos")
    .select("id, instrumento, familia, abreviatura, plaza_extra, rol_gira_default");
  if (error) throw error;
  return data || [];
}

/** Programas vigentes o futuros, los de cálculo más viejo primero. */
export async function listCurrentOrganicoProgramas(supabase) {
  const { data, error } = await vigenteOrganicoQuery(supabase);
  if (error) throw error;
  return data || [];
}

/**
 * Recalcula una lista ya cargada. El catálogo de instrumentos se pide una vez.
 * `deadlineMs` (timestamp) corta la tanda para el cron; el botón manual no lo usa.
 */
export async function refreshOrganicoProgramas(
  supabase,
  rows,
  { onProgress, deadlineMs } = {},
) {
  const catalog = await loadInstrumentCatalog(supabase);
  const updated = [];
  const failed = [];
  const list = rows || [];
  for (const row of list) {
    if (deadlineMs && Date.now() >= deadlineMs) break;
    try {
      await refreshOrganicoConvocado(supabase, row, {
        instrumentCatalog: catalog,
      });
      updated.push(row.id);
    } catch (err) {
      failed.push({ id: row.id, error: err?.message || String(err) });
    }
    onProgress?.({
      done: updated.length + failed.length,
      total: list.length,
    });
  }
  return { updated, failed, total: list.length };
}

export async function refreshCurrentOrganicoConvocado(
  supabase,
  { limit = 12, deadlineMs, onProgress } = {},
) {
  let query = vigenteOrganicoQuery(supabase);
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  const result = await refreshOrganicoProgramas(supabase, data || [], {
    deadlineMs,
    onProgress,
  });
  return { ...result, scanned: (data || []).length };
}

/** Backfill del listado, de a dos programas, sin repetir el mismo id. */
export function enqueueOrganicoRefresh(supabase, gira, onDone) {
  const id = gira?.id;
  if (!supabase || id == null || pendingIds.has(id)) return;
  pendingIds.add(id);
  queue.push(async () => {
    try {
      const snap = await refreshOrganicoConvocado(supabase, gira);
      onDone?.(snap);
    } catch (err) {
      console.warn("organico_convocado:", err?.message || err);
      onDone?.(null);
    } finally {
      pendingIds.delete(id);
    }
  });
  drainOrganicoQueue();
}
