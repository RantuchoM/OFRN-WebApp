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
} from "../../components/ui/Icons";
import { normalize, getCategoriaLogistica } from "../../hooks/useLogistics";
import { toast } from "sonner";
import SearchableSelect from "../../components/ui/SearchableSelect";

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
  onRefresh,
}) {
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

      let anyChange = false;

      for (const currentId of selectedIds) {
        const conflict = (existingAll || []).find((r) => {
          if (r.alcance !== newScope) return false;

          const sameTarget =
            newScope === "General"
              ? true
              : newScope === "Region"
                ? String(r.id_region) === String(currentId)
                : newScope === "Localidad"
                  ? String(r.id_localidad) === String(currentId)
                  : newScope === "Persona"
                    ? String(r.id_integrante) === String(currentId)
                    : newScope === "Categoria"
                      ? (r.target_ids || [])[0] === currentId
                      : false;

          if (!sameTarget) return false;

          const currentEventId = r[fieldToUpdate];
          if (!currentEventId) return false;

          // Si ya apunta a este mismo evento, no hacemos nada.
          if (String(currentEventId) === String(event.id)) return false;

          return true;
        });

        if (conflict) {
          const actionLabel = type === "up" ? "subida" : "bajada";
          const confirmReplace = window.confirm(
            `Ya existe una ${actionLabel.toUpperCase()} definida para este alcance en otro evento.\n\n` +
              `¿Querés reemplazarla por esta parada?\n\n` +
              `Aceptar: reemplazar la ${actionLabel} anterior.\n` +
              `Cancelar: dejar todo como está para este objetivo.`,
          );

          if (!confirmReplace) {
            continue;
          }

          // Reemplazamos la subida/bajada en la misma regla
          const { error: updateErr } = await supabase
            .from("giras_logistica_rutas")
            .update({ [fieldToUpdate]: event.id })
            .eq("id", conflict.id);

          if (updateErr) throw updateErr;
          anyChange = true;
          continue;
        }

        // --- LÓGICA DE AUTO-INCLUSIÓN (por persona) ---
        if (newScope === "Persona" && currentId) {
          const idStr = String(currentId);
          if (!admittedIds.has(idStr)) {
            const { error: admError } = await supabase
              .from("giras_logistica_admision") // <--- NOMBRE CORRECTO
              .insert([
                {
                  id_gira: giraId, // Columna correcta: id_gira
                  id_transporte_fisico: transportId,
                  id_integrante: currentId, // Columna correcta: id_integrante
                  alcance: "Persona",
                  prioridad: 5,
                  tipo: "INCLUSION",
                },
              ]);

            if (admError) {
              console.error("Error en auto-inclusión:", admError.message);
            } else {
              setAdmittedIds((prev) => {
                const next = new Set(prev);
                next.add(idStr);
                return next;
              });
              await fetchTransportAdmissionRules();
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
        };

        const { error } = await supabase
          .from("giras_logistica_rutas")
          .insert([payload]);
        if (error) throw error;
        anyChange = true;
      }

      if (anyChange) {
        setTargetIds([]);
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
    if (!confirm("¿Eliminar esta definición de parada?")) return;
    try {
      await supabase.from("giras_logistica_rutas").delete().eq("id", ruleId);
      fetchRules();
      onRefresh && onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAutoCreateMissingAdmissionRule = async () => {
    try {
      const pending = (existingRules || []).filter(
        (r) =>
          (r.alcance === "Localidad" ||
            r.alcance === "Region" ||
            (r.alcance === "Persona" && r.id_integrante)) &&
          !hasAdmissionForRouteRule(r),
      );

      if (pending.length === 0) {
        toast.info("No hay admisiones pendientes para esta parada.");
        return;
      }

      const lines = pending
        .map((r) => `• ${r.alcance} — ${resolveTargetName(r)}`)
        .join("\n");

      const confirmed = window.confirm(
        `Se crearán ${pending.length} regla(s) de ADMISIÓN para este transporte:\n\n${lines}\n\n` +
          "¿Deseás continuar?",
      );
      if (!confirmed) return;

      setLoading(true);

      const payloads = pending.map((r) => {
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
        new Set(pending.map((r) => routeRuleAdmissionKey(r)).filter(Boolean)),
      );

      onRefresh && onRefresh();

      toast.success(
        created?.length === 1
          ? "Se creó 1 regla de admisión."
          : `Se crearon ${created?.length || pending.length} reglas de admisión.`,
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
      return !hasAdmissionForRouteRule(r);
    });
  }, [existingRules, transportAdmissionRules]);

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

    // En bajadas, primero quienes aún no tienen bajada en este transporte,
    // luego quienes ya tienen alguna bajada, siempre ordenados por apellido.
    if (type === "down") {
      list.sort((a, b) => {
        const trA = a.logistics?.transports?.find(
          (t) => String(t.id) === String(transportId),
        );
        const trB = b.logistics?.transports?.find(
          (t) => String(t.id) === String(transportId),
        );
        const aHasDrop = Boolean(trA?.bajadaId);
        const bHasDrop = Boolean(trB?.bajadaId);

        if (aHasDrop !== bHasDrop) {
          // false (0) primero, true (1) después
          return Number(aHasDrop) - Number(bHasDrop);
        }

        return (a.apellido || "").localeCompare(b.apellido || "");
      });
    } else {
      list.sort((a, b) => (a.apellido || "").localeCompare(b.apellido || ""));
    }

    return list.map((p) => {
      const idStr = String(p.id);
      const inBus = admittedIds.has(idStr);
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
  }, [passengers, admittedIds, type, transportId, event?.id]);

  const hasNewPersonToAutoInclude =
    newScope === "Persona" &&
    targetIds.some((id) => !admittedIds.has(String(id)));

  if (!isOpen || !event) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
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
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
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
                        const isExpanded = expandedRuleId === rule.id;
                        const displayCount = affectedPeople.length;
                        const admissionReady = hasAdmissionForRouteRule(rule);
                        const admissionJustCreated = recentlyCreatedAdmissionKeys.has(
                          routeRuleAdmissionKey(rule),
                        );

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
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="text-xs font-semibold text-slate-700 truncate">
                                  {resolveTargetName(rule)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {admissionReady && displayCount === 0 && (
                                  <span
                                    className="text-[10px] font-bold flex items-center gap-1 px-2 py-0.5 rounded-full text-emerald-700 bg-emerald-100"
                                    title="Admisión creada; los pasajeros aparecerán al actualizar la logística"
                                  >
                                    <IconCheck size={12} /> Admisión
                                  </span>
                                )}
                                <span
                                  className={`text-[10px] font-bold flex items-center gap-1 px-2 py-0.5 rounded-full ${
                                    displayCount === 0 && !admissionReady
                                      ? "text-amber-700 bg-amber-100"
                                      : "text-slate-400 bg-slate-100"
                                  }`}
                                >
                                  <IconUsers size={12} /> {displayCount}
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
                                {affectedPeople.length > 0 ? (
                                  <ul className="grid grid-cols-2 gap-2">
                                    {affectedPeople.map((p) => (
                                      <li
                                        key={p.id}
                                        className="text-xs text-slate-600 flex items-center gap-2"
                                      >
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                                        {p.apellido}, {p.nombre}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <div className="text-xs text-slate-500 text-center py-1.5 space-y-1">
                                    {admissionReady ? (
                                      <div className="flex items-center justify-center gap-1 text-emerald-700 font-semibold not-italic">
                                        <IconCheck size={14} />
                                        Regla de admisión creada
                                        {admissionJustCreated
                                          ? " (recién)"
                                          : ""}
                                        . Los pasajeros se listarán al
                                        actualizar la logística.
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
                    setNewScope(e.target.value);
                    setTargetIds([]);
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
            <button
              onClick={handleAddRule}
              disabled={loading}
              className={`w-full py-2 rounded text-xs font-bold text-white shadow-sm flex justify-center items-center gap-2 ${type === "up" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}`}
            >
              <IconPlus size={14} /> Asignar Parada
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
