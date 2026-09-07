import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchGiraSegmentosBundle } from "../services/giraSegmentosService";

/** Stable empty fallbacks — `?? []` would be a new ref every render and can loop effects. */
const EMPTY_ARR = Object.freeze([]);

export function giraSegmentosQueryKey(gira) {
  const id = gira?.id;
  if (!id) return ["gira-segmentos", null];
  return [
    "gira-segmentos",
    id,
    gira?.fecha_desde ?? null,
    gira?.fecha_hasta ?? null,
  ];
}

export function useGiraSegmentos(supabase, gira, { enabled = true } = {}) {
  const queryClient = useQueryClient();
  const id = gira?.id;

  const query = useQuery({
    queryKey: giraSegmentosQueryKey(gira),
    queryFn: () => fetchGiraSegmentosBundle(supabase, id, gira),
    enabled: Boolean(enabled && id),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const refreshSegmentos = useCallback(async () => {
    const result = await query.refetch();
    return result.data;
  }, [query]);

  const invalidateSegmentos = useCallback(() => {
    if (!id) return;
    queryClient.invalidateQueries({ queryKey: ["gira-segmentos", id] });
  }, [queryClient, id]);

  return {
    cortes: query.data?.cortes ?? EMPTY_ARR,
    segmentRows: query.data?.segmentRows ?? EMPTY_ARR,
    segments: query.data?.segments ?? EMPTY_ARR,
    cortesCount: query.data?.cortesCount ?? 0,
    loading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refreshSegmentos,
    invalidateSegmentos,
  };
}
