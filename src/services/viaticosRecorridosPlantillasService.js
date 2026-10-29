const TABLE = "viaticos_recorridos_plantillas";
const COLS = "id, nombre, zona, es_preferida, recorridos, updated_at";

function friendlyError(error) {
  const message = String(error?.message || "");
  if (error?.code === "23505" || message.includes("duplicate key")) {
    if (message.includes("preferida")) {
      return new Error("Ya hay una plantilla preferida para esa zona.");
    }
    return new Error("Ya existe una plantilla con ese nombre en esa zona.");
  }
  return error instanceof Error ? error : new Error(message || "No se pudo guardar la plantilla.");
}

export async function listRecorridosPlantillas(supabase) {
  const { data, error } = await supabase
    .from(TABLE)
    .select(COLS)
    .order("zona", { ascending: true })
    .order("nombre", { ascending: true });
  if (error) throw error;
  return data || [];
}

async function clearPreferida(supabase, zona, exceptId) {
  let query = supabase
    .from(TABLE)
    .update({ es_preferida: false, updated_at: new Date().toISOString() })
    .eq("zona", zona)
    .eq("es_preferida", true);
  if (exceptId != null) query = query.neq("id", exceptId);
  const { error } = await query;
  if (error) throw error;
}

export async function saveRecorridosPlantilla(supabase, payload) {
  const now = new Date().toISOString();
  const row = {
    nombre: String(payload.nombre || "").trim(),
    zona: String(payload.zona || "").trim(),
    es_preferida: !!payload.esPreferida,
    recorridos: (payload.recorridosIds || [])
      .filter((ids) => Array.isArray(ids) && ids.length > 0)
      .map((ids) => ({ ids: ids.map((id) => Number(id)) })),
    updated_at: now,
  };
  if (row.es_preferida) {
    await clearPreferida(supabase, row.zona, payload.id ?? null);
  }
  const query = payload.id
    ? supabase.from(TABLE).update(row).eq("id", payload.id).select(COLS).single()
    : supabase.from(TABLE).insert(row).select(COLS).single();
  const { data, error } = await query;
  if (error) throw friendlyError(error);
  return data;
}

export async function setPlantillaPreferida(supabase, id, zona) {
  const now = new Date().toISOString();
  await clearPreferida(supabase, zona, id);
  const { data, error } = await supabase
    .from(TABLE)
    .update({ es_preferida: true, updated_at: now })
    .eq("id", id)
    .select(COLS)
    .single();
  if (error) throw friendlyError(error);
  return data;
}

export async function deleteRecorridosPlantilla(supabase, id) {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}
