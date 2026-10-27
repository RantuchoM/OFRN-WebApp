import { integranteIdForDb } from "../utils/integranteIds";

/**
 * Baja de giras_integrantes con autor y motivo en el historial.
 * Hay que indicar integrantes o roles: la RPC no borra la gira entera.
 */
export async function bajaGirasIntegrantes(
  supabase,
  { idGira, actorId = null, integranteIds = null, roles = null, motivo = null } = {},
) {
  const ids = Array.isArray(integranteIds)
    ? integranteIds.map((id) => integranteIdForDb(id)).filter((id) => id != null)
    : null;
  const roleList = Array.isArray(roles)
    ? roles.map((r) => String(r || "").trim()).filter(Boolean)
    : null;

  const { data, error } = await supabase.rpc("baja_giras_integrantes", {
    p_id_gira: idGira,
    p_actor: integranteIdForDb(actorId),
    p_id_integrantes: ids && ids.length > 0 ? ids : null,
    p_roles: roleList && roleList.length > 0 ? roleList : null,
    p_motivo: motivo ? String(motivo) : null,
  });
  if (error) throw error;
  return data;
}
