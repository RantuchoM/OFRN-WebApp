import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchGiraGrupos,
  GIRA_GRUPOS_TUTTI_LABEL,
  GIRA_GRUPOS_TUTTI_VALUE,
} from "../services/giraGruposService";

const storageKey = (giraId) => `gira_grupos_filter_v2_${giraId}`;
const legacyStorageKey = (giraId) => `gira_grupos_filter_${giraId}`;

function readStored(giraId) {
  if (giraId == null) {
    return { filterGrupoIds: [], includeGeneralEvents: false };
  }
  try {
    const rawV2 = sessionStorage.getItem(storageKey(giraId));
    if (rawV2) {
      const parsed = JSON.parse(rawV2);
      return {
        filterGrupoIds: Array.isArray(parsed.filterGrupoIds)
          ? parsed.filterGrupoIds.map(Number).filter(Number.isFinite)
          : [],
        includeGeneralEvents: Boolean(parsed.includeGeneralEvents),
      };
    }
    // Migración v1: vacío + includeGeneral true significaba «sin filtro».
    const rawV1 = sessionStorage.getItem(legacyStorageKey(giraId));
    if (!rawV1) {
      return { filterGrupoIds: [], includeGeneralEvents: false };
    }
    const parsed = JSON.parse(rawV1);
    const filterGrupoIds = Array.isArray(parsed.filterGrupoIds)
      ? parsed.filterGrupoIds.map(Number).filter(Number.isFinite)
      : [];
    const includeGeneralEvents =
      filterGrupoIds.length > 0
        ? parsed.includeGeneralEvents == null
          ? true
          : Boolean(parsed.includeGeneralEvents)
        : false;
    return { filterGrupoIds, includeGeneralEvents };
  } catch {
    return { filterGrupoIds: [], includeGeneralEvents: false };
  }
}

function writeStored(giraId, filterGrupoIds, includeGeneralEvents) {
  if (giraId == null) return;
  try {
    sessionStorage.setItem(
      storageKey(giraId),
      JSON.stringify({
        version: 2,
        filterGrupoIds,
        includeGeneralEvents: Boolean(includeGeneralEvents),
      }),
    );
  } catch {
    /* ignore quota */
  }
}

/**
 * Estado compartido del filtro editorial de grupos (header de gira).
 * «Actividades Tutti» = eventos sin `eventos_grupos`; se combina con ids (OR).
 */
export function useGiraGruposFilter(supabase, giraId, { enabled = true } = {}) {
  const [giraGrupos, setGiraGrupos] = useState([]);
  const [filterGrupoIds, setFilterGrupoIdsState] = useState([]);
  const [includeGeneralEvents, setIncludeGeneralEventsState] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !supabase || giraId == null) {
      setGiraGrupos([]);
      setFilterGrupoIdsState([]);
      setIncludeGeneralEventsState(false);
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

  /** Actualiza ids + Tutti en un solo write (evita race en sessionStorage). */
  const setGrupoFilterSelection = useCallback(
    (ids, includeTutti) => {
      const normalized = (ids || []).map(Number).filter(Number.isFinite);
      const nextTutti = Boolean(includeTutti);
      setFilterGrupoIdsState(normalized);
      setIncludeGeneralEventsState(nextTutti);
      writeStored(giraId, normalized, nextTutti);
    },
    [giraId],
  );

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
    () => [
      {
        value: GIRA_GRUPOS_TUTTI_VALUE,
        label: GIRA_GRUPOS_TUTTI_LABEL,
        color: "#0369a1",
      },
      ...(giraGrupos || []).map((g) => ({
        value: Number(g.id),
        label: g.nombre,
        color: g.color,
      })),
    ],
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
    setGrupoFilterSelection,
    grupoFilterOptions,
    setGiraGrupos,
  };
}
