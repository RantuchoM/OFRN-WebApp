/**
 * Persistencia de restauraciones del banner de seating tardío (deshacer).
 */

import { assignParticellaIndividualJefe } from "../services/giraService";

/**
 * Reescribe las particellas individuales (M-) de un músico en una obra.
 * @param {object} supabase
 * @param {{ programId: number|string, musicianId: number|string, obraId: number|string, partIds: Array<number|string> }}
 */
export async function persistMusicianObraPartIds(
  supabase,
  { programId, musicianId, obraId, partIds = [] },
) {
  if (!supabase || programId == null || musicianId == null || obraId == null) {
    return { error: new Error("Parámetros incompletos") };
  }
  const targetId = Number(musicianId);
  const desired = [...new Set(
    (partIds || [])
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id) && id > 0),
  )];

  const { data: existing, error: fetchError } = await supabase
    .from("seating_asignaciones")
    .select("*")
    .eq("id_programa", programId)
    .eq("id_obra", obraId);
  if (fetchError) return { error: fetchError };

  const updates = [];
  const rowTargets = new Map();
  (existing || [])
    .filter((row) => !row.id_contenedor)
    .forEach((row) => {
      const ids = row.id_musicos_asignados || [];
      if (ids.some((id) => String(id) === String(targetId))) {
        rowTargets.set(
          row.id,
          ids.filter((id) => String(id) !== String(targetId)),
        );
      }
    });

  desired.forEach((partId) => {
    const targetRow = (existing || []).find(
      (row) =>
        !row.id_contenedor && String(row.id_particella) === String(partId),
    );
    if (targetRow) {
      const baseIds =
        rowTargets.get(targetRow.id) ||
        (targetRow.id_musicos_asignados || []).filter(
          (id) => String(id) !== String(targetId),
        );
      rowTargets.set(targetRow.id, [...new Set([...baseIds, targetId])]);
    } else {
      updates.push(
        supabase.from("seating_asignaciones").insert({
          id_programa: programId,
          id_obra: obraId,
          id_particella: partId,
          id_musicos_asignados: [targetId],
        }),
      );
    }
  });

  (existing || [])
    .filter((row) => !row.id_contenedor && rowTargets.has(row.id))
    .forEach((row) => {
      const nextIds = rowTargets.get(row.id) || [];
      if (nextIds.length === 0) {
        updates.push(
          supabase.from("seating_asignaciones").delete().eq("id", row.id),
        );
      } else {
        updates.push(
          supabase
            .from("seating_asignaciones")
            .update({ id_musicos_asignados: nextIds })
            .eq("id", row.id),
        );
      }
    });

  if (updates.length) {
    const results = await Promise.all(updates);
    const firstError = results.find((r) => r?.error)?.error;
    if (firstError) return { error: firstError };
  }
  return { error: null };
}

export async function persistContainerObraPartId(
  supabase,
  { programId, containerId, obraId, partId = null },
) {
  if (!supabase || programId == null || containerId == null || obraId == null) {
    return { error: new Error("Parámetros incompletos") };
  }

  const { error: delError } = await supabase
    .from("seating_asignaciones")
    .delete()
    .match({
      id_programa: programId,
      id_contenedor: containerId,
      id_obra: obraId,
    });
  if (delError) return { error: delError };
  if (partId == null || partId === "") return { error: null };

  const { error: insError } = await supabase.from("seating_asignaciones").insert({
    id_programa: programId,
    id_contenedor: Number(containerId),
    id_obra: obraId,
    id_particella: partId,
  });
  return { error: insError || null };
}

export async function applyLateAssignmentUndoPlan(
  supabase,
  programId,
  plan,
  { asJefeActorId = null } = {},
) {
  if (!supabase || programId == null || !plan) {
    return { error: new Error("Plan inválido") };
  }

  // Jefe: solo M- vía RPC (sin tocar C-).
  if (asJefeActorId != null) {
    for (const patch of plan.musicianPatches || []) {
      const { error } = await assignParticellaIndividualJefe(supabase, {
        actorId: asJefeActorId,
        programId,
        obraId: patch.obraId,
        musicoId: patch.musicianId,
        particellaIds: patch.partIds,
      });
      if (error) return { error };
    }
    return { error: null };
  }

  for (const patch of plan.musicianPatches || []) {
    const { error } = await persistMusicianObraPartIds(supabase, {
      programId,
      musicianId: patch.musicianId,
      obraId: patch.obraId,
      partIds: patch.partIds,
    });
    if (error) return { error };
  }
  for (const patch of plan.containerPatches || []) {
    const { error } = await persistContainerObraPartId(supabase, {
      programId,
      containerId: patch.containerId,
      obraId: patch.obraId,
      partId: patch.partId,
    });
    if (error) return { error };
  }
  return { error: null };
}
