import { supabase } from "./supabase";

export async function ensayoCheckinGps({
  eventoId,
  integranteId,
  lat,
  lng,
  precisionM,
  userAgent,
}) {
  const { data, error } = await supabase.rpc("ensayo_checkin_gps", {
    p_evento_id: eventoId,
    p_integrante_id: integranteId,
    p_lat: lat ?? null,
    p_lng: lng ?? null,
    p_precision_m: precisionM ?? null,
    p_user_agent: userAgent ?? null,
  });
  if (error) throw error;
  return data;
}

export async function ensayoGenerarPaseUbicacion(eventoId, prestadorId) {
  const { data, error } = await supabase.rpc("ensayo_generar_pase_ubicacion", {
    p_evento_id: eventoId,
    p_prestador_id: prestadorId,
  });
  if (error) throw error;
  return data;
}

export async function ensayoCheckinPase(token, integranteId, userAgent) {
  const { data, error } = await supabase.rpc("ensayo_checkin_pase", {
    p_token: token,
    p_integrante_id: integranteId,
    p_user_agent: userAgent ?? null,
  });
  if (error) throw error;
  return data;
}

export async function ensayoCheckinEstado(eventoIds, integranteId) {
  if (!eventoIds?.length || !integranteId) return {};
  const { data, error } = await supabase.rpc("ensayo_checkin_estado", {
    p_evento_ids: eventoIds.map(Number),
    p_integrante_id: Number(integranteId),
  });
  if (error) throw error;
  return data || {};
}

export async function ensayoCheckinAdminUpsert({
  eventoId,
  integranteId,
  registradoAt,
  editorId,
  justificado = false,
  notaJustificacion = null,
  lat = null,
  lng = null,
}) {
  const { data, error } = await supabase.rpc("ensayo_checkin_admin_upsert", {
    p_evento_id: eventoId,
    p_integrante_id: integranteId,
    p_registrado_at: registradoAt,
    p_editor_id: editorId,
    p_justificado: justificado,
    p_nota_justificacion: notaJustificacion,
    p_lat: lat,
    p_lng: lng,
  });
  if (error) throw error;
  return data;
}

export async function ensayoCheckinAdminDelete(eventoId, integranteId, editorId) {
  const { data, error } = await supabase.rpc("ensayo_checkin_admin_delete", {
    p_evento_id: eventoId,
    p_integrante_id: integranteId,
    p_editor_id: editorId,
  });
  if (error) throw error;
  return data;
}
