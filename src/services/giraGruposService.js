/**
 * Grupos de convocatoria por gira (CRUD + helpers de membresía efectiva).
 */
import { notifyEnsayoEventoSoftDeleted } from "../utils/ensayoCheckinLifecycle";

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
 * Eventos asociados a un grupo (vía eventos_grupos).
 * @returns {{ eventos: Array<{id, fecha, hora_inicio, descripcion, tipos_evento}>, error }}
 */
export async function fetchEventosByGiraGrupo(supabase, idGrupo) {
  const { data, error } = await supabase
    .from("eventos_grupos")
    .select(
      "id_evento, eventos ( id, fecha, hora_inicio, descripcion, is_deleted, tipos_evento ( nombre ) )",
    )
    .eq("id_grupo", idGrupo);
  if (error) return { eventos: [], error };
  const eventos = (data || [])
    .map((row) => row.eventos)
    .filter((e) => e && e.is_deleted !== true);
  eventos.sort((a, b) => {
    const da = `${a.fecha || ""}T${a.hora_inicio || "00:00"}`;
    const db = `${b.fecha || ""}T${b.hora_inicio || "00:00"}`;
    return da.localeCompare(db);
  });
  return { eventos, error: null };
}

/** Soft-delete de eventos (papelera), mismo patrón que la agenda. */
export async function softDeleteEventos(supabase, eventIds) {
  const ids = [...new Set((eventIds || []).map(Number).filter(Boolean))];
  if (ids.length === 0) return { error: null };
  const { error } = await supabase
    .from("eventos")
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
    })
    .in("id", ids);
  if (!error) notifyEnsayoEventoSoftDeleted(ids);
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

/** Quita un integrante de un grupo (sin tocar el resto de la membresía). */
export async function removeIntegranteFromGiraGrupo(
  supabase,
  idGrupo,
  idIntegrante,
) {
  const { error } = await supabase
    .from("giras_grupos_integrantes")
    .delete()
    .eq("id_grupo", idGrupo)
    .eq("id_integrante", idIntegrante);
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

/** ¿El evento pasa el filtro editorial de grupos? */
export function eventPassesEditorialGrupoFilter(
  evt,
  filterGrupoIds = [],
  includeGeneralEvents = true,
) {
  const selected = (filterGrupoIds || []).map(Number).filter(Number.isFinite);
  if (selected.length === 0) return true;
  const eventIds = eventGrupoIdsFromEvent(evt);
  if (eventIds.length === 0) return includeGeneralEvents;
  return eventIds.some((id) => selected.includes(id));
}

/**
 * ¿La persona pertenece a al menos uno de los grupos del evento?
 * Sin grupos en el evento → true (comportamiento histórico).
 */
export function personPassesEventoGrupos(personId, eventoGrupoIds, personGrupoIds) {
  const required = [...new Set((eventoGrupoIds || []).map(Number).filter(Number.isFinite))];
  if (required.length === 0) return true;
  if (personId == null) return false;
  const mine =
    personGrupoIds instanceof Set
      ? personGrupoIds
      : new Set([...(personGrupoIds || [])].map(Number).filter(Number.isFinite));
  return required.some((id) => mine.has(id));
}

/** Grupos default de un vehículo físico. */
export async function fetchGiraTransporteGrupos(supabase, idGiraTransporte) {
  if (!supabase || idGiraTransporte == null) {
    return { grupoIds: [], error: null };
  }
  const { data, error } = await supabase
    .from("giras_transportes_grupos")
    .select("id_grupo")
    .eq("id_gira_transporte", idGiraTransporte);
  if (error) return { grupoIds: [], error };
  return {
    grupoIds: (data || []).map((r) => Number(r.id_grupo)).filter(Number.isFinite),
    error: null,
  };
}

/** Mapa id_gira_transporte → grupoIds para varios vehículos. */
export async function fetchGiraTransportesGruposMap(supabase, transportIds) {
  const ids = [...new Set((transportIds || []).map(Number).filter(Boolean))];
  if (!supabase || ids.length === 0) return { map: new Map(), error: null };
  const { data, error } = await supabase
    .from("giras_transportes_grupos")
    .select("id_gira_transporte, id_grupo")
    .in("id_gira_transporte", ids);
  if (error) return { map: new Map(), error };
  const map = new Map();
  (data || []).forEach((row) => {
    const tid = Number(row.id_gira_transporte);
    const gid = Number(row.id_grupo);
    if (!Number.isFinite(tid) || !Number.isFinite(gid)) return;
    if (!map.has(tid)) map.set(tid, []);
    map.get(tid).push(gid);
  });
  return { map, error: null };
}

/** Reemplaza grupos default de un vehículo. */
export async function setGiraTransporteGrupos(supabase, idGiraTransporte, grupoIds) {
  const { error: delError } = await supabase
    .from("giras_transportes_grupos")
    .delete()
    .eq("id_gira_transporte", idGiraTransporte);
  if (delError) return { error: delError };

  const ids = [...new Set((grupoIds || []).map(Number).filter(Boolean))];
  if (ids.length === 0) return { error: null };

  const { error } = await supabase.from("giras_transportes_grupos").insert(
    ids.map((id_grupo) => ({
      id_gira_transporte: idGiraTransporte,
      id_grupo,
    })),
  );
  return { error };
}

/**
 * Reemplaza grupos asignados a un bloque de repertorio (`programas_repertorios`).
 * Vacío = el bloque aplica a todo el roster.
 * @param {number[]} grupoIds
 */
export async function setRepertorioGrupos(supabase, idRepertorio, grupoIds) {
  const { error: delError } = await supabase
    .from("programas_repertorios_grupos")
    .delete()
    .eq("id_repertorio", idRepertorio);
  if (delError) return { error: delError };

  const ids = [...new Set((grupoIds || []).map(Number).filter(Boolean))];
  if (ids.length === 0) return { error: null };

  const { error } = await supabase.from("programas_repertorios_grupos").insert(
    ids.map((id_grupo) => ({ id_repertorio: idRepertorio, id_grupo })),
  );
  return { error };
}

export function repertorioGrupoIdsFromBlock(block) {
  return (block?.programas_repertorios_grupos || [])
    .map((rg) => rg.id_grupo ?? rg.giras_grupos?.id)
    .filter((id) => id != null)
    .map(Number);
}

export function repertorioGruposMetaFromBlock(block) {
  return (block?.programas_repertorios_grupos || [])
    .map((rg) => rg.giras_grupos)
    .filter(Boolean);
}

/**
 * IDs de integrantes (string) que pertenecen a alguno de los grupos del bloque.
 * Sin grupos en el bloque → null (no filtra; todo el roster).
 */
export function integranteIdsForRepertorioGrupos(grupos, blockGrupoIds) {
  const required = [
    ...new Set((blockGrupoIds || []).map(Number).filter(Number.isFinite)),
  ];
  if (required.length === 0) return null;
  const requiredSet = new Set(required);
  const ids = new Set();
  (grupos || []).forEach((g) => {
    if (!requiredSet.has(Number(g.id))) return;
    (g.giras_grupos_integrantes || []).forEach((row) => {
      if (row?.id_integrante != null) ids.add(String(row.id_integrante));
    });
  });
  return ids;
}

/**
 * Roster que toca un bloque: unión de grupos asignados, o roster completo si el bloque no tiene grupos.
 */
export function filterRosterForRepertorioBlock(roster, grupos, block) {
  const memberIds = integranteIdsForRepertorioGrupos(
    grupos,
    repertorioGrupoIdsFromBlock(block),
  );
  if (!memberIds) return roster || [];
  return (roster || []).filter((m) => memberIds.has(String(m.id)));
}

/**
 * Copia los grupos default del vehículo a N eventos (reemplaza eventos_grupos).
 */
export async function applyTransporteGruposToEventos(
  supabase,
  eventIds,
  grupoIds,
) {
  const ids = [...new Set((eventIds || []).map(Number).filter(Boolean))];
  if (ids.length === 0) return { error: null };
  for (const idEvento of ids) {
    const { error } = await setEventoGrupos(supabase, idEvento, grupoIds);
    if (error) return { error };
  }
  return { error: null };
}
