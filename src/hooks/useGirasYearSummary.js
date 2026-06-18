import { useQuery } from "@tanstack/react-query";
import { membershipActiveOnProgramDate } from "../utils/ensembleMembership";
import {
  applyConcertDateOverlapFilter,
  applyProgramOverlapDateFilter,
  compareProgramsForList,
  mergeProgramsById,
  programOverlapsDateRange,
  toLocalDateString,
} from "../utils/giraDateRange";
import {
  countConvokedEnsayos,
  countProgramsByType,
  currentYearBounds,
} from "../utils/girasYearSummary";

const GIRAS_YEAR_SELECT = `
  id, nombre_gira, fecha_desde, fecha_hasta, tipo, estado,
  giras_fuentes(*),
  giras_integrantes(id_integrante, estado),
  eventos(id, fecha, id_tipo_evento)
`;

const ENSAYO_EVENT_SELECT = `
  id, fecha, id_tipo_evento, tecnica, is_deleted,
  eventos_ensambles ( id_ensamble )
`;

async function fetchProgramsByProgramDates(supabase, desde, hasta) {
  let query = supabase.from("programas").select(GIRAS_YEAR_SELECT);
  query = applyProgramOverlapDateFilter(query, desde, hasta);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function fetchProgramIdsWithConcertsInRange(supabase, desde, hasta) {
  let query = supabase.from("programas").select("id, eventos!inner(id)");
  query = applyConcertDateOverlapFilter(query, desde, hasta);
  const { data, error } = await query;
  if (error) throw error;
  return [...new Set((data || []).map((p) => p.id).filter((id) => id != null))];
}

async function fetchProgramsByIds(supabase, ids) {
  if (!ids?.length) return [];
  const { data, error } = await supabase
    .from("programas")
    .select(GIRAS_YEAR_SELECT)
    .in("id", ids);
  if (error) throw error;
  return data || [];
}

function isIntegranteUser(user, isGuest, isDifusion) {
  if (isGuest || isDifusion || user?.id === "guest-general") return false;
  return Number.isFinite(Number(user?.id));
}

async function fetchYearProgramsForUser(
  supabase,
  {
    user,
    isGuest,
    isDifusion,
    desde,
    hasta,
  },
) {
  const applyPersonalFilter = isIntegranteUser(user, isGuest, isDifusion);

  let myEnsembleMembershipRows = [];
  let myFamily = null;
  let isFamiliaSourceApplicable = false;

  if (applyPersonalFilter) {
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
    fetchProgramsByProgramDates(supabase, desde, hasta),
    fetchProgramIdsWithConcertsInRange(supabase, desde, hasta),
  ]);

  const programIdsFromDates = new Set(byProgramDates.map((p) => p.id));
  const extraIds = concertProgramIds.filter((id) => !programIdsFromDates.has(id));
  const extraByConcerts = await fetchProgramsByIds(supabase, extraIds);

  let merged = mergeProgramsById([byProgramDates, extraByConcerts]);
  const listReferenceDate = toLocalDateString();

  let result = merged.filter((g) =>
    programOverlapsDateRange(g, desde, hasta, listReferenceDate),
  );
  result.sort((a, b) => compareProgramsForList(a, b, listReferenceDate));

  if (applyPersonalFilter) {
    result = result.filter((gira) => {
      const overrides = gira.giras_integrantes || [];
      const sources = gira.giras_fuentes || [];
      const myOverride = overrides.find(
        (o) => Number(o.id_integrante) === Number(user.id),
      );
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
          (s.tipo === "ENSAMBLE" && ensembleActiveOnProgram(s.valor_id)) ||
          (s.tipo === "FAMILIA" &&
            s.valor_texto === myFamily &&
            isFamiliaSourceApplicable),
      );
      if (!isIncluded) return false;
      const excludedEnsembles = sources
        .filter((s) => s.tipo === "EXCL_ENSAMBLE")
        .map((s) => s.valor_id);
      if (
        excludedEnsembles.some((exclId) => ensembleActiveOnProgram(exclId))
      ) {
        return false;
      }
      return true;
    });
  }

  return result;
}

async function fetchYearEnsayosConvocados(supabase, integranteId, desde, hasta) {
  const uid = Number(integranteId);
  if (!Number.isFinite(uid)) {
    return { ensayosConvocados: 0 };
  }

  const { data: memberships, error: memErr } = await supabase
    .from("integrantes_ensambles")
    .select("id_integrante, id_ensamble, fecha_desde, fecha_hasta")
    .eq("id_integrante", uid);
  if (memErr) throw memErr;

  const activeEnsembleIds = [
    ...new Set(
      (memberships || [])
        .filter((m) => membershipActiveOnProgramDate(m, hasta))
        .map((m) => Number(m.id_ensamble))
        .filter(Number.isFinite),
    ),
  ];

  let eventIds = [];
  if (activeEnsembleIds.length > 0) {
    const { data: eeRows, error: eeErr } = await supabase
      .from("eventos_ensambles")
      .select("id_evento")
      .in("id_ensamble", activeEnsembleIds);
    if (eeErr) throw eeErr;
    eventIds = [
      ...new Set((eeRows || []).map((r) => r.id_evento).filter(Boolean)),
    ];
  }

  const { data: customRows, error: customErr } = await supabase
    .from("eventos_asistencia_custom")
    .select("id_evento, tipo")
    .eq("id_integrante", uid);
  if (customErr) throw customErr;

  const invitedEventIds = (customRows || [])
    .filter((r) => r.tipo === "invitado" || r.tipo === "adicional")
    .map((r) => r.id_evento)
    .filter(Boolean);

  const allEventIds = [...new Set([...eventIds, ...invitedEventIds])];
  if (!allEventIds.length) {
    return { ensayosConvocados: 0 };
  }

  const { data: events, error: evErr } = await supabase
    .from("eventos")
    .select(ENSAYO_EVENT_SELECT)
    .in("id", allEventIds)
    .eq("id_tipo_evento", 13)
    .eq("is_deleted", false)
    .eq("tecnica", false)
    .gte("fecha", desde)
    .lte("fecha", hasta);
  if (evErr) throw evErr;

  return {
    ensayosConvocados: countConvokedEnsayos(
      events || [],
      uid,
      memberships || [],
      customRows || [],
    ),
  };
}

export function girasYearSummaryQueryKey({ userId, isGuest, isDifusion, year }) {
  return ["giras-year-summary", userId, isGuest, isDifusion, year];
}

export function useGirasYearSummary(
  supabase,
  { user, isGuest, isDifusion, enabled = true } = {},
) {
  const { year, desde, hasta } = currentYearBounds();

  const query = useQuery({
    queryKey: girasYearSummaryQueryKey({
      userId: user?.id,
      isGuest,
      isDifusion,
      year,
    }),
    enabled: Boolean(enabled && user),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (isGuest) {
        return {
          year,
          programCounts: {},
          ensayosConvocados: null,
          totalPrograms: 0,
        };
      }

      const programs = await fetchYearProgramsForUser(supabase, {
        user,
        isGuest,
        isDifusion,
        desde,
        hasta,
      });

      const programCounts = countProgramsByType(programs, { desde, hasta });

      let ensayosConvocados = null;
      if (!isGuest && Number.isFinite(Number(user?.id))) {
        const ensayoData = await fetchYearEnsayosConvocados(
          supabase,
          user.id,
          desde,
          hasta,
        );
        ensayosConvocados = ensayoData.ensayosConvocados;
      }

      return {
        year,
        programCounts,
        ensayosConvocados,
        totalPrograms: Object.values(programCounts).reduce((a, b) => a + b, 0),
      };
    },
  });

  return {
    year,
    programCounts: query.data?.programCounts ?? {},
    ensayosConvocados: query.data?.ensayosConvocados ?? null,
    totalPrograms: query.data?.totalPrograms ?? 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
  };
}
