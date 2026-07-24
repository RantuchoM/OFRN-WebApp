/**
 * Grupos de convocatoria por gira (CRUD + helpers de membresía efectiva).
 */

export const GIRA_GRUPO_DEFAULT_COLORS = [
  "#6366f1",
  "#0d9488",
  "#ea580c",
  "#db2777",
  "#2563eb",
  "#ca8a04",
  "#7c3aed",
  "#0891b2",
];

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {number|string} idGira
 */
export async function fetchGiraGrupos(supabase, idGira) {
  if (!supabase || idGira == null || idGira === "") {
    return { grupos: [], error: null };
  }
  const { data, error } = await supabase
    .from("giras_grupos")
    .select(
      "id, id_gira, nombre, color, orden, giras_grupos_integrantes ( id, id_integrante )",
    )
    .eq("id_gira", idGira)
    .order("orden", { ascending: true })
    .order("nombre", { ascending: true });
  if (error) return { grupos: [], error };
  return { grupos: data || [], error: null };
}

/**
 * Mapa integranteId → grupos efectivos (excluye ausentes del roster).
 * @param {Array} grupos
 * @param {Array<{ id: number|string, estado_gira?: string }>} roster
 */
export function buildIntegranteGruposMap(grupos, roster) {
  const ausentes = new Set(
    (roster || [])
      .filter((m) => (m.estado_gira || "").toLowerCase() === "ausente")
      .map((m) => String(m.id)),
  );
  const map = new Map();
  (grupos || []).forEach((g) => {
    const meta = {
      id: g.id,
      nombre: g.nombre,
      color: g.color || GIRA_GRUPO_DEFAULT_COLORS[0],
    };
    (g.giras_grupos_integrantes || []).forEach((row) => {
      const id = String(row.id_integrante);
      if (ausentes.has(id)) return;
      if (!map.has(id)) map.set(id, []);
      map.get(id).push(meta);
    });
  });
  return map;
}

/**
 * IDs de grupo a los que pertenece un integrante (efectivo).
 */
export function getEffectiveGrupoIdsForIntegrante(grupos, integranteId, isAusente) {
  if (isAusente || integranteId == null) return new Set();
  const id = String(integranteId);
  const set = new Set();
  (grupos || []).forEach((g) => {
    const member = (g.giras_grupos_integrantes || []).some(
      (r) => String(r.id_integrante) === id,
    );
    if (member) set.add(Number(g.id));
  });
  return set;
}

export async function createGiraGrupo(supabase, { idGira, nombre, color, orden = 0 }) {
  const { data, error } = await supabase
    .from("giras_grupos")
    .insert({
      id_gira: idGira,
      nombre: String(nombre || "").trim(),
      color: color || GIRA_GRUPO_DEFAULT_COLORS[0],
      orden,
    })
    .select()
    .single();
  return { data, error };
}

export async function updateGiraGrupo(supabase, id, patch) {
  const payload = {};
  if (patch.nombre != null) payload.nombre = String(patch.nombre).trim();
  if (patch.color != null) payload.color = patch.color;
  if (patch.orden != null) payload.orden = patch.orden;
  const { data, error } = await supabase
    .from("giras_grupos")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  return { data, error };
}

export async function deleteGiraGrupo(supabase, id) {
  const { error } = await supabase.from("giras_grupos").delete().eq("id", id);
  return { error };
}

/**
 * Reemplaza la membresía completa de un grupo.
 * @param {number[]} integranteIds
 */
export async function setGiraGrupoMembers(supabase, idGrupo, integranteIds) {
  const { error: delError } = await supabase
    .from("giras_grupos_integrantes")
    .delete()
    .eq("id_grupo", idGrupo);
  if (delError) return { error: delError };

  const ids = [...new Set((integranteIds || []).map(Number).filter(Boolean))];
  if (ids.length === 0) return { error: null };

  const { error } = await supabase.from("giras_grupos_integrantes").insert(
    ids.map((id_integrante) => ({ id_grupo: idGrupo, id_integrante })),
  );
  return { error };
}

/**
 * Reemplaza grupos asignados a un evento.
 * @param {number[]} grupoIds
 */
export async function setEventoGrupos(supabase, idEvento, grupoIds) {
  const { error: delError } = await supabase
    .from("eventos_grupos")
    .delete()
    .eq("id_evento", idEvento);
  if (delError) return { error: delError };

  const ids = [...new Set((grupoIds || []).map(Number).filter(Boolean))];
  if (ids.length === 0) return { error: null };

  const { error } = await supabase.from("eventos_grupos").insert(
    ids.map((id_grupo) => ({ id_evento: idEvento, id_grupo })),
  );
  return { error };
}

export function eventGrupoIdsFromEvent(evt) {
  return (evt?.eventos_grupos || [])
    .map((eg) => eg.id_grupo ?? eg.giras_grupos?.id)
    .filter((id) => id != null)
    .map(Number);
}

export function eventGruposMetaFromEvent(evt) {
  return (evt?.eventos_grupos || [])
    .map((eg) => eg.giras_grupos)
    .filter(Boolean);
}
