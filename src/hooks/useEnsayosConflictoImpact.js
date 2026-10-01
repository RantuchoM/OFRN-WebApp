import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ID_TIPO_ENSAYO_ENSAMBLE } from "../utils/serviciosCantidad";
import {
  applyTuttiNImpacts,
  buildFullConflictoImpactByEventId,
  collectEmbeddedProgramas,
  mergeProgramasById,
  pendingFullConflictoEventIdSet,
  uniqueTuttiNProgramasForEvents,
} from "../utils/serviciosEnsayosConflicto";
import {
  fetchConflictoAgendaContext,
  fetchTuttiNMembershipContext,
  resolveSeatingRostersSequential,
} from "../services/serviciosCantidadService";

function type13DateBounds(events) {
  let min = null;
  let max = null;
  for (const evt of events || []) {
    if (evt?.isProgramMarker) continue;
    if (Number(evt.id_tipo_evento) !== ID_TIPO_ENSAYO_ENSAMBLE) continue;
    if (evt.is_deleted) continue;
    const day = String(evt.fecha || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    if (!min || day < min) min = day;
    if (!max || day > max) max = day;
  }
  return { min, max };
}

function ensambleIdsFromType13(events) {
  const ids = new Set();
  for (const evt of events || []) {
    if (Number(evt?.id_tipo_evento) !== ID_TIPO_ENSAYO_ENSAMBLE) continue;
    for (const row of evt.eventos_ensambles || []) {
      const id = Number(row.id_ensamble ?? row.ensambles?.id);
      if (Number.isFinite(id)) ids.add(id);
    }
  }
  return [...ids];
}

function type13Signature(events) {
  const rows = [];
  for (const evt of events || []) {
    if (evt?.isProgramMarker) continue;
    if (Number(evt.id_tipo_evento) !== ID_TIPO_ENSAYO_ENSAMBLE) continue;
    if (evt.is_deleted) continue;
    const ens = (evt.eventos_ensambles || [])
      .map((row) => row.id_ensamble ?? row.ensambles?.id)
      .filter((id) => id != null)
      .join(",");
    rows.push(
      `${evt.id}:${String(evt.fecha || "").slice(0, 10)}:${evt.ensayo_pese_conflicto ? 1 : 0}:${String(evt.ensayo_pese_conflicto_justificacion || "").length}:${ens}`,
    );
  }
  rows.sort();
  return rows.join("|");
}

/**
 * Impacto de giras superpuestas sobre ensayos de ensamble.
 * Conflicto pleno: en memoria (eventos + un bulk programas/fuentes + catálogo).
 * Tutti-N: solo si `includeTuttiN` (Coordinación Lista); un seating por gira
 * candidata, en serie, memoizado.
 */
export function useEnsayosConflictoImpact({
  supabase,
  events = [],
  fechaDesde,
  fechaHasta,
  includeTuttiN = false,
  enabled = true,
} = {}) {
  const [impactByEventId, setImpactByEventId] = useState(() => new Map());
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);
  const eventsRef = useRef(events);
  eventsRef.current = events;

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  const bounds = useMemo(() => type13DateBounds(events), [events]);
  const from = fechaDesde || bounds.min;
  const to = fechaHasta || bounds.max;
  const hasType13 = Boolean(bounds.min);
  const type13Key = useMemo(() => type13Signature(events), [events]);

  useEffect(() => {
    if (!enabled || !supabase || !hasType13 || !from || !to) {
      setImpactByEventId(new Map());
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const snapshot = eventsRef.current;
      const ctx = await fetchConflictoAgendaContext(supabase, {
        fechaDesde: from,
        fechaHasta: to,
      });
      if (cancelled) return;
      if (ctx.error) {
        setImpactByEventId(new Map());
        setLoading(false);
        return;
      }
      const programas = mergeProgramasById(
        ctx.programas,
        collectEmbeddedProgramas(snapshot),
      );
      let map = buildFullConflictoImpactByEventId({
        events: snapshot,
        ensambles: ctx.ensambles,
        programas,
      });

      if (includeTuttiN) {
        const candidates = uniqueTuttiNProgramasForEvents({
          events: snapshot,
          ensambles: ctx.ensambles,
          programas,
          fullImpactByEventId: map,
        });
        if (candidates.length) {
          const extras = await fetchTuttiNMembershipContext(
            supabase,
            ensambleIdsFromType13(snapshot),
          );
          if (cancelled) return;
          const rosterByGiraId = await resolveSeatingRostersSequential(
            supabase,
            candidates,
          );
          if (cancelled) return;
          map = applyTuttiNImpacts(map, {
            events: snapshot,
            ensambles: ctx.ensambles,
            programas,
            rosterByGiraId,
            memberships: extras.memberships,
            integrantes: extras.integrantes,
          });
        }
      }

      setImpactByEventId(map);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    enabled,
    supabase,
    hasType13,
    from,
    to,
    tick,
    includeTuttiN,
    type13Key,
  ]);

  const pendingIds = useMemo(
    () => pendingFullConflictoEventIdSet(impactByEventId),
    [impactByEventId],
  );

  return {
    groups: [],
    impactByEventId,
    pendingIds,
    loading,
    refresh,
  };
}
