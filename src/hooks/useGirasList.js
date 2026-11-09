import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  applyConcertDateOverlapFilter,
  applyProgramOverlapDateFilter,
  compareProgramsForList,
  mergeProgramsById,
  programOverlapsDateRange,
  toLocalDateString,
} from "../utils/giraDateRange";
import { seatingApellidoNombre } from "../utils/integranteDisplayName";
import { personalCoberturaTagFromRow } from "../utils/coberturaGira";

/** Select completo (editores / management): nómina anidada para tarjetas densas. */
export const GIRAS_LIST_SELECT = `
  *,
  giras_localidades(id_localidad, localidades(localidad)),
  giras_integrantes(
    id_integrante, rol, estado,
    es_cobertura, cobertura_id_integrante, cobertura_nombre,
    integrantes!giras_integrantes_id_integrante_fkey(
      id, nombre, apellido, nombre_preferencia, apellido_preferencia, id_localidad,
      instrumentos(familia),
      integrantes_ensambles(id_ensamble, fecha_desde, fecha_hasta)
    )
  ),
  giras_fuentes(*),
  eventos(
    id, fecha, hora_inicio, hora_fin, id_tipo_evento, id_locacion, id_gira, convocados, is_deleted,
    tipos_evento(id, nombre, color, id_categoria),
    locaciones(id, nombre, localidades(localidad)),
    eventos_asistencia(id, id_integrante, estado)
  )
`;

/**
 * Select liviano para rol personal: sin expandir toda la orquesta.
 * Incluye campos de cobertura para tags en GiraCard.
 * GiraCard resuelve el perfil propio vía meConvocadoFallback si hace falta.
 */
export const GIRAS_LIST_SELECT_PERSONAL = `
  *,
  giras_localidades(id_localidad, localidades(localidad)),
  giras_integrantes(
    id_integrante, rol, estado,
    es_cobertura, cobertura_id_integrante, cobertura_nombre
  ),
  giras_fuentes(*),
  eventos(
    id, fecha, hora_inicio, hora_fin, id_tipo_evento, id_locacion, id_gira, convocados, is_deleted,
    tipos_evento(id, nombre, color, id_categoria),
    locaciones(id, nombre, localidades(localidad)),
    eventos_asistencia(id, id_integrante, estado)
  )
`;

/**
 * Adjunta `mi_cobertura` en cada programa (tag personal cubierto/cubre/Asistís).
 * @param {{ includeAsistis?: boolean }} [opts] — editors: también «Asistís» si van presentes.
 */
async function enrichPersonalCoberturaTags(
  supabase,
  programs,
  userId,
  { includeAsistis = false } = {},
) {
  const uid = Number(userId);
  if (!Number.isFinite(uid) || !programs?.length) return programs || [];

  const nameIds = new Set();
  const giraIdsWhereICover = [];

  for (const g of programs) {
    const mine = (g.giras_integrantes || []).find(
      (r) => Number(r.id_integrante) === uid,
    );
    if (!mine) continue;
    if (
      String(mine.estado || "").toLowerCase() === "ausente" &&
      mine.cobertura_id_integrante != null
    ) {
      nameIds.add(Number(mine.cobertura_id_integrante));
    }
    if (mine.es_cobertura) {
      giraIdsWhereICover.push(g.id);
      const covered = (g.giras_integrantes || []).find(
        (r) => Number(r.cobertura_id_integrante) === uid,
      );
      if (covered?.id_integrante != null) {
        nameIds.add(Number(covered.id_integrante));
      }
    }
  }

  // Por si el ausente no vino en el nested slim (RLS raro): lookup directo.
  let coveredByGira = new Map();
  if (giraIdsWhereICover.length) {
    const { data: coveredRows, error: coveredErr } = await supabase
      .from("giras_integrantes")
      .select("id_gira, id_integrante")
      .eq("cobertura_id_integrante", uid)
      .in("id_gira", giraIdsWhereICover);
    if (!coveredErr) {
      for (const row of coveredRows || []) {
        coveredByGira.set(Number(row.id_gira), Number(row.id_integrante));
        if (row.id_integrante != null) nameIds.add(Number(row.id_integrante));
      }
    }
  }

  const nameById = new Map();
  // Preferir nombres ya anidados (select de editores) antes de ir a DB.
  for (const g of programs) {
    for (const r of g.giras_integrantes || []) {
      const id = Number(r.id_integrante);
      if (!Number.isFinite(id) || !r.integrantes) continue;
      const label = seatingApellidoNombre(r.integrantes);
      if (label) nameById.set(id, label);
    }
  }
  const missingIds = [...nameIds].filter(
    (id) => Number.isFinite(id) && !nameById.has(id),
  );
  if (missingIds.length) {
    const { data: people, error } = await supabase
      .from("integrantes")
      .select(
        "id, nombre, apellido, nombre_preferencia, apellido_preferencia",
      )
      .in("id", missingIds);
    if (!error) {
      for (const p of people || []) {
        nameById.set(Number(p.id), seatingApellidoNombre(p));
      }
    }
  }

  return programs.map((g) => {
    const mine = (g.giras_integrantes || []).find(
      (r) => Number(r.id_integrante) === uid,
    );
    if (!mine) return { ...g, mi_cobertura: null };

    let teCubreLabel = "";
    let cubrisALabel = "";
    if (mine.cobertura_id_integrante != null) {
      teCubreLabel =
        nameById.get(Number(mine.cobertura_id_integrante)) || "";
    } else if (String(mine.cobertura_nombre || "").trim()) {
      teCubreLabel = String(mine.cobertura_nombre).trim();
    }

    if (mine.es_cobertura) {
      const coveredId =
        coveredByGira.get(Number(g.id)) ??
        (g.giras_integrantes || []).find(
          (r) => Number(r.cobertura_id_integrante) === uid,
        )?.id_integrante;
      if (coveredId != null) {
        cubrisALabel = nameById.get(Number(coveredId)) || "";
      }
    }

    const tag = personalCoberturaTagFromRow(mine, {
      teCubreLabel,
      cubrisALabel,
      includeAsistis,
    });
    return {
      ...g,
      mi_cobertura: tag
        ? {
            ...tag,
            estado: mine.estado,
            es_cobertura: Boolean(mine.es_cobertura),
            hideAgenda: tag.kind === "cubierto",
          }
        : null,
    };
  });
}

async function fetchProgramsByProgramDates(
  supabase,
  filterDateStart,
  filterDateEnd,
  select = GIRAS_LIST_SELECT,
) {
  let query = supabase.from("programas").select(select);
  query = applyProgramOverlapDateFilter(
    query,
    filterDateStart,
    filterDateEnd,
  );
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/** Ids de programas con concierto en el rango (aunque fecha_hasta esté desactualizada). */
async function fetchProgramIdsWithConcertsInRange(
  supabase,
  filterDateStart,
  filterDateEnd,
) {
  let query = supabase
    .from("programas")
    .select("id, eventos!inner(id)");
  query = applyConcertDateOverlapFilter(
    query,
    filterDateStart,
    filterDateEnd,
  );
  const { data, error } = await query;
  if (error) throw error;
  return [...new Set((data || []).map((p) => p.id).filter((id) => id != null))];
}

/** Programa completo para ids (deep-link / hydrate personal). */
export async function fetchProgramsByIds(
  supabase,
  ids,
  select = GIRAS_LIST_SELECT,
) {
  if (!ids?.length) return [];
  const { data, error } = await supabase
    .from("programas")
    .select(select)
    .in("id", ids);
  if (error) throw error;
  return data || [];
}

function normalizeCoordIds(coordinatedEnsembleIds) {
  return [...(coordinatedEnsembleIds || [])]
    .map(Number)
    .filter(Number.isFinite);
}

/**
 * IDs de programas visibles para un integrante (RPC server-side).
 * @param {object} [opts]
 * @param {boolean} [opts.incluirAusenteConAbono] year summary: ausente + abona_* sigue contando
 */
export async function fetchVisibleProgramIds(
  supabase,
  {
    integranteId,
    filterDateStart,
    filterDateEnd,
    coordinatedEnsembleIds = [],
    incluirAusenteConAbono = false,
  },
) {
  const uid = Number(integranteId);
  if (!Number.isFinite(uid)) return [];

  const { data, error } = await supabase.rpc("list_programa_ids_visibles", {
    p_integrante_id: uid,
    p_fecha_desde: filterDateStart || null,
    p_fecha_hasta: filterDateEnd || null,
    p_coord_ensamble_ids: normalizeCoordIds(coordinatedEnsembleIds),
    p_incluir_ausente_con_abono: Boolean(incluirAusenteConAbono),
  });
  if (error) throw error;
  return (data || [])
    .map((row) => (typeof row === "object" && row != null ? row.id ?? row : row))
    .map(Number)
    .filter(Number.isFinite);
}

async function fetchGuestGira(supabase, user) {
  const tokenToUse = user.token_original;
  if (!tokenToUse) {
    console.error("Usuario invitado sin token original");
    return [];
  }

  const { data: giraBaseData, error } = await supabase.rpc(
    "get_gira_by_public_token",
    { token_input: tokenToUse },
  );
  if (error) throw error;
  if (!giraBaseData?.length) return [];

  const targetGira = giraBaseData[0];
  const [eventosRes, locsRes, fuentesRes] = await Promise.all([
    supabase
      .from("eventos")
      .select(
        "id, fecha, hora_inicio, locaciones(nombre, localidades(localidad)), tipos_evento(nombre)",
      )
      .eq("id_gira", targetGira.id),
    supabase
      .from("giras_localidades")
      .select("id_localidad, localidades(localidad)")
      .eq("id_gira", targetGira.id),
    supabase.from("giras_fuentes").select("*").eq("id_gira", targetGira.id),
  ]);

  return [
    {
      ...targetGira,
      eventos: eventosRes.data || [],
      giras_localidades: locsRes.data || [],
      giras_fuentes: fuentesRes.data || [],
      giras_integrantes: [],
    },
  ];
}

async function fetchPersonalGiras(
  supabase,
  { user, coordinatedEnsembleIds, filterDateStart, filterDateEnd },
) {
  const ids = await fetchVisibleProgramIds(supabase, {
    integranteId: user.id,
    filterDateStart,
    filterDateEnd,
    coordinatedEnsembleIds,
    incluirAusenteConAbono: false,
  });
  if (!ids.length) return [];

  const programs = await fetchProgramsByIds(
    supabase,
    ids,
    GIRAS_LIST_SELECT_PERSONAL,
  );
  const enriched = await enrichPersonalCoberturaTags(
    supabase,
    programs,
    user.id,
  );

  const listReferenceDate = toLocalDateString();
  const result = enriched.filter((g) =>
    programOverlapsDateRange(
      g,
      filterDateStart,
      filterDateEnd,
      listReferenceDate,
    ),
  );
  result.sort((a, b) => compareProgramsForList(a, b, listReferenceDate));
  return result;
}

async function fetchAuthenticatedGiras(
  supabase,
  {
    user,
    userRole,
    isDifusion,
    coordinatedEnsembleIds,
    filterDateStart,
    filterDateEnd,
  },
) {
  const isPersonalRoleForDB =
    (userRole === "consulta_personal" || userRole === "personal") &&
    user.id !== "guest-general" &&
    !isDifusion;

  if (isPersonalRoleForDB) {
    return fetchPersonalGiras(supabase, {
      user,
      coordinatedEnsembleIds,
      filterDateStart,
      filterDateEnd,
    });
  }

  const [byProgramDates, concertProgramIds] = await Promise.all([
    fetchProgramsByProgramDates(
      supabase,
      filterDateStart,
      filterDateEnd,
    ),
    fetchProgramIdsWithConcertsInRange(
      supabase,
      filterDateStart,
      filterDateEnd,
    ),
  ]);

  const programIdsFromDates = new Set(byProgramDates.map((p) => p.id));
  const extraIds = concertProgramIds.filter((id) => !programIdsFromDates.has(id));
  const extraByConcerts = await fetchProgramsByIds(supabase, extraIds);

  let merged = mergeProgramsById([byProgramDates, extraByConcerts]);

  // Editores/admins: cobertura + «Asistís» si van presentes en la nómina.
  if (user?.id && user.id !== "guest-general") {
    merged = await enrichPersonalCoberturaTags(supabase, merged, user.id, {
      includeAsistis: true,
    });
  }

  const listReferenceDate = toLocalDateString();
  let result = merged.filter((g) =>
    programOverlapsDateRange(
      g,
      filterDateStart,
      filterDateEnd,
      listReferenceDate,
    ),
  );
  result.sort((a, b) =>
    compareProgramsForList(a, b, listReferenceDate),
  );

  return result;
}

export function girasListQueryKey({
  userId,
  isGuest,
  userRole,
  isDifusion,
  coordinatedEnsembleIds,
  filterDateStart,
  filterDateEnd,
  trigger,
}) {
  const coordKey = [...(coordinatedEnsembleIds || [])]
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => a - b)
    .join(",");
  return [
    "giras-list",
    "cobertura-tags-v1",
    userId,
    isGuest,
    userRole,
    isDifusion,
    coordKey,
    filterDateStart ?? "",
    filterDateEnd ?? "",
    trigger ?? 0,
  ];
}

export function useGirasList(
  supabase,
  {
    user,
    isGuest,
    userRole,
    isDifusion,
    coordinatedEnsembleIds = [],
    filterDateStart,
    filterDateEnd,
    enabled = true,
    trigger = 0,
  } = {},
) {
  const query = useQuery({
    queryKey: girasListQueryKey({
      userId: user?.id,
      isGuest,
      userRole,
      isDifusion,
      coordinatedEnsembleIds,
      filterDateStart,
      filterDateEnd,
      trigger,
    }),
    enabled: Boolean(enabled && user),
    placeholderData: keepPreviousData,
    queryFn: async () => {
      if (isGuest) {
        return fetchGuestGira(supabase, user);
      }
      return fetchAuthenticatedGiras(supabase, {
        user,
        userRole,
        isDifusion,
        coordinatedEnsembleIds,
        filterDateStart,
        filterDateEnd,
      });
    },
  });

  return {
    giras: query.data ?? [],
    isLoading: query.isLoading,
    isPending: query.isPending,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}
