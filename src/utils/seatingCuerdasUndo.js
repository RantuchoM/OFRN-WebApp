/** Max undo steps for cuerdas config (in-memory, per config session). */
export const CUERDAS_UNDO_HISTORY_LIMIT = 50;

/** Deep-clone containers + items for undo snapshots (IDs preserved). */
export function cloneCuerdasSnapshot(containers) {
  return {
    containers: (containers || []).map((c) => ({
      id: c.id,
      nombre: c.nombre ?? "",
      orden: c.orden ?? 0,
      capacidad: c.capacidad ?? null,
      id_instrumento: c.id_instrumento ?? null,
      items: (c.items || []).map((item) => ({
        id: item.id,
        id_contenedor: Number(item.id_contenedor ?? c.id),
        id_musico: item.id_musico,
        atril_num:
          item.atril_num != null && !Number.isNaN(Number(item.atril_num))
            ? Number(item.atril_num)
            : null,
        lado:
          item.lado != null && !Number.isNaN(Number(item.lado))
            ? Number(item.lado)
            : null,
        orden:
          item.orden != null && !Number.isNaN(Number(item.orden))
            ? Number(item.orden)
            : null,
      })),
    })),
  };
}

/**
 * Restore a snapshot to Supabase for the active config (containers + items).
 * Used by undo/redo after in-memory history navigation.
 */
export async function applyCuerdasSnapshot(
  supabase,
  programId,
  configId,
  snapshot,
) {
  if (!supabase || !programId || configId == null || !snapshot?.containers) {
    return { error: "Parámetros inválidos" };
  }

  const { data: currentContainers, error: fetchErr } = await supabase
    .from("seating_contenedores")
    .select("id")
    .eq("id_programa", programId)
    .eq("id_config", configId);

  if (fetchErr) return { error: fetchErr.message };

  const snapshotContainerIds = new Set(
    snapshot.containers.map((c) => Number(c.id)),
  );
  const currentContainerIds = new Set(
    (currentContainers || []).map((c) => Number(c.id)),
  );

  const deleteContainerIds = [...currentContainerIds].filter(
    (id) => !snapshotContainerIds.has(id),
  );
  if (deleteContainerIds.length) {
    const { error: delItemsErr } = await supabase
      .from("seating_contenedores_items")
      .delete()
      .in("id_contenedor", deleteContainerIds);
    if (delItemsErr) return { error: delItemsErr.message };

    const { error: delContErr } = await supabase
      .from("seating_contenedores")
      .delete()
      .in("id", deleteContainerIds);
    if (delContErr) return { error: delContErr.message };
  }

  for (const c of snapshot.containers) {
    const cid = Number(c.id);
    if (currentContainerIds.has(cid)) {
      const { error } = await supabase
        .from("seating_contenedores")
        .update({
          nombre: c.nombre,
          orden: c.orden ?? 0,
          capacidad: c.capacidad,
          id_instrumento: c.id_instrumento,
        })
        .eq("id", cid);
      if (error) return { error: error.message };
    } else {
      const { error } = await supabase.from("seating_contenedores").insert({
        id: cid,
        id_programa: programId,
        id_config: configId,
        nombre: c.nombre,
        orden: c.orden ?? 0,
        capacidad: c.capacidad,
        id_instrumento: c.id_instrumento ?? "00",
      });
      if (error) return { error: error.message };
    }
  }

  const allContainerIds = snapshot.containers.map((c) => Number(c.id));
  if (!allContainerIds.length) {
    return { error: null };
  }

  const { data: currentItems, error: itemsFetchErr } = await supabase
    .from("seating_contenedores_items")
    .select("id")
    .in("id_contenedor", allContainerIds);
  if (itemsFetchErr) return { error: itemsFetchErr.message };

  const snapshotItems = snapshot.containers.flatMap((c) => c.items || []);
  const snapshotItemIds = new Set(snapshotItems.map((i) => Number(i.id)));
  const currentItemIds = new Set(
    (currentItems || []).map((i) => Number(i.id)),
  );

  const deleteItemIds = [...currentItemIds].filter(
    (id) => !snapshotItemIds.has(id),
  );
  if (deleteItemIds.length) {
    const { error } = await supabase
      .from("seating_contenedores_items")
      .delete()
      .in("id", deleteItemIds);
    if (error) return { error: error.message };
  }

  const remainingItemIds = new Set(
    [...currentItemIds].filter((id) => !deleteItemIds.includes(id)),
  );

  for (const item of snapshotItems) {
    const iid = Number(item.id);
    const row = {
      id_contenedor: Number(item.id_contenedor),
      id_musico: item.id_musico,
      atril_num: item.atril_num,
      lado: item.lado,
      orden: item.orden,
    };

    if (remainingItemIds.has(iid)) {
      const { error } = await supabase
        .from("seating_contenedores_items")
        .update(row)
        .eq("id", iid);
      if (error) return { error: error.message };
    } else {
      const { error } = await supabase
        .from("seating_contenedores_items")
        .insert({ id: iid, ...row });
      if (error) {
        const { error: fallbackErr } = await supabase
          .from("seating_contenedores_items")
          .insert(row);
        if (fallbackErr) return { error: fallbackErr.message };
      }
    }
  }

  return { error: null };
}
