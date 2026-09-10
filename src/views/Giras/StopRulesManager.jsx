import React, { useState, useEffect, useMemo } from "react";
import {
  IconX,
  IconPlus,
  IconTrash,
  IconMapPin,
  IconClock,
  IconUsers,
  IconChevronDown,
  IconChevronUp,
  IconCheck,
  IconArrowDown,
  IconLoader,
} from "../../components/ui/Icons";
import {
  normalize,
  getCategoriaLogistica,
  matchesRule,
  isPersonVetoedFromTransport,
  isPersonAdmittedToTransport,
  isAdmissionExclusionRule,
  getExclusionAdmissionRulesForPerson,
} from "../../hooks/useLogistics";
import { toast } from "sonner";
import SearchableSelect from "../../components/ui/SearchableSelect";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";
import {
  personWithViaticosAsResidence,
  viaticosDiffersFromResidencia,
} from "../../utils/integranteDomicilioViaticos";
import {
  listOfrnPeopleAboardAtStop,
} from "../../utils/fimbaTransportBoarding";
import {
  alightAllOfrnAboardAtStop,
  alightOfrnGrupoAtStop,
  alightOfrnPeopleAtStop,
  listOpenOfrnGrupoRidesAtStop,
  upsertOfrnGrupoRutaStop,
} from "../../services/fimbaService";
import {
  fetchGiraGrupos,
  integranteIdsInGrupos,
} from "../../services/giraGruposService";

/** Etiqueta corta de parada para el picker de bajada espejo (Grupo ↑ → ↓). */
function formatStopOptionLabel(ev) {
  if (!ev) return "—";
  const f = String(ev.fecha || "").slice(0, 10);
  let datePart = "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(f)) {
    const [, m, d] = f.split("-");
    datePart = `${d}/${m}`;
  }
  const h = ev.hora_inicio ? String(ev.hora_inicio).slice(0, 5) : "";
  const loc =
    ev.locaciones?.nombre ||
    ev.locacion_nombre ||
    ev.actividad ||
    ev.descripcion ||
    (ev.id != null ? `#${ev.id}` : "Parada");
  return [datePart, h, loc].filter(Boolean).join(" · ");
}

/** Opciones de categoría logística (valor guardado en reglas = `id`). */
const CATEGORIA_LOGISTICA_OPTIONS = [
  { id: "SOLISTAS", label: "Solistas" },
  { id: "DIRECTORES", label: "Directores" },
  { id: "PRODUCCION", label: "Producción (incl. choferes)" },
  { id: "EXTERNOS", label: "Externos (No estables)" },
  { id: "LOCALES", label: "Locales" },
  { id: "NO_LOCALES", label: "No Locales" },
];

// Helpers de Etiquetado
const getScopeLabel = (scope) => {
  switch (scope) {
    case "General":
      return "General (Todos)";
    case "Region":
      return "Por Región";
    case "Localidad":
      return "Por Localidad";
    case "Categoria":
      return "Por Categoría";
    case "Grupo":
      return "Por Grupo";
    case "Persona":
      return "Individual";
    default:
      return scope;
  }
};

const getPriorityColor = (prio) => {
  if (prio >= 5) return "bg-purple-100 text-purple-700 border-purple-200"; // Persona
  if (prio === 4) return "bg-indigo-100 text-indigo-700 border-indigo-200"; // Categoría
  if (prio === 3) return "bg-cyan-100 text-cyan-700 border-cyan-200"; // Localidad
  if (prio === 2) return "bg-blue-100 text-blue-700 border-blue-200"; // Región
  return "bg-slate-100 text-slate-600 border-slate-200"; // General
};

const routeRuleAdmissionKey = (rule) => {
  if (!rule) return "";
  if (rule.alcance === "Localidad")
    return `Localidad:${rule.id_localidad}`;
  if (rule.alcance === "Region") return `Region:${rule.id_region}`;
  if (rule.alcance === "Persona")
    return `Persona:${rule.id_integrante}`;
  return "";
};

const admissionCoversRouteRule = (admission, routeRule) => {
  if (!admission || !routeRule) return false;
  if (admission.tipo === "EXCLUSION" || admission.es_exclusion) return false;
  if (routeRule.alcance === "Localidad") {
    return (
      admission.alcance === "Localidad" &&
      String(admission.id_localidad) === String(routeRule.id_localidad)
    );
  }
  if (routeRule.alcance === "Region") {
    return (
      admission.alcance === "Region" &&
      String(admission.id_region) === String(routeRule.id_region)
    );
  }
  if (routeRule.alcance === "Persona") {
    return (
      admission.alcance === "Persona" &&
      String(admission.id_integrante) === String(routeRule.id_integrante)
    );
  }
  return false;
};

/** Abreviatura de instrumento con plaza extra (ocupa asiento en bus). */
const getPlazaExtraAbreviatura = (person) => {
  if (!person?.instrumentos?.plaza_extra) return null;
  const abbr = String(person.instrumentos.abreviatura || "").trim();
  return abbr || null;
};

const countInstrumentSeats = (people) =>
  (people || []).filter((p) => Boolean(p?.instrumentos?.plaza_extra)).length;

function formatStopRuleOccupancy(count, inferredCount = 0, instrumentSeats = 0) {
  const actualLabel =
    instrumentSeats > 0 && count > 0
      ? `${count} + ${instrumentSeats} ins`
      : count > 0
        ? String(count)
        : "";
  if (inferredCount > 0 && actualLabel) return `${actualLabel} y ${inferredCount} inf.`;
  if (inferredCount > 0) return `${inferredCount} inf.`;
  return actualLabel || "0";
}

export default function StopRulesManager({
  isOpen,
  onClose,
  event,
  type, // "up" | "down"
  transportId,
  supabase,
  giraId,
  regions,
  localities,
  passengers, // summary/logistics completo
  admissionRules = [],
  onRefresh,
  /** Sin shell modal/overlay: contenido al nivel del padre (ej. pestaña FIMBA Orquesta OFRN). */
  embedded = false,
  /**
   * FIMBA / multi-chip: varias ↑/↓ del mismo alcance en la *misma* parada
   * (INSERT aditivo; hops abiertos). El diálogo de conflicto en *otra* parada
   * es siempre 4-way (Reemplazar / Crear nueva / Extremo adicional / Cancelar),
   * también en OFRN Trayectos standalone — no depende de este flag.
   * `embedded` (FimbaStopRulesManager / FimbaEventoFormModal) también activa multi.
   */
  allowMultipleAssignments = false,
  /** Secuencia del vehículo (para «a bordo» / Bajar todo). */
  sortedEvents = [],
  /** Grupos de convocatoria `giras_grupos` (si no se pasan, se cargan por giraId). */
  giraGrupos: giraGruposProp = null,
  /**
   * Reglas `giras_logistica_rutas` de la gira (FIMBA). Con
   * multi-asignación se cuentan todos los hops, no la ↑/↓ colapsada.
   */
  routeRules = null,
}) {
  /** FIMBA embedded o flag explícito → hops aditivos en la misma parada. */
  const allowMulti = Boolean(allowMultipleAssignments || embedded);
  const { confirm, dialog } = useConfirmDialog();
  const [existingRules, setExistingRules] = useState([]);
  /** Rides Grupo ↑ sin ↓ que aún cubren esta parada (vista bajadas). */
  const [openGrupoRides, setOpenGrupoRides] = useState([]);
  const [transportAdmissionRules, setTransportAdmissionRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedRuleId, setExpandedRuleId] = useState(null); // Estado para el acordeón
  const [admittedIds, setAdmittedIds] = useState(new Set());
  const [recentlyCreatedAdmissionKeys, setRecentlyCreatedAdmissionKeys] =
    useState(() => new Set());
  // Formulario nueva regla
  const [newScope, setNewScope] = useState("General");
  const [targetIds, setTargetIds] = useState([]);
  const [esChofer, setEsChofer] = useState(false);
  /** Al asignar Grupo ↑: también cerrar ride con ↓ en otra parada del vehículo. */
  const [alsoMirrorBajada, setAlsoMirrorBajada] = useState(false);
  const [mirrorBajadaEventId, setMirrorBajadaEventId] = useState("");
  /** Por regla Grupo ↑ abierta: parada elegida para «Crear bajada». */
  const [rowMirrorEventByRuleId, setRowMirrorEventByRuleId] = useState({});
  const [mirrorBusyKey, setMirrorBusyKey] = useState(null);
  const [bajarTodoBusy, setBajarTodoBusy] = useState(false);
  const [quickAlightBusyId, setQuickAlightBusyId] = useState(null);
  const [choferBusyId, setChoferBusyId] = useState(null);
  const [giraGrupos, setGiraGrupos] = useState(() =>
    Array.isArray(giraGruposProp) ? giraGruposProp : [],
  );

  const title = type === "up" ? "Gestionar Subidas" : "Gestionar Bajadas";
  const colorClass = type === "up" ? "text-emerald-700" : "text-rose-700";
  const bgClass = type === "up" ? "bg-emerald-50" : "bg-rose-50";

  useEffect(() => {
    if (isOpen && transportId) {
      fetchRules();
      fetchTransportAdmissionRules();
      fetchAdmissions();
    } else if (!isOpen) {
      setRecentlyCreatedAdmissionKeys(new Set());
      setAlsoMirrorBajada(false);
      setMirrorBajadaEventId("");
      setRowMirrorEventByRuleId({});
      setMirrorBusyKey(null);
      setOpenGrupoRides([]);
    }
  }, [isOpen, transportId, event?.id, type]);

  useEffect(() => {
    if (Array.isArray(giraGruposProp)) {
      setGiraGrupos(giraGruposProp);
      return;
    }
    if (!isOpen || !giraId || !supabase) return;
    let cancelled = false;
    fetchGiraGrupos(supabase, giraId).then(({ grupos }) => {
      if (!cancelled) setGiraGrupos(grupos || []);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, giraId, supabase, giraGruposProp]);

  // Re-resolver miembros/labels de rides Grupo abiertos cuando carga el roster de grupos.
  useEffect(() => {
    if (!isOpen || type !== "down" || !transportId || !event?.id || !giraId) {
      return;
    }
    let cancelled = false;
    listOpenOfrnGrupoRidesAtStop({
      giraId,
      id_transporte_fisico: transportId,
      id_evento: event.id,
      sortedEvents,
      giraGrupos,
    }).then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        console.error(error);
        return;
      }
      setOpenGrupoRides(data || []);
    });
    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    type,
    transportId,
    event?.id,
    giraId,
    giraGrupos,
    sortedEvents,
  ]);

  useEffect(() => {
    if (isOpen && transportId) fetchAdmissions();
  }, [passengers, isOpen, transportId]);

  const fetchTransportAdmissionRules = async () => {
    if (!transportId || !giraId) return;
    try {
      const { data, error } = await supabase
        .from("giras_logistica_admision")
        .select("*")
        .eq("id_gira", giraId)
        .eq("id_transporte_fisico", transportId);
      if (error) throw error;
      setTransportAdmissionRules(data || []);
    } catch (err) {
      console.error("Error cargando admisiones del transporte:", err);
    }
  };

  const hasAdmissionForRouteRule = (routeRule) =>
    (transportAdmissionRules || []).some((adm) =>
      admissionCoversRouteRule(adm, routeRule),
    );

  /** Regla de admisión (inclusión) que efectivamente incluye a la persona en este bus. */
  const getEffectiveInclusionAdmissionForPerson = (person) => {
    if (!person) return null;
    const rules = transportAdmissionRules || admissionRules || [];
    const applicable = rules.filter(
      (r) =>
        String(r.id_transporte_fisico) === String(transportId) &&
        matchesRule(r, person, localities) &&
        !isAdmissionExclusionRule(r),
    );
    if (!applicable.length) return null;
    applicable.sort((a, b) => (b.prioridad || 0) - (a.prioridad || 0));
    return applicable[0];
  };

  /** Admisión de mayor alcance que ya cubre una parada territorial (loc ← región ← general). */
  const getBroaderTerritoryAdmissionCover = (routeRule) => {
    const rules = (transportAdmissionRules || admissionRules || []).filter(
      (r) =>
        String(r.id_transporte_fisico) === String(transportId) &&
        !isAdmissionExclusionRule(r),
    );

    if (routeRule.alcance === "Localidad" && routeRule.id_localidad != null) {
      const loc = localities.find(
        (l) => String(l.id) === String(routeRule.id_localidad),
      );
      const regionId = loc?.id_region;
      if (regionId != null && String(regionId) !== "") {
        const regionRule = rules.find(
          (r) =>
            r.alcance === "Region" &&
            String(r.id_region) === String(regionId),
        );
        if (regionRule) return { rule: regionRule, sameScope: false };
      }
    }

    if (
      routeRule.alcance === "Localidad" ||
      routeRule.alcance === "Region"
    ) {
      const generalRule = rules.find((r) => r.alcance === "General");
      if (generalRule) return { rule: generalRule, sameScope: false };
    }

    return null;
  };

  /**
   * ¿La parada ya tiene admisión cubierta? (regla espejo o incluido por alcance más amplio)
   */
  const getRouteRuleAdmissionCoverage = (routeRule) => {
    if (hasAdmissionForRouteRule(routeRule)) {
      const mirror = (transportAdmissionRules || []).find((adm) =>
        admissionCoversRouteRule(adm, routeRule),
      );
      return {
        satisfied: true,
        viaLabel: mirror
          ? `${mirror.alcance} — ${resolveTargetName(mirror)}`
          : null,
        sameScope: true,
      };
    }

    const territoryCover = getBroaderTerritoryAdmissionCover(routeRule);
    if (territoryCover) {
      return {
        satisfied: true,
        viaLabel: `${territoryCover.rule.alcance} — ${resolveTargetName(territoryCover.rule)}`,
        sameScope: false,
      };
    }

    if (routeRule.alcance === "Persona" && routeRule.id_integrante) {
      const person = (passengers || []).find(
        (p) => String(p.id) === String(routeRule.id_integrante),
      );
      if (
        person &&
        isPersonAdmittedToTransport(
          person,
          transportId,
          transportAdmissionRules,
          localities,
        )
      ) {
        const viaRule = getEffectiveInclusionAdmissionForPerson(person);
        const viaLabel = viaRule
          ? `${viaRule.alcance} — ${resolveTargetName(viaRule)}`
          : "otra regla de admisión";
        return {
          satisfied: true,
          viaLabel,
          sameScope: viaRule?.alcance === "Persona",
        };
      }
    }

    return { satisfied: false, viaLabel: null, sameScope: false };
  };

  const fetchAdmissions = async () => {
    // Centralizamos: si useLogistics ya resolvió que un pasajero "viaja en este transporte",
    // entonces ya respetó la lógica de roles y alcance (matchesRule). Usamos eso como fuente de verdad.
    const ids = new Set();
    (passengers || []).forEach((p) => {
      const trans = p?.logistics?.transports || [];
      const isInTransport = trans.some(
        (t) => String(t.id) === String(transportId),
      );
      if (isInTransport) ids.add(String(p.id));
    });
    setAdmittedIds(ids);
  };
  const fetchRules = async () => {
    setLoading(true);
    try {
      const fieldToCheck =
        type === "up" ? "id_evento_subida" : "id_evento_bajada";

      // Buscamos en la NUEVA tabla de RUTAS
      const { data, error } = await supabase
        .from("giras_logistica_rutas")
        .select("*")
        .eq("id_gira", giraId)
        .eq("id_transporte_fisico", transportId)
        .eq(fieldToCheck, event.id) // Solo reglas que apunten a ESTE evento
        .order("prioridad", { ascending: false });

      if (error) throw error;
      setExistingRules(data || []);

      if (type === "down" && event?.id != null) {
        const { data: openG, error: openErr } =
          await listOpenOfrnGrupoRidesAtStop({
            giraId,
            id_transporte_fisico: transportId,
            id_evento: event.id,
            sortedEvents,
            giraGrupos,
          });
        if (openErr) console.error(openErr);
        setOpenGrupoRides(openG || []);
      } else {
        setOpenGrupoRides([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /** Lista local + planilla padre (chips Suben/Bajan / FIMBA logistics). */
  const refreshAfterMutation = async ({ reloadRules = true } = {}) => {
    if (reloadRules) await fetchRules();
    if (typeof onRefresh === "function") {
      await Promise.resolve(onRefresh());
    }
  };

  /** Paradas posteriores (u otras) del vehículo para espejar Grupo ↑ → ↓. */
  const bajadaCandidateStops = useMemo(() => {
    const list = Array.isArray(sortedEvents) ? sortedEvents : [];
    if (!event?.id || list.length === 0) return [];
    const idx = list.findIndex((e) => String(e.id) === String(event.id));
    const after = idx >= 0 ? list.slice(idx + 1) : list;
    return after.filter((e) => String(e.id) !== String(event.id));
  }, [sortedEvents, event?.id]);

  useEffect(() => {
    if (!alsoMirrorBajada) return;
    if (mirrorBajadaEventId) {
      const stillValid = bajadaCandidateStops.some(
        (e) => String(e.id) === String(mirrorBajadaEventId),
      );
      if (stillValid) return;
    }
    if (bajadaCandidateStops[0]?.id != null) {
      setMirrorBajadaEventId(String(bajadaCandidateStops[0].id));
    } else {
      setMirrorBajadaEventId("");
    }
  }, [alsoMirrorBajada, bajadaCandidateStops, mirrorBajadaEventId]);

  const resolveStopLabel = (eventId) => {
    if (eventId == null || eventId === "") return null;
    const fromSeq = (sortedEvents || []).find(
      (e) => String(e.id) === String(eventId),
    );
    if (fromSeq) return formatStopOptionLabel(fromSeq);
    return `Evento #${eventId}`;
  };

  /**
   * Crea/actualiza la ↓ Grupo espejo (mismo vehículo + grupo) sin duplicar
   * si ya existe en esa parada. Reusa auto-admisión de miembros (ausentes
   * no matchean vía grupo_ids en roster).
   */
  const mirrorGrupoBajadaForIds = async (grupoIds, bajadaEventId) => {
    const ids = Array.from(
      new Set((grupoIds || []).map(String).filter(Boolean)),
    );
    const destId = Number(bajadaEventId);
    if (!ids.length || !Number.isFinite(destId)) {
      return { mirrored: 0, error: null };
    }
    let mirrored = 0;
    for (const gid of ids) {
      const res = await upsertOfrnGrupoRutaStop({
        id_gira: giraId,
        id_transporte_fisico: transportId,
        id_grupo: Number(gid),
        id_evento: destId,
        type: "down",
        ensureAdmission: true,
        giraGrupos,
        allowMultiple: allowMulti,
      });
      if (res.error) return { mirrored, error: res.error };
      mirrored += 1;
    }
    return { mirrored, error: null };
  };

  const handleMirrorGrupoBajada = async (rule) => {
    if (!rule || rule.alcance !== "Grupo") return;
    const grupoId = (rule.target_ids || [])[0];
    if (!grupoId) {
      toast.error("La regla de grupo no tiene objetivo.");
      return;
    }
    if (rule.id_evento_bajada != null && rule.id_evento_bajada !== "") {
      toast.info(
        `Ya tiene bajada en ${resolveStopLabel(rule.id_evento_bajada)}.`,
      );
      return;
    }
    const picked =
      rowMirrorEventByRuleId[rule.id] ||
      (bajadaCandidateStops[0] != null
        ? String(bajadaCandidateStops[0].id)
        : "");
    if (!picked) {
      toast.info(
        "No hay paradas posteriores en la secuencia de este vehículo para asignar la bajada.",
      );
      return;
    }
    const busyKey = `rule:${rule.id}`;
    setMirrorBusyKey(busyKey);
    try {
      const res = await mirrorGrupoBajadaForIds([grupoId], picked);
      if (res.error) {
        toast.error(res.error.message || "No se pudo crear la bajada del grupo");
        return;
      }
      await refreshAfterMutation();
      toast.success(
        `Bajada del grupo asignada en ${resolveStopLabel(picked)}.`,
      );
    } finally {
      setMirrorBusyKey(null);
    }
  };

  const handleAddRule = async () => {
    if (newScope !== "General" && (!targetIds || targetIds.length === 0)) {
      toast.message("Seleccioná al menos un objetivo.");
      return;
    }

    setLoading(true);
    try {
      const fieldToUpdate = type === "up" ? "id_evento_subida" : "id_evento_bajada";

      // Antes de crear nuevas reglas de trayecto, verificamos si
      // ya existen otras subidas/bajadas para el mismo alcance/objetivo
      // en este transporte.
      const { data: existingAll, error: fetchRouteError } = await supabase
        .from("giras_logistica_rutas")
        .select("*")
        .eq("id_gira", giraId)
        .eq("id_transporte_fisico", transportId);

      if (fetchRouteError) throw fetchRouteError;

      const selectedIds =
        newScope === "General" ? [null] : Array.from(new Set(targetIds));

      const sameTarget = (r, currentId) => {
        if (r.alcance !== newScope) return false;
        if (newScope === "General") return true;
        if (newScope === "Region")
          return String(r.id_region) === String(currentId);
        if (newScope === "Localidad")
          return String(r.id_localidad) === String(currentId);
        if (newScope === "Persona")
          return String(r.id_integrante) === String(currentId);
        if (newScope === "Categoria")
          return String((r.target_ids || [])[0]) === String(currentId);
        if (newScope === "Grupo")
          return String((r.target_ids || [])[0]) === String(currentId);
        return false;
      };

      let anyChange = false;
      let allowMirrorAfter = false;
      let workingAdmissionRules = [...(transportAdmissionRules || [])];

      for (const currentId of selectedIds) {
        // Extremo a persistir en INSERT (puede voltearse a «adicional» en conflicto).
        let insertType = type;

        // 1) Ya apunta a este evento
        const alreadyHere = (existingAll || []).find(
          (r) =>
            sameTarget(r, currentId) &&
            r[fieldToUpdate] != null &&
            String(r[fieldToUpdate]) === String(event.id),
        );
        // OFRN clásico: noop. FIMBA multi: seguir e INSERT otra fila del mismo alcance.
        if (alreadyHere && !allowMulti) continue;

        // Grupo: incluir miembros en admisión del bus (también al cerrar ride abierto)
        if (newScope === "Grupo" && currentId) {
          const memberIds = integranteIdsInGrupos(giraGrupos, [currentId]);
          let rulesForAdmission = workingAdmissionRules;
          for (const mid of memberIds) {
            const idStr = String(mid);
            const personRow = (passengers || []).find(
              (p) => String(p.id) === idStr,
            );
            if (
              personRow &&
              isPersonVetoedFromTransport(
                personRow,
                transportId,
                rulesForAdmission,
                localities,
              )
            ) {
              continue;
            }
            const alreadyOnBus =
              admittedIds.has(idStr) ||
              (personRow &&
                isPersonAdmittedToTransport(
                  personRow,
                  transportId,
                  rulesForAdmission,
                  localities,
                ));
            if (alreadyOnBus) continue;
            const { data: createdAdm, error: admError } = await supabase
              .from("giras_logistica_admision")
              .insert([
                {
                  id_gira: giraId,
                  id_transporte_fisico: transportId,
                  id_integrante: Number(mid),
                  alcance: "Persona",
                  prioridad: 5,
                  tipo: "INCLUSION",
                },
              ])
              .select("*")
              .maybeSingle();
            if (admError) {
              console.error("Error en auto-inclusión de grupo:", admError.message);
            } else if (createdAdm) {
              rulesForAdmission = [...rulesForAdmission, createdAdm];
              workingAdmissionRules = rulesForAdmission;
              setTransportAdmissionRules(workingAdmissionRules);
              setAdmittedIds((prev) => {
                const next = new Set(prev);
                next.add(idStr);
                return next;
              });
            }
          }
        }

        // 2) Ride abierto / huérfano: mismo alcance+objetivo, este extremo vacío
        //    → UPDATE (cierra el ride). Evita insertar bajada-only que a veces
        //    no se reflejaba bien tras refresh desde el embed FIMBA.
        //    Multi + ↑: siempre INSERT (nueva subida aunque hayan abordado antes).
        //    Multi + ↓ ya en esta parada: INSERT otra ↓ (no reusar huérfano).
        //    Multi + ↓ sin fila aquí: sí cerrar ride abierto del mismo alcance.
        const openRide =
          allowMulti && type === "up"
            ? null
            : allowMulti && alreadyHere && type === "down"
              ? null
              : (existingAll || []).find(
                  (r) =>
                    sameTarget(r, currentId) &&
                    (r[fieldToUpdate] == null || r[fieldToUpdate] === ""),
                );
        if (openRide) {
          const openPatch = { [fieldToUpdate]: event.id };
          if (
            type === "up" &&
            newScope === "Persona" &&
            Boolean(esChofer) !== Boolean(openRide.es_chofer)
          ) {
            openPatch.es_chofer = Boolean(esChofer);
          }
          const { error: updateErr } = await supabase
            .from("giras_logistica_rutas")
            .update(openPatch)
            .eq("id", openRide.id);
          if (updateErr) throw updateErr;
          openRide[fieldToUpdate] = event.id;
          if (openPatch.es_chofer != null) openRide.es_chofer = openPatch.es_chofer;
          anyChange = true;
          if (type === "up") allowMirrorAfter = true;
          continue;
        }

        // 3) Conflicto: mismo alcance ya tiene este extremo en otro evento
        //    Siempre 4-way (OFRN Trayectos + FIMBA Orquesta): no depende de allowMulti.
        const conflict = (existingAll || []).find((r) => {
          if (!sameTarget(r, currentId)) return false;
          const currentEventId = r[fieldToUpdate];
          if (!currentEventId) return false;
          if (String(currentEventId) === String(event.id)) return false;
          return true;
        });

        if (conflict) {
          const actionLabel = type === "up" ? "subida" : "bajada";
          const otherTitle =
            type === "up" ? "Bajada adicional" : "Subida adicional";
          const prevStopLabel =
            resolveStopLabel(conflict[fieldToUpdate]) || "otra parada";

          const choice = await confirm({
            title:
              type === "up" ? "Ya tiene una subida" : "Ya tiene una bajada",
            message:
              `Este alcance ya tiene ${actionLabel} en ${prevStopLabel}.\n\n` +
              `Reemplazar: mueve la ${actionLabel} anterior a esta parada.\n` +
              `Crear nueva ${actionLabel}: agrega otra y mantiene la anterior.\n` +
              `${otherTitle}: agrega una ${type === "up" ? "↓" : "↑"} en esta parada y mantiene la ${actionLabel} anterior.\n` +
              `Cancelar: dejar todo como está.`,
            confirmText: "Reemplazar",
            cancelText: "Cancelar",
            secondaryAction: {
              label:
                type === "up" ? "Crear nueva subida" : "Crear nueva bajada",
              value: "create",
            },
            tertiaryAction: {
              label: otherTitle,
              value: "other",
            },
            overlayClassName: embedded ? "z-[110]" : "z-[100]",
          });

          if (choice === "cancel" || choice === false) {
            continue;
          }

          if (choice === "confirm" || choice === true) {
            const { error: updateErr } = await supabase
              .from("giras_logistica_rutas")
              .update({ [fieldToUpdate]: event.id })
              .eq("id", conflict.id);

            if (updateErr) throw updateErr;
            conflict[fieldToUpdate] = event.id;
            anyChange = true;
            if (type === "up") allowMirrorAfter = true;
            continue;
          }

          if (choice === "other") {
            // Extremo opuesto en esta parada; no mover la fila en conflicto.
            insertType = type === "up" ? "down" : "up";
          }
          // "create" | "other": seguir al INSERT sin mover la fila previa.
        }

        // --- LÓGICA DE AUTO-INCLUSIÓN (por persona) ---
        if (newScope === "Persona" && currentId) {
          const idStr = String(currentId);
          const personRow = (passengers || []).find(
            (p) => String(p.id) === idStr,
          );
          const personName = personRow
            ? `${personRow.apellido || ""}, ${personRow.nombre || ""}`.trim()
            : `ID ${idStr}`;

          let rulesForAdmission = workingAdmissionRules;

          const vetoed =
            personRow &&
            isPersonVetoedFromTransport(
              personRow,
              transportId,
              rulesForAdmission,
              localities,
            );

          if (vetoed) {
            const exclusionRules = getExclusionAdmissionRulesForPerson(
              personRow,
              transportId,
              rulesForAdmission,
              localities,
            );
            const removeVeto = await confirm({
              title: "Persona excluida del transporte",
              message:
                `${personName} fue excluida del transporte.\n\n` +
                "¿Querés que eliminemos esa exclusión para que pueda ser incluida en este transporte?",
              confirmText: "Eliminar exclusión",
              overlayClassName: embedded ? "z-[110]" : "z-[100]",
            });
            if (!removeVeto) {
              continue;
            }

            const exclusionIds = exclusionRules
              .map((r) => r.id)
              .filter(Boolean);
            if (exclusionIds.length > 0) {
              const { error: delExclError } = await supabase
                .from("giras_logistica_admision")
                .delete()
                .in("id", exclusionIds);
              if (delExclError) {
                console.error(
                  "Error eliminando exclusión:",
                  delExclError.message,
                );
                toast.error("No se pudo eliminar la exclusión.");
                continue;
              }
              rulesForAdmission = rulesForAdmission.filter(
                (r) => !exclusionIds.includes(r.id),
              );
              workingAdmissionRules = rulesForAdmission;
              setTransportAdmissionRules(rulesForAdmission);
              toast.success("Exclusión eliminada.");
            }
          }

          const alreadyOnBus =
            admittedIds.has(idStr) ||
            (personRow &&
              isPersonAdmittedToTransport(
                personRow,
                transportId,
                rulesForAdmission,
                localities,
              ));
          if (!alreadyOnBus) {
            const { data: createdAdm, error: admError } = await supabase
              .from("giras_logistica_admision")
              .insert([
                {
                  id_gira: giraId,
                  id_transporte_fisico: transportId,
                  id_integrante: currentId,
                  alcance: "Persona",
                  prioridad: 5,
                  tipo: "INCLUSION",
                },
              ])
              .select("*")
              .maybeSingle();

            if (admError) {
              console.error("Error en auto-inclusión:", admError.message);
            } else {
              if (createdAdm) {
                workingAdmissionRules = [...rulesForAdmission, createdAdm];
                setTransportAdmissionRules(workingAdmissionRules);
              }
              setAdmittedIds((prev) => {
                const next = new Set(prev);
                next.add(idStr);
                return next;
              });
            }
          }
        }

        // --- LÓGICA DE DEFINICIÓN DE PARADA ---
        let priority = 1;
        if (newScope === "Region") priority = 2;
        if (newScope === "Localidad") priority = 3;
        if (newScope === "Categoria" || newScope === "Grupo") priority = 4;
        if (newScope === "Persona") priority = 5;

        const payload = {
          id_gira: giraId,
          id_transporte_fisico: transportId,
          alcance: newScope,
          prioridad: priority,
          id_evento_subida: insertType === "up" ? event.id : null,
          id_evento_bajada: insertType === "down" ? event.id : null,
          id_region: newScope === "Region" ? currentId : null,
          id_localidad: newScope === "Localidad" ? currentId : null,
          id_integrante: newScope === "Persona" ? currentId : null,
          target_ids:
            (newScope === "Categoria" || newScope === "Grupo") && currentId
              ? [String(currentId)]
              : [],
          es_chofer:
            insertType === "up" && newScope === "Persona"
              ? Boolean(esChofer)
              : false,
        };

        const { data: inserted, error } = await supabase
          .from("giras_logistica_rutas")
          .insert([payload])
          .select("*")
          .maybeSingle();
        if (error) throw error;
        if (inserted) existingAll.push(inserted);
        anyChange = true;
        if (insertType === "up") allowMirrorAfter = true;
      }

      if (anyChange) {
        setTargetIds([]);
        setEsChofer(false);
      }

      const shouldMirrorBajada =
        type === "up" &&
        allowMirrorAfter &&
        newScope === "Grupo" &&
        alsoMirrorBajada &&
        mirrorBajadaEventId;

      if (shouldMirrorBajada) {
        const mirrorRes = await mirrorGrupoBajadaForIds(
          selectedIds.filter(Boolean),
          mirrorBajadaEventId,
        );
        if (mirrorRes.error) {
          toast.error(
            mirrorRes.error.message ||
              (anyChange
                ? "Subida creada, pero no se pudo asignar la bajada espejo."
                : "No se pudo asignar la bajada espejo."),
          );
        } else if (mirrorRes.mirrored > 0) {
          toast.success(
            mirrorRes.mirrored === 1
              ? `También se asignó bajada en ${resolveStopLabel(mirrorBajadaEventId)}.`
              : `También se asignaron ${mirrorRes.mirrored} bajadas de grupo en ${resolveStopLabel(mirrorBajadaEventId)}.`,
          );
          setAlsoMirrorBajada(false);
        }
      }

      if (anyChange || shouldMirrorBajada) {
        await refreshAfterMutation();
      }
    } catch (err) {
      console.error(err);
      toast.error("Error al procesar la regla.");
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteRule = async (ruleId) => {
    // Aquí solo "desvinculamos" el evento de la regla, o borramos la regla si solo servía para esto.
    // Para simplificar UX, borramos la regla de la tabla de rutas.
    if (
      !(await confirm({
        title: "Eliminar definición",
        message: "¿Eliminar esta definición de parada?",
        destructive: true,
        confirmText: "Eliminar",
        overlayClassName: embedded ? "z-[110]" : "z-[100]",
      }))
    )
      return;
    try {
      await supabase.from("giras_logistica_rutas").delete().eq("id", ruleId);
      await refreshAfterMutation();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleChofer = async (rule, nextValue) => {
    if (!rule?.id || rule.alcance !== "Persona") return;
    const next = Boolean(nextValue);
    if (Boolean(rule.es_chofer) === next) return;
    setChoferBusyId(rule.id);
    try {
      const { error } = await supabase
        .from("giras_logistica_rutas")
        .update({ es_chofer: next })
        .eq("id", rule.id);
      if (error) throw error;
      setExistingRules((prev) =>
        (prev || []).map((r) =>
          String(r.id) === String(rule.id) ? { ...r, es_chofer: next } : r,
        ),
      );
      await refreshAfterMutation({ reloadRules: false });
    } catch (err) {
      console.error(err);
      toast.error("No se pudo actualizar el flag de chofer");
    } finally {
      setChoferBusyId(null);
    }
  };

  const handleAutoCreateMissingAdmissionRule = async () => {
    try {
      const pending = (existingRules || []).filter((r) => {
        if (
          r.alcance !== "Localidad" &&
          r.alcance !== "Region" &&
          !(r.alcance === "Persona" && r.id_integrante)
        ) {
          return false;
        }
        return !getRouteRuleAdmissionCoverage(r).satisfied;
      });

      if (pending.length === 0) {
        toast.info("No hay admisiones pendientes para esta parada.");
        return;
      }

      let workingRules = [...(transportAdmissionRules || [])];
      const vetoedPersonaPending = [];
      const needInclusion = [];

      for (const r of pending) {
        if (r.alcance === "Persona" && r.id_integrante) {
          const person = (passengers || []).find(
            (p) => String(p.id) === String(r.id_integrante),
          );
          if (
            person &&
            isPersonVetoedFromTransport(
              person,
              transportId,
              workingRules,
              localities,
            )
          ) {
            vetoedPersonaPending.push({ rule: r, person });
            continue;
          }
        }
        needInclusion.push(r);
      }

      if (vetoedPersonaPending.length > 0) {
        const lines = vetoedPersonaPending
          .map(({ rule }) => `• ${resolveTargetName(rule)}`)
          .join("\n");
        const removeVeto = await confirm({
          title: "Personas excluidas del transporte",
          message:
            (vetoedPersonaPending.length === 1
              ? "Esta persona fue excluida del transporte.\n\n"
              : "Estas personas fueron excluidas del transporte.\n\n") +
            `${lines}\n\n` +
            "¿Querés que eliminemos esa exclusión para que puedan ser incluidas en este transporte?",
          confirmText:
            vetoedPersonaPending.length === 1
              ? "Eliminar exclusión"
              : "Eliminar exclusiones",
          overlayClassName: embedded ? "z-[110]" : "z-[100]",
        });
        if (!removeVeto) {
          // Si cancelan el veto, no creamos inclusión inútil encima del veto
          if (needInclusion.length === 0) return;
        } else {
          setLoading(true);
          const exclusionIds = [];
          for (const { person } of vetoedPersonaPending) {
            getExclusionAdmissionRulesForPerson(
              person,
              transportId,
              workingRules,
              localities,
            ).forEach((ex) => {
              if (ex.id != null) exclusionIds.push(ex.id);
            });
          }
          const uniqueIds = [...new Set(exclusionIds)];
          if (uniqueIds.length > 0) {
            const { error: delExclError } = await supabase
              .from("giras_logistica_admision")
              .delete()
              .in("id", uniqueIds);
            if (delExclError) throw delExclError;
            workingRules = workingRules.filter(
              (r) => !uniqueIds.includes(r.id),
            );
            setTransportAdmissionRules(workingRules);
            toast.success(
              uniqueIds.length === 1
                ? "Exclusión eliminada."
                : "Exclusiones eliminadas.",
            );
          }

          // Tras quitar veto, si aún no quedan admitidos, crear inclusión Persona
          for (const { rule, person } of vetoedPersonaPending) {
            const stillAdmitted = isPersonAdmittedToTransport(
              person,
              transportId,
              workingRules,
              localities,
            );
            if (!stillAdmitted) {
              needInclusion.push(rule);
            }
          }
        }
      }

      if (needInclusion.length === 0) {
        await refreshAfterMutation({ reloadRules: false });
        return;
      }

      const lines = needInclusion
        .map((r) => `• ${r.alcance} — ${resolveTargetName(r)}`)
        .join("\n");

      const confirmed = await confirm({
        title: "Crear admisiones",
        message:
          `Se crearán ${needInclusion.length} regla(s) de ADMISIÓN para este transporte:\n\n${lines}\n\n` +
          "¿Deseás continuar?",
        confirmText: "Crear",
        overlayClassName: embedded ? "z-[110]" : "z-[100]",
      });
      if (!confirmed) {
        await refreshAfterMutation({ reloadRules: false });
        return;
      }

      setLoading(true);

      const payloads = needInclusion.map((r) => {
        const scope = r.alcance;
        return {
          id_gira: giraId,
          id_transporte_fisico: transportId,
          alcance: scope,
          prioridad: scope === "Persona" ? 5 : scope === "Region" ? 2 : 3,
          tipo: "INCLUSION",
          id_localidad: scope === "Localidad" ? r.id_localidad : null,
          id_region: scope === "Region" ? r.id_region : null,
          id_integrante: scope === "Persona" ? r.id_integrante : null,
        };
      });

      const { data: created, error } = await supabase
        .from("giras_logistica_admision")
        .insert(payloads)
        .select();

      if (error) throw error;

      setTransportAdmissionRules((prev) => [...prev, ...(created || [])]);
      setRecentlyCreatedAdmissionKeys(
        new Set(
          needInclusion.map((r) => routeRuleAdmissionKey(r)).filter(Boolean),
        ),
      );

      await refreshAfterMutation({ reloadRules: false });

      toast.success(
        created?.length === 1
          ? "Se creó 1 regla de admisión."
          : `Se crearon ${created?.length || needInclusion.length} reglas de admisión.`,
      );
    } catch (e) {
      console.error("Error en creación automática de regla de admisión:", e);
      toast.error(
        "No se pudo crear automáticamente la regla de admisión.",
      );
    } finally {
      setLoading(false);
    }
  };

  const resolveTargetName = (rule) => {
    if (rule.alcance === "General") return "Todos";

    if (rule.alcance === "Region") {
      const reg = regions.find(
        (r) => String(r.id) === String(rule.id_region),
      );
      return reg ? reg.region : "Región";
    }

    if (rule.alcance === "Localidad") {
      const loc = localities.find(
        (l) => String(l.id) === String(rule.id_localidad),
      );
      return loc ? loc.localidad : "Localidad";
    }

    if (rule.alcance === "Persona") {
      const p = (passengers || []).find(
        (m) => String(m.id) === String(rule.id_integrante),
      );
      return p ? `${p.apellido}, ${p.nombre}` : "Persona";
    }

    if (rule.alcance === "Categoria") {
      const raw = rule.target_ids?.[0];
      if (!raw) return "Categoría";
      const opt = CATEGORIA_LOGISTICA_OPTIONS.find((c) => c.id === raw);
      return opt ? opt.label : raw;
    }

    if (rule.alcance === "Grupo") {
      const raw = rule.target_ids?.[0];
      if (!raw) return "Grupo";
      const g = (giraGrupos || []).find((x) => String(x.id) === String(raw));
      return g?.nombre || `Grupo #${raw}`;
    }

    return "-";
  };

  // Helper para calcular afectados en tiempo real, respetando prioridad de reglas
  const getPriorityFromScope = (scope) => {
    switch (scope) {
      case "Persona":
        return 5;
      case "Categoria":
      case "Grupo":
        return 4;
      case "Localidad":
        return 3;
      case "Region":
        return 2;
      case "General":
      default:
        return 1;
    }
  };

  const getAffectedPeople = (rule) => {
    if (!passengers) return [];

    const scopeNorm = normalize(rule.alcance);
    const fieldKey = type === "up" ? "subidaId" : "bajadaId";
    const scopeKey = type === "up" ? "subidaScope" : "bajadaScope";

    return passengers.filter((p) => {
      if (
        isPersonVetoedFromTransport(
          p,
          transportId,
          admissionRules,
          localities,
        )
      ) {
        return false;
      }

      const tr = p.logistics?.transports?.find(
        (t) => String(t.id) === String(transportId),
      );
      if (!tr) return false;

      // Debe corresponder a este evento
      if (String(tr[fieldKey]) !== String(event.id)) return false;

      const winningScope = tr[scopeKey] || "";
      // Solo mostramos a la persona en la regla cuyo alcance
      // coincide con el alcance efectivo del trayecto...
      if (normalize(winningScope) !== scopeNorm) return false;

      // ...y además, para alcances por territorio/categoría,
      // validamos que pertenezca al objetivo específico de la regla.
      if (rule.alcance === "Localidad" && rule.id_localidad) {
        const pLocId =
          p.id_localidad_residencia ||
          p.localidades_residencia?.id ||
          p._loc_residencia?.id ||
          "";
        return String(pLocId) === String(rule.id_localidad);
      }

      if (rule.alcance === "Region" && rule.id_region) {
        const pRegId =
          p.id_region_residencia ||
          p.localidades_residencia?.id_region ||
          p.localidades_residencia?.regiones?.id ||
          p._loc_residencia?.id_region ||
          p._loc_residencia?.regiones?.id ||
          "";
        return String(pRegId) === String(rule.id_region);
      }

      if (rule.alcance === "Persona" && rule.id_integrante) {
        return String(p.id) === String(rule.id_integrante);
      }

      if (rule.alcance === "Categoria" && (rule.target_ids || []).length > 0) {
        return (
          normalize(getCategoriaLogistica(p)) ===
          normalize(rule.target_ids[0])
        );
      }

      if (rule.alcance === "Grupo" && (rule.target_ids || []).length > 0) {
        const want = new Set((rule.target_ids || []).map(String));
        const fromPerson = (p.grupo_ids || []).map(String);
        if (fromPerson.some((gid) => want.has(gid))) return true;
        return integranteIdsInGrupos(giraGrupos, [...want]).includes(
          String(p.id),
        );
      }

      // General u otros casos: ya alcanza con el scope ganador.
      return true;
    });
  };

  /** Pasajeros del bus cuya loc. de viáticos coincide con la regla (≠ residencia). */
  const getInferredPeople = (rule) => {
    if (!passengers || rule.alcance !== "Localidad") return [];

    const actualIds = new Set(
      getAffectedPeople(rule).map((p) => String(p.id)),
    );

    return passengers.filter((p) => {
      if (actualIds.has(String(p.id))) return false;
      if (!viaticosDiffersFromResidencia(p)) return false;
      if (
        isPersonVetoedFromTransport(
          p,
          transportId,
          admissionRules,
          localities,
        )
      ) {
        return false;
      }
      const tr = p.logistics?.transports?.find(
        (t) => String(t.id) === String(transportId),
      );
      if (!tr) return false;
      return matchesRule(
        rule,
        personWithViaticosAsResidence(p),
        localities,
      );
    });
  };

  const missingAdmissionRules = useMemo(() => {
    if (!existingRules || existingRules.length === 0) return [];

    return (existingRules || []).filter((r) => {
      if (
        r.alcance !== "Localidad" &&
        r.alcance !== "Region" &&
        !(r.alcance === "Persona" && r.id_integrante)
      ) {
        return false;
      }
      return !getRouteRuleAdmissionCoverage(r).satisfied;
    });
  }, [
    existingRules,
    transportAdmissionRules,
    admissionRules,
    passengers,
    transportId,
    localities,
  ]);

  const groupedRules = useMemo(() => {
    if (!existingRules || existingRules.length === 0) return [];

    const map = {};

    existingRules.forEach((rule) => {
      const key = `${rule.prioridad}|${rule.alcance}`;
      if (!map[key]) {
        map[key] = {
          prioridad: rule.prioridad,
          alcance: rule.alcance,
          rules: [],
        };
      }
      map[key].rules.push(rule);
    });

    const groups = Object.values(map);

    groups.forEach((group) => {
      group.rules.sort((a, b) =>
        resolveTargetName(a).localeCompare(resolveTargetName(b), "es", {
          sensitivity: "base",
        }),
      );
    });

    groups.sort((a, b) => {
      if (b.prioridad !== a.prioridad) return b.prioridad - a.prioridad;
      return a.alcance.localeCompare(b.alcance);
    });

    return groups;
  }, [existingRules, regions, localities, passengers, giraGrupos]);

  const regionOptions = useMemo(
    () =>
      (regions || []).map((r) => ({
        id: String(r.id),
        label: r.region,
      })),
    [regions],
  );

  const localityOptions = useMemo(
    () =>
      (localities || []).map((l) => ({
        id: String(l.id),
        label: l.localidad,
      })),
    [localities],
  );

  const categoryOptions = useMemo(() => CATEGORIA_LOGISTICA_OPTIONS, []);

  const grupoOptions = useMemo(
    () =>
      (giraGrupos || []).map((g) => {
        const n = (g.giras_grupos_integrantes || []).length;
        return {
          id: String(g.id),
          label: n > 0 ? `${g.nombre} (${n})` : g.nombre || `Grupo #${g.id}`,
        };
      }),
    [giraGrupos],
  );

  const personOptions = useMemo(() => {
    const list = (passengers || []).slice();
    const fieldKey = type === "up" ? "subidaId" : "bajadaId";
    const eventId = event?.id;

    // En bajadas, primero quienes están a bordo sin bajada aquí,
    // luego quienes ya bajan aquí, luego el resto.
    if (type === "down") {
      const aboardIds = new Set(
        listOfrnPeopleAboardAtStop({
          passengers,
          transportId,
          eventId,
          sortedEvents,
          routeRules,
          localities,
          expandAllHops: allowMulti,
        })
          .filter((r) => r.openRide)
          .map((r) => String(r.id)),
      );
      list.sort((a, b) => {
        const aAboard = aboardIds.has(String(a.id));
        const bAboard = aboardIds.has(String(b.id));
        if (aAboard !== bAboard) return aAboard ? -1 : 1;

        const trA = a.logistics?.transports?.find(
          (t) => String(t.id) === String(transportId),
        );
        const trB = b.logistics?.transports?.find(
          (t) => String(t.id) === String(transportId),
        );
        const aHasDrop = Boolean(trA?.bajadaId);
        const bHasDrop = Boolean(trB?.bajadaId);

        if (aHasDrop !== bHasDrop) {
          return Number(aHasDrop) - Number(bHasDrop);
        }

        return (a.apellido || "").localeCompare(b.apellido || "");
      });
    } else {
      list.sort((a, b) => (a.apellido || "").localeCompare(b.apellido || ""));
    }

    return list.map((p) => {
      const idStr = String(p.id);
      const inBus =
        admittedIds.has(idStr) ||
        isPersonAdmittedToTransport(
          p,
          transportId,
          transportAdmissionRules,
          localities,
        );
      const tr = p.logistics?.transports?.find(
        (t) => String(t.id) === String(transportId),
      );

      const assignedStopId = tr ? tr[fieldKey] : null;
      const hasAnyStop = inBus && Boolean(assignedStopId);
      const hasAnotherStop =
        inBus &&
        hasAnyStop &&
        eventId != null &&
        String(assignedStopId) !== String(eventId);
      const isThisStop =
        inBus &&
        hasAnyStop &&
        eventId != null &&
        String(assignedStopId) === String(eventId);

      const loc = p.localidades?.localidad || "";
      const label = loc
        ? `${p.apellido}, ${p.nombre} (${loc})`
        : `${p.apellido}, ${p.nombre}`;

      if (!inBus) {
        return {
          id: idStr,
          label,
          subLabel: "Se incluirá al bus",
          optionClassName: "bg-amber-50",
          labelClassName: "text-amber-700",
          subLabelClassName: "text-[10px] text-amber-600",
        };
      }

      if (type === "down" && tr?.subidaId && !tr?.bajadaId) {
        return {
          id: idStr,
          label,
          subLabel: "A bordo (sin bajada)",
          optionClassName: "bg-rose-50",
          labelClassName: "text-rose-800",
          subLabelClassName: "text-[10px] text-rose-600",
        };
      }

      if (hasAnotherStop) {
        return {
          id: idStr,
          label,
          subLabel: allowMulti
            ? "Ya tiene otra parada (se preguntará)"
            : "Ya tiene otra parada",
          optionClassName: "bg-cyan-50",
          labelClassName: "text-cyan-700",
          subLabelClassName: "text-[10px] text-cyan-600",
        };
      }

      const subLabel = isThisStop
        ? allowMulti
          ? "Ya está en esta parada (se agregará otra)"
          : "Ya está asignado a esta parada"
        : "Sin parada aún";

      return {
        id: idStr,
        label,
        subLabel,
        optionClassName: "bg-emerald-50",
        labelClassName: "text-emerald-700",
        subLabelClassName: "text-[10px] text-emerald-600",
      };
    });
  }, [
    passengers,
    admittedIds,
    type,
    transportId,
    event?.id,
    sortedEvents,
    transportAdmissionRules,
    localities,
    allowMulti,
  ]);

  const hasNewPersonToAutoInclude =
    newScope === "Persona" &&
    targetIds.some((id) => !admittedIds.has(String(id)));

  const aboardAtStop = useMemo(() => {
    if (type !== "down" || !event?.id || !transportId) return [];
    return listOfrnPeopleAboardAtStop({
      passengers,
      transportId,
      eventId: event.id,
      sortedEvents,
      routeRules,
      localities,
      expandAllHops: allowMulti,
    });
  }, [
    type,
    event?.id,
    transportId,
    passengers,
    sortedEvents,
    routeRules,
    localities,
    allowMulti,
  ]);

  const aboardOpen = useMemo(
    () => aboardAtStop.filter((r) => r.openRide && !r.alreadyAlightingHere),
    [aboardAtStop],
  );

  const openGrupoMemberIds = useMemo(() => {
    const s = new Set();
    (openGrupoRides || []).forEach((g) => {
      (g.memberIds || []).forEach((id) => s.add(String(id)));
    });
    return s;
  }, [openGrupoRides]);

  const aboardSeats = useMemo(
    () => aboardAtStop.reduce((s, r) => s + (Number(r.seats) || 0), 0),
    [aboardAtStop],
  );

  const handleQuickAlightPerson = async (integranteId) => {
    if (!giraId || !transportId || !event?.id) return;
    setQuickAlightBusyId(String(integranteId));
    try {
      const res = await alightOfrnPeopleAtStop({
        giraId,
        id_transporte_fisico: transportId,
        id_evento: event.id,
        integranteIds: [integranteId],
        allowMultiple: allowMulti,
      });
      if (res.error) {
        toast.error(res.error.message || "No se pudo bajar");
        return;
      }
      await refreshAfterMutation();
      toast.success("Bajada asignada");
    } finally {
      setQuickAlightBusyId(null);
    }
  };

  const handleAlightOpenGrupo = async (row) => {
    if (!giraId || !transportId || !event?.id || !row?.grupoId) return;
    const busyKey = `open-grupo:${row.rule?.id || row.grupoId}`;
    setMirrorBusyKey(busyKey);
    try {
      const res = await alightOfrnGrupoAtStop({
        giraId,
        id_transporte_fisico: transportId,
        id_grupo: row.grupoId,
        id_evento: event.id,
        giraGrupos,
        allowMultiple: allowMulti,
      });
      if (res.error) {
        toast.error(res.error.message || "No se pudo bajar el grupo");
        return;
      }
      await refreshAfterMutation();
      toast.success(`Bajada del grupo «${row.label}» asignada aquí.`);
    } finally {
      setMirrorBusyKey(null);
    }
  };

  const handleBajarTodoOfrn = async () => {
    if (!giraId || !transportId || !event?.id) return;
    const hasOpenGrupos = (openGrupoRides || []).length > 0;
    if (aboardOpen.length === 0 && !hasOpenGrupos) {
      toast.info("Nadie con ride abierto a bordo en esta parada.");
      return;
    }
    const seats = aboardOpen.reduce((s, r) => s + (Number(r.seats) || 0), 0);
    const grupoNames = (openGrupoRides || []).map((g) => g.label).filter(Boolean);
    const ok = await confirm({
      title: "Bajar todo (orquesta)",
      message:
        (hasOpenGrupos
          ? `Se cerrarán ${openGrupoRides.length} regla(s) de alcance Grupo` +
            (grupoNames.length
              ? ` (${grupoNames.join(", ")})`
              : "") +
            ` en esta parada` +
            (aboardOpen.length
              ? `; el resto de personas a bordo se baja como Persona`
              : "") +
            `.\n\n`
          : `¿Bajar a las ${aboardOpen.length} persona(s) a bordo de este vehículo ` +
            `en esta parada (${seats} asiento${seats === 1 ? "" : "s"})?\n\n` +
            `Se crearán/actualizarán reglas Persona en giras_logistica_rutas.\n\n`) +
        (hasOpenGrupos
          ? `Personas listadas a bordo: ${aboardOpen.length} · ${seats} asiento${seats === 1 ? "" : "s"}.`
          : ""),
      confirmText: "Bajar todo",
      overlayClassName: embedded ? "z-[110]" : "z-[100]",
    });
    if (!ok) return;
    setBajarTodoBusy(true);
    try {
      const res = await alightAllOfrnAboardAtStop({
        giraId,
        id_transporte_fisico: transportId,
        id_evento: event.id,
        passengers,
        sortedEvents,
        giraGrupos,
        allowMultiple: allowMulti,
        preferGrupo: true,
        routeRules,
        localities,
        expandAllHops: allowMulti,
      });
      if (res.error) {
        toast.error(res.error.message || "No se pudo bajar todo");
        return;
      }
      await refreshAfterMutation();
      const g = res.gruposClosed || 0;
      const p = res.personasClosed || 0;
      if (g > 0 && p > 0) {
        toast.success(
          `Se bajaron ${g} grupo${g === 1 ? "" : "s"} y ${p} persona${p === 1 ? "" : "s"}`,
        );
      } else if (g > 0) {
        toast.success(
          g === 1 ? "Se bajó 1 grupo" : `Se bajaron ${g} grupos`,
        );
      } else {
        toast.success(
          res.closed === 1
            ? "Se bajó 1 persona"
            : `Se bajaron ${res.closed} personas`,
        );
      }
    } finally {
      setBajarTodoBusy(false);
    }
  };

  if (!isOpen || !event) return null;

  const rulesBody = (
          <>
          {type === "down" && (
            <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider m-0 flex items-center gap-1.5">
                    <IconUsers size={14} /> A bordo en esta parada
                  </h4>
                  <p className="text-[11px] text-rose-700/80 m-0 mt-0.5">
                    {aboardAtStop.length === 0 && openGrupoRides.length === 0
                      ? "Nadie de orquesta figura a bordo aquí."
                      : `${aboardAtStop.length} persona${aboardAtStop.length === 1 ? "" : "s"} · ${aboardSeats} asiento${aboardSeats === 1 ? "" : "s"} (derivado de subida/bajada)`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleBajarTodoOfrn}
                  disabled={
                    bajarTodoBusy ||
                    loading ||
                    (aboardOpen.length === 0 && openGrupoRides.length === 0)
                  }
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 shadow-sm"
                  title="Cierra primero rides Grupo abiertos; el resto como Persona"
                >
                  {bajarTodoBusy ? (
                    <IconLoader size={12} className="animate-spin" />
                  ) : (
                    <IconArrowDown size={12} />
                  )}
                  Bajar todo
                </button>
              </div>

              {openGrupoRides.length > 0 && (
                <div className="rounded border border-rose-200 bg-white/90 p-2 space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-rose-800 m-0">
                    Grupos a bordo (sin bajada)
                  </p>
                  <p className="text-[10px] text-rose-700/80 m-0">
                    Subieron como alcance Grupo — bajá el grupo entero (no
                    persona por persona).
                  </p>
                  <ul className="m-0 p-0 list-none divide-y divide-rose-100">
                    {openGrupoRides.map((row) => {
                      const busyKey = `open-grupo:${row.rule?.id || row.grupoId}`;
                      return (
                        <li
                          key={String(row.rule?.id || row.grupoId)}
                          className="flex items-center justify-between gap-2 py-1.5 text-xs"
                        >
                          <span className="text-slate-700 truncate">
                            <span className="font-semibold">{row.label}</span>
                            <span className="text-slate-400 ml-1">
                              · {row.memberCount} integrante
                              {row.memberCount === 1 ? "" : "s"}
                            </span>
                          </span>
                          <button
                            type="button"
                            disabled={
                              loading || mirrorBusyKey === busyKey || bajarTodoBusy
                            }
                            onClick={() => handleAlightOpenGrupo(row)}
                            className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50"
                            title="Crear bajada alcance Grupo en esta parada"
                          >
                            {mirrorBusyKey === busyKey ? "…" : "Bajar grupo"}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {aboardAtStop.length > 0 && (
                <ul className="max-h-40 overflow-y-auto divide-y divide-rose-100 bg-white/80 rounded border border-rose-100 m-0 p-0 list-none">
                  {aboardAtStop.map((row) => {
                    const coveredByGrupo = openGrupoMemberIds.has(String(row.id));
                    return (
                    <li
                      key={String(row.id)}
                      className="flex items-center justify-between gap-2 px-2 py-1.5 text-xs"
                    >
                      <span className="text-slate-700 truncate">
                        {row.label}
                        <span className="text-slate-400 ml-1">
                          · {row.seats} asiento{row.seats === 1 ? "" : "s"}
                        </span>
                        {row.es_chofer ? (
                          <span className="ml-1 inline-flex items-center px-1 py-0 rounded text-[9px] font-bold uppercase tracking-wide text-slate-600 bg-slate-200">
                            Chofer
                          </span>
                        ) : null}
                        {coveredByGrupo ? (
                          <span className="ml-1 text-[10px] font-semibold text-violet-700">
                            (vía grupo)
                          </span>
                        ) : null}
                        {row.alreadyAlightingHere ? (
                          <span className="ml-1 text-[10px] font-semibold text-rose-600">
                            (ya baja aquí)
                          </span>
                        ) : null}
                      </span>
                      {row.openRide && !row.alreadyAlightingHere ? (
                        coveredByGrupo ? (
                          <span
                            className="text-[10px] text-violet-600 shrink-0 font-semibold"
                            title="Usá «Bajar grupo» arriba para no crear N reglas Persona"
                          >
                            Ver grupo
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={
                              quickAlightBusyId === String(row.id) || loading
                            }
                            onClick={() => handleQuickAlightPerson(row.id)}
                            className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold text-rose-700 bg-rose-100 hover:bg-rose-200 disabled:opacity-50"
                          >
                            {quickAlightBusyId === String(row.id)
                              ? "…"
                              : "Bajar"}
                          </button>
                        )
                      ) : (
                        <span className="text-[10px] text-slate-400 shrink-0">
                          OK
                        </span>
                      )}
                    </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {/* 1. Lista de Reglas Existentes */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Reglas Activas
            </h4>

            {existingRules.length === 0 && (
              <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-lg">
                <span className="text-sm text-slate-400">
                  Nadie tiene asignada esta parada aún.
                </span>
              </div>
            )}

            {existingRules.length > 0 && (
              <div className="space-y-3">
                {groupedRules.map((group) => (
                  <div
                    key={`${group.prioridad}-${group.alcance}`}
                    className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden transition-all"
                  >
                    <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                          {getScopeLabel(group.alcance)}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getPriorityColor(group.prioridad)}`}
                        >
                          Prio {group.prioridad}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {group.rules.length}{" "}
                        {group.rules.length === 1 ? "regla" : "reglas"}
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {group.rules.map((rule) => {
                        const isPersonaRule = rule.alcance === "Persona";
                        const isGrupoRule = rule.alcance === "Grupo";
                        const grupoNeedsBajadaMirror =
                          type === "up" &&
                          isGrupoRule &&
                          (rule.id_evento_bajada == null ||
                            rule.id_evento_bajada === "");
                        const grupoBajadaLabel =
                          type === "up" &&
                          isGrupoRule &&
                          rule.id_evento_bajada != null &&
                          rule.id_evento_bajada !== ""
                            ? resolveStopLabel(rule.id_evento_bajada)
                            : null;
                        const rowMirrorValue =
                          rowMirrorEventByRuleId[rule.id] ||
                          (bajadaCandidateStops[0] != null
                            ? String(bajadaCandidateStops[0].id)
                            : "");
                        const affectedPeople = getAffectedPeople(rule);
                        const inferredPeople = getInferredPeople(rule);
                        const isExpanded = expandedRuleId === rule.id;
                        const displayCount = affectedPeople.length;
                        const inferredCount = inferredPeople.length;
                        const instrumentSeats =
                          countInstrumentSeats(affectedPeople);
                        const personForRule = isPersonaRule
                          ? (passengers || []).find(
                              (m) =>
                                String(m.id) === String(rule.id_integrante),
                            )
                          : null;
                        const personInstAbrev =
                          getPlazaExtraAbreviatura(personForRule) ||
                          (isPersonaRule
                            ? getPlazaExtraAbreviatura(affectedPeople[0])
                            : null);
                        const admissionCoverage =
                          getRouteRuleAdmissionCoverage(rule);
                        const admissionReady = admissionCoverage.satisfied;
                        const admissionJustCreated = recentlyCreatedAdmissionKeys.has(
                          routeRuleAdmissionKey(rule),
                        );
                        const occupancyLabel = formatStopRuleOccupancy(
                          displayCount,
                          inferredCount,
                          instrumentSeats,
                        );
                        const occupancyTitle =
                          inferredCount > 0 && displayCount > 0
                            ? instrumentSeats > 0
                              ? `${displayCount} personas + ${instrumentSeats} ins y ${inferredCount} inf. (loc. viáticos ≠ residencia)`
                              : `${displayCount} personas y ${inferredCount} inf. (loc. viáticos ≠ residencia)`
                            : inferredCount > 0
                              ? `${inferredCount} inf. (loc. viáticos ≠ residencia)`
                              : instrumentSeats > 0
                                ? `${displayCount} personas + ${instrumentSeats} instrumentos (plaza extra) = ${displayCount + instrumentSeats} butacas`
                                : `${displayCount} personas`;

                        return (
                          <div key={rule.id} className="flex flex-col">
                            <div
                              className={`px-3 py-2 flex justify-between items-center hover:bg-slate-50 ${
                                isPersonaRule ? "" : "cursor-pointer"
                              } ${admissionJustCreated ? "bg-emerald-50/80" : ""}`}
                              onClick={() => {
                                if (isPersonaRule) return;
                                setExpandedRuleId(isExpanded ? null : rule.id);
                              }}
                            >
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-semibold text-slate-700 truncate flex items-center gap-1.5">
                                  <span className="truncate">
                                    {resolveTargetName(rule)}
                                  </span>
                                  {personInstAbrev ? (
                                    <span className="ml-0 font-bold text-indigo-600 shrink-0">
                                      +{personInstAbrev}
                                    </span>
                                  ) : null}
                                  {rule.es_chofer ? (
                                    <span
                                      className="shrink-0 inline-flex items-center px-1 py-0 rounded text-[9px] font-bold uppercase tracking-wide text-slate-600 bg-slate-200"
                                      title="Esta subida/trayecto: a bordo sin consumir cupo (no es un rol permanente de la persona)"
                                    >
                                      Chofer
                                    </span>
                                  ) : null}
                                </span>
                                {admissionReady &&
                                  admissionCoverage.viaLabel &&
                                  !admissionCoverage.sameScope && (
                                    <span className="text-[10px] text-emerald-600 truncate">
                                      {admissionCoverage.viaLabel}
                                    </span>
                                  )}
                                {isPersonaRule && type === "up" ? (
                                  <label
                                    className="mt-1 inline-flex items-center gap-1.5 text-[10px] text-slate-600 cursor-pointer select-none w-fit"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <input
                                      type="checkbox"
                                      className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-500"
                                      checked={Boolean(rule.es_chofer)}
                                      disabled={
                                        loading ||
                                        choferBusyId === rule.id
                                      }
                                      onChange={(e) =>
                                        handleToggleChofer(
                                          rule,
                                          e.target.checked,
                                        )
                                      }
                                    />
                                    <span>
                                      <span className="font-semibold">
                                        Es chofer
                                      </span>
                                      <span className="text-slate-400">
                                        {" "}
                                        en esta subida
                                      </span>
                                    </span>
                                  </label>
                                ) : null}
                                {grupoBajadaLabel ? (
                                  <span className="mt-0.5 text-[10px] text-rose-600 truncate">
                                    Baja en {grupoBajadaLabel}
                                  </span>
                                ) : null}
                                {grupoNeedsBajadaMirror ? (
                                  <div
                                    className="mt-1.5 flex flex-wrap items-center gap-1.5"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {bajadaCandidateStops.length === 0 ? (
                                      <span className="text-[10px] text-amber-700">
                                        Sin paradas posteriores para espejar
                                        bajada.
                                      </span>
                                    ) : (
                                      <>
                                        <select
                                          className="text-[10px] border border-rose-200 rounded px-1.5 py-1 bg-white text-slate-700 max-w-[11rem]"
                                          value={rowMirrorValue}
                                          disabled={
                                            loading ||
                                            mirrorBusyKey === `rule:${rule.id}`
                                          }
                                          onChange={(e) =>
                                            setRowMirrorEventByRuleId(
                                              (prev) => ({
                                                ...prev,
                                                [rule.id]: e.target.value,
                                              }),
                                            )
                                          }
                                          title="Parada donde crear la misma regla de grupo en bajada"
                                        >
                                          {bajadaCandidateStops.map((ev) => (
                                            <option key={ev.id} value={ev.id}>
                                              {formatStopOptionLabel(ev)}
                                            </option>
                                          ))}
                                        </select>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleMirrorGrupoBajada(rule)
                                          }
                                          disabled={
                                            loading ||
                                            !rowMirrorValue ||
                                            mirrorBusyKey === `rule:${rule.id}`
                                          }
                                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50"
                                          title="Crear la misma regla de grupo en bajada (si aún no existe)"
                                        >
                                          {mirrorBusyKey ===
                                          `rule:${rule.id}` ? (
                                            <IconLoader
                                              size={11}
                                              className="animate-spin"
                                            />
                                          ) : (
                                            <IconArrowDown size={11} />
                                          )}
                                          Crear bajada
                                        </button>
                                      </>
                                    )}
                                  </div>
                                ) : null}
                              </div>
                              <div className="flex items-center gap-2">
                                {admissionReady &&
                                  displayCount === 0 &&
                                  inferredCount === 0 && (
                                  <span
                                    className="text-[10px] font-bold flex items-center gap-1 px-2 py-0.5 rounded-full text-emerald-700 bg-emerald-100"
                                    title={
                                      admissionCoverage.viaLabel
                                        ? `Ya incluido: ${admissionCoverage.viaLabel}`
                                        : "Admisión creada; los pasajeros aparecerán al actualizar la logística"
                                    }
                                  >
                                    <IconCheck size={12} />{" "}
                                    {admissionCoverage.sameScope
                                      ? "Admisión"
                                      : "Incluido"}
                                  </span>
                                )}
                                <span
                                  title={occupancyTitle}
                                  className={`text-[10px] font-bold flex items-center gap-1 px-2 py-0.5 rounded-full ${
                                    displayCount === 0 &&
                                    inferredCount === 0 &&
                                    !admissionReady
                                      ? "text-amber-700 bg-amber-100"
                                      : inferredCount > 0 && displayCount === 0
                                        ? "text-sky-800 bg-sky-100"
                                        : inferredCount > 0
                                          ? "text-sky-800 bg-sky-50"
                                          : "text-slate-400 bg-slate-100"
                                  }`}
                                >
                                  <IconUsers size={12} /> {occupancyLabel}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteRule(rule.id);
                                  }}
                                  className="text-slate-300 hover:text-red-500 p-1"
                                >
                                  <IconTrash size={14} />
                                </button>
                            {!isPersonaRule && (
                              <button
                                type="button"
                                className="text-slate-400"
                              >
                                {isExpanded ? (
                                  <IconChevronUp size={14} />
                                ) : (
                                  <IconChevronDown size={14} />
                                )}
                              </button>
                            )}
                              </div>
                            </div>

                            {!isPersonaRule && isExpanded && (
                              <div className="bg-slate-50 border-t border-slate-100 px-3 py-2 animate-in slide-in-from-top-2">
                                {affectedPeople.length > 0 ||
                                inferredPeople.length > 0 ? (
                                  <ul className="grid grid-cols-2 gap-2">
                                    {affectedPeople.map((p) => {
                                      const instAbrev =
                                        getPlazaExtraAbreviatura(p);
                                      return (
                                      <li
                                        key={p.id}
                                        className="text-xs text-slate-600 flex items-center gap-2 min-w-0"
                                      >
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0"></div>
                                        <span className="truncate">
                                          {p.apellido}, {p.nombre}
                                          {instAbrev ? (
                                            <span className="ml-1 font-semibold text-indigo-600">
                                              +{instAbrev}
                                            </span>
                                          ) : null}
                                        </span>
                                      </li>
                                      );
                                    })}
                                    {inferredPeople.map((p) => (
                                      <li
                                        key={`inf-${p.id}`}
                                        title="Loc. de viáticos distinta de residencia"
                                        className="text-xs text-sky-800 flex items-center gap-2 min-w-0"
                                      >
                                        <div className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0"></div>
                                        <span className="truncate">
                                          {p.apellido}, {p.nombre}
                                          <span className="ml-1 font-semibold text-sky-700">
                                            inf.
                                          </span>
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <div className="text-xs text-slate-500 text-center py-1.5 space-y-1">
                                    {admissionReady ? (
                                      <div className="flex flex-col items-center justify-center gap-0.5 text-emerald-700 font-semibold not-italic text-center">
                                        <div className="flex items-center gap-1">
                                          <IconCheck size={14} />
                                          {admissionCoverage.sameScope
                                            ? "Regla de admisión creada"
                                            : "Ya incluido en el bus"}
                                          {admissionJustCreated
                                            ? " (recién)"
                                            : ""}
                                        </div>
                                        {admissionCoverage.viaLabel && (
                                          <span className="text-[10px] font-normal text-emerald-600">
                                            {admissionCoverage.viaLabel}
                                          </span>
                                        )}
                                        <span className="text-[10px] font-normal text-emerald-600">
                                          Los pasajeros se listarán al
                                          actualizar la logística.
                                        </span>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="italic">
                                          Ninguna persona coincide con esta
                                          regla actualmente.
                                        </div>
                                        {rule.alcance === "Localidad" && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setNewScope("Localidad");
                                              setTargetIds(
                                                rule.id_localidad
                                                  ? [
                                                      String(
                                                        rule.id_localidad,
                                                      ),
                                                    ]
                                                  : [],
                                              );
                                            }}
                                            className="mt-1 inline-flex items-center gap-1 px-2 py-1 rounded-full border border-amber-300 bg-amber-50 text-[10px] font-semibold text-amber-700 hover:bg-amber-100"
                                          >
                                            Sugerir regla de admisión para esta
                                            localidad
                                          </button>
                                        )}
                                        {rule.alcance === "Region" && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setNewScope("Region");
                                              setTargetIds(
                                                rule.id_region
                                                  ? [String(rule.id_region)]
                                                  : [],
                                              );
                                            }}
                                            className="mt-1 inline-flex items-center gap-1 px-2 py-1 rounded-full border border-amber-300 bg-amber-50 text-[10px] font-semibold text-amber-700 hover:bg-amber-100"
                                          >
                                            Sugerir regla de admisión para esta
                                            región
                                          </button>
                                        )}
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Formulario Agregar */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-3">
              Agregar Nueva Regla
            </h4>
            {missingAdmissionRules.length > 0 && (
              <div className="mb-3 flex items-center justify-between gap-3 text-[10px] bg-amber-50 border border-amber-200 px-2 py-1.5 rounded">
                <div className="text-amber-700">
                  Faltan admisiones para:{" "}
                  <div className="mt-1">
                    <ul className="space-y-1">
                      {missingAdmissionRules.map((r) => (
                        <li key={r.id} className="flex items-center gap-2">
                          <span className="inline-flex w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                          <span>
                            {r.alcance} — {resolveTargetName(r)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAutoCreateMissingAdmissionRule}
                  disabled={loading}
                  className="shrink-0 px-2 py-1 rounded-full bg-amber-600 hover:bg-amber-700 text-white font-semibold disabled:opacity-60"
                >
                  Crear{" "}
                  {missingAdmissionRules.length > 1
                    ? `${missingAdmissionRules.length} reglas`
                    : "regla"}{" "}
                  automáticamente
                </button>
              </div>
            )}
            {missingAdmissionRules.length === 0 &&
              recentlyCreatedAdmissionKeys.size > 0 && (
                <div className="mb-3 text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-2 rounded flex items-start gap-2">
                  <IconCheck size={14} className="shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">
                      Admisiones creadas para esta parada.
                    </span>{" "}
                    El listado de pasajeros por regla se actualiza en cuanto
                    termina el recálculo de logística.
                  </div>
                </div>
              )}
            {transportAdmissionRules.length > 0 && (
              <div className="mb-3 text-[10px] bg-slate-50 border border-slate-200 px-2 py-1.5 rounded">
                <span className="font-bold text-slate-500 uppercase tracking-wide">
                  Admisiones en este bus
                </span>
                <ul className="mt-1 space-y-0.5 text-slate-600">
                  {transportAdmissionRules.map((adm) => (
                    <li key={adm.id} className="flex items-center gap-1.5">
                      {recentlyCreatedAdmissionKeys.has(
                        routeRuleAdmissionKey(adm),
                      ) ? (
                        <IconCheck
                          size={12}
                          className="text-emerald-600 shrink-0"
                        />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                      )}
                      <span>
                        {isAdmissionExclusionRule(adm) ? (
                          <span className="font-semibold text-rose-700">
                            Veto{" "}
                          </span>
                        ) : null}
                        {adm.alcance}
                        {adm.alcance !== "General"
                          ? ` — ${resolveTargetName(adm)}`
                          : ""}
                        {recentlyCreatedAdmissionKeys.has(
                          routeRuleAdmissionKey(adm),
                        )
                          ? " (nueva)"
                          : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex gap-2 mb-3">
              <div className="w-1/3">
                <label className="text-[10px] font-bold text-slate-400 block mb-1">
                  ALCANCE
                </label>
                <select
                  className="w-full text-xs border rounded p-2 outline-none focus:border-indigo-500"
                  value={newScope}
                  onChange={(e) => {
                    const next = e.target.value;
                    setNewScope(next);
                    setTargetIds([]);
                    if (next !== "Persona") setEsChofer(false);
                    if (next !== "Grupo") {
                      setAlsoMirrorBajada(false);
                    }
                  }}
                >
                  <option value="General">General</option>
                  <option value="Region">Región</option>
                  <option value="Localidad">Localidad</option>
                  <option value="Categoria">Categoría</option>
                  <option value="Grupo">Grupo</option>
                  <option value="Persona">Persona</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-400 block mb-1">
                  OBJETIVO
                </label>
                {newScope === "General" ? (
                  <div className="text-xs text-slate-400 italic p-2 bg-white border rounded">
                    Aplica a todos los pasajeros
                  </div>
                ) : newScope === "Region" ? (
                  <SearchableSelect
                    options={regionOptions}
                    value={targetIds}
                    onChange={setTargetIds}
                    placeholder="Seleccionar regiones..."
                    isMulti
                  />
                ) : newScope === "Localidad" ? (
                  <SearchableSelect
                    options={localityOptions}
                    value={targetIds}
                    onChange={setTargetIds}
                    placeholder="Seleccionar localidades..."
                    isMulti
                  />
                ) : newScope === "Categoria" ? (
                  <SearchableSelect
                    options={categoryOptions}
                    value={targetIds}
                    onChange={setTargetIds}
                    placeholder="Seleccionar categorías..."
                    isMulti
                  />
                ) : newScope === "Grupo" ? (
                  giraGrupos.length === 0 ? (
                    <div className="text-xs text-amber-700 italic p-2 bg-amber-50 border border-amber-200 rounded">
                      No hay grupos de convocatoria en esta gira. Creálos en
                      Roster → Grupos.
                    </div>
                  ) : (
                    <SearchableSelect
                      options={grupoOptions}
                      value={targetIds}
                      onChange={setTargetIds}
                      placeholder="Seleccionar grupos..."
                      isMulti
                    />
                  )
                ) : (
                  <div
                    className={`w-full text-xs rounded ${
                      hasNewPersonToAutoInclude
                        ? "border border-amber-500 bg-amber-50"
                        : ""
                    }`}
                  >
                    <SearchableSelect
                      options={personOptions}
                      value={targetIds}
                      onChange={setTargetIds}
                      placeholder="Buscar personas..."
                      isMulti
                      className="border-0"
                    />
                  </div>
                )}
              </div>
            </div>
            {type === "up" && newScope === "Persona" ? (
              <label className="mb-3 flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-500"
                  checked={esChofer}
                  onChange={(e) => setEsChofer(e.target.checked)}
                />
                <span>
                  <span className="font-semibold">Es chofer</span>
                  <span className="text-slate-500">
                    {" "}
                    — en esta subida/trayecto (no consume cupo; no es un rol
                    permanente de la persona)
                  </span>
                </span>
              </label>
            ) : null}
            {type === "up" && newScope === "Grupo" ? (
              <div className="mb-3 space-y-1.5">
                <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                    checked={alsoMirrorBajada}
                    disabled={bajadaCandidateStops.length === 0}
                    onChange={(e) => setAlsoMirrorBajada(e.target.checked)}
                  />
                  <span>
                    <span className="font-semibold">
                      También asignar bajada en…
                    </span>
                    <span className="text-slate-500">
                      {" "}
                      misma regla de grupo (↓) en otra parada del vehículo
                    </span>
                  </span>
                </label>
                {alsoMirrorBajada && bajadaCandidateStops.length > 0 ? (
                  <select
                    className="w-full text-xs border border-rose-200 rounded p-2 outline-none focus:border-rose-500 bg-white"
                    value={mirrorBajadaEventId}
                    onChange={(e) => setMirrorBajadaEventId(e.target.value)}
                  >
                    {bajadaCandidateStops.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {formatStopOptionLabel(ev)}
                      </option>
                    ))}
                  </select>
                ) : null}
                {bajadaCandidateStops.length === 0 ? (
                  <p className="text-[10px] text-amber-700 m-0 pl-6">
                    No hay paradas posteriores en la secuencia de este vehículo.
                  </p>
                ) : null}
              </div>
            ) : null}
            <button
              onClick={handleAddRule}
              disabled={loading}
              className={`w-full py-2 rounded text-xs font-bold text-white shadow-sm flex justify-center items-center gap-2 ${type === "up" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}`}
            >
              <IconPlus size={14} /> Asignar Parada
            </button>
          </div>
          </>
  );

  if (embedded) {
    return (
      <>
        {dialog}
        <div className="space-y-6">{rulesBody}</div>
      </>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      {dialog}
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] animate-in zoom-in-95">
        {/* Header */}
        <div
          className={`p-4 border-b rounded-t-xl flex justify-between items-start ${bgClass}`}
        >
          <div>
            <h3
              className={`text-lg font-bold ${colorClass} flex items-center gap-2`}
            >
              <IconMapPin size={20} /> {title}
            </h3>
            <div className="mt-1 text-sm font-medium text-slate-600">
              {event.locaciones?.nombre ||
                event.descripcion ||
                "Lugar sin nombre"}
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <IconClock size={12} /> {event.hora_inicio?.slice(0, 5)} hs
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/50 rounded-full transition-colors"
          >
            <IconX size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">{rulesBody}</div>
      </div>
    </div>
  );
}
