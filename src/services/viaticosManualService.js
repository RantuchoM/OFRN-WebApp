import { supabaseOficinaExterna } from "./supabase";
import {
  ensureOficinaExternaProfile,
  getOficinaExternaSessionProfile,
  logoutOficinaExterna,
  requestOficinaExternaEmailCode,
  verifyOficinaExternaEmailCode,
  verifyOficinaExternaMagicLink,
  VIATICOS_APP,
} from "./oficinaExternaAuthService";

export async function getViaticosManualSessionProfile() {
  return getOficinaExternaSessionProfile();
}

export async function ensureViaticosManualProfile({ nombre, apellido }) {
  return ensureOficinaExternaProfile({ nombre, apellido });
}

export async function requestViaticosManualEmailCode(email) {
  return requestOficinaExternaEmailCode(email, VIATICOS_APP);
}

export async function verifyViaticosManualEmailCode({ email, code }) {
  return verifyOficinaExternaEmailCode({ email, code, app: VIATICOS_APP });
}

export async function verifyViaticosManualMagicLink({ token }) {
  return verifyOficinaExternaMagicLink({ token, app: VIATICOS_APP });
}

export async function logoutViaticosManual() {
  return logoutOficinaExterna();
}

export async function listViaticosGuardados() {
  const { data, error } = await supabaseOficinaExterna
    .from("viaticos_manual_viatico")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getViaticoGuardado(id) {
  const { data, error } = await supabaseOficinaExterna
    .from("viaticos_manual_viatico")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveViaticoGuardado({ id, etiqueta, datos }) {
  const {
    data: { session },
  } = await supabaseOficinaExterna.auth.getSession();
  if (!session?.user) throw new Error("No autenticado");

  const payload = {
    usuario_id: session.user.id,
    etiqueta: String(etiqueta || "").trim(),
    datos,
  };

  if (id) {
    const { data, error } = await supabaseOficinaExterna
      .from("viaticos_manual_viatico")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabaseOficinaExterna
    .from("viaticos_manual_viatico")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteViaticoGuardado(id) {
  const { error } = await supabaseOficinaExterna
    .from("viaticos_manual_viatico")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function deleteAllViaticosGuardados() {
  const {
    data: { session },
  } = await supabaseOficinaExterna.auth.getSession();
  if (!session?.user) throw new Error("No autenticado");

  const { error } = await supabaseOficinaExterna
    .from("viaticos_manual_viatico")
    .delete()
    .eq("usuario_id", session.user.id);
  if (error) throw error;
}

export async function listRendicionesGuardadas() {
  const { data, error } = await supabaseOficinaExterna
    .from("viaticos_manual_rendicion")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function saveRendicionGuardada({ id, viatico_origen_id, etiqueta, datos }) {
  const {
    data: { session },
  } = await supabaseOficinaExterna.auth.getSession();
  if (!session?.user) throw new Error("No autenticado");

  const payload = {
    usuario_id: session.user.id,
    viatico_origen_id: viatico_origen_id || null,
    etiqueta: String(etiqueta || "").trim(),
    datos,
  };

  if (id) {
    const { data, error } = await supabaseOficinaExterna
      .from("viaticos_manual_rendicion")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabaseOficinaExterna
    .from("viaticos_manual_rendicion")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRendicionGuardada(id) {
  const { error } = await supabaseOficinaExterna
    .from("viaticos_manual_rendicion")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function deleteAllRendicionesGuardadas() {
  const {
    data: { session },
  } = await supabaseOficinaExterna.auth.getSession();
  if (!session?.user) throw new Error("No autenticado");

  const { error } = await supabaseOficinaExterna
    .from("viaticos_manual_rendicion")
    .delete()
    .eq("usuario_id", session.user.id);
  if (error) throw error;
}

/** Nombre visible del registro: persona + fecha de inicio (siempre calculado desde datos). */
export function buildViaticoDisplayName(datos, fallback = "Viático sin identificar") {
  const apellido = String(datos?.apellido || "").trim();
  const nombre = String(datos?.nombre || "").trim();
  const fecha = String(datos?.fecha_salida || "").trim();
  const persona = [apellido, nombre].filter(Boolean).join(", ");
  const parts = [persona, fecha].filter(Boolean);
  return parts.length ? parts.join(" · ") : fallback;
}

export function buildRendicionDisplayName(datos, fallback = "Rendición sin identificar") {
  return buildViaticoDisplayName(datos, fallback);
}

/** @deprecated Usar buildViaticoDisplayName para el título y etiqueta solo como descriptiva. */
export function buildAutoEtiqueta(datos, fallback = "Sin título") {
  return buildViaticoDisplayName(datos, fallback);
}

export function resolveRecordLabels(record, type = "viatico") {
  const datos = record?.datos || {};
  const displayName =
    type === "rendicion"
      ? buildRendicionDisplayName(datos)
      : buildViaticoDisplayName(datos);
  const descriptiveLabel = String(record?.etiqueta || "").trim();
  return { displayName, descriptiveLabel };
}
