import {
  findMailPlantillaSchema,
  mailPlantillaSchemaKey,
  MAIL_PLANTILLA_SCHEMAS,
} from "../utils/mailPlantillaSchemas";

export async function listMailPlantillas(supabase) {
  const { data, error } = await supabase
    .from("mail_plantillas")
    .select(
      "id, template_id, variant_key, titulo, asunto, slots, updated_at, updated_by",
    )
    .order("template_id", { ascending: true })
    .order("variant_key", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getMailPlantilla(supabase, templateId, variantKey = "") {
  const { data, error } = await supabase
    .from("mail_plantillas")
    .select(
      "id, template_id, variant_key, titulo, asunto, slots, updated_at, updated_by",
    )
    .eq("template_id", templateId)
    .eq("variant_key", variantKey || "")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertMailPlantilla(
  supabase,
  { templateId, variantKey = "", titulo, asunto, slots, updatedBy = null },
) {
  const schema = findMailPlantillaSchema(templateId, variantKey);
  const allowed = new Set((schema?.slotDefs || []).map((s) => s.key));
  const cleanSlots = {};
  for (const [k, v] of Object.entries(slots || {})) {
    if (allowed.size && !allowed.has(k)) continue;
    cleanSlots[k] = String(v ?? "");
  }
  const row = {
    template_id: templateId,
    variant_key: variantKey || "",
    titulo: titulo || schema?.titulo || templateId,
    asunto: asunto ?? schema?.asunto ?? "",
    slots: cleanSlots,
    updated_at: new Date().toISOString(),
    updated_by: updatedBy,
  };
  const { data, error } = await supabase
    .from("mail_plantillas")
    .upsert(row, { onConflict: "template_id,variant_key" })
    .select(
      "id, template_id, variant_key, titulo, asunto, slots, updated_at, updated_by",
    )
    .single();
  if (error) throw error;
  return data;
}

export function defaultsForSchema(templateId, variantKey = "") {
  const schema = findMailPlantillaSchema(templateId, variantKey);
  if (!schema) return null;
  return {
    template_id: schema.templateId,
    variant_key: schema.variantKey,
    titulo: schema.titulo,
    asunto: schema.asunto,
    slots: { ...schema.slots },
  };
}

/** Fusiona filas DB con esquemas (por si falta alguna fila). */
export function mergePlantillasWithSchemas(rows = []) {
  const byKey = new Map(
    (rows || []).map((r) => [
      mailPlantillaSchemaKey(r.template_id, r.variant_key),
      r,
    ]),
  );
  return MAIL_PLANTILLA_SCHEMAS.map((schema) => {
    const key = mailPlantillaSchemaKey(schema.templateId, schema.variantKey);
    const row = byKey.get(key);
    return {
      schema,
      row: row || null,
      template_id: schema.templateId,
      variant_key: schema.variantKey,
      titulo: row?.titulo || schema.titulo,
      asunto: row?.asunto ?? schema.asunto,
      slots: { ...schema.slots, ...(row?.slots || {}) },
      updated_at: row?.updated_at || null,
      id: row?.id || null,
      missingInDb: !row,
    };
  });
}
