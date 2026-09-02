/**
 * Aplica asignaciones de particellas en lote (contenedores + músicos) con una sola
 * lectura de seating_asignaciones y mutaciones en paralelo.
 */

function getMusicianPartIds(musicianAssignments, key) {
  const ids = musicianAssignments?.[key];
  if (!Array.isArray(ids)) return [];
  return ids.filter(
    (id, index) =>
      id &&
      ids.findIndex((candidate) => String(candidate) === String(id)) === index,
  );
}

function computeNextMusicianPartIds(prev, particellaId, slotIndex, targetId) {
  let next = [...prev];

  if (particellaId == null) {
    if (slotIndex < next.length) next.splice(slotIndex, 1);
  } else {
    while (next.length <= slotIndex) next.push(null);
    next = next.map((id, index) =>
      index !== slotIndex && id && String(id) === String(particellaId)
        ? null
        : id,
    );
    next[slotIndex] = particellaId;
    next = next.filter(Boolean);
  }

  return next.filter(
    (id, index) =>
      id &&
      next.findIndex((candidate) => String(candidate) === String(id)) === index,
  );
}

function buildPartToMusiciansForObra(musicianAssignments, obraId) {
  const partToMusicians = new Map();
  const obraKey = String(obraId);

  Object.entries(musicianAssignments || {}).forEach(([key, partIds]) => {
    const match = key.match(/^M-(\d+)-(\d+)$/);
    if (!match || match[2] !== obraKey) return;
    const musicianId = Number(match[1]);
    getMusicianPartIds(musicianAssignments, key).forEach((partId) => {
      const pk = String(partId);
      if (!partToMusicians.has(pk)) partToMusicians.set(pk, []);
      const arr = partToMusicians.get(pk);
      if (!arr.some((id) => String(id) === String(musicianId))) {
        arr.push(musicianId);
      }
    });
  });

  return partToMusicians;
}

async function applyContainerAssignOp(
  supabase,
  programId,
  { containerId, obraId, particellaId },
  existingRows,
) {
  await supabase.from("seating_asignaciones").delete().match({
    id_programa: programId,
    id_contenedor: containerId,
    id_obra: obraId,
  });

  if (!particellaId) return;

  const staleContainerRow = (existingRows || []).find(
    (row) =>
      row.id_contenedor &&
      Number(row.id_contenedor) !== Number(containerId) &&
      Number(row.id_obra) === Number(obraId) &&
      String(row.id_particella) === String(particellaId),
  );

  if (staleContainerRow) {
    await supabase
      .from("seating_asignaciones")
      .update({
        id_contenedor: containerId,
        id_musicos_asignados: null,
      })
      .eq("id", staleContainerRow.id);
    return;
  }

  const { error } = await supabase.from("seating_asignaciones").insert({
    id_programa: programId,
    id_obra: obraId,
    id_particella: particellaId,
    id_contenedor: containerId,
    id_musicos_asignados: null,
  });
  if (error) throw error;
}

function musicianIdsEqual(a, b) {
  const sa = [...(a || [])].map(String).sort();
  const sb = [...(b || [])].map(String).sort();
  return sa.length === sb.length && sa.every((v, i) => v === sb[i]);
}

async function runDbOps(dbOps) {
  if (!dbOps.length) return;
  const results = await Promise.all(dbOps);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}

function buildMusicianOpsForObra(
  programId,
  obraId,
  existingAfterContainers,
  nextMusicianAssignments,
  supabase,
) {
  const musicianOps = [];
  const musicianRows = (existingAfterContainers || []).filter(
    (row) => !row.id_contenedor && Number(row.id_obra) === Number(obraId),
  );
  const partToMusicians = buildPartToMusiciansForObra(
    nextMusicianAssignments,
    obraId,
  );
  const remainingParts = new Map(partToMusicians);

  musicianRows.forEach((row) => {
    const pk = String(row.id_particella);
    if (remainingParts.has(pk)) {
      const nextIds = remainingParts.get(pk);
      const prevIds = row.id_musicos_asignados || [];
      remainingParts.delete(pk);
      if (!musicianIdsEqual(prevIds, nextIds)) {
        if (nextIds.length === 0) {
          musicianOps.push(
            supabase.from("seating_asignaciones").delete().eq("id", row.id),
          );
        } else {
          musicianOps.push(
            supabase
              .from("seating_asignaciones")
              .update({ id_musicos_asignados: nextIds })
              .eq("id", row.id),
          );
        }
      }
    } else {
      musicianOps.push(
        supabase.from("seating_asignaciones").delete().eq("id", row.id),
      );
    }
  });

  remainingParts.forEach((musicianIds, partId) => {
    if (!musicianIds.length) return;

    const existingMusicianRow = (existingAfterContainers || []).find(
      (row) => !row.id_contenedor && String(row.id_particella) === partId,
    );

    if (existingMusicianRow) {
      musicianOps.push(
        supabase
          .from("seating_asignaciones")
          .update({ id_musicos_asignados: musicianIds })
          .eq("id", existingMusicianRow.id),
      );
      return;
    }

    musicianOps.push(
      supabase.from("seating_asignaciones").insert({
        id_programa: programId,
        id_obra: obraId,
        id_particella: partId,
        id_musicos_asignados: musicianIds,
      }),
    );
  });

  return musicianOps;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {number|string} programId
 * @param {{
 *   containerAssigns?: Array<{ containerId: number|string, obraId: number|string, particellaId: number|string }>,
 *   musicianAssigns?: Array<{ musicianId: number|string, obraId: number|string, particellaId: number|string, slotIndex?: number }>,
 *   assignments: Record<string, number|string>,
 *   musicianAssignments: Record<string, Array<number|string>>,
 *   onProgress?: (progress: { current: number, total: number, label?: string }) => void,
 * }} params
 */
export async function applyBulkParticellaAssignments(
  supabase,
  programId,
  {
    containerAssigns = [],
    musicianAssigns = [],
    assignments,
    musicianAssignments,
    onProgress,
  },
) {
  if (!containerAssigns.length && !musicianAssigns.length) {
    return {
      assignments,
      musicianAssignments,
    };
  }

  const total = containerAssigns.length + musicianAssigns.length;
  let current = 0;
  const report = (label) => {
    onProgress?.({ current, total, label });
  };

  report("Preparando…");

  const nextAssignments = { ...assignments };
  const nextMusicianAssignments = { ...musicianAssignments };

  containerAssigns.forEach(({ containerId, obraId, particellaId }) => {
    const key = `C-${containerId}-${obraId}`;
    if (particellaId) nextAssignments[key] = particellaId;
    else delete nextAssignments[key];
  });

  musicianAssigns.forEach(
    ({ musicianId, obraId, particellaId, slotIndex = 0 }) => {
      const key = `M-${musicianId}-${obraId}`;
      const prev = getMusicianPartIds(nextMusicianAssignments, key);
      const nextPartIds = computeNextMusicianPartIds(
        prev,
        particellaId,
        slotIndex,
        musicianId,
      );
      if (nextPartIds.length === 0) delete nextMusicianAssignments[key];
      else nextMusicianAssignments[key] = nextPartIds;
    },
  );

  const musicianAssignCountByObra = new Map();
  musicianAssigns.forEach(({ obraId }) => {
    const key = String(obraId);
    musicianAssignCountByObra.set(
      key,
      (musicianAssignCountByObra.get(key) || 0) + 1,
    );
  });

  const { data: existingAll, error: initialFetchError } = await supabase
    .from("seating_asignaciones")
    .select("*")
    .eq("id_programa", programId);

  if (initialFetchError) throw initialFetchError;

  for (const assign of containerAssigns) {
    await applyContainerAssignOp(supabase, programId, assign, existingAll);
    current += 1;
    report("Cuerdas");
  }

  const affectedObraIds = new Set(
    musicianAssigns.map((a) => Number(a.obraId)),
  );
  if (!affectedObraIds.size) {
    report("Listo");
    return {
      assignments: nextAssignments,
      musicianAssignments: nextMusicianAssignments,
    };
  }

  const { data: existingAfterContainers, error: fetchError } = await supabase
    .from("seating_asignaciones")
    .select("*")
    .eq("id_programa", programId);

  if (fetchError) throw fetchError;

  for (const obraId of affectedObraIds) {
    const musicianOps = buildMusicianOpsForObra(
      programId,
      obraId,
      existingAfterContainers,
      nextMusicianAssignments,
      supabase,
    );
    await runDbOps(musicianOps);
    current += musicianAssignCountByObra.get(String(obraId)) || 0;
    report("Vientos y percusión");
  }

  report("Listo");

  return {
    assignments: nextAssignments,
    musicianAssignments: nextMusicianAssignments,
  };
}
