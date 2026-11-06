/**
 * Persistencia del plano de escenario (N lienzos por programa).
 */

import {
  cloneStagePlotPayload,
  createEmptyStagePlotPayload,
} from "../utils/stagePlotPayload";

const STAGE_PLOT_SELECT =
  "id, id_programa, nombre, payload, sort_order, bloque_ids, created_at, updated_at, locked_by, lock_heartbeat_at";

/** Latido del editor. El candado vence si el latido tiene más de este margen. */
export const STAGE_PLOT_LOCK_STALE_MS = 30_000;
/** Intervalo de latido mientras se tiene el candado. */
export const STAGE_PLOT_LOCK_HEARTBEAT_MS = 15_000;
/** Espera máxima del que toma, para recibir el último flush del editor saliente. */
export const STAGE_PLOT_LOCK_SETTLE_MS = 2500;

function normalizeBloqueIds(raw) {
  if (!Array.isArray(raw)) return [];
  return [
    ...new Set(
      raw
        .map((id) => Number(id))
        .filter((n) => Number.isFinite(n) && n > 0),
    ),
  ];
}

function mapPlotRow(row) {
  if (!row) return null;
  const lockedBy = Number(row.locked_by);
  return {
    ...row,
    bloque_ids: normalizeBloqueIds(row.bloque_ids),
    sort_order: Number.isFinite(Number(row.sort_order))
      ? Number(row.sort_order)
      : 0,
    nombre: row.nombre || "",
    evento_ids: Array.isArray(row.evento_ids)
      ? normalizeBloqueIds(row.evento_ids)
      : [],
    locked_by:
      row.locked_by == null || !Number.isFinite(lockedBy) ? null : lockedBy,
    lock_heartbeat_at: row.lock_heartbeat_at || null,
  };
}

/** @param {string|null|undefined} heartbeatAt @param {number} [now] */
export function isStagePlotLockStale(heartbeatAt, now = Date.now()) {
  if (!heartbeatAt) return true;
  const t = new Date(heartbeatAt).getTime();
  if (!Number.isFinite(t)) return true;
  return now - t > STAGE_PLOT_LOCK_STALE_MS;
}

function sameInstant(a, b) {
  if (!a || !b) return false;
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  return Number.isFinite(ta) && ta === tb;
}

export { sameInstant as stagePlotSameInstant };

/** Tipos de evento relevantes para Escenario (concierto / ensayo). */
export const STAGE_PLOT_EVENT_TIPO_IDS = [1, 13];

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {number|string} programId
 */
export async function listStagePlotsByPrograma(supabase, programId) {
  if (!supabase || programId == null || programId === "") {
    return { data: [], error: new Error("Cliente o programa inválido") };
  }
  const { data, error } = await supabase
    .from("stage_plots")
    .select(STAGE_PLOT_SELECT)
    .eq("id_programa", programId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) return { data: [], error };
  return { data: (data || []).map(mapPlotRow), error: null };
}

/**
 * Compat v1: primer plot del programa (o stub vacío).
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {number|string} programId
 */
export async function getStagePlotByPrograma(supabase, programId) {
  const { data, error } = await listStagePlotsByPrograma(supabase, programId);
  if (error) return { data: null, error };
  if (!data?.length) {
    return {
      data: {
        id: null,
        id_programa: programId,
        payload: null,
        nombre: "",
        sort_order: 0,
        bloque_ids: [],
      },
      error: null,
    };
  }
  return { data: data[0], error: null };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} plotId
 */
export async function getStagePlotById(supabase, plotId) {
  if (!supabase || !plotId) {
    return { data: null, error: new Error("Cliente o plot inválido") };
  }
  const { data, error } = await supabase
    .from("stage_plots")
    .select(STAGE_PLOT_SELECT)
    .eq("id", plotId)
    .maybeSingle();
  if (error) return { data: null, error };
  return { data: mapPlotRow(data), error: null };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {number|string} programId
 * @param {{
 *   payload?: object,
 *   nombre?: string|null,
 *   sort_order?: number,
 *   bloque_ids?: number[],
 * }} [opts]
 */
export async function createStagePlot(supabase, programId, opts = {}) {
  if (!supabase || programId == null || programId === "") {
    return { data: null, error: new Error("Cliente o programa inválido") };
  }

  let sortOrder = opts.sort_order;
  if (sortOrder == null) {
    const { data: existing } = await listStagePlotsByPrograma(
      supabase,
      programId,
    );
    const max = (existing || []).reduce(
      (m, p) => Math.max(m, Number(p.sort_order) || 0),
      -1,
    );
    sortOrder = max + 1;
  }

  const payload = opts.payload ?? createEmptyStagePlotPayload();
  const { data, error } = await supabase
    .from("stage_plots")
    .insert({
      id_programa: programId,
      payload,
      nombre: opts.nombre?.trim() ? opts.nombre.trim() : null,
      sort_order: sortOrder,
      bloque_ids: normalizeBloqueIds(opts.bloque_ids),
      updated_at: new Date().toISOString(),
    })
    .select(STAGE_PLOT_SELECT)
    .maybeSingle();
  return { data: mapPlotRow(data), error };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} plotId
 * @param {{
 *   payload?: object,
 *   nombre?: string|null,
 *   sort_order?: number,
 *   bloque_ids?: number[],
 * }} patch
 */
export async function updateStagePlot(supabase, plotId, patch) {
  if (!supabase || !plotId) {
    return { data: null, error: new Error("Cliente o plot inválido") };
  }
  const row = {
    updated_at: new Date().toISOString(),
  };
  if (patch.payload !== undefined) row.payload = patch.payload;
  if (patch.nombre !== undefined) {
    row.nombre = patch.nombre?.trim() ? patch.nombre.trim() : null;
  }
  if (patch.sort_order !== undefined) {
    row.sort_order = Number(patch.sort_order) || 0;
  }
  if (patch.bloque_ids !== undefined) {
    row.bloque_ids = normalizeBloqueIds(patch.bloque_ids);
  }
  const { data, error } = await supabase
    .from("stage_plots")
    .update(row)
    .eq("id", plotId)
    .select(STAGE_PLOT_SELECT)
    .maybeSingle();
  return { data: mapPlotRow(data), error };
}

/**
 * Guarda payload / nombre / bloques sin tocar el candado.
 * `requireLockedBy`: solo escribe si el candado sigue siendo de ese integrante.
 * `expectedUpdatedAt`: solo escribe si nadie avanzó `updated_at` (último flush
 * después de perder el candado). 0 filas → `skipped` (no es un error de red).
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} plotId
 * @param {{
 *   payload?: object,
 *   nombre?: string|null,
 *   bloqueIds?: number[],
 *   requireLockedBy?: number|null,
 *   expectedUpdatedAt?: string|null,
 * }} opts
 */
export async function saveStagePlotContents(supabase, plotId, opts = {}) {
  if (!supabase || !plotId) {
    return {
      data: null,
      error: new Error("Cliente o plot inválido"),
      skipped: false,
    };
  }
  const row = {
    updated_at: new Date().toISOString(),
  };
  if (opts.payload !== undefined) row.payload = opts.payload;
  if (opts.nombre !== undefined) {
    row.nombre = opts.nombre?.trim() ? opts.nombre.trim() : null;
  }
  if (opts.bloqueIds !== undefined) {
    row.bloque_ids = normalizeBloqueIds(opts.bloqueIds);
  }
  let query = supabase.from("stage_plots").update(row).eq("id", plotId);
  if (opts.requireLockedBy != null) {
    query = query.eq("locked_by", opts.requireLockedBy);
  }
  if (opts.expectedUpdatedAt) {
    query = query.eq("updated_at", opts.expectedUpdatedAt);
  }
  const { data, error } = await query.select(STAGE_PLOT_SELECT).maybeSingle();
  return { data: mapPlotRow(data), error, skipped: !error && !data };
}

function mapLockRpc(data) {
  if (!data || typeof data !== "object") return null;
  const lockedBy = Number(data.locked_by);
  const previous = Number(data.previous_locked_by);
  return {
    ...data,
    acquired: Boolean(data.acquired),
    released: Boolean(data.released),
    held: Boolean(data.held),
    stolen_from_live: Boolean(data.stolen_from_live),
    locked_by:
      data.locked_by == null || !Number.isFinite(lockedBy) ? null : lockedBy,
    previous_locked_by:
      data.previous_locked_by == null || !Number.isFinite(previous)
        ? null
        : previous,
    lock_heartbeat_at: data.lock_heartbeat_at || null,
    payload: data.payload,
    updated_at: data.updated_at || null,
    nombre: data.nombre ?? "",
    error: data.error || null,
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} plotId
 * @param {number} integranteId
 * @param {{ force?: boolean, expectedLockedBy?: number|null }} [opts]
 */
export async function takeStagePlotLock(supabase, plotId, integranteId, opts = {}) {
  if (!supabase || !plotId || integranteId == null) {
    return { data: null, error: new Error("Cliente, plot o integrante inválido") };
  }
  const { data, error } = await supabase.rpc("stage_plot_take_lock", {
    p_plot_id: plotId,
    p_integrante_id: integranteId,
    p_force: Boolean(opts.force),
    p_expected_locked_by: opts.expectedLockedBy ?? null,
  });
  if (error) return { data: null, error };
  return { data: mapLockRpc(data), error: null };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} plotId
 * @param {number} integranteId
 */
export async function releaseStagePlotLock(supabase, plotId, integranteId) {
  if (!supabase || !plotId || integranteId == null) {
    return { data: null, error: new Error("Cliente, plot o integrante inválido") };
  }
  const { data, error } = await supabase.rpc("stage_plot_release_lock", {
    p_plot_id: plotId,
    p_integrante_id: integranteId,
  });
  if (error) return { data: null, error };
  return { data: mapLockRpc(data), error: null };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} plotId
 * @param {number} integranteId
 */
export async function heartbeatStagePlotLock(supabase, plotId, integranteId) {
  if (!supabase || !plotId || integranteId == null) {
    return { data: null, error: new Error("Cliente, plot o integrante inválido") };
  }
  const { data, error } = await supabase.rpc("stage_plot_heartbeat_lock", {
    p_plot_id: plotId,
    p_integrante_id: integranteId,
  });
  if (error) return { data: null, error };
  return { data: mapLockRpc(data), error: null };
}

/**
 * Compat: upsert por id si existe; si no, por id_programa (crea o actualiza el primero).
 * Preferir createStagePlot / updateStagePlot en código nuevo.
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {number|string} programId
 * @param {{
 *   id?: string|null,
 *   payload: object,
 *   nombre?: string|null,
 *   sort_order?: number,
 *   bloque_ids?: number[],
 * }} plot
 */
export async function upsertStagePlot(supabase, programId, plot) {
  if (!supabase || programId == null || programId === "") {
    return { data: null, error: new Error("Cliente o programa inválido") };
  }
  if (plot?.id) {
    return updateStagePlot(supabase, plot.id, {
      payload: plot.payload,
      nombre: plot.nombre,
      sort_order: plot.sort_order,
      bloque_ids: plot.bloque_ids,
    });
  }

  const { data: existing, error: listErr } = await listStagePlotsByPrograma(
    supabase,
    programId,
  );
  if (listErr) return { data: null, error: listErr };

  if (existing?.length) {
    return updateStagePlot(supabase, existing[0].id, {
      payload: plot.payload,
      nombre: plot.nombre,
      sort_order: plot.sort_order ?? existing[0].sort_order,
      bloque_ids:
        plot.bloque_ids !== undefined
          ? plot.bloque_ids
          : existing[0].bloque_ids,
    });
  }

  return createStagePlot(supabase, programId, {
    payload: plot.payload,
    nombre: plot.nombre,
    sort_order: plot.sort_order ?? 0,
    bloque_ids: plot.bloque_ids,
  });
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} plotId
 */
export async function deleteStagePlot(supabase, plotId) {
  if (!supabase || !plotId) {
    return { error: new Error("Cliente o plot inválido") };
  }
  const { error } = await supabase.from("stage_plots").delete().eq("id", plotId);
  return { error };
}

/**
 * Copia un plot (mismo o otro programa). No copia bloque_ids entre giras.
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {number|string} targetProgramId
 * @param {{
 *   payload: object,
 *   nombre?: string|null,
 *   bloque_ids?: number[],
 *   clearBloqueIds?: boolean,
 * }} source
 */
export async function importStagePlotIntoPrograma(
  supabase,
  targetProgramId,
  source,
) {
  const clearBloques = source.clearBloqueIds !== false;
  return createStagePlot(supabase, targetProgramId, {
    payload: source.payload,
    nombre: source.nombre,
    bloque_ids: clearBloques ? [] : source.bloque_ids,
  });
}

/**
 * Eventos (ensayo/concierto) vinculados a un plot.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} plotId
 */
export async function listEventIdsForStagePlot(supabase, plotId) {
  if (!supabase || !plotId) {
    return { data: [], error: new Error("Cliente o plot inválido") };
  }
  const { data, error } = await supabase
    .from("stage_plot_eventos")
    .select("id_evento")
    .eq("id_stage_plot", plotId);
  if (error) return { data: [], error };
  return {
    data: (data || [])
      .map((r) => Number(r.id_evento))
      .filter((n) => Number.isFinite(n) && n > 0),
    error: null,
  };
}

/**
 * Mapa plotId → eventoIds para todos los plots de un programa.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string[]} plotIds
 */
export async function listStagePlotEventLinks(supabase, plotIds) {
  const ids = [...new Set((plotIds || []).filter(Boolean))];
  if (!supabase || ids.length === 0) {
    return { data: new Map(), error: null };
  }
  const { data, error } = await supabase
    .from("stage_plot_eventos")
    .select("id_stage_plot, id_evento")
    .in("id_stage_plot", ids);
  if (error) return { data: new Map(), error };
  const map = new Map();
  (data || []).forEach((row) => {
    const pid = row.id_stage_plot;
    const eid = Number(row.id_evento);
    if (!pid || !Number.isFinite(eid)) return;
    if (!map.has(pid)) map.set(pid, []);
    map.get(pid).push(eid);
  });
  return { data: map, error: null };
}

/**
 * Plantas ya anidadas en un evento (`stage_plot_eventos → stage_plots`).
 * @param {{ stage_plot_eventos?: Array<{ id_stage_plot?: string, stage_plots?: { nombre?: string|null }|{ nombre?: string|null }[]|null }>|null }} evt
 * @returns {{ id: string, nombre: string }[]}
 */
export function stagePlotLinksFromEventRow(evt) {
  const rows = Array.isArray(evt?.stage_plot_eventos) ? evt.stage_plot_eventos : [];
  const out = [];
  const seen = new Set();
  for (const row of rows) {
    const id = row?.id_stage_plot;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const plot = Array.isArray(row.stage_plots) ? row.stage_plots[0] : row.stage_plots;
    const nombre = String(plot?.nombre || "").trim() || "Escenario";
    out.push({ id, nombre });
  }
  return out;
}

/**
 * Vincula un evento a un plot sin sacar las demás plantas de ese evento
 * ni los demás eventos de ese plot. Si el par ya existe, no duplica.
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} plotId
 * @param {number|string} eventoId
 */
export async function linkEventToStagePlot(supabase, plotId, eventoId) {
  if (!supabase || !plotId || eventoId == null || eventoId === "") {
    return { error: new Error("Cliente, plot o evento inválido") };
  }
  const eid = Number(eventoId);
  if (!Number.isFinite(eid) || eid <= 0) {
    return { error: new Error("id de evento inválido") };
  }

  const { error: insErr } = await supabase.from("stage_plot_eventos").upsert(
    {
      id_stage_plot: plotId,
      id_evento: eid,
    },
    { onConflict: "id_stage_plot,id_evento", ignoreDuplicates: true },
  );
  return { error: insErr || null };
}

/**
 * Quita vínculos evento ↔ stage_plot. No borra el lienzo `stage_plots`.
 * Con `plotId`, solo esa planta. Sin `plotId`, todas las del evento.
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {number|string} eventoId
 * @param {string|null} [plotId]
 */
export async function unlinkEventFromStagePlot(supabase, eventoId, plotId = null) {
  if (!supabase || eventoId == null || eventoId === "") {
    return { error: new Error("Cliente o evento inválido") };
  }
  const eid = Number(eventoId);
  if (!Number.isFinite(eid) || eid <= 0) {
    return { error: new Error("id de evento inválido") };
  }
  let query = supabase.from("stage_plot_eventos").delete().eq("id_evento", eid);
  if (plotId) query = query.eq("id_stage_plot", plotId);
  const { error } = await query;
  return { error: error || null };
}

/**
 * Plantas vinculadas directo a un evento, ordenadas como en la gira.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {number|string} eventoId
 */
export async function listStagePlotsLinkedToEvent(supabase, eventoId) {
  const eventId = Number(eventoId);
  if (!supabase || !Number.isFinite(eventId) || eventId <= 0) {
    return { data: [], error: new Error("Evento inválido") };
  }
  const { data, error } = await supabase
    .from("stage_plot_eventos")
    .select(`id_stage_plot, stage_plots(${STAGE_PLOT_SELECT})`)
    .eq("id_evento", eventId);
  if (error) return { data: [], error };
  const plots = (data || [])
    .map((row) => {
      const nested = Array.isArray(row.stage_plots)
        ? row.stage_plots[0]
        : row.stage_plots;
      return mapPlotRow(nested);
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return String(a.created_at || "").localeCompare(String(b.created_at || ""));
    });
  return { data: plots, error: null };
}

/**
 * Asegura un lienzo Escenario (RiderMaker) vinculado al evento.
 * Orden: link directo → vincular plot resuelto (bloque/default) → crear vacío + link.
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{
 *   id: number|string,
 *   id_gira?: number|string|null,
 *   programas?: { id?: number|string }|null,
 *   fecha?: string|null,
 *   descripcion?: string|null,
 * }} evento
 * @returns {Promise<{ data: object|null, created: boolean, error: Error|null }>}
 */
export async function ensureStagePlotForEvent(supabase, evento) {
  if (!supabase || !evento?.id) {
    return {
      data: null,
      created: false,
      error: new Error("Cliente o evento inválido"),
    };
  }
  const resolved = await resolveStagePlotForEvent(supabase, evento);
  if (resolved.error) {
    return { data: null, created: false, error: resolved.error };
  }
  if (resolved.data && resolved.reason === "event_link") {
    return { data: resolved.data, created: false, error: null };
  }

  if (resolved.data?.id) {
    const { error: linkErr } = await linkEventToStagePlot(
      supabase,
      resolved.data.id,
      evento.id,
    );
    if (linkErr) {
      return { data: resolved.data, created: false, error: linkErr };
    }
    return { data: resolved.data, created: false, error: null };
  }

  const programId =
    evento.id_gira ?? evento.programas?.id ?? evento.id_programa ?? null;
  if (programId == null || programId === "") {
    return {
      data: null,
      created: false,
      error: new Error("El evento no tiene gira/programa"),
    };
  }

  const fechaLabel = evento.fecha ? String(evento.fecha) : "";
  const nombre = fechaLabel
    ? `Concierto ${fechaLabel}`
    : `Concierto #${evento.id}`;

  const { data: plot, error: createErr } = await createStagePlot(
    supabase,
    programId,
    { nombre },
  );
  if (createErr || !plot?.id) {
    return {
      data: null,
      created: false,
      error: createErr || new Error("No se pudo crear el escenario"),
    };
  }

  const { error: linkErr } = await linkEventToStagePlot(
    supabase,
    plot.id,
    evento.id,
  );
  if (linkErr) {
    return { data: plot, created: true, error: linkErr };
  }
  return { data: plot, created: true, error: null };
}

/**
 * Crea un lienzo nuevo para el evento y lo vincula (siempre inserta; no reutiliza).
 * - Sin `sourcePlotId`: payload vacío (`createEmptyStagePlotPayload`).
 * - Con `sourcePlotId`: duplica payload del plot de referencia (mismo programa).
 *   No copia `bloque_ids` ni links de eventos del origen.
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{
 *   id: number|string,
 *   id_gira?: number|string|null,
 *   programas?: { id?: number|string }|null,
 *   fecha?: string|null,
 * }} evento
 * @param {{ sourcePlotId?: string|null, nombre?: string|null }} [opts]
 * @returns {Promise<{ data: object|null, error: Error|null }>}
 */
export async function createStagePlotForEvent(supabase, evento, opts = {}) {
  if (!supabase || !evento?.id) {
    return { data: null, error: new Error("Cliente o evento inválido") };
  }
  const programId =
    evento.id_gira ?? evento.programas?.id ?? evento.id_programa ?? null;
  if (programId == null || programId === "") {
    return { data: null, error: new Error("El evento no tiene gira/programa") };
  }

  const fechaLabel = evento.fecha ? String(evento.fecha) : "";
  const defaultNombre = fechaLabel
    ? `Concierto ${fechaLabel}`
    : `Concierto #${evento.id}`;

  let payload = createEmptyStagePlotPayload();
  let nombre =
    opts.nombre?.trim() ? opts.nombre.trim() : defaultNombre;

  const sourcePlotId = opts.sourcePlotId || null;
  if (sourcePlotId) {
    const { data: source, error: srcErr } = await getStagePlotById(
      supabase,
      sourcePlotId,
    );
    if (srcErr || !source?.id) {
      return {
        data: null,
        error: srcErr || new Error("No se encontró el escenario de referencia"),
      };
    }
    if (Number(source.id_programa) !== Number(programId)) {
      return {
        data: null,
        error: new Error("El escenario de referencia no pertenece a esta gira"),
      };
    }
    payload = cloneStagePlotPayload(source.payload);
    if (!opts.nombre?.trim()) {
      const srcLabel = source.nombre?.trim() || "Lienzo";
      nombre = `${srcLabel} (copia)`;
    }
  }

  const { data: plot, error: createErr } = await createStagePlot(
    supabase,
    programId,
    { nombre, payload, bloque_ids: [] },
  );
  if (createErr || !plot?.id) {
    return {
      data: null,
      error: createErr || new Error("No se pudo crear el escenario"),
    };
  }

  const { error: linkErr } = await linkEventToStagePlot(
    supabase,
    plot.id,
    evento.id,
  );
  if (linkErr) {
    return { data: plot, error: linkErr };
  }
  return { data: plot, error: null };
}

/**
 * Reemplaza los eventos asociados a este plot.
 * No quita esos eventos de otras plantas: un concierto puede tener varias.
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} plotId
 * @param {number[]} eventoIds
 */
export async function setStagePlotEventos(supabase, plotId, eventoIds) {
  if (!supabase || !plotId) {
    return { error: new Error("Cliente o plot inválido") };
  }
  const nextIds = normalizeBloqueIds(eventoIds);

  const { error: delErr } = await supabase
    .from("stage_plot_eventos")
    .delete()
    .eq("id_stage_plot", plotId);
  if (delErr) return { error: delErr };

  if (nextIds.length === 0) return { error: null };

  const { error: insErr } = await supabase.from("stage_plot_eventos").insert(
    nextIds.map((id_evento) => ({
      id_stage_plot: plotId,
      id_evento,
    })),
  );
  return { error: insErr || null };
}

/**
 * Eventos de la gira candidatos a asociar (concierto / ensayo).
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {number|string} giraId
 */
export async function listGiraStagePlotCandidateEvents(supabase, giraId) {
  if (!supabase || giraId == null || giraId === "") {
    return { data: [], error: new Error("Cliente o gira inválida") };
  }
  const { data, error } = await supabase
    .from("eventos")
    .select(
      "id, fecha, hora_inicio, id_tipo_evento, descripcion, tecnica, id_repertorio, id_gira, tipos_evento(nombre)",
    )
    .eq("id_gira", giraId)
    .in("id_tipo_evento", STAGE_PLOT_EVENT_TIPO_IDS)
    .or("is_deleted.is.null,is_deleted.eq.false")
    .order("fecha", { ascending: true })
    .order("hora_inicio", { ascending: true });
  if (error) return { data: [], error };
  return { data: data || [], error: null };
}

/**
 * Resuelve el plot que debe ver un técnico para un evento.
 *
 * Orden:
 * 1. Primera planta vinculada en `stage_plot_eventos` (sort_order). Si hay varias, el viewer lista todas por nombre.
 * 2. Plot cuyo `bloque_ids` contiene `eventos.id_repertorio`
 * 3. Primer plot del programa (sort_order / created_at)
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{
 *   id: number|string,
 *   id_gira?: number|string|null,
 *   id_repertorio?: number|string|null,
 *   programas?: { id?: number|string }|null,
 * }} evento
 */
export async function resolveStagePlotForEvent(supabase, evento) {
  if (!supabase || !evento?.id) {
    return {
      data: null,
      reason: "invalid",
      error: new Error("Evento inválido"),
    };
  }
  const eventId = Number(evento.id);
  const programId =
    evento.id_gira ?? evento.programas?.id ?? evento.id_programa ?? null;

  // 1) Plantas vinculadas. Si hay varias, la primera es el default; el viewer muestra todas.
  const { data: linked, error: linkErr } = await listStagePlotsLinkedToEvent(
    supabase,
    eventId,
  );
  if (linkErr) return { data: null, reason: "error", error: linkErr };
  if (linked?.length) {
    return { data: linked[0], reason: "event_link", error: null };
  }

  if (programId == null || programId === "") {
    return { data: null, reason: "no_gira", error: null };
  }

  const { data: plots, error: listErr } = await listStagePlotsByPrograma(
    supabase,
    programId,
  );
  if (listErr) return { data: null, reason: "error", error: listErr };
  if (!plots?.length) return { data: null, reason: "no_plots", error: null };

  // 2) Por bloque del evento
  const bloqueId = Number(evento.id_repertorio);
  if (Number.isFinite(bloqueId) && bloqueId > 0) {
    const byBloque = plots.find((p) =>
      (p.bloque_ids || []).includes(bloqueId),
    );
    if (byBloque) {
      return { data: byBloque, reason: "bloque", error: null };
    }
  }

  // 3) Default gira
  return { data: plots[0], reason: "default", error: null };
}

/**
 * Lista programas que tienen al menos un stage plot (para importar desde otra gira).
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{ excludeProgramId?: number|string, limit?: number }} [opts]
 */
export async function listProgramasWithStagePlots(supabase, opts = {}) {
  if (!supabase) {
    return { data: [], error: new Error("Cliente inválido") };
  }
  const { data, error } = await supabase
    .from("stage_plots")
    .select(
      "id_programa, programas(id, nombre_gira, nomenclador, mes_letra, fecha_desde)",
    )
    .order("updated_at", { ascending: false })
    .limit(Math.min(opts.limit || 200, 500));
  if (error) return { data: [], error };

  const exclude = opts.excludeProgramId != null
    ? Number(opts.excludeProgramId)
    : null;
  const seen = new Set();
  const rows = [];
  for (const row of data || []) {
    const pid = Number(row.id_programa);
    if (!Number.isFinite(pid) || seen.has(pid)) continue;
    if (exclude != null && pid === exclude) continue;
    seen.add(pid);
    rows.push({
      id: pid,
      nombre_gira: row.programas?.nombre_gira || `Gira ${pid}`,
      nomenclador: row.programas?.nomenclador || null,
      mes_letra: row.programas?.mes_letra || null,
      fecha_desde: row.programas?.fecha_desde || null,
    });
  }
  return { data: rows, error: null };
}

/**
 * Contexto mínimo para montar el editor Escenario fuera del shell Giras/Seating.
 * Carga el plot por id + fila `programas` (roster / meta del editor).
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string|number} plotId
 * @returns {Promise<{
 *   plot: object|null,
 *   program: object|null,
 *   error: Error|null,
 * }>}
 */
export async function loadStagePlotStandaloneContext(supabase, plotId) {
  if (!supabase || plotId == null || plotId === "") {
    return {
      plot: null,
      program: null,
      error: new Error("Cliente o plot inválido"),
    };
  }
  const { data: plot, error: plotErr } = await getStagePlotById(supabase, plotId);
  if (plotErr) return { plot: null, program: null, error: plotErr };
  if (!plot?.id) {
    return {
      plot: null,
      program: null,
      error: new Error("Escenario no encontrado"),
    };
  }
  const programId = plot.id_programa;
  // `programas` has no `anio` column — year comes from fecha_desde (and FIMBA ediciones.anio).
  const { data: program, error: progErr } = await supabase
    .from("programas")
    .select(
      "id, nombre_gira, nomenclador, tipo, mes_letra, fecha_desde, fecha_hasta, subtitulo",
    )
    .eq("id", programId)
    .maybeSingle();
  if (progErr) return { plot, program: null, error: progErr };
  if (!program?.id) {
    return {
      plot,
      program: null,
      error: new Error("Programa del escenario no encontrado"),
    };
  }
  return { plot, program, error: null };
}

/**
 * Primer plot del programa (o null). Útil para deep-link FIMBA Venues sin vínculo evento.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {number|string} programId
 */
export async function getDefaultStagePlotForPrograma(supabase, programId) {
  const { data, error } = await listStagePlotsByPrograma(supabase, programId);
  if (error) return { data: null, error };
  return { data: data?.[0] || null, error: null };
}

export { normalizeBloqueIds };
