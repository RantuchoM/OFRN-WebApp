import { supabase } from "./supabase";
import { normalizeEnsayoSlot } from "../utils/ensambleProyeccionEnsayos";

const SELECT = `
  id,
  id_ensamble,
  iso_dow,
  hora_inicio,
  hora_fin,
  id_locacion,
  titulo,
  activo,
  locaciones ( id, nombre, id_localidad )
`;

function mapRow(row) {
  return normalizeEnsayoSlot(row);
}

/** Todos los slots activos (informe / precarga). */
export async function fetchAllEnsambleProyeccionEnsayos() {
  const { data, error } = await supabase
    .from("ensamble_proyeccion_ensayos")
    .select(SELECT)
    .eq("activo", true)
    .order("id_ensamble")
    .order("iso_dow")
    .order("hora_inicio");
  if (error) throw error;
  return (data || []).map(mapRow);
}

export async function fetchEnsambleProyeccionEnsayos(ensambleId) {
  const id = Number(ensambleId);
  if (!id) return [];
  const { data, error } = await supabase
    .from("ensamble_proyeccion_ensayos")
    .select(SELECT)
    .eq("id_ensamble", id)
    .eq("activo", true)
    .order("iso_dow")
    .order("hora_inicio");
  if (error) throw error;
  return (data || []).map(mapRow);
}

export async function fetchLocacionesForProyeccion() {
  const { data, error } = await supabase
    .from("locaciones")
    .select("id, nombre, id_localidad, localidades(id, localidad)")
    .order("nombre");
  if (error) throw error;
  return data || [];
}

export async function upsertEnsambleProyeccionEnsayo(payload) {
  const id_ensamble = Number(payload.id_ensamble);
  const iso_dow = Number(payload.iso_dow ?? payload.isoDow);
  const hora_inicio = String(payload.hora_inicio || "").slice(0, 5);
  const hora_fin = String(payload.hora_fin || "").slice(0, 5);
  if (!id_ensamble || !iso_dow || !hora_inicio || !hora_fin) {
    throw new Error("Faltan ensamble, día u horario");
  }
  if (hora_fin <= hora_inicio) {
    throw new Error("La hora fin debe ser posterior al inicio");
  }
  const row = {
    id_ensamble,
    iso_dow,
    hora_inicio,
    hora_fin,
    id_locacion:
      payload.id_locacion != null && payload.id_locacion !== ""
        ? Number(payload.id_locacion)
        : null,
    titulo: payload.titulo?.trim() || null,
    activo: payload.activo !== false,
  };
  if (payload.id) {
    const { data, error } = await supabase
      .from("ensamble_proyeccion_ensayos")
      .update(row)
      .eq("id", Number(payload.id))
      .select(SELECT)
      .single();
    if (error) throw error;
    return mapRow(data);
  }
  const { data, error } = await supabase
    .from("ensamble_proyeccion_ensayos")
    .insert(row)
    .select(SELECT)
    .single();
  if (error) throw error;
  return mapRow(data);
}

/** Soft-delete (activo=false) o hard delete si hard=true. */
export async function deleteEnsambleProyeccionEnsayo(id, { hard = false } = {}) {
  const sid = Number(id);
  if (!sid) throw new Error("id inválido");
  if (hard) {
    const { error } = await supabase
      .from("ensamble_proyeccion_ensayos")
      .delete()
      .eq("id", sid);
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from("ensamble_proyeccion_ensayos")
    .update({ activo: false })
    .eq("id", sid);
  if (error) throw error;
}
