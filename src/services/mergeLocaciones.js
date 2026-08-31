/**
 * Fusiona una locación duplicada (source) en una canónica (target).
 * Ejecuta RPC `merge_locaciones` (una sola transacción Postgres).
 *
 * Tablas remapeadas en el RPC:
 * - eventos.id_locacion
 * - hoteles.id_locacion
 * - programas_agenda_comidas.id_locacion
 * - plantillas_recorridos_tramos.id_locacion_origen / destino
 * - integrantes.id_domicilio_laboral
 * - fimba_venue_info.id_locacion
 */

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {number|string} sourceId - duplicado a eliminar
 * @param {number|string} targetId - locación que permanece
 * @returns {Promise<{ ok: true, summary: string } | { ok: false, error: string }>}
 */
export async function mergeLocaciones(supabase, sourceId, targetId) {
  const source = Number(sourceId);
  const target = Number(targetId);

  if (!Number.isFinite(source) || !Number.isFinite(target)) {
    return { ok: false, error: "IDs de locación inválidos." };
  }
  if (source === target) {
    return { ok: false, error: "No podés fusionar una locación consigo misma." };
  }

  try {
    const { data, error } = await supabase.rpc("merge_locaciones", {
      p_source_id: source,
      p_target_id: target,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    const result = data && typeof data === "object" ? data : null;
    if (!result) {
      return { ok: false, error: "Respuesta vacía del servidor." };
    }
    if (result.ok === false) {
      return { ok: false, error: result.error || "No se pudo unificar." };
    }
    return {
      ok: true,
      summary: result.summary || "Unificación completada.",
    };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}
