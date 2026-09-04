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
  alightOfrnPeopleAtStop,
} from "../../services/fimbaService";

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
  /** Secuencia del vehículo (para «a bordo» / Bajar todo). */
  sortedEvents = [],
}) {
  const { confirm, dialog } = useConfirmDialog();
  const [existingRules, setExistingRules] = useState([]);
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
  const [bajarTodoBusy, setBajarTodoBusy] = useState(false);
  const [quickAlightBusyId, setQuickAlightBusyId] = useState(null);
  const [choferBusyId, setChoferBusyId] = useState(null);

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
    }
  }, [isOpen, transportId, event?.id]);

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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRule = async () => {
    if (newScope !== "General" && (!targetIds || targetIds.length === 0)) {
      alert("Seleccioná al menos un objetivo.");
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
        return false;
      };

      let anyChange = false;
      let workingAdmissionRules = [...(transportAdmissionRules || [])];

      for (const currentId of selectedIds) {
        // 1) Ya apunta a este evento → noop
        const alreadyHere = (existingAll || []).find(
          (r) =>
            sameTarget(r, currentId) &&
            r[fieldToUpdate] != null &&
            String(r[fieldToUpdate]) === String(event.id),
        );
        if (alreadyHere) continue;

        // 2) Ride abierto / huérfano: mismo alcance+objetivo, este extremo vacío
        //    → UPDATE (cierra el ride). Evita insertar bajada-only que a veces
        //    no se reflejaba bien tras refresh desde el embed FIMBA.
        const openRide = (existingAll || []).find(
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
          continue;
        }

        // 3) Conflicto: mismo alcance ya tiene este extremo en otro evento
        const conflict = (existingAll || []).find((r) => {
          if (!sameTarget(r, currentId)) return false;
          const currentEventId = r[fieldToUpdate];
          if (!currentEventId) return false;
          if (String(currentEventId) === String(event.id)) return false;
          return true;
        });

        if (conflict) {
          const actionLabel = type === "up" ? "subida" : "bajada";
          const confirmReplace = await confirm({
            title: "Reemplazar parada",
            message:
              `Ya existe una ${actionLabel.toUpperCase()} definida para este alcance en otro evento.\n\n` +
              `¿Querés reemplazarla por esta parada?\n\n` +
              `Aceptar: reemplazar la ${actionLabel} anterior.\n` +
              `Cancelar: dejar todo como está para este objetivo.`,
            confirmText: "Reemplazar",
            overlayClassName: embedded ? "z-[110]" : "z-[100]",
          });

          if (!confirmReplace) {
            continue;
          }

          const { error: updateErr } = await supabase
            .from("giras_logistica_rutas")
            .update({ [fieldToUpdate]: event.id })
            .eq("id", conflict.id);

          if (updateErr) throw updateErr;
          conflict[fieldToUpdate] = event.id;
          anyChange = true;
          continue;
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
        if (newScope === "Categoria") priority = 4;
        if (newScope === "Persona") priority = 5;

        const payload = {
          id_gira: giraId,
          id_transporte_fisico: transportId,
          alcance: newScope,
          prioridad: priority,
          id_evento_subida: type === "up" ? event.id : null,
          id_evento_bajada: type === "down" ? event.id : null,
          id_region: newScope === "Region" ? currentId : null,
          id_localidad: newScope === "Localidad" ? currentId : null,
          id_integrante: newScope === "Persona" ? currentId : null,
          target_ids: newScope === "Categoria" && currentId ? [currentId] : [],
          es_chofer:
            type === "up" && newScope === "Persona" ? Boolean(esChofer) : false,
        };

        const { data: inserted, error } = await supabase
          .from("giras_logistica_rutas")
          .insert([payload])
          .select("*")
          .maybeSingle();
        if (error) throw error;
        if (inserted) existingAll.push(inserted);
        anyChange = true;
      }

      if (anyChange) {
        setTargetIds([]);
        setEsChofer(false);
        await fetchRules();
        onRefresh && onRefresh();
      }
    } catch (err) {
      console.error(err);
      alert("Error al procesar la regla.");
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
      fetchRules();
      onRefresh && onRefresh();
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
      onRefresh && onRefresh();
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
        onRefresh && onRefresh();
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
        onRefresh && onRefresh();
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

      onRefresh && onRefresh();

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

    return "-";
  };

  // Helper para calcular afectados en tiempo real, respetando prioridad de reglas
  const getPriorityFromScope = (scope) => {
    switch (scope) {
      case "Persona":
        return 5;
      case "Categoria":
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
  }, [existingRules, regions, localities, passengers]);

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
          subLabel: "Ya tiene otra parada",
          optionClassName: "bg-cyan-50",
          labelClassName: "text-cyan-700",
          subLabelClassName: "text-[10px] text-cyan-600",
        };
      }

      const subLabel = isThisStop
        ? "Ya está asignado a esta parada"
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
    });
  }, [type, event?.id, transportId, passengers, sortedEvents]);

  const aboardOpen = useMemo(
    () => aboardAtStop.filter((r) => r.openRide && !r.alreadyAlightingHere),
    [aboardAtStop],
  );

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
      });
      if (res.error) {
        toast.error(res.error.message || "No se pudo bajar");
        return;
      }
      await fetchRules();
      onRefresh?.();
      toast.success("Bajada asignada");
    } finally {
      setQuickAlightBusyId(null);
    }
  };

  const handleBajarTodoOfrn = async () => {
    if (!giraId || !transportId || !event?.id) return;
    if (aboardOpen.length === 0) {
      toast.info("Nadie con ride abierto a bordo en esta parada.");
      return;
    }
    const seats = aboardOpen.reduce((s, r) => s + (Number(r.seats) || 0), 0);
    const ok = await confirm({
      title: "Bajar todo (orquesta)",
      message:
        `¿Bajar a las ${aboardOpen.length} persona(s) a bordo de este vehículo ` +
        `en esta parada (${seats} asiento${seats === 1 ? "" : "s"})?\n\n` +
        `Se crearán/actualizarán reglas Persona en giras_logistica_rutas.`,
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
      });
      if (res.error) {
        toast.error(res.error.message || "No se pudo bajar todo");
        return;
      }
      await fetchRules();
      onRefresh?.();
      toast.success(
        res.closed === 1
          ? "Se bajó 1 persona"
          : `Se bajaron ${res.closed} personas`,
      );
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
                    {aboardAtStop.length === 0
                      ? "Nadie de orquesta figura a bordo aquí."
                      : `${aboardAtStop.length} persona${aboardAtStop.length === 1 ? "" : "s"} · ${aboardSeats} asiento${aboardSeats === 1 ? "" : "s"} (derivado de subida/bajada)`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleBajarTodoOfrn}
                  disabled={
                    bajarTodoBusy || loading || aboardOpen.length === 0
                  }
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 shadow-sm"
                  title="Crear bajadas Persona para todos los rides abiertos a bordo"
                >
                  {bajarTodoBusy ? (
                    <IconLoader size={12} className="animate-spin" />
                  ) : (
                    <IconArrowDown size={12} />
                  )}
                  Bajar todo
                </button>
              </div>
              {aboardAtStop.length > 0 && (
                <ul className="max-h-40 overflow-y-auto divide-y divide-rose-100 bg-white/80 rounded border border-rose-100 m-0 p-0 list-none">
                  {aboardAtStop.map((row) => (
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
                        {row.alreadyAlightingHere ? (
                          <span className="ml-1 text-[10px] font-semibold text-rose-600">
                            (ya baja aquí)
                          </span>
                        ) : null}
                      </span>
                      {row.openRide && !row.alreadyAlightingHere ? (
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
                      ) : (
                        <span className="text-[10px] text-slate-400 shrink-0">
                          OK
                        </span>
                      )}
                    </li>
                  ))}
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
                  }}
                >
                  <option value="General">General</option>
                  <option value="Region">Región</option>
                  <option value="Localidad">Localidad</option>
                  <option value="Categoria">Categoría</option>
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
