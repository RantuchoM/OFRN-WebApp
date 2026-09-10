/**
 * Fusiona personas duplicadas y consulta por qué no se puede eliminar un integrante.
 * RPCs: merge_integrantes, get_integrante_delete_blockers, delete_integrante.
 */

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {number|string} sourceId
 * @param {number|string} targetId
 * @returns {Promise<{ ok: true, summary: string } | { ok: false, error: string }>}
 */
export async function mergeIntegrantes(supabase, sourceId, targetId) {
  const source = Number(sourceId);
  const target = Number(targetId);

  if (!Number.isFinite(source) || !Number.isFinite(target)) {
    return { ok: false, error: "IDs de persona inválidos." };
  }
  if (source === target) {
    return { ok: false, error: "No podés fusionar una persona consigo misma." };
  }

  try {
    const { data, error } = await supabase.rpc("merge_integrantes", {
      p_source_id: source,
      p_target_id: target,
    });
    if (error) return { ok: false, error: error.message };
    const result = data && typeof data === "object" ? data : null;
    if (!result) return { ok: false, error: "Respuesta vacía del servidor." };
    if (result.ok === false) {
      return { ok: false, error: result.error || "No se pudo fusionar." };
    }
    return { ok: true, summary: result.summary || "Fusión completada." };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {number|string} id
 * @returns {Promise<object>}
 */
export async function getIntegranteDeleteBlockers(supabase, id) {
  const personId = Number(id);
  if (!Number.isFinite(personId)) {
    return { ok: false, error: "ID de persona inválido." };
  }
  try {
    const { data, error } = await supabase.rpc("get_integrante_delete_blockers", {
      p_id: personId,
    });
    if (error) return { ok: false, error: error.message };
    const result = data && typeof data === "object" ? data : null;
    if (!result) return { ok: false, error: "Respuesta vacía del servidor." };
    return result;
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {number|string} id
 * @returns {Promise<object>}
 */
export async function deleteIntegrante(supabase, id) {
  const personId = Number(id);
  if (!Number.isFinite(personId)) {
    return { ok: false, error: "ID de persona inválido." };
  }
  try {
    const { data, error } = await supabase.rpc("delete_integrante", {
      p_id: personId,
    });
    if (error) return { ok: false, error: error.message };
    const result = data && typeof data === "object" ? data : null;
    if (!result) return { ok: false, error: "Respuesta vacía del servidor." };
    return result;
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}

function personLabel(person) {
  const apellido = String(person?.apellido || "").trim();
  const nombre = String(person?.nombre || "").trim();
  if (apellido && nombre) return `${apellido}, ${nombre}`;
  return apellido || nombre || `#${person?.id ?? ""}`;
}

/**
 * @param {object} info
 * @param {object} [person]
 * @returns {string}
 */
export function formatIntegranteDeleteBlockers(info, person) {
  const name =
    (info && info.nombre) || (person ? personLabel(person) : "esta persona");
  const blockers = Array.isArray(info?.blockers) ? info.blockers : [];
  if (!blockers.length) {
    return `Se puede eliminar a ${name}.`;
  }

  const lines = blockers.map((b) => {
    const count = Number(b.count) || 0;
    const details = Array.isArray(b.details)
      ? b.details.filter(Boolean).map(String)
      : [];
    const extra =
      count > details.length && details.length
        ? ` y ${count - details.length} más`
        : "";
    const detailText = details.length ? `: ${details.join("; ")}${extra}` : count > 1 ? ` (${count})` : "";
    return `• ${b.label}${detailText}`;
  });

  return [
    `No se puede eliminar a ${name} porque tiene actividad o vínculos:`,
    "",
    ...lines,
    "",
    "Si es un duplicado, fusioná las dos fichas para conservar la actividad.",
  ].join("\n");
}
