import { supabaseOficinaExterna as supabase } from "./supabase";

/**
 * @param {string} origen
 * @param {string} destino
 * @param {number} [maxTransbordos=1]
 * @returns {Promise<{ data: object[]|null, error: import('@supabase/supabase-js').PostgrestError|null }>}
 */
export async function fetchScrnParadasEntre(origen, destino, maxTransbordos = 1) {
  const o = String(origen || "").trim();
  const d = String(destino || "").trim();
  if (!o || !d) {
    return { data: null, error: null };
  }
  return supabase.rpc("scrn_paradas_entre", {
    p_origen: o,
    p_destino: d,
    p_max_transbordos: maxTransbordos,
  });
}
