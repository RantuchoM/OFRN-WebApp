import { useEffect, useMemo, useState } from "react";
import { useCoordinatorPrograms } from "./useCoordinatorPrograms";
import { integranteKey } from "../utils/integranteIds";
import { membershipActiveOnProgramDate } from "../utils/ensembleMembership";

async function resolveActiveMemberIds(supabase, myEnsembles) {
  const baseEnsembleIds = (myEnsembles || []).map((e) => e.id);
  if (baseEnsembleIds.length === 0) return [];

  const { data: rels } = await supabase
    .from("integrantes_ensambles")
    .select("id_integrante, id_ensamble, fecha_desde, fecha_hasta")
    .in("id_ensamble", baseEnsembleIds);

  const hoy = new Date().toISOString().slice(0, 10);
  return [
    ...new Set(
      (rels || [])
        .filter((r) => membershipActiveOnProgramDate(r, hoy))
        .map((r) => integranteKey(r.id_integrante))
        .filter(Boolean),
    ),
  ];
}

/**
 * Opciones de programas para formularios de ensayo.
 * Reutiliza la misma query que la pestaña Programas cuando hay ensambles.
 */
export function useRehearsalProgramasOptions(
  supabase,
  { memberIds = null, myEnsembles = [], enabled = true } = {},
) {
  const [resolvedMemberIds, setResolvedMemberIds] = useState(
    () => memberIds || [],
  );

  useEffect(() => {
    if (memberIds?.length) {
      setResolvedMemberIds(memberIds);
      return;
    }
    if (!myEnsembles?.length) {
      setResolvedMemberIds([]);
      return;
    }
    let cancelled = false;
    resolveActiveMemberIds(supabase, myEnsembles).then((ids) => {
      if (!cancelled) setResolvedMemberIds(ids);
    });
    return () => {
      cancelled = true;
    };
  }, [supabase, memberIds, myEnsembles]);

  const ensembleIds = useMemo(
    () => (myEnsembles || []).map((e) => e.id),
    [myEnsembles],
  );

  const query = useCoordinatorPrograms(supabase, {
    ensembleIds,
    memberIds: resolvedMemberIds,
    enabled,
  });

  return {
    ...query,
    data: query.programasOptions,
    memberIds: resolvedMemberIds,
  };
}
