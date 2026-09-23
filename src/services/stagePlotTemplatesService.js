/**
 * CRUD de plantillas globales de Escenario (`stage_plot_templates`).
 */

import {
  cloneStagePlotPayload,
  countStagePlotMusicians,
  createEmptyStagePlotPayload,
  normalizeStagePlotPayload,
} from "../utils/stagePlotPayload";

const TEMPLATE_SELECT =
  "id, nombre, payload, musicos_count, created_at, updated_at";

function mapTemplateRow(row) {
  if (!row) return null;
  const payload = normalizeStagePlotPayload(row.payload);
  const musicos =
    Number.isFinite(Number(row.musicos_count)) && Number(row.musicos_count) >= 0
      ? Number(row.musicos_count)
      : countStagePlotMusicians(payload);
  return {
    id: row.id,
    nombre: row.nombre?.trim() ? String(row.nombre).trim() : "Sin nombre",
    payload,
    musicos_count: musicos,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
  };
}

function buildWriteFields({ nombre, payload }) {
  const normalized = normalizeStagePlotPayload(
    payload ?? createEmptyStagePlotPayload(),
  );
  const name = String(nombre ?? "").trim();
  if (!name) {
    return { error: new Error("El nombre de la plantilla es obligatorio") };
  }
  return {
    fields: {
      nombre: name,
      payload: cloneStagePlotPayload(normalized),
      musicos_count: countStagePlotMusicians(normalized),
      updated_at: new Date().toISOString(),
    },
    error: null,
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function listStagePlotTemplates(supabase) {
  if (!supabase) {
    return { data: [], error: new Error("Cliente inválido") };
  }
  const { data, error } = await supabase
    .from("stage_plot_templates")
    .select(TEMPLATE_SELECT)
    .order("updated_at", { ascending: false })
    .order("nombre", { ascending: true });
  if (error) return { data: [], error };
  return { data: (data || []).map(mapTemplateRow), error: null };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{ nombre: string, payload: object }} opts
 */
export async function createStagePlotTemplate(supabase, opts) {
  if (!supabase) {
    return { data: null, error: new Error("Cliente inválido") };
  }
  const built = buildWriteFields(opts);
  if (built.error) return { data: null, error: built.error };
  const { data, error } = await supabase
    .from("stage_plot_templates")
    .insert(built.fields)
    .select(TEMPLATE_SELECT)
    .single();
  if (error) return { data: null, error };
  return { data: mapTemplateRow(data), error: null };
}

/**
 * Actualiza nombre y/o payload de una plantilla existente.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} templateId
 * @param {{ nombre?: string, payload?: object }} patch
 */
export async function updateStagePlotTemplate(supabase, templateId, patch) {
  if (!supabase || !templateId) {
    return { data: null, error: new Error("Cliente o plantilla inválidos") };
  }
  const updates = { updated_at: new Date().toISOString() };

  if (patch?.nombre != null) {
    const name = String(patch.nombre).trim();
    if (!name) {
      return { data: null, error: new Error("El nombre no puede quedar vacío") };
    }
    updates.nombre = name;
  }

  if (patch?.payload != null) {
    const normalized = normalizeStagePlotPayload(patch.payload);
    updates.payload = cloneStagePlotPayload(normalized);
    updates.musicos_count = countStagePlotMusicians(normalized);
  }

  if (Object.keys(updates).length <= 1) {
    return { data: null, error: new Error("Nada para actualizar") };
  }

  const { data, error } = await supabase
    .from("stage_plot_templates")
    .update(updates)
    .eq("id", templateId)
    .select(TEMPLATE_SELECT)
    .single();
  if (error) return { data: null, error };
  return { data: mapTemplateRow(data), error: null };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} templateId
 */
export async function deleteStagePlotTemplate(supabase, templateId) {
  if (!supabase || !templateId) {
    return { error: new Error("Cliente o plantilla inválidos") };
  }
  const { error } = await supabase
    .from("stage_plot_templates")
    .delete()
    .eq("id", templateId);
  return { error: error || null };
}
