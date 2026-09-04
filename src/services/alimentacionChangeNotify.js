import { dietsDiffer, normalizeDiet } from "../utils/dietOptions";

export const PRODUCCION_ALIMENTACION_EMAIL = "produccion.ofrn@gmail.com";

/**
 * Avisa a producción cuando un integrante cambia su tipo de alimentación.
 * No lanza si el valor no cambió.
 */
export async function notifyAlimentacionChange(supabase, payload = {}) {
  const anterior = normalizeDiet(payload.anterior);
  const nueva = normalizeDiet(payload.nueva);
  if (!supabase || !dietsDiffer(anterior, nueva)) {
    return { ok: true, skipped: true };
  }

  const nombre = String(payload.nombre || "").trim();
  const apellido = String(payload.apellido || "").trim();
  const display = [nombre, apellido].filter(Boolean).join(" ") || "Integrante";

  const { error } = await supabase.functions.invoke(
    "notify-alimentacion-change",
    {
      body: {
        nombre,
        apellido,
        id: payload.id ?? null,
        mail: payload.mail || "",
        alimentacion_anterior: anterior || "(sin dato)",
        alimentacion_nueva: nueva || "(sin dato)",
      },
    },
  );

  if (error) throw error;
  return { ok: true, skipped: false };
}
