import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { membershipActiveOnProgramDate } from "../utils/ensembleMembership";
import {
  applyConcertDateOverlapFilter,
  applyProgramOverlapDateFilter,
  compareProgramsForList,
  mergeProgramsById,
  programOverlapsDateRange,
  toLocalDateString,
} from "../utils/giraDateRange";

/** Select liviano para tarjetas en LIST (sin joins redundantes). */
export const GIRAS_LIST_SELECT = `
  *,
  giras_localidades(id_localidad, localidades(localidad)),
  giras_integrantes(
    id_integrante, rol, estado,
    integrantes(id, nombre, apellido, id_localidad, instrumentos(familia))
  ),
  giras_fuentes(*),
  eventos(
    id, fecha, hora_inicio, hora_fin, id_tipo_evento, id_locacion, id_gira, convocados,
    tipos_evento(id, nombre, color, id_categoria),
    locaciones(id, nombre, localidades(localidad)),
    eventos_asistencia(id, id_integrante, estado)
  )
`;

async function fetchProgramsByProgramDates(
  supabase,
  filterDateStart,
  filterDateEnd,
) {
  let query = supabase.from("programas").select(GIRAS_LIST_SELECT);
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

/** Programa completo para ids que solo entraron por fecha de concierto o deep-link (Ctrl+K). */
export async function fetchProgramsByIds(supabase, ids) {
  if (!ids?.length) return [];
  const { data, error } = await supabase
    .from("programas")
    .select(GIRAS_LIST_SELECT)
    .in("id", ids);
  if (error) throw error;
  return data || [];
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

  let myEnsembleMembershipRows = [];
  let myFamily = null;
  let isFamiliaSourceApplicable = false;
  const coordinatedSet = new Set(coordinatedEnsembleIds || []);

  if (isPersonalRoleForDB) {
    const { data: me } = await supabase
      .from("integrantes")
      .select(
        "*, instrumentos(familia), integrantes_ensambles(id_ensamble, fecha_desde, fecha_hasta)",
      )
      .eq("id", user.id)
      .single();
    if (me) {
      myFamily = me.instrumentos?.familia;
      myEnsembleMembershipRows = me.integrantes_ensambles || [];
      const nc = (me.condicion || "").toString().toLowerCase().trim();
      isFamiliaSourceApplicable = nc === "estable" || nc === "contratado";
    }
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
  if (isPersonalRoleForDB) {
    result = result.filter((gira) => {
      const overrides = gira.giras_integrantes || [];
      const sources = gira.giras_fuentes || [];
      const myOverride = overrides.find((o) => o.id_integrante === user.id);
      if (myOverride && myOverride.estado === "ausente") return false;
      if (myOverride) return true;
      const progRef = gira.fecha_desde;
      const ensembleActiveOnProgram = (valorId) =>
        myEnsembleMembershipRows.some(
          (ie) =>
            Number(ie.id_ensamble) === Number(valorId) &&
            membershipActiveOnProgramDate(ie, progRef),
        );
      const isIncluded = sources.some(
        (s) =>
          (s.tipo === "ENSAMBLE" &&
            (ensembleActiveOnProgram(s.valor_id) ||
              coordinatedSet.has(s.valor_id))) ||
          (s.tipo === "FAMILIA" &&
            s.valor_texto === myFamily &&
            isFamiliaSourceApplicable),
      );
      if (isIncluded) {
        const excludedEnsembles = sources
          .filter((s) => s.tipo === "EXCL_ENSAMBLE")
          .map((s) => s.valor_id);
        if (
          excludedEnsembles.some((exclId) => ensembleActiveOnProgram(exclId))
        ) {
          return false;
        }
        return true;
      }
      return false;
    });
  }

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
