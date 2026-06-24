function stripHtml(html) {
  return (html || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

export function buildReferenciaObraOrigenTitulo(sourceWorkId, sourceTitulo) {
  const plain = stripHtml(sourceTitulo);
  if (plain) {
    const clipped = plain.length > 72 ? `${plain.slice(0, 72)}…` : plain;
    return `Obra original · ${clipped}`;
  }
  return `Obra original (#${sourceWorkId})`;
}

/** Inserta la obra fuente como primera referencia del nuevo encargo de arreglo. */
export async function seedArregloReferenciaObraOrigen(
  supabase,
  newObraId,
  sourceWorkId,
  sourceTitulo,
) {
  if (!supabase || !newObraId || !sourceWorkId) return { ok: false, skipped: true };

  const { error } = await supabase.from("arreglos_referencias").insert([
    {
      id_obra: newObraId,
      titulo: buildReferenciaObraOrigenTitulo(sourceWorkId, sourceTitulo),
      id_obra_referencia: sourceWorkId,
      link: null,
      orden: 0,
    },
  ]);

  if (error) {
    console.warn("seedArregloReferenciaObraOrigen:", error.message);
    return { ok: false, error };
  }
  return { ok: true };
}
