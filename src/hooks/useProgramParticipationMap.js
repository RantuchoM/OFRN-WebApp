import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { integranteKey } from "../utils/integranteIds";
import { giraRosterQueryKey } from "./useGiraRosterQuery";
import { fetchRosterForGira } from "./useGiraRoster";

export function countInvolvedEnsembleMembers(roster, activeMembersSet) {
  if (!activeMembersSet?.size) return [];
  return (roster || []).filter(
    (member) =>
      activeMembersSet.has(integranteKey(member.id)) &&
      member.estado_gira !== "ausente",
  );
}

/**
 * Roster por programa + conteo de integrantes del ensamble activo (caché compartida).
 */
export function useProgramParticipationMap(
  supabase,
  programs,
  activeMembersSet,
) {
  const list = programs || [];
  const enabled = Boolean(supabase && activeMembersSet?.size > 0);

  const rosterQueries = useQueries({
    queries: list.map((gira) => ({
      queryKey: giraRosterQueryKey(gira),
      queryFn: async () => {
        const { roster } = await fetchRosterForGira(supabase, gira);
        return roster;
      },
      enabled: enabled && Boolean(gira?.id),
      staleTime: 5 * 60 * 1000,
    })),
  });

  return useMemo(() => {
    const map = new Map();
    if (!enabled) return map;

    list.forEach((gira, index) => {
      const query = rosterQueries[index];
      const members = countInvolvedEnsembleMembers(
        query?.data,
        activeMembersSet,
      );
      const ensembleSize = activeMembersSet.size;
      map.set(gira.id, {
        count: members.length,
        members,
        loading: query?.isLoading,
        isFull:
          ensembleSize > 0 && members.length >= ensembleSize * 0.9,
      });
    });
    return map;
  }, [list, rosterQueries, activeMembersSet, enabled]);
}
