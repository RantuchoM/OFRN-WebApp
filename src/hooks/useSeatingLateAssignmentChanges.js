import { useEffect, useMemo, useRef, useState } from "react";
import { confirmedSeatingRosterKeySet } from "../utils/seatingRosterGate";
import { seatingApellidoNombre } from "../utils/integranteDisplayName";
import { integranteKey } from "../utils/integranteIds";
import {
  buildContainerMusicianMap,
  buildEffectiveAssignments,
  collectMusicianEmails,
  diffEffectiveAssignments,
  fetchProgramContainerItems,
  formatLateAssignmentDetalle,
  formatPartsLabel,
  isWithinSeatingLateChangeWindow,
} from "../utils/seatingLateAssignmentChanges";

/**
 * Acumula altas/cambios de particella de esta visita a Seating.
 * Se limpia al desmontar (cambio de pestaña). No persiste.
 */
export function useSeatingLateAssignmentChanges({
  supabase,
  program,
  loading = false,
  initialLoadDone = false,
  confirmedRoster = [],
  musicianAssignments = {},
  assignments = {},
  containers = [],
  obras = [],
  particellas = [],
}) {
  const withinWindow = useMemo(
    () => isWithinSeatingLateChangeWindow(program?.fecha_desde),
    [program?.fecha_desde],
  );

  const rosterKeys = useMemo(
    () => confirmedSeatingRosterKeySet(confirmedRoster),
    [confirmedRoster],
  );

  const [persistedItems, setPersistedItems] = useState([]);
  const [itemsProgramId, setItemsProgramId] = useState(null);

  useEffect(() => {
    if (!withinWindow || !supabase || program?.id == null) {
      setPersistedItems([]);
      setItemsProgramId(null);
      return undefined;
    }
    const programId = program.id;
    let cancelled = false;
    setItemsProgramId(null);
    fetchProgramContainerItems(supabase, programId)
      .then((items) => {
        if (cancelled) return;
        setPersistedItems(items);
        setItemsProgramId(programId);
      })
      .catch((err) => {
        console.error("seating late-assignment container items:", err);
        if (cancelled) return;
        setPersistedItems([]);
        setItemsProgramId(programId);
      });
    return () => {
      cancelled = true;
    };
  }, [withinWindow, supabase, program?.id]);

  const containerMusicianMap = useMemo(
    () => buildContainerMusicianMap(persistedItems, containers),
    [persistedItems, containers],
  );

  const currentAssignments = useMemo(
    () =>
      buildEffectiveAssignments({
        musicianAssignments,
        assignments,
        containerMusicianMap,
        rosterKeys,
      }),
    [musicianAssignments, assignments, containerMusicianMap, rosterKeys],
  );

  const baselineRef = useRef(null);
  const baselineProgramIdRef = useRef(null);
  const [rawChanges, setRawChanges] = useState([]);
  const seatingReady =
    initialLoadDone && !loading && program?.id != null;
  const itemsReady = itemsProgramId === program?.id;

  useEffect(() => {
    if (baselineProgramIdRef.current !== program?.id) {
      baselineRef.current = null;
      baselineProgramIdRef.current = program?.id ?? null;
      setRawChanges([]);
    }
    if (!withinWindow) {
      baselineRef.current = null;
      setRawChanges([]);
      return;
    }
    if (!seatingReady || !itemsReady) return;
    if (!baselineRef.current) {
      baselineRef.current = currentAssignments;
      setRawChanges([]);
      return;
    }
    setRawChanges(
      diffEffectiveAssignments(baselineRef.current, currentAssignments),
    );
  }, [
    program?.id,
    withinWindow,
    seatingReady,
    itemsReady,
    currentAssignments,
  ]);

  const particellasById = useMemo(() => {
    const map = new Map();
    (particellas || []).forEach((p) => {
      if (p?.id != null) map.set(String(p.id), p);
    });
    return map;
  }, [particellas]);

  const obrasById = useMemo(() => {
    const map = new Map();
    (obras || []).forEach((obra) => {
      const id = obra?.obra_id ?? obra?.id;
      if (id == null) return;
      map.set(String(id), obra);
    });
    return map;
  }, [obras]);

  const rosterById = useMemo(() => {
    const map = new Map();
    (confirmedRoster || []).forEach((m) => {
      const k = integranteKey(m.id);
      if (k) map.set(k, m);
    });
    return map;
  }, [confirmedRoster]);

  const musicians = useMemo(() => {
    const byMusician = new Map();
    rawChanges.forEach((change) => {
      const person = rosterById.get(integranteKey(change.musicianId));
      if (!person) return;
      const mid = integranteKey(person.id);
      if (!byMusician.has(mid)) {
        byMusician.set(mid, {
          id: person.id,
          displayName: seatingApellidoNombre(person),
          mail: String(person.mail || "").trim(),
          changes: [],
        });
      }
      const obra = obrasById.get(String(change.obraId));
      const title =
        obra?.title ||
        (typeof obra?.fullTitle === "string" ? obra.fullTitle : "") ||
        "Obra";
      byMusician.get(mid).changes.push({
        obraId: change.obraId,
        obraTitle: title,
        fromIds: change.fromIds,
        toIds: change.toIds,
        fromLabel: formatPartsLabel(change.fromIds, particellasById),
        toLabel: formatPartsLabel(change.toIds, particellasById),
      });
    });

    return [...byMusician.values()]
      .map((m) => ({
        ...m,
        changes: [...m.changes].sort((a, b) =>
          String(a.obraTitle).localeCompare(String(b.obraTitle), "es"),
        ),
      }))
      .sort((a, b) =>
        String(a.displayName).localeCompare(String(b.displayName), "es"),
      );
  }, [rawChanges, rosterById, obrasById, particellasById]);

  const detalleText = useMemo(
    () => formatLateAssignmentDetalle(musicians),
    [musicians],
  );
  const emails = useMemo(() => collectMusicianEmails(musicians), [musicians]);

  return {
    visible: withinWindow && musicians.length > 0,
    musicians,
    count: musicians.length,
    detalleText,
    emails,
  };
}
