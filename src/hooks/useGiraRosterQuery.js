import { useQuery } from "@tanstack/react-query";
import { fetchRosterForGira } from "./useGiraRoster";
import { persistOrganicoFromRoster } from "../services/organicoConvocadoService";

async function loadRoster(supabase, gira) {
  const { roster, sources } = await fetchRosterForGira(supabase, gira);
  if (gira?.id) {
    persistOrganicoFromRoster(supabase, gira.id, roster).catch((err) => {
      console.warn("organico_convocado:", err?.message || err);
    });
  }
  return { roster, sources };
}

export function giraRosterQueryKey(gira) {
  const id = gira?.id;
  if (!id) return ["gira-roster", null];
  return ["gira-roster", id, gira?.fecha_desde ?? null, gira?.fecha_hasta ?? null];
}

/**
 * Roster de gira con caché compartida por React Query (una petición por programa).
 */
export function useGiraRosterQuery(supabase, gira, { enabled = true } = {}) {
  const id = gira?.id;
  const query = useQuery({
    queryKey: giraRosterQueryKey(gira),
    queryFn: () => loadRoster(supabase, gira),
    enabled: Boolean(enabled && id),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const refreshRoster = async () => {
    const result = await query.refetch();
    return result.data?.roster ?? [];
  };

  return {
    roster: query.data?.roster ?? [],
    sources: query.data?.sources ?? [],
    loading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refreshRoster,
  };
}

/** Misma API que el hook histórico. Vive acá para no mezclar React Query con el fetch. */
export function useGiraRoster(supabase, gira) {
  return useGiraRosterQuery(supabase, gira);
}

/** Roster imperativo con la misma caché que el hook (mails, prefetch, etc.). */
export async function fetchGiraRosterCached(supabase, queryClient, gira) {
  if (!gira?.id) return { roster: [], sources: [] };
  const data = await queryClient.fetchQuery({
    queryKey: giraRosterQueryKey(gira),
    queryFn: () => loadRoster(supabase, gira),
    staleTime: 5 * 60 * 1000,
  });
  return data ?? { roster: [], sources: [] };
}
