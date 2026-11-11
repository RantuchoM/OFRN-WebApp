import { useEffect, useMemo, useRef, useState } from "react";
import { confirmedSeatingRosterKeySet } from "../utils/seatingRosterGate";
import { seatingApellidoNombre } from "../utils/integranteDisplayName";
import { integranteKey } from "../utils/integranteIds";
import {
  buildContainerMusicianMap,
  buildEffectiveAssignments,
  buildLateAssignmentUndoPlan,
  cloneAssignmentMaps,
  collectMusicianEmails,
  diffEffectiveAssignments,
  effectiveAssignmentsSignature,
  fetchProgramContainerItems,
  formatLateAssignmentDetalle,
  formatPartsLabel,
  isWithinSeatingLateChangeWindow,
  lateAssignmentChangesEqual,
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
  /** Jefe de fila: ofrecer mail siempre (sin ventana de ~2 semanas). */
  alwaysOfferMail = false,
}) {
  const withinWindow = useMemo(
    () => isWithinSeatingLateChangeWindow(program?.fecha_desde),
    [program?.fecha_desde],
  );
  const trackChanges = withinWindow || alwaysOfferMail;

  const rosterKeys = useMemo(
    () => confirmedSeatingRosterKeySet(confirmedRoster),
    [confirmedRoster],
  );

  const [persistedItems, setPersistedItems] = useState([]);
  const [itemsProgramId, setItemsProgramId] = useState(null);

  useEffect(() => {
    if (!trackChanges || !supabase || program?.id == null) {
      setPersistedItems([]);
      setItemsProgramId(null);
      return undefined;
    }
    const programId = program.id;
    let cancelled = false;
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
  }, [trackChanges, supabase, program?.id]);

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
  const baselineMapsRef = useRef(null);
  const baselineProgramIdRef = useRef(null);
  const currentAssignmentsRef = useRef(currentAssignments);
  currentAssignmentsRef.current = currentAssignments;
  const musicianAssignmentsRef = useRef(musicianAssignments);
  musicianAssignmentsRef.current = musicianAssignments;
  const assignmentsRef = useRef(assignments);
  assignmentsRef.current = assignments;
  const currentSignature = useMemo(
    () => effectiveAssignmentsSignature(currentAssignments),
    [currentAssignments],
  );
  const [rawChanges, setRawChanges] = useState([]);
  const seatingReady =
    initialLoadDone && !loading && program?.id != null;
  const itemsReady = itemsProgramId === program?.id;

  useEffect(() => {
    if (baselineProgramIdRef.current !== program?.id) {
      baselineRef.current = null;
      baselineMapsRef.current = null;
      baselineProgramIdRef.current = program?.id ?? null;
      setRawChanges([]);
    }
    if (!trackChanges) {
      baselineRef.current = null;
      baselineMapsRef.current = null;
      setRawChanges([]);
      return;
    }
    if (!seatingReady || !itemsReady) return;
    const live = currentAssignmentsRef.current;
    if (!baselineRef.current) {
      baselineRef.current = live;
      baselineMapsRef.current = cloneAssignmentMaps({
        musicianAssignments: musicianAssignmentsRef.current,
        assignments: assignmentsRef.current,
      });
      setRawChanges([]);
      return;
    }
    const next = diffEffectiveAssignments(baselineRef.current, live);
    setRawChanges((prev) =>
      lateAssignmentChangesEqual(prev, next) ? prev : next,
    );
  }, [
    program?.id,
    trackChanges,
    seatingReady,
    itemsReady,
    currentSignature,
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
          nombre: person.nombre || "",
          apellido: person.apellido || "",
          nombreCompleto:
            person.nombre_completo || seatingApellidoNombre(person),
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

  const dismissSession = () => {
    baselineRef.current = currentAssignmentsRef.current;
    baselineMapsRef.current = cloneAssignmentMaps({
      musicianAssignments: musicianAssignmentsRef.current,
      assignments: assignmentsRef.current,
    });
    setRawChanges([]);
  };

  const getUndoPlan = (musicianId = null) => {
    const baselineMaps = baselineMapsRef.current || {
      musicianAssignments: {},
      assignments: {},
    };
    return buildLateAssignmentUndoPlan({
      musicians,
      musicianId,
      baselineMusicianAssignments: baselineMaps.musicianAssignments,
      baselineAssignments: baselineMaps.assignments,
      currentMusicianAssignments: musicianAssignmentsRef.current,
      currentAssignments: assignmentsRef.current,
    });
  };

  return {
    visible: trackChanges && musicians.length > 0,
    withinWindow,
    alwaysOfferMail: Boolean(alwaysOfferMail),
    musicians,
    count: musicians.length,
    detalleText,
    emails,
    dismissSession,
    getUndoPlan,
  };
}
