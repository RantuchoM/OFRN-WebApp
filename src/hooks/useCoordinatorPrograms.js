import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchCoordinatorPrograms,
  mapProgramToRehearsalOption,
  EXCLUDED_REHEARSAL_PROGRAM_TYPES,
} from "../utils/rehearsalProgramas";

/**
 * Lista única de programas de Coordinación (pestaña Programas, filtros, ensayos).
 * Una sola query compartida; opciones de repertorio excluyen Comisión.
 */
export function useCoordinatorPrograms(
  supabase,
  { ensembleIds = [], memberIds = [], enabled = true } = {},
) {
  const ensembleKey = useMemo(
    () => [...ensembleIds].sort((a, b) => a - b).join(","),
    [ensembleIds],
  );
  const memberKey = useMemo(
    () => [...memberIds].sort().join(","),
    [memberIds],
  );

  const query = useQuery({
    queryKey: ["coordinator-programs", ensembleKey, memberKey],
    enabled: enabled && (ensembleIds.length > 0 || memberIds.length > 0),
    staleTime: 5 * 60 * 1000,
    queryFn: () =>
      fetchCoordinatorPrograms(supabase, { ensembleIds, memberIds }),
  });

  const programasOptions = useMemo(
    () =>
      (query.data || [])
        .filter((p) => !EXCLUDED_REHEARSAL_PROGRAM_TYPES.has(p.tipo))
        .map(mapProgramToRehearsalOption),
    [query.data],
  );

  return {
    ...query,
    programs: query.data || [],
    programasOptions,
  };
}
