/**
 * Persistencia del plano de escenario (N lienzos por programa).
 */

import { createEmptyStagePlotPayload } from "../utils/stagePlotPayload";

const STAGE_PLOT_SELECT =
  "id, id_programa, nombre, payload, sort_order, bloque_ids, created_at, updated_at";

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
  };
}

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
 * Reemplaza los eventos asociados a un plot.
 * Un evento solo puede pertenecer a un plot (unique id_evento).
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

  // Liberar eventos que ya estuvieran en otro plot.
  const { error: freeErr } = await supabase
    .from("stage_plot_eventos")
    .delete()
    .in("id_evento", nextIds);
  if (freeErr) return { error: freeErr };

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
 * 1. Link directo `stage_plot_eventos`
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

  // 1) Link directo
  const { data: link, error: linkErr } = await supabase
    .from("stage_plot_eventos")
    .select("id_stage_plot")
    .eq("id_evento", eventId)
    .maybeSingle();
  if (linkErr) return { data: null, reason: "error", error: linkErr };
  if (link?.id_stage_plot) {
    const { data, error } = await getStagePlotById(supabase, link.id_stage_plot);
    if (error) return { data: null, reason: "error", error };
    if (data) return { data, reason: "event_link", error: null };
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
    .select("id_programa, programas(id, nombre_gira, nomenclador, mes_letra, anio)")
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
      anio: row.programas?.anio || null,
    });
  }
  return { data: rows, error: null };
}

export { normalizeBloqueIds };
