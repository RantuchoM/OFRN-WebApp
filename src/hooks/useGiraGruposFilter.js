import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchGiraGrupos } from "../services/giraGruposService";

const storageKey = (giraId) => `gira_grupos_filter_${giraId}`;

function readStored(giraId) {
  if (giraId == null) return { filterGrupoIds: [], includeGeneralEvents: true };
  try {
    const raw = sessionStorage.getItem(storageKey(giraId));
    if (!raw) return { filterGrupoIds: [], includeGeneralEvents: true };
    const parsed = JSON.parse(raw);
    return {
      filterGrupoIds: Array.isArray(parsed.filterGrupoIds)
        ? parsed.filterGrupoIds.map(Number).filter(Number.isFinite)
        : [],
      includeGeneralEvents:
        parsed.includeGeneralEvents == null
          ? true
          : Boolean(parsed.includeGeneralEvents),
    };
  } catch {
    return { filterGrupoIds: [], includeGeneralEvents: true };
  }
}

function writeStored(giraId, filterGrupoIds, includeGeneralEvents) {
  if (giraId == null) return;
  try {
    sessionStorage.setItem(
      storageKey(giraId),
      JSON.stringify({ filterGrupoIds, includeGeneralEvents }),
    );
  } catch {
    /* ignore quota */
  }
}

/**
 * Estado compartido del filtro editorial de grupos (header de gira).
 */
export function useGiraGruposFilter(supabase, giraId, { enabled = true } = {}) {
  const [giraGrupos, setGiraGrupos] = useState([]);
  const [filterGrupoIds, setFilterGrupoIdsState] = useState([]);
  const [includeGeneralEvents, setIncludeGeneralEventsState] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !supabase || giraId == null) {
      setGiraGrupos([]);
      setFilterGrupoIdsState([]);
      setIncludeGeneralEventsState(true);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const stored = readStored(giraId);
    fetchGiraGrupos(supabase, giraId).then(({ grupos, error }) => {
      if (cancelled) return;
      if (error) console.warn("useGiraGruposFilter:", error.message);
      const list = grupos || [];
      setGiraGrupos(list);
      const valid = new Set(list.map((g) => Number(g.id)));
      const nextIds = stored.filterGrupoIds.filter((id) => valid.has(id));
      setFilterGrupoIdsState(nextIds);
      setIncludeGeneralEventsState(stored.includeGeneralEvents);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [supabase, giraId, enabled]);

  const setFilterGrupoIds = useCallback(
    (idsOrFn) => {
      setFilterGrupoIdsState((prev) => {
        const next =
          typeof idsOrFn === "function" ? idsOrFn(prev) : idsOrFn;
        const normalized = (next || []).map(Number).filter(Number.isFinite);
        writeStored(giraId, normalized, includeGeneralEvents);
        return normalized;
      });
    },
    [giraId, includeGeneralEvents],
  );

  const setIncludeGeneralEvents = useCallback(
    (valOrFn) => {
      setIncludeGeneralEventsState((prev) => {
        const next =
          typeof valOrFn === "function" ? valOrFn(prev) : Boolean(valOrFn);
        writeStored(giraId, filterGrupoIds, next);
        return next;
      });
    },
    [giraId, filterGrupoIds],
  );

  const grupoFilterOptions = useMemo(
    () =>
      (giraGrupos || []).map((g) => ({
        value: Number(g.id),
        label: g.nombre,
        color: g.color,
      })),
    [giraGrupos],
  );

  const hasGrupos = giraGrupos.length > 0;

  return {
    giraGrupos,
    hasGrupos,
    loading,
    filterGrupoIds,
    setFilterGrupoIds,
    includeGeneralEvents,
    setIncludeGeneralEvents,
    grupoFilterOptions,
    setGiraGrupos,
  };
}
