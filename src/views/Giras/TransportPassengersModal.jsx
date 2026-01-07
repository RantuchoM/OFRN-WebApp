import React, { useState, useMemo } from "react";
import {
  IconX,
  IconPlus,
  IconUserCheck,
  IconUserX,
  IconTrash,
  IconMapPin,
  IconChevronDown,
  IconChevronUp,
  IconUsers,
} from "../../components/ui/Icons";
import SearchableSelect from "../../components/ui/SearchableSelect";

export default function TransportPassengersModal({
  isOpen,
  onClose,
  transport,
  transportRules,
  roster,
  regions,
  localities,
  supabase,
  onRefresh,
}) {
  if (!isOpen || !transport) return null;

  const [activeTab, setActiveTab] = useState("list"); // 'list' | 'add'
  const [addType, setAddType] = useState("Persona"); // 'Persona', 'Region', 'Localidad'
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);

  // Estado para mostrar/ocultar reglas de logística
  const [showLogistics, setShowLogistics] = useState(false);
  
  // Estado para expandir los miembros de una regla
  const [expandedRuleId, setExpandedRuleId] = useState(null);

  // 1. Filtrar reglas de ESTE transporte
  const myRules = useMemo(() => {
    return (transportRules || []).filter(
      (r) => r.id_gira_transporte === transport.id
    );
  }, [transportRules, transport.id]);

  // 2. Separar reglas Principales (Acceso/Veto) de Logística (Paradas)
  const { mainRules, logisticsRules } = useMemo(() => {
    const main = [];
    const logistics = [];

    myRules.forEach((r) => {
      if (r.solo_logistica) {
        logistics.push(r);
      } else {
        main.push(r);
      }
    });

    // Ordenar principales: Exclusiones primero
    main.sort((a, b) =>
      a.es_exclusion === b.es_exclusion ? 0 : a.es_exclusion ? -1 : 1
    );

    return { mainRules: main, logisticsRules: logistics };
  }, [myRules]);

  // 3. Calcular pasajeros actuales
  const currentPassengers = useMemo(() => {
    const list = roster.filter((p) =>
      p.logistics?.transports?.some((t) => t.id === transport.id)
    );
    return list.sort((a, b) => a.apellido.localeCompare(b.apellido));
  }, [roster, transport.id]);

  // --- FUNCIÓN CORREGIDA: Calcular coincidencias de una regla ---
  const getRuleMatches = (rule) => {
    return roster.filter((person) => {
      // 1. FILTRO DE PRESENCIA: Ignorar a los que están marcados como 'ausente' en la gira
      if (person.estado_gira === 'ausente') return false;

      const scope = rule.alcance;
      const pId = String(person.id);

      // 2. Lógica de coincidencia por alcance
      if (scope === "Persona") {
        if (rule.target_ids && rule.target_ids.length > 0)
          return rule.target_ids.map(String).includes(pId);
        return String(rule.id_integrante) === pId;
      }

      if (scope === "Categoria" || scope === "Instrumento") {
        const targets = (rule.target_ids || []).map(String);
        if (targets.length > 0) {
          if (targets.includes("SOLISTAS") && person.rol_gira === "solista") return true;
          if (targets.includes("DIRECTORES") && person.rol_gira === "director") return true;
          if (targets.includes("PRODUCCION") && person.rol_gira === "produccion") return true;
          if (targets.includes("STAFF") && person.rol_gira === "staff") return true;
          if (targets.includes("CHOFER") && person.rol_gira === "chofer") return true;
          if (targets.includes("LOCALES") && person.is_local) return true;
          if (targets.includes("NO_LOCALES") && !person.is_local) return true;
          if (person.instrumentos?.familia && targets.includes(person.instrumentos.familia))
            return true;
        }
        return false;
      }

      // Reglas Masivas
      const userRole = (person.rol_gira || "musico").trim().toLowerCase();
      let applyMassive = false;
      if (userRole === "musico") applyMassive = true;
      else if (["solista", "director"].includes(userRole)) {
        if (!person.es_adicional) applyMassive = true;
      }
      if (!applyMassive) return false;

      if (scope === "General") return true;

      const pLoc = String(person.id_localidad);
      const pReg = String(person.localidades?.id_region);
      const targets = (rule.target_ids || []).map(String);

      if (scope === "Localidad") {
        return targets.length > 0
          ? targets.includes(pLoc)
          : String(rule.id_localidad) === pLoc;
      }
      if (scope === "Region") {
        return targets.length > 0
          ? targets.includes(pReg)
          : String(rule.id_region) === pReg;
      }

      return false;
    });
  };

  // --- Helper para renderizar la lista de afectados ---
  const renderAffectedMembers = (rule, isExclusion) => {
    const matches = getRuleMatches(rule);

    return (
      <div className="mt-2 bg-white/90 rounded p-2 text-xs border border-slate-200 animate-in slide-in-from-top-2">
        <div className="font-bold text-slate-500 mb-1 border-b pb-1 flex justify-between">
          <span>
            {isExclusion ? "Excluidos" : "Incluidos"} por esta regla ({matches.length}):
          </span>
        </div>
        <div className="max-h-32 overflow-y-auto space-y-1">
          {matches.length > 0 ? (
            matches.map((m) => (
              <div key={m.id} className="text-slate-700 flex justify-between">
                <span>
                  {m.apellido}, {m.nombre}
                </span>
                <span className="text-[10px] text-slate-400">
                  (
                  {localities.find((l) => String(l.id) === String(m.id_localidad))
                    ?.localidad || "-"}
                  )
                </span>
              </div>
            ))
          ) : (
            <span className="text-slate-400 italic">
              Sin coincidencias (validas) en el roster.
            </span>
          )}
        </div>
      </div>
    );
  };

  const handleAddRule = async (isExclusion = false) => {
    if (!selectedId) return;
    setLoading(true);
    try {
      const payload = {
        id_gira_transporte: transport.id,
        alcance: addType,
        es_exclusion: isExclusion,
        solo_logistica: false,
      };

      if (addType === "Persona") payload.id_integrante = selectedId;
      else if (addType === "Region") payload.id_region = selectedId;
      else if (addType === "Localidad") payload.id_localidad = selectedId;

      await supabase
        .from("giras_logistica_reglas_transportes")
        .insert([payload]);
      onRefresh();
      setActiveTab("list");
      setSelectedId(null);
    } catch (e) {
      console.error(e);
      alert("Error al guardar regla");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!confirm("¿Eliminar esta regla?")) return;
    setLoading(true);
    try {
      await supabase
        .from("giras_logistica_reglas_transportes")
        .delete()
        .eq("id", ruleId);
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getRuleLabel = (r) => {
    let label = r.alcance;
    if (r.alcance === "General") label = "Todos los integrantes";
    else if (r.alcance === "Region")
      label = `Región: ${
        regions.find((x) => String(x.id) === String(r.id_region))?.region || "?"
      }`;
    else if (r.alcance === "Localidad")
      label = `Loc.: ${
        localities.find((x) => String(x.id) === String(r.id_localidad))
          ?.localidad || "?"
      }`;
    else if (r.alcance === "Persona") {
      const p = roster.find((x) => String(x.id) === String(r.id_integrante));
      label = p ? `${p.apellido}, ${p.nombre}` : `ID #${r.id_integrante}`;
    }
    if (r.instrumento_familia) label += ` (${r.instrumento_familia})`;
    return label;
  };

  const getRuleStyles = (r) => {
    if (r.es_exclusion) {
      return {
        bg: "bg-red-50",
        border: "border-red-100",
        text: "text-red-700",
        icon: <IconUserX size={16} className="text-red-500" />,
        typeLabel: "EXCLUIR (VETO)",
      };
    }
    if (r.solo_logistica) {
      return {
        bg: "bg-blue-50",
        border: "border-blue-100",
        text: "text-blue-700",
        icon: <IconMapPin size={16} className="text-blue-500" />,
        typeLabel: "AJUSTE LOGÍSTICA",
      };
    }
    return {
      bg: "bg-emerald-50",
      border: "border-emerald-100",
      text: "text-emerald-800",
      icon: <IconPlus size={16} className="text-emerald-600" />,
      typeLabel: "INCLUIR (ACCESO)",
    };
  };

  // --- CORRECCIÓN: Usar 'id' como clave para SearchableSelect ---
  const selectOptions = useMemo(() => {
    if (addType === "Region")
      return regions.map((r) => ({ id: r.id, label: r.region })); // key id
    if (addType === "Localidad")
      return localities.map((l) => ({ id: l.id, label: l.localidad })); // key id
    if (addType === "Persona")
      return roster.map((p) => {
        const locName =
          localities.find((l) => String(l.id) === String(p.id_localidad))?.localidad ||
          p.localidades?.localidad ||
          "-";
        return {
          id: p.id, // key id
          label: `${p.apellido}, ${p.nombre} (${locName})`,
        };
      });
    return [];
  }, [addType, regions, localities, roster]);

  const RuleCard = ({ r }) => {
    const styles = getRuleStyles(r);
    const isExpanded = expandedRuleId === r.id;

    return (
      <div
        className={`flex flex-col p-2 rounded border transition-all ${styles.bg} ${styles.border}`}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            {styles.icon}
            <div>
              <div
                className={`text-[10px] font-bold uppercase ${styles.text} opacity-70`}
              >
                {styles.typeLabel}
              </div>
              <div className={`text-sm font-medium ${styles.text}`}>
                {getRuleLabel(r)}
              </div>
              {r.solo_logistica && (
                <div className="text-[10px] text-slate-500 flex gap-2 mt-0.5">
                  {r.id_evento_subida && <span>Subida Personalizada</span>}
                  {r.id_evento_subida && r.id_evento_bajada && <span>•</span>}
                  {r.id_evento_bajada && <span>Bajada Personalizada</span>}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setExpandedRuleId(isExpanded ? null : r.id)}
              className={`p-1.5 rounded transition-colors flex items-center gap-1 text-[10px] font-bold uppercase ${
                styles.text
              } hover:bg-white/50`}
              title="Ver personas afectadas"
            >
              <IconUsers size={14} />
              {isExpanded ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />}
            </button>

            <button
              onClick={() => handleDeleteRule(r.id)}
              className="text-slate-400 hover:text-red-500 p-1.5 rounded hover:bg-white/50 transition-colors ml-1"
              title="Eliminar regla"
            >
              <IconTrash size={14} />
            </button>
          </div>
        </div>
        
        {isExpanded && renderAffectedMembers(r, r.es_exclusion)}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* HEADER */}
        <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <IconUserCheck className="text-indigo-600" />
              Pasajeros: {transport.detalle}
            </h3>
            <p className="text-xs text-slate-500">
              {currentPassengers.length} personas asignadas actualmente
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* TABS */}
        <div className="flex border-b text-sm font-medium">
          <button
            onClick={() => setActiveTab("list")}
            className={`flex-1 py-3 text-center border-b-2 transition-colors ${
              activeTab === "list"
                ? "border-indigo-600 text-indigo-700 bg-indigo-50/50"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Reglas Activas
          </button>
          <button
            onClick={() => setActiveTab("add")}
            className={`flex-1 py-3 text-center border-b-2 transition-colors ${
              activeTab === "add"
                ? "border-indigo-600 text-indigo-700 bg-indigo-50/50"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Agregar / Excluir
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
          {activeTab === "list" && (
            <div className="space-y-6">
              {/* SECCIÓN 1: REGLAS PRINCIPALES (ACCESO) */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider flex justify-between items-center">
                  <span>Reglas de Acceso</span>
                  <span className="text-[10px] font-normal bg-white px-2 rounded border">
                    Orden: Veto {">"} Acceso
                  </span>
                </h4>
                <div className="space-y-2">
                  {mainRules.length === 0 && logisticsRules.length === 0 && (
                    <p className="text-sm text-slate-400 italic text-center py-4">
                      No hay reglas definidas.
                    </p>
                  )}
                  {mainRules.map((r) => (
                    <RuleCard key={r.id} r={r} />
                  ))}
                </div>
              </div>

              {/* SECCIÓN 2: REGLAS LOGÍSTICA (COLAPSIBLE) */}
              {logisticsRules.length > 0 && (
                <div className="border-t border-slate-200 pt-4">
                  <button
                    onClick={() => setShowLogistics(!showLogistics)}
                    className="w-full flex items-center justify-between text-xs font-bold text-blue-600 bg-blue-50 px-3 py-2 rounded hover:bg-blue-100 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <IconMapPin size={14} />
                      Ajustes de Paradas ({logisticsRules.length})
                    </span>
                    {showLogistics ? (
                      <IconChevronUp size={14} />
                    ) : (
                      <IconChevronDown size={14} />
                    )}
                  </button>

                  {showLogistics && (
                    <div className="mt-2 space-y-2 animate-in slide-in-from-top-2">
                      {logisticsRules.map((r) => (
                        <RuleCard key={r.id} r={r} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SECCIÓN 3: PERSONAS */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider mt-6 border-t pt-4">
                  Pasajeros Resultantes ({currentPassengers.length})
                </h4>
                <div className="bg-white rounded border border-slate-200 divide-y divide-slate-100 max-h-60 overflow-y-auto">
                  {currentPassengers.map((p) => {
                    const nombreLoc =
                      p.localidades?.localidad ||
                      localities.find(
                        (l) => String(l.id) === String(p.id_localidad)
                      )?.localidad ||
                      "-";

                    return (
                      <div
                        key={p.id}
                        className="p-2 text-sm flex justify-between items-center hover:bg-slate-50 group"
                      >
                        <div className="flex flex-col">
                          <span className="text-slate-700 font-medium">
                            {p.apellido}, {p.nombre}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            ({nombreLoc})
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 rounded">
                            {p.logistics?.transports?.find(
                              (t) => t.id === transport.id
                            )?.priority >= 4
                              ? "Individual"
                              : "Grupo"}
                          </span>
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  `¿Excluir a ${p.apellido} de este transporte?`
                                )
                              ) {
                                const payload = {
                                  id_gira_transporte: transport.id,
                                  alcance: "Persona",
                                  id_integrante: p.id,
                                  es_exclusion: true,
                                  solo_logistica: false,
                                };
                                supabase
                                  .from("giras_logistica_reglas_transportes")
                                  .insert([payload])
                                  .then(onRefresh);
                              }
                            }}
                            className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-opacity"
                            title="Vetar de este transporte"
                          >
                            <IconUserX size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === "add" && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded border border-slate-200 shadow-sm">
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Tipo de Regla de Acceso
                </label>
                <div className="flex gap-2 mb-4">
                  {["Persona", "Region", "Localidad"].map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        setAddType(type);
                        setSelectedId(null);
                      }}
                      className={`px-3 py-1.5 text-xs rounded font-bold border transition-colors ${
                        addType === type
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Seleccionar {addType}
                </label>
                
                <div className="mb-6">
                  <SearchableSelect
                    options={selectOptions}
                    value={selectedId}
                    onChange={setSelectedId}
                    placeholder={`Buscar ${addType.toLowerCase()}...`}
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleAddRule(false)}
                    disabled={!selectedId || loading}
                    className="py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-sm flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 transition-all active:scale-95"
                  >
                    <IconPlus size={16} /> Incluir (Acceso)
                  </button>
                  <button
                    onClick={() => handleAddRule(true)}
                    disabled={!selectedId || loading}
                    className="py-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95"
                  >
                    <IconUserX size={16} /> Excluir (Veto)
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-3 text-center border-t pt-2">
                  Nota: Las reglas de "Logística" (paradas específicas) se
                  gestionan desde el botón de cada parada en el listado
                  principal.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}