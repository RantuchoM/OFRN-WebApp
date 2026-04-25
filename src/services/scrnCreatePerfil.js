import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "./supabase";

/**
 * Crea usuario en Auth + fila en scrn_perfiles (o vincula si el mail ya existe).
 * Cualquier usuario con sesión puede invocar (Edge `create-scrn-perfil`).
 * @param {Object} body
 * @param {string} body.email
 * @param {string} body.nombre
 * @param {string} body.apellido
 * @param {string} [body.dni] — si falta, el perfil guarda dni NULL (requiere columna nullable en DB)
 * @param {string|null} [body.fecha_nacimiento]
 * @param {string|null} [body.cargo]
 * @param {string} [body.genero]
 * @param {boolean} [body.es_admin] — solo tiene efecto si el llamador es admin en scrn
 * @returns {Promise<{ id: string, alreadyExists: boolean } | { error: string }>}
 */
function formatFnPayloadError(p) {
  if (!p || typeof p !== "object") return "Error desconocido";
  const main = p.error != null ? String(p.error) : "";
  const parts = [main].filter(Boolean);
  if (p.details) parts.push(String(p.details));
  if (p.hint) parts.push(`hint: ${p.hint}`);
  if (p.code) parts.push(`code: ${p.code}`);
  return parts.length ? parts.join(" — ") : "Error desconocido";
}

async function readEdgeFunctionErrorBody(err) {
  if (!(err instanceof FunctionsHttpError) || err.context == null) return null;
  const res = err.context;
  if (typeof res.json !== "function") return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function ensureScrnPerfilForNewEmail(body) {
  const { data: fnData, error: fnError } = await supabase.functions.invoke(
    "create-scrn-perfil",
    { body },
  );

  if (fnError) {
    const parsed = await readEdgeFunctionErrorBody(fnError);
    if (parsed && (parsed.error || typeof parsed === "string")) {
      if (typeof parsed === "string") {
        return { error: parsed };
      }
      return { error: formatFnPayloadError(parsed) };
    }
    return { error: fnError.message || "Error al crear el perfil" };
  }

  if (fnData && typeof fnData === "object") {
    if (fnData.error) {
      return { error: formatFnPayloadError(fnData) };
    }
    if (fnData.ok && fnData.id) {
      return { id: fnData.id, alreadyExists: fnData.alreadyExists === true };
    }
  }

  return { error: "Respuesta inesperada del servidor" };
}
