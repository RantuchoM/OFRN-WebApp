import { syncProgramRepertoire } from "./giraService";

export async function bulkAddTagsToWorks(supabase, workIds, tagIds) {
  if (!workIds?.length || !tagIds?.length) {
    return { inserted: 0 };
  }

  const { data: existing, error: fetchError } = await supabase
    .from("obras_palabras_clave")
    .select("id_obra, id_palabra_clave")
    .in("id_obra", workIds)
    .in("id_palabra_clave", tagIds);

  if (fetchError) throw fetchError;

  const existingSet = new Set(
    (existing || []).map((r) => `${r.id_obra}:${r.id_palabra_clave}`),
  );
  const rows = [];
  workIds.forEach((obraId) => {
    tagIds.forEach((tagId) => {
      if (!existingSet.has(`${obraId}:${tagId}`)) {
        rows.push({ id_obra: obraId, id_palabra_clave: tagId });
      }
    });
  });

  if (rows.length === 0) return { inserted: 0 };

  const { error } = await supabase.from("obras_palabras_clave").insert(rows);
  if (error) throw error;
  return { inserted: rows.length };
}

export async function bulkRemoveTagsFromWorks(supabase, workIds, tagIds) {
  if (!workIds?.length || !tagIds?.length) {
    return { removed: 0 };
  }

  const { data, error } = await supabase
    .from("obras_palabras_clave")
    .delete()
    .in("id_obra", workIds)
    .in("id_palabra_clave", tagIds)
    .select("id_obra");

  if (error) throw error;
  return { removed: data?.length || 0 };
}

export async function bulkAssignWorksToRepertoireBlock(
  supabase,
  { programId, blockId, createBlockName, workIds },
) {
  if (!programId) throw new Error("Seleccioná un programa.");
  if (!workIds?.length) throw new Error("No hay obras para cargar.");

  let targetBlockId = blockId ? Number(blockId) : null;

  if (!targetBlockId) {
    const name = String(createBlockName || "").trim();
    if (!name) throw new Error("Seleccioná un bloque o indicá un nombre para crear uno.");

    const { data: bloques, error: bloquesError } = await supabase
      .from("programas_repertorios")
      .select("orden")
      .eq("id_programa", programId);

    if (bloquesError) throw bloquesError;

    const lastOrder =
      bloques?.length > 0 ? Math.max(...bloques.map((b) => b.orden || 0)) : 0;

    const { data: newBlock, error: blockError } = await supabase
      .from("programas_repertorios")
      .insert([{ id_programa: programId, nombre: name, orden: lastOrder + 1 }])
      .select("id")
      .single();

    if (blockError) throw blockError;
    targetBlockId = newBlock.id;
  }

  const { data: existingWorks, error: existingError } = await supabase
    .from("repertorio_obras")
    .select("id_obra, orden")
    .eq("id_repertorio", targetBlockId);

  if (existingError) throw existingError;

  let maxOrder =
    existingWorks?.reduce((max, o) => Math.max(max, o.orden || 0), 0) || 0;
  const existingObraIds = new Set((existingWorks || []).map((o) => o.id_obra));

  const rows = [];
  let skippedDuplicates = 0;

  workIds.forEach((workId) => {
    if (existingObraIds.has(workId)) {
      skippedDuplicates += 1;
      return;
    }
    maxOrder += 1;
    rows.push({
      id_repertorio: targetBlockId,
      id_obra: workId,
      orden: maxOrder,
    });
  });

  if (rows.length > 0) {
    const { error: insertError } = await supabase
      .from("repertorio_obras")
      .insert(rows);
    if (insertError) throw insertError;
  }

  try {
    await syncProgramRepertoire(supabase, programId);
  } catch (syncErr) {
    console.warn("Obras cargadas; sync Drive:", syncErr);
  }

  return {
    blockId: targetBlockId,
    inserted: rows.length,
    skippedDuplicates,
  };
}
