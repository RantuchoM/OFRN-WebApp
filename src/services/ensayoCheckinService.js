import { supabase } from "./supabase";

export const ENSAYO_CHECKIN_REGISTRANDO_MSG =
  "Registrando entrada/salida... esperá unos instantes";

/** Parsea jsonb de RPC (a veces llega como string). */
export function parseRpcJson(data) {
  if (data == null) return null;
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return data;
}

/** Resultado de check-in / checkout / pase (objeto único). */
export function parseEnsayoCheckinRpc(data) {
  let v = parseRpcJson(data);
  if (Array.isArray(v)) v = v[0] ?? null;
  if (!v || typeof v !== "object") return null;
  return v;
}

function isTruthyOk(ok) {
  return ok === true || ok === "true";
}

/**
 * El RPC afirma persistencia y trae el timestamp correspondiente.
 * @param {object|null} res
 * @param {'entrada'|'salida'} phase
 */
export function ensayoCheckinRpcLooksPersisted(res, phase) {
  if (!res || !isTruthyOk(res.ok)) return false;
  if (phase === "salida") return !!res.salida_at;
  return !!res.registrado_at;
}

export function ensayoCheckinPersistError(phase, reason) {
  const err = new Error(
    phase === "salida"
      ? "La salida no quedó registrada. Intentá de nuevo."
      : "El ingreso no quedó registrado. Intentá de nuevo.",
  );
  if (reason) err.reason = reason;
  return err;
}

/** Mensaje específico de QR inválido/expirado; null si no aplica. */
export function ensayoCheckinPaseErrorMessage(res) {
  if (!res || isTruthyOk(res.ok)) return null;
  if (res.reason === "pase_expirado") return "El QR expiró. Pedí uno nuevo.";
  if (res.reason === "pase_usado") return "Este QR ya fue usado.";
  if (res.reason === "token_no_encontrado") return "QR no válido";
  return null;
}

/** Estado local a partir del RETURNING del RPC de escritura. */
export function estadoFromCheckinRpc(res, phase) {
  if (!ensayoCheckinRpcLooksPersisted(res, phase)) return null;
  return {
    registrado_at: res.registrado_at || null,
    salida_at: phase === "salida" ? res.salida_at : res.salida_at || null,
    modo: res.modo || null,
    modo_salida: res.modo_salida || null,
    justificado: res.justificado ?? false,
    editado_por_admin: res.editado_por_admin ?? false,
  };
}

/**
 * Exige ok + timestamp del RPC (RETURNING post-commit). Si no, pedir reintento.
 * @param {object|null} res
 * @param {'entrada'|'salida'} phase
 */
export function ensayoCheckinRequirePersisted(res, phase) {
  const parsed = parseEnsayoCheckinRpc(res) || res;
  if (!ensayoCheckinRpcLooksPersisted(parsed, phase)) {
    throw ensayoCheckinPersistError(phase, parsed?.reason);
  }
  return { res: parsed, estado: estadoFromCheckinRpc(parsed, phase) };
}

/**
 * Ejecuta el RPC de escritura y lo da por registrado solo con RETURNING válido.
 * @param {'entrada'|'salida'} phase
 * @param {() => Promise<any>} rpcFn
 */
export async function ensayoCheckinPersistAndVerify({ phase, rpcFn }) {
  const res = parseEnsayoCheckinRpc(await rpcFn());
  return ensayoCheckinRequirePersisted(res, phase);
}

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
  return parseEnsayoCheckinRpc(data);
}

export async function ensayoCheckoutGps({
  eventoId,
  integranteId,
  lat,
  lng,
  precisionM,
  userAgent,
}) {
  const { data, error } = await supabase.rpc("ensayo_checkout_gps", {
    p_evento_id: eventoId,
    p_integrante_id: integranteId,
    p_lat: lat ?? null,
    p_lng: lng ?? null,
    p_precision_m: precisionM ?? null,
    p_user_agent: userAgent ?? null,
  });
  if (error) throw error;
  return parseEnsayoCheckinRpc(data);
}

export async function ensayoGenerarPaseUbicacion(
  eventoId,
  prestadorId,
  proposito = "entrada",
) {
  const { data, error } = await supabase.rpc("ensayo_generar_pase_ubicacion", {
    p_evento_id: eventoId,
    p_prestador_id: prestadorId,
    p_proposito: proposito || "entrada",
  });
  if (error) throw error;
  return parseEnsayoCheckinRpc(data) || data;
}

export async function ensayoCheckinPase(token, integranteId, userAgent) {
  const { data, error } = await supabase.rpc("ensayo_checkin_pase", {
    p_token: token,
    p_integrante_id: integranteId,
    p_user_agent: userAgent ?? null,
  });
  if (error) throw error;
  return parseEnsayoCheckinRpc(data);
}

export async function ensayoCheckinEstado(eventoIds, integranteId) {
  if (!eventoIds?.length || !integranteId) return {};
  const { data, error } = await supabase.rpc("ensayo_checkin_estado", {
    p_evento_ids: eventoIds.map(Number),
    p_integrante_id: Number(integranteId),
  });
  if (error) throw error;
  const parsed = parseRpcJson(data);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  return parsed;
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
  salidaAt = null,
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
    p_salida_at: salidaAt,
  });
  if (error) throw error;
  return parseEnsayoCheckinRpc(data) || data;
}

export async function ensayoCheckinAdminDelete(eventoId, integranteId, editorId) {
  const { data, error } = await supabase.rpc("ensayo_checkin_admin_delete", {
    p_evento_id: eventoId,
    p_integrante_id: integranteId,
    p_editor_id: editorId,
  });
  if (error) throw error;
  return parseEnsayoCheckinRpc(data) || data;
}
