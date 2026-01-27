import React, { useState, useEffect, useMemo } from "react";
import {
  IconX,
  IconTrash,
  IconPlus,
  IconAlertTriangle,
  IconCheck,
  IconTruck,
} from "../../components/ui/Icons";
import SearchableSelect from "../../components/ui/SearchableSelect";
import { matchesRule } from "../../hooks/useLogistics";

const SCOPES = [
  { val: "General", label: "General (Todos)", prio: 1 },
  { val: "Region", label: "Por Región", prio: 2 },
  { val: "Localidad", label: "Por Localidad", prio: 3 },
  { val: "Categoria", label: "Por Categoría / Rol", prio: 4 },
  { val: "Persona", label: "Individual", prio: 5 },
];

const CATEGORIA_OPTIONS = [
  { val: "SOLISTAS", label: "Solistas" },
  { val: "DIRECTORES", label: "Directores" },
  { val: "PRODUCCION", label: "Producción / Staff" },
  { val: "CHOFER", label: "Choferes" },
  { val: "LOCALES", label: "Locales (Residentes)" },
  { val: "NO_LOCALES", label: "No Locales" },
];

export default function TransportAdmissionModal({
  isOpen,
  onClose,
  transporte,
  roster,
  regions,
  localities,
  supabase,
  giraId,
  onUpdate,
}) {
  const [rules, setRules] = useState([]);
  const [allTourRules, setAllTourRules] = useState([]);
  const [loading, setLoading] = useState(false);

  const [newScope, setNewScope] = useState("General");
  const [newType, setNewType] = useState("INCLUSION");
  const [targetId, setTargetId] = useState("");

  useEffect(() => {
    if (isOpen && transporte) fetchInitialData();
  }, [isOpen, transporte]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [currentRules, tourRules] = await Promise.all([
        supabase
          .from("giras_logistica_admision")
          .select("*")
          .eq("id_transporte_fisico", transporte.id),
        supabase
          .from("giras_logistica_admision")
          .select("*, giras_transportes(detalle, transportes(nombre))")
          .eq("id_gira", giraId),
      ]);
      setRules(currentRules.data || []);
      setAllTourRules(tourRules.data || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- 1. FILTRAR LOCALIDADES SOLO A LAS PRESENTES EN EL ROSTER ---
  const relevantLocalities = useMemo(() => {
    const rosterLocIds = new Set(
      roster.map((p) => String(p.id_localidad)).filter((id) => id !== "null"),
    );
    return localities.filter((l) => rosterLocIds.has(String(l.id)));
  }, [localities, roster]);

  // --- 2. MOTOR DE DETECCIÓN DE ASIGNACIÓN (ACTUAL VS OTROS) ---
  const getAssignmentInfo = (entity, entityType) => {
    // Definimos los buses a evaluar: primero el actual, luego el resto
    const transportIds = [
      String(transporte.id),
      ...new Set(
        allTourRules
          .filter(
            (r) => String(r.id_transporte_fisico) !== String(transporte.id),
          )
          .map((r) => String(r.id_transporte_fisico)),
      ),
    ];

    for (const tId of transportIds) {
      const isCurrentBus = tId === String(transporte.id);
      const rulesInBus = allTourRules.filter(
        (r) => String(r.id_transporte_fisico) === tId,
      );

      let applicable = [];
      if (entityType === "persona") {
        applicable = rulesInBus.filter((r) => {
          const isMatch = matchesRule(r, entity, localities);
          if (!isMatch) return false;

          // LÓGICA DE PRODUCCIÓN/STAFF:
          // Las reglas geo (General, Región, Localidad) NO aplican a staff puro.
          const isGeoRule = ["General", "Region", "Localidad"].includes(
            r.alcance,
          );
          const isProduction =
            entity.rol_sistema?.toUpperCase() === "PRODUCCION" ||
            entity.rol_sistema?.toUpperCase() === "STAFF";
          const isMusicianStable =
            entity.condicion === "Estable" && !isProduction;

          if (isGeoRule && isProduction && !isMusicianStable) return false;
          return true;
        });
      } else if (entityType === "localidad") {
        applicable = rulesInBus.filter(
          (r) =>
            r.alcance === "General" ||
            (r.alcance === "Localidad" &&
              String(r.id_localidad) === String(entity.id)) ||
            (r.alcance === "Region" &&
              String(r.id_region) === String(entity.id_region)),
        );
      }

      if (applicable.length > 0) {
        const topRule = applicable.sort((a, b) => b.prioridad - a.prioridad)[0];
        if (topRule.tipo === "INCLUSION" || !topRule.tipo) {
          return {
            name: isCurrentBus
              ? "este transporte"
              : topRule.giras_transportes?.detalle || "otro bus",
            isCurrent: isCurrentBus,
            via:
              topRule.alcance !==
              (entityType === "persona" ? "Persona" : "Localidad")
                ? ` (vía ${topRule.alcance})`
                : "",
          };
        }
      }
    }
    return null;
  };

  const dynamicOptions = useMemo(() => {
    if (newScope === "Persona") {
      return roster.map((p) => {
        const assign = getAssignmentInfo(p, "persona");
        const isProd =
          p.rol_sistema?.toUpperCase() === "PRODUCCION" ||
          p.rol_sistema?.toUpperCase() === "STAFF";

        return {
          id: p.id,
          label: `${p.apellido}, ${p.nombre}`,
          subLabel: assign
            ? `${assign.isCurrent ? "✅" : "⚠️"} Ya en ${assign.name}${assign.via}`
            : `${isProd ? "🛠️ Producción" : p.instrumento || "Músico"}`,
          variant: assign
            ? assign.isCurrent
              ? "success"
              : "warning"
            : "default",
        };
      });
    }

    if (newScope === "Localidad") {
      return relevantLocalities.map((l) => {
        const assign = getAssignmentInfo(l, "localidad");
        return {
          id: l.id,
          label: l.localidad,
          subLabel: assign
            ? `${assign.isCurrent ? "✅" : "⚠️"} Ya en ${assign.name}${assign.via}`
            : "Localidad sin asignar",
          variant: assign
            ? assign.isCurrent
              ? "success"
              : "warning"
            : "default",
        };
      });
    }

    if (newScope === "Region" || newScope === "Categoria") {
      const items = newScope === "Region" ? regions : CATEGORIA_OPTIONS;
      return items.map((item) => {
        const val = newScope === "Region" ? item.id : item.val;
        const label = newScope === "Region" ? item.region : item.label;

        const otherRule = allTourRules.find(
          (r) =>
            r.alcance === newScope &&
            (newScope === "Region"
              ? String(r.id_region) === String(val)
              : r.target_ids?.includes(val)) &&
            r.tipo === "INCLUSION",
        );

        const isCurrent =
          otherRule &&
          String(otherRule.id_transporte_fisico) === String(transporte.id);

        return {
          id: val,
          label: label,
          subLabel: otherRule
            ? `${isCurrent ? "✅" : "⚠️"} Regla en ${isCurrent ? "este bus" : otherRule.giras_transportes?.detalle || "otro bus"}`
            : newScope,
          variant: otherRule ? (isCurrent ? "success" : "warning") : "default",
        };
      });
    }
    return [];
  }, [
    newScope,
    roster,
    relevantLocalities,
    regions,
    allTourRules,
    transporte.id,
    localities,
  ]);

  const handleAddRule = async () => {
    if (newScope !== "General" && !targetId)
      return alert("Selecciona un valor.");
    setLoading(true);
    try {
      const payload = {
        id_gira: giraId,
        id_transporte_fisico: transporte.id,
        alcance: newScope,
        tipo: newType,
        prioridad: SCOPES.find((s) => s.val === newScope)?.prio || 1,
        id_integrante: newScope === "Persona" ? targetId : null,
        id_region: newScope === "Region" ? targetId : null,
        id_localidad: newScope === "Localidad" ? targetId : null,
        target_ids: newScope === "Categoria" ? [targetId] : [],
      };
      const { error } = await supabase
        .from("giras_logistica_admision")
        .insert([payload]);
      if (error) throw error;
      setTargetId("");
      fetchInitialData();
      onUpdate && onUpdate();
    } catch (err) {
      alert("Error al crear regla");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRule = async (id) => {
    if (!confirm("¿Borrar esta regla?")) return;
    await supabase.from("giras_logistica_admision").delete().eq("id", id);
    fetchInitialData();
    onUpdate && onUpdate();
  };

  const resolveName = (rule) => {
    if (rule.alcance === "General") return "Todos los integrantes";
    if (rule.alcance === "Region")
      return (
        regions.find((r) => String(r.id) === String(rule.id_region))?.region ||
        "Región"
      );
    if (rule.alcance === "Localidad")
      return (
        localities.find((l) => String(l.id) === String(rule.id_localidad))
          ?.localidad || "Localidad"
      );
    if (rule.alcance === "Categoria")
      return (
        CATEGORIA_OPTIONS.find((c) => rule.target_ids?.includes(c.val))
          ?.label || "Categoría"
      );
    if (rule.alcance === "Persona") {
      const p = roster.find((m) => String(m.id) === String(rule.id_integrante));
      return p
        ? `${p.apellido}, ${p.nombre}`
        : `Músico ID: ${rule.id_integrante}`;
    }
    return "-";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-300 border border-white/20 overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center bg-slate-50/80">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg">
              <IconTruck size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">
                Admisión de Pasajeros
              </h3>
              <p className="text-xs text-slate-500 font-bold">
                Bus:{" "}
                <span className="text-indigo-600">{transporte?.detalle}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
          >
            <IconX size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-white custom-scrollbar">
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 mb-8 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Alcance
                </label>
                <select
                  className="w-full text-sm font-bold border rounded-xl p-3 outline-none focus:ring-4 focus:ring-indigo-100 bg-white shadow-sm"
                  value={newScope}
                  onChange={(e) => {
                    setNewScope(e.target.value);
                    setTargetId("");
                  }}
                >
                  {SCOPES.map((s) => (
                    <option key={s.val} value={s.val}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Acción
                </label>
                <select
                  className={`w-full text-sm border rounded-xl p-3 font-black bg-white shadow-sm transition-all ${newType === "INCLUSION" ? "text-emerald-600" : "text-rose-600"}`}
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                >
                  <option value="INCLUSION">INCLUIR (Viaja)</option>
                  <option value="EXCLUSION">VETAR (No viaja)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Objetivo
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  {newScope === "General" ? (
                    <div className="text-sm text-slate-400 font-medium p-3 bg-white border border-slate-200 rounded-xl italic">
                      Todo el padrón de la gira.
                    </div>
                  ) : (
                    <SearchableSelect
                      options={dynamicOptions}
                      value={targetId}
                      onChange={setTargetId}
                      placeholder={`Buscar...`}
                    />
                  )}
                </div>
                <button
                  onClick={handleAddRule}
                  disabled={loading || (newScope !== "General" && !targetId)}
                  className="bg-slate-900 text-white px-6 rounded-xl hover:bg-black disabled:opacity-20 transition-all font-black text-xs uppercase tracking-widest flex items-center gap-2 shrink-0"
                >
                  <IconPlus size={18} /> AGREGAR
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 mb-4">
              Reglas Activas en este Bus
            </h4>
            {rules.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/50">
                <IconAlertTriangle
                  size={32}
                  className="mx-auto text-slate-200 mb-2"
                />
                <p className="text-slate-400 text-xs font-bold uppercase">
                  Sin pasajeros definidos
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="bg-white p-4 rounded-2xl border border-slate-200 flex justify-between items-center shadow-sm group hover:border-indigo-300 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${rule.tipo === "INCLUSION" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}
                      >
                        {rule.tipo === "INCLUSION" ? (
                          <IconCheck size={20} />
                        ) : (
                          <IconX size={20} />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-black text-slate-700 uppercase tracking-tight">
                          {resolveName(rule)}
                        </div>
                        <div className="flex gap-2 items-center mt-1">
                          <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase">
                            {rule.alcance}
                          </span>
                          <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                            Prio: {rule.prioridad}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="text-slate-300 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <IconTrash size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-5 bg-slate-900 border-t rounded-b-3xl text-white">
          <div className="flex items-start gap-3">
            <IconAlertTriangle className="text-amber-400 mt-0.5" size={16} />
            <p className="text-[11px] text-slate-400 leading-relaxed">
              <strong className="text-white">Doble Validación:</strong> El
              sistema ahora detecta si un músico está incluido por localidad
              pero <strong className="text-white">vetado</strong>{" "}
              individualmente. El check verde ✅ indica que ya está en este bus
              (directa o geográficamente). 
            </p> 
          </div>
        </div>
      </div>
    </div>
  );
} 
