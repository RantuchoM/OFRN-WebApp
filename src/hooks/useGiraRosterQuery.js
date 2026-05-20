import { useQuery } from "@tanstack/react-query";
import { fetchRosterForGira } from "./useGiraRoster";

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
    queryFn: async () => {
      const { roster, sources } = await fetchRosterForGira(supabase, gira);
      return { roster, sources };
    },
    enabled: Boolean(enabled && id),
    staleTime: 5 * 60 * 1000,
  });

  return {
    roster: query.data?.roster ?? [],
    sources: query.data?.sources ?? [],
    loading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refreshRoster: query.refetch,
  };
}
