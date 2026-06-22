import { isRepertorioPlaceholder } from "../utils/repertorioRowDisplay";

export const PLACEHOLDER_OPCIONES_SELECT = `
  id,
  id_repertorio_obra,
  id_obra,
  orden,
  notas,
  created_at,
  obras (
    id,
    titulo,
    duracion_segundos,
    instrumentacion,
    estado,
    link_drive,
    obras_compositores (
      rol,
      compositores ( id, apellido, nombre )
    )
  )
`;

/** Opciones de un slot placeholder, ordenadas. */
export async function fetchPlaceholderOpciones(supabase, placeholderRowId) {
  if (!placeholderRowId) return [];
  const { data, error } = await supabase
    .from("repertorio_obras_placeholder_opciones")
    .select(PLACEHOLDER_OPCIONES_SELECT)
    .eq("id_repertorio_obra", placeholderRowId)
    .order("orden", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

/** Añade obra como opción de un placeholder. */
export async function addPlaceholderOpcion(
  supabase,
  placeholderRowId,
  obraId,
  { notas = null } = {},
) {
  const { data: existing, error: countError } = await supabase
    .from("repertorio_obras_placeholder_opciones")
    .select("orden")
    .eq("id_repertorio_obra", placeholderRowId)
    .order("orden", { ascending: false })
    .limit(1);
  if (countError) throw countError;
  const nextOrden =
    existing?.length && existing[0]?.orden != null
      ? Number(existing[0].orden) + 1
      : 0;

  const { data, error } = await supabase
    .from("repertorio_obras_placeholder_opciones")
    .insert([
      {
        id_repertorio_obra: placeholderRowId,
        id_obra: obraId,
        orden: nextOrden,
        notas: notas?.trim() || null,
      },
    ])
    .select(PLACEHOLDER_OPCIONES_SELECT)
    .single();
  if (error) throw error;
  return data;
}

/** Quita una opción por id de fila intermedia. */
export async function removePlaceholderOpcion(supabase, opcionId) {
  const { error } = await supabase
    .from("repertorio_obras_placeholder_opciones")
    .delete()
    .eq("id", opcionId);
  if (error) throw error;
}

/**
 * Reemplaza el placeholder por una o varias obras definitivas.
 * @param {object} placeholderRow - fila repertorio_obras (slot)
 * @param {number[]} obraIds - ids de obras a insertar
 */
export async function assignDefinitivePlaceholder(
  supabase,
  placeholderRow,
  obraIds,
) {
  if (!isRepertorioPlaceholder(placeholderRow)) {
    return { error: "La fila no es un slot a definir." };
  }
  const ids = [...new Set((obraIds || []).map(Number).filter(Boolean))];
  if (ids.length === 0) {
    return { error: "Seleccioná al menos una obra." };
  }

  const repId = placeholderRow.id_repertorio;
  const baseOrden = Number(placeholderRow.orden) || 0;
  const n = ids.length;

  const { data: afterRows, error: afterErr } = await supabase
    .from("repertorio_obras")
    .select("id, orden")
    .eq("id_repertorio", repId)
    .gt("orden", baseOrden)
    .neq("id", placeholderRow.id);
  if (afterErr) throw afterErr;

  if (afterRows?.length && n > 1) {
    for (const row of afterRows) {
      const { error } = await supabase
        .from("repertorio_obras")
        .update({ orden: Number(row.orden) + (n - 1) })
        .eq("id", row.id);
      if (error) throw error;
    }
  }

  const shared = {
    notas_especificas: placeholderRow.notas_especificas ?? null,
    duracion_segundos_concierto:
      placeholderRow.duracion_segundos_concierto ?? null,
    en_definicion: placeholderRow.en_definicion ?? false,
    estado_curaduria: placeholderRow.estado_curaduria ?? null,
    observacion_curaduria: placeholderRow.observacion_curaduria ?? null,
    excluir: !!placeholderRow.excluir,
  };

  const inserts = ids.map((id_obra, i) => ({
    id_repertorio: repId,
    id_obra,
    orden: baseOrden + i,
    ...shared,
  }));

  const { error: delErr } = await supabase
    .from("repertorio_obras")
    .delete()
    .eq("id", placeholderRow.id);
  if (delErr) throw delErr;

  const { error: insErr } = await supabase
    .from("repertorio_obras")
    .insert(inserts);
  if (insErr) throw insErr;

  return { ok: true, inserted: ids.length };
}

/** Placeholders de un bloque (para asignar opciones desde catálogo). */
export async function fetchPlaceholdersInBlock(supabase, repertorioId) {
  const { data, error } = await supabase
    .from("repertorio_obras")
    .select(
      "id, titulo_placeholder, orden, instrumentacion_placeholder, repertorio_obras_placeholder_opciones(count)",
    )
    .eq("id_repertorio", repertorioId)
    .is("id_obra", null)
    .order("orden", { ascending: true });
  if (error) throw error;
  return data || [];
}

/** Programas con al menos un placeholder (para historial en catálogo). */
export async function fetchProgramIdsWithPlaceholders(supabase, programIds = []) {
  if (!programIds.length) return new Set();
  const { data, error } = await supabase
    .from("repertorio_obras")
    .select("id, programas_repertorios!inner(id_programa)")
    .is("id_obra", null)
    .in("programas_repertorios.id_programa", programIds);
  if (error) throw error;
  const set = new Set();
  (data || []).forEach((row) => {
    const pid = row.programas_repertorios?.id_programa;
    if (pid != null) set.add(pid);
  });
  return set;
}

/** Asignaciones directas de una obra en programas (repertorio_obras con id_obra). */
export async function fetchDirectRepertorioAssignmentsForObra(supabase, obraId) {
  if (!obraId) return [];
  const { data, error } = await supabase
    .from("repertorio_obras")
    .select(
      `
      id,
      orden,
      programas_repertorios (
        id,
        nombre,
        programas ( id, nombre_gira, mes_letra, nomenclador, fecha_desde )
      )
    `,
    )
    .eq("id_obra", obraId)
    .order("id", { ascending: true });
  if (error) throw error;
  return data || [];
}

/** Quita una obra de un bloque de repertorio (fila definitiva). */
export async function removeDirectRepertorioAssignment(supabase, repertorioObraId) {
  const { error } = await supabase
    .from("repertorio_obras")
    .delete()
    .eq("id", repertorioObraId);
  if (error) throw error;
}

/** Busca giras/programas para el selector del modal de asignación. */
export async function searchProgramasForAssign(supabase, query = "", limit = 40) {
  let q = supabase
    .from("programas")
    .select("id, nombre_gira, mes_letra, nomenclador, fecha_desde")
    .order("fecha_desde", { ascending: false })
    .limit(limit);
  const t = String(query || "").trim();
  if (t.length >= 2) {
    q = q.or(
      `nombre_gira.ilike.%${t}%,nomenclador.ilike.%${t}%,mes_letra.ilike.%${t}%`,
    );
  }
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

/** Slots placeholder donde esta obra figura como opción. */
export async function fetchPlaceholderOpcionesForObra(supabase, obraId) {
  const { data, error } = await supabase
    .from("repertorio_obras_placeholder_opciones")
    .select(
      `
      id,
      repertorio_obras (
        id,
        titulo_placeholder,
        programas_repertorios (
          id,
          nombre,
          programas ( id, nombre_gira, mes_letra, nomenclador, fecha_desde )
        )
      )
    `,
    )
    .eq("id_obra", obraId);
  if (error) throw error;
  return data || [];
}

