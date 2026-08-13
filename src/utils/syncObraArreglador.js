/**
 * Al asignar un arreglo a un integrante, ese integrante queda como arreglador
 * de la obra (`obras.id_arreglador` + `obras_compositores.rol = 'arreglador'`).
 * Resuelve el compositor por apellido/nombre (crea uno si no existe).
 */

function foldName(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export async function resolveCompositorIdForIntegrante(supabase, integranteId) {
  const id = Number(integranteId);
  if (!supabase || !Number.isFinite(id) || id <= 0) return null;

  const { data: integrante, error: intErr } = await supabase
    .from("integrantes")
    .select("id, apellido, nombre")
    .eq("id", id)
    .maybeSingle();
  if (intErr || !integrante) return null;

  const apellido = (integrante.apellido || "").trim();
  const nombre = (integrante.nombre || "").trim();
  if (!apellido) return null;

  const { data: candidates, error: findErr } = await supabase
    .from("compositores")
    .select("id, apellido, nombre")
    .ilike("apellido", apellido);
  if (findErr) {
    console.warn("resolveCompositorIdForIntegrante:", findErr.message);
  }

  const hit = (candidates || []).find(
    (c) =>
      foldName(c.apellido) === foldName(apellido) &&
      foldName(c.nombre) === foldName(nombre),
  );
  if (hit?.id) return Number(hit.id);

  const { data: created, error: insErr } = await supabase
    .from("compositores")
    .insert([{ apellido, nombre: nombre || null }])
    .select("id")
    .single();
  if (insErr) {
    console.warn("resolveCompositorIdForIntegrante insert:", insErr.message);
    const { data: retry } = await supabase
      .from("compositores")
      .select("id, apellido, nombre")
      .ilike("apellido", apellido);
    const again = (retry || []).find(
      (c) =>
        foldName(c.apellido) === foldName(apellido) &&
        foldName(c.nombre) === foldName(nombre),
    );
    return again?.id ? Number(again.id) : null;
  }
  return created?.id ? Number(created.id) : null;
}

/**
 * Persiste el integrante asignado y lo deja como único arreglador de la obra.
 * @returns {Promise<number|null>} id de compositor arreglador
 */
export async function syncObraArregladorFromIntegrante(
  supabase,
  obraId,
  integranteId,
) {
  const compositorId = await resolveCompositorIdForIntegrante(
    supabase,
    integranteId,
  );
  if (!obraId || !compositorId) return null;

  const { error: upErr } = await supabase
    .from("obras")
    .update({
      id_arreglador: compositorId,
      id_integrante_arreglador: Number(integranteId),
    })
    .eq("id", obraId);
  if (upErr) throw upErr;

  const { error: delErr } = await supabase
    .from("obras_compositores")
    .delete()
    .eq("id_obra", obraId)
    .eq("rol", "arreglador");
  if (delErr) throw delErr;

  const { error: insErr } = await supabase.from("obras_compositores").insert([
    {
      id_obra: obraId,
      id_compositor: compositorId,
      rol: "arreglador",
    },
  ]);
  if (insErr) throw insErr;

  return compositorId;
}
