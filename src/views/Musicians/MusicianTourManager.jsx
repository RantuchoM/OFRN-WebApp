import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  IconCheck,
  IconX,
  IconLoader,
  IconFilter,
  IconTrash,
  IconPlus,
  IconRefresh,
  IconChevronDown,
  IconUser
} from "../../components/ui/Icons";
import { getProgramStyle } from "../../utils/giraUtils";

// --- HELPERS ---
const getMonthName = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const userTimezoneOffset = date.getTimezoneOffset() * 60000;
  const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
  return new Intl.DateTimeFormat("es-ES", { month: "long" }).format(adjustedDate);
};

const formatDateDayMonth = (dateString) => {
  if (!dateString) return "-";
  const d = new Date(dateString);
  return `${d.getUTCDate().toString().padStart(2, '0')}/${(d.getUTCMonth() + 1).toString().padStart(2, '0')}`;
};

// --- COMPONENTE INTERNO: DROPDOWN MULTI-SELECCIÓN ---
const MultiFilterDropdown = ({ label, options, selected, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target))
        setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const toggleOption = (val) => {
    let newSet = new Set(selected);
    if (val === "TODOS") {
        onChange(newSet.has("TODOS") ? newSet : new Set(["TODOS"]));
        setIsOpen(false);
        return;
    }
    if (newSet.has("TODOS")) newSet.delete("TODOS");
    if (newSet.has(val)) newSet.delete(val);
    else newSet.add(val);
    if (newSet.size === 0) newSet.add("TODOS");
    onChange(newSet);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
          selected.size > 0 && !selected.has("TODOS")
            ? "bg-indigo-50 border-indigo-200 text-indigo-700"
            : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
        }`}
      >
        <IconFilter size={14} />
        {label} {selected.size > 0 && !selected.has("TODOS") && `(${selected.size})`}
        <IconChevronDown size={12} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div 
                className={`p-2 border-b border-slate-50 hover:bg-slate-50 cursor-pointer text-xs font-bold ${selected.has("TODOS") ? "text-indigo-600 bg-indigo-50/50" : "text-slate-500"}`}
                onClick={() => toggleOption("TODOS")}
            >
                Todos
            </div>
            <div className="max-h-60 overflow-y-auto p-1">
                {options.map(opt => (
                    <div 
                        key={opt.value} 
                        onClick={() => toggleOption(opt.value)}
                        className="flex items-center gap-2 p-2 hover:bg-indigo-50 rounded-lg cursor-pointer"
                    >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selected.has(opt.value) ? "bg-indigo-600 border-indigo-600" : "border-slate-300"}`}>
                            {selected.has(opt.value) && <IconCheck size={10} className="text-white" />}
                        </div>
                        <span className="text-xs text-slate-700">{opt.label}</span>
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  );
};

export default function MusicianTourManager({ supabase, musician }) {
  const [loading, setLoading] = useState(true);
  const [giras, setGiras] = useState([]);
  const [overrides, setOverrides] = useState({});
  const [sourcesMap, setSourcesMap] = useState({});
  const [dbMusicianData, setDbMusicianData] = useState(null);
  const [rolesList, setRolesList] = useState([]); 
  const [ensembleMap, setEnsembleMap] = useState({}); 
  const [processingId, setProcessingId] = useState(null); 
  const [updatingRole, setUpdatingRole] = useState(null); 

  // Filtros
  const [selectedTypes, setSelectedTypes] = useState(new Set(["TODOS"]));
  const [selectedStatuses, setSelectedStatuses] = useState(new Set(["TODOS"]));
  const [dateRange, setDateRange] = useState("FUTURE");

  useEffect(() => {
    if (musician?.id) {
        fetchData();
    }
  }, [musician?.id, dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Catálogos
      const [rolesRes, ensemblesRes] = await Promise.all([
        supabase.from("roles").select("id, color, orden").order("orden"),
        supabase.from("ensambles").select("id, ensamble")
      ]);
      
      if (rolesRes.data) setRolesList(rolesRes.data);
      if (ensemblesRes.data) {
        const eMap = {};
        ensemblesRes.data.forEach(e => eMap[e.id] = e.ensamble);
        setEnsembleMap(eMap);
      }

      // 2. Datos del músico
      const { data: dbMusician, error: errMus } = await supabase
        .from("integrantes")
        .select(`
            id, condicion, fecha_alta, fecha_baja, id_instr,
            instrumentos (familia),
            integrantes_ensambles (id_ensamble)
        `)
        .eq("id", musician.id)
        .single();

      if (errMus) throw errMus;
      setDbMusicianData(dbMusician);

      // 3. Giras
      let query = supabase
        .from("programas")
        .select("id, nombre_gira, fecha_desde, fecha_hasta, tipo, estado, mes_letra, zona, nomenclador")
        .order("fecha_desde", { ascending: true }); 

      if (dateRange === "FUTURE") {
        const today = new Date().toISOString().split('T')[0];
        query = query.gte("fecha_hasta", today);
      }

      const { data: girasData, error: errGiras } = await query;
      if (errGiras) throw errGiras;

      if (!girasData || girasData.length === 0) {
        setGiras([]);
        setLoading(false);
        return;
      }

      // 4. Fuentes y Overrides
      const giraIds = girasData.map((g) => g.id);
      
      const { data: fuentesData } = await supabase
        .from("giras_fuentes")
        .select("*")
        .in("id_gira", giraIds);

      const fMap = {};
      fuentesData?.forEach((f) => {
        if (!fMap[f.id_gira]) fMap[f.id_gira] = [];
        fMap[f.id_gira].push(f);
      });

      const { data: overridesData } = await supabase
        .from("giras_integrantes")
        .select("id, id_gira, estado, rol") 
        .eq("id_integrante", musician.id)
        .in("id_gira", giraIds);

      const oMap = {};
      overridesData?.forEach((o) => {
        oMap[o.id_gira] = o;
      });

      setGiras(girasData);
      setSourcesMap(fMap);
      setOverrides(oMap);
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- CÁLCULO DE ESTADO ---
  const processedGiras = useMemo(() => {
    if (!dbMusicianData) return [];

    const normalize = (str) => str ? String(str).toLowerCase().trim() : "";

    const instrumentoRel = dbMusicianData.instrumentos;
    const instrumentoObj = Array.isArray(instrumentoRel) ? instrumentoRel[0] : instrumentoRel;
    const myFamily = normalize(instrumentoObj?.familia);
    const isEstable = normalize(dbMusicianData.condicion) === "estable" || normalize(dbMusicianData.condicion) === "contratado"; 
    
    const myEnsembleIds = new Set(
       dbMusicianData.integrantes_ensambles?.map(ie => String(ie.id_ensamble)) || []
    );

    const fechaAlta = dbMusicianData.fecha_alta ? new Date(dbMusicianData.fecha_alta) : null;
    const fechaBaja = dbMusicianData.fecha_baja ? new Date(dbMusicianData.fecha_baja) : null;

    return giras.map((gira) => {
      const override = overrides[gira.id];
      const sources = sourcesMap[gira.id] || [];
      
      const giraInicio = gira.fecha_desde ? new Date(gira.fecha_desde) : new Date();
      const giraFin = gira.fecha_hasta ? new Date(gira.fecha_hasta) : new Date();
      giraFin.setHours(23, 59, 59, 999);

      let isBaseCandidate = false;
      let isExcluded = false;

      sources.forEach(src => {
        if (src.tipo === "FAMILIA" && isEstable) {
            if (normalize(src.valor_texto) === myFamily) isBaseCandidate = true;
        }
        if (src.tipo === "ENSAMBLE") {
           if (myEnsembleIds.has(String(src.valor_id))) isBaseCandidate = true;
        }
        if (src.tipo === "EXCL_ENSAMBLE") {
           if (myEnsembleIds.has(String(src.valor_id))) isExcluded = true;
        }
      });

      let isBaseValid = false;
      if (isBaseCandidate && !isExcluded) {
         const startsBeforeEnd = !fechaAlta || fechaAlta <= giraFin;
         const endsAfterStart = !fechaBaja || fechaBaja >= giraInicio;
         if (startsBeforeEnd && endsAfterStart) isBaseValid = true;
      }

      let status = "NO_CONVOCADO";
      let situation = "NONE"; 

      if (override) {
        if (override.estado === "confirmado") {
            status = "CONVOCADO";
            // Si califica por base pero tiene override, es BASE_FORCED (Ej: se le cambió el rol)
            // Si NO califica por base, es ADICIONAL
            situation = isBaseValid ? "BASE_FORCED" : "ADDITIONAL"; 
        } else {
            status = "AUSENTE";
            situation = isBaseValid ? "BASE_ABSENT" : "IRRELEVANT_ABSENT";
        }
      } else {
        if (isBaseValid) {
            status = "CONVOCADO";
            situation = "BASE_OK";
        } else {
            status = "NO_CONVOCADO";
            situation = "NONE";
        }
      }

      return {
        ...gira,
        computedStatus: status,
        situation, 
        isBaseValid, 
        override,
        sources
      };
    });
  }, [giras, overrides, sourcesMap, dbMusicianData]);

  const filteredList = useMemo(() => {
    return processedGiras.filter(g => {
        if (!selectedTypes.has("TODOS") && !selectedTypes.has(g.tipo)) return false;
        if (!selectedStatuses.has("TODOS") && !selectedStatuses.has(g.computedStatus)) return false;
        return true;
    });
  }, [processedGiras, selectedTypes, selectedStatuses]);

  // --- ACTIONS ---
  const handleAction = async (giraId, action) => {
    if (!musician.id) return;
    setProcessingId(giraId);
    
    // Recuperamos el ID existente para asegurar UPDATE
    const currentOverride = overrides[giraId];
    const existingId = currentOverride?.id;

    try {
      if (action === "DELETE") {
        await supabase.from("giras_integrantes").delete().eq("id_gira", giraId).eq("id_integrante", musician.id);
        const newOverrides = { ...overrides }; delete newOverrides[giraId]; setOverrides(newOverrides);
      } else {
        const targetStatus = action === "SET_PRESENT" ? "confirmado" : "ausente";
        const currentRol = currentOverride?.rol || "musico";
        
        const payload = { 
            ...(existingId ? { id: existingId } : {}), 
            id_gira: giraId, 
            id_integrante: musician.id, 
            estado: targetStatus, 
            rol: currentRol 
        };
        
        const { data: savedData, error } = await supabase.from("giras_integrantes").upsert(payload).select().single();
        if (error) throw error;

        setOverrides(prev => ({ ...prev, [giraId]: savedData }));
      }
    } catch (err) { alert("Error: " + err.message); } finally { setProcessingId(null); }
  };

  const handleRoleChange = async (giraId, newRole) => {
    const currentOverride = overrides[giraId];
    const existingId = currentOverride?.id;
    const currentStatus = currentOverride?.estado || "confirmado"; 

    if (currentOverride?.rol === newRole) return;

    setUpdatingRole(giraId);
    try {
        const payload = { 
            ...(existingId ? { id: existingId } : {}), 
            id_gira: giraId, 
            id_integrante: musician.id, 
            estado: currentStatus, 
            rol: newRole 
        };
        const { data: savedData, error } = await supabase.from("giras_integrantes").upsert(payload).select().single();
        if(error) throw error;

        setOverrides(prev => ({ ...prev, [giraId]: savedData }));
    } catch (err) { alert("Error actualizando rol"); } finally { setUpdatingRole(null); }
  };

  if (loading && giras.length === 0) return <div className="p-10 flex justify-center text-slate-400"><IconLoader className="animate-spin" /></div>;

  const typeOptions = ["Sinfónico", "Camerata Filarmónica", "Ensamble", "Jazz Band", "Comisión"].map(t => ({ value: t, label: t }));
  const statusOptions = [{value:"CONVOCADO", label:"Convocado"}, {value:"AUSENTE", label:"Ausente"}, {value:"NO_CONVOCADO", label:"No Convocado"}];

  // Estilos de botones
  const btnBaseClass = "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50";
  const btnOutlineClass = `${btnBaseClass} border`;
  const btnSolidClass = `${btnBaseClass} shadow-sm hover:shadow-md`;

  return (
    <div className="space-y-4 animate-in fade-in h-full flex flex-col">
        {/* BARRA DE CONTROL */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 shrink-0">
            <MultiFilterDropdown label="Tipo Programa" options={typeOptions} selected={selectedTypes} onChange={setSelectedTypes} />
            <MultiFilterDropdown label="Estado" options={statusOptions} selected={selectedStatuses} onChange={setSelectedStatuses} />
            <div className="ml-auto flex items-center gap-2">
                 <button 
                    onClick={() => setDateRange(prev => prev === "FUTURE" ? "ALL" : "FUTURE")}
                    className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg hover:bg-indigo-100 transition-colors uppercase tracking-wider"
                 >
                    {dateRange === "FUTURE" ? "Ver Historial" : "Ver Futuros"}
                 </button>
            </div>
        </div>

        {/* LISTADO */}
        <div className="flex-1 overflow-y-auto min-h-0 pr-2 custom-scrollbar">
            <div className="grid grid-cols-1 gap-3">
                {filteredList.length === 0 && (
                    <div className="text-center py-10 text-slate-400 italic">No hay giras que coincidan con los filtros.</div>
                )}
                {filteredList.map(gira => {
                    const isProcessing = processingId === gira.id;
                    const style = getProgramStyle(gira.tipo);
                    const isConvocado = gira.computedStatus === "CONVOCADO";
                    const isAusente = gira.computedStatus === "AUSENTE";
                    
                    const bgClass = style.color.match(/bg-[-\w]+-\d+/)?.[0] || "bg-slate-50";
                    const borderClass = style.color.match(/border-[-\w]+-\d+/)?.[0] || "border-slate-200";
                    const textClass = style.color.match(/text-[-\w]+-\d+/)?.[0] || "text-slate-600";

                    let cardClasses = "";
                    
                    if (isAusente) {
                        cardClasses = "bg-red-50 border border-red-200 border-l-4 border-l-red-400 opacity-90";
                    } else if (isConvocado) {
                        const borderDarker = borderClass.replace("200", "500").replace("border-", "border-l-");
                        cardClasses = `${bgClass} border ${borderClass} border-l-4 shadow-sm ${borderDarker}`;
                    } else {
                        cardClasses = "bg-slate-50 border border-slate-200 border-l-4 border-l-slate-300 text-slate-500 opacity-70 grayscale-[0.3]";
                    }

                    // Lógica para color del Rol
                    const currentRolId = gira.override?.rol || "musico";
                    const currentRolData = rolesList.find(r => r.id === currentRolId);
                    
                    // Detectar si es Hex (#...) o Clase CSS
                    let roleStyle = {};
                    let roleClass = "text-slate-600";
                    
                    if (currentRolData?.color) {
                        if (currentRolData.color.startsWith("#") || currentRolData.color.startsWith("rgb")) {
                            roleStyle = { color: currentRolData.color };
                            roleClass = ""; // Usamos style
                        } else {
                            roleClass = currentRolData.color; // Usamos clase
                        }
                    }
                    
                    const monthName = getMonthName(gira.fecha_desde);

                    return (
                        <div key={gira.id} className={`p-4 rounded-xl transition-all shadow-sm ${cardClasses} relative group`}>
                            <div className="flex items-center justify-between gap-4">
                                
                                {/* COLUMNA IZQUIERDA: CAJA FECHA */}
                                <div className="p-2 rounded-lg bg-white/60 shadow-sm border border-black/5 shrink-0 flex flex-col items-center justify-center min-w-[3.5rem]">
                                    <span className="text-sm font-black opacity-80 leading-none">{formatDateDayMonth(gira.fecha_desde)}</span>
                                    <span className="text-[9px] font-bold uppercase opacity-50 my-0.5">al</span>
                                    <span className="text-sm font-black opacity-80 leading-none">{formatDateDayMonth(gira.fecha_hasta)}</span>
                                </div>

                                {/* COLUMNA CENTRAL: DATOS */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center flex-wrap gap-2 mb-1 opacity-70">
                                        {!isConvocado && !isAusente && (
                                            <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 rounded border bg-white ${borderClass} ${textClass}`}>
                                                {gira.tipo}
                                            </span>
                                        )}
                                        {(isConvocado || isAusente) && (
                                            <span className="text-[9px] font-black uppercase tracking-wider">
                                                {gira.tipo}
                                            </span>
                                        )}
                                        
                                        <span className="text-[9px] font-bold uppercase tracking-wider border-l border-black/20 pl-2">
                                            {gira.zona || "Sin Zona"}
                                        </span>
                                        <span className="text-[11px] font-bold uppercase tracking-wider border-l border-black/20 pl-2">
                                            {gira.mes_letra || monthName} | {gira.nomenclador || ""}
                                        </span>
                                    </div>

                                    <h4 className={`font-bold text-base truncate ${isConvocado ? 'opacity-100' : 'opacity-80'}`}>
                                        {gira.nombre_gira}
                                    </h4>
                                    
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                        {gira.sources.map((src, i) => {
                                            const isExclusion = src.tipo === "EXCL_ENSAMBLE";
                                            let label = src.valor_texto;
                                            if (src.tipo.includes("ENSAMBLE")) {
                                                label = ensembleMap[src.valor_id] || `Ensamble #${src.valor_id}`;
                                            }

                                            return (
                                                <span key={i} className={`text-[11px] px-1.5 rounded border flex items-center gap-1 bg-white/80 ${
                                                    isExclusion 
                                                        ? "border-red-200 text-red-400 line-through decoration-red-400" 
                                                        : "border-black/10 opacity-70"
                                                }`}>
                                                    {label}
                                                </span>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* COLUMNA DERECHA: ROL Y ACCIONES */}
                                <div className="flex items-center gap-3 shrink-0">
                                    
                                    {/* Selector Rol */}
                                    <div className="flex items-center gap-1 bg-white/50 px-2 py-1 rounded-lg border border-black/5 hover:border-black/10 transition-colors">
                                        <IconUser size={12} className="opacity-40" style={roleStyle} />
                                        <div className="relative">
                                            {updatingRole === gira.id ? (
                                                <IconLoader className="animate-spin opacity-50" size={12} />
                                            ) : (
                                                <select
                                                    value={currentRolId}
                                                    onChange={(e) => handleRoleChange(gira.id, e.target.value)}
                                                    style={roleStyle}
                                                    className={`bg-transparent text-[10px] font-black outline-none cursor-pointer hover:opacity-80 transition-all pr-4 appearance-none uppercase tracking-wide w-24 text-right truncate ${roleClass}`}
                                                >
                                                    {rolesList.map(role => (
                                                        <option key={role.id} value={role.id} className="text-slate-600 font-bold">
                                                            {role.id}
                                                        </option>
                                                    ))}
                                                </select>
                                            )}
                                            <IconChevronDown size={10} className="absolute right-0 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" style={roleStyle} />
                                        </div>
                                    </div>

                                    {/* Botones de Acción */}
                                    <div>
                                        {/* Caso 1 y 2: PRESENTE (Base OK o Base Forzado) -> Botón Ausente */}
                                        {(gira.situation === "BASE_OK" || gira.situation === "BASE_FORCED") && (
                                            <div className="flex gap-1">
                                                {/* Si es FORZADO (cambio de rol), botón Restaurar pequeño opcional o usar DELETE */}
                                                {/* Para simplificar, si está presente, botón Ausente. Si se quiere borrar el rol custom, hay que ponerlo ausente y luego restaurar, o bien agregar un botón de reset si es forced */}
                                                
                                                {/* Decisión: Si es BASE_FORCED, mostramos Restaurar (Borrar) para volver a base pura */}
                                                {gira.situation === "BASE_FORCED" && (
                                                    <button onClick={() => handleAction(gira.id, "DELETE")} disabled={isProcessing} className={`${btnOutlineClass} text-slate-400 border-slate-200 hover:bg-slate-100 hover:text-slate-600 bg-white`} title="Restaurar rol original">
                                                        {isProcessing ? <IconLoader className="animate-spin" size={14}/> : <IconRefresh size={14}/>}
                                                    </button>
                                                )}

                                                <button onClick={() => handleAction(gira.id, "SET_ABSENT")} disabled={isProcessing} className={`${btnOutlineClass} text-red-600 border-red-200 hover:bg-red-50 bg-white`} title="Marcar Ausente">
                                                    {isProcessing ? <IconLoader className="animate-spin" size={14}/> : <IconX size={14}/>} 
                                                    <span className="hidden sm:inline">Marcar Ausente</span>
                                                </button>
                                            </div>
                                        )}

                                        {gira.situation === "ADDITIONAL" && (
                                            <button onClick={() => handleAction(gira.id, "DELETE")} disabled={isProcessing} className={`${btnOutlineClass} text-slate-500 border-slate-300 hover:bg-slate-100 hover:text-red-600 bg-white`} title="Eliminar adicional">
                                                {isProcessing ? <IconLoader className="animate-spin" size={14}/> : <IconTrash size={14}/>}
                                                <span className="hidden sm:inline">Borrar</span>
                                            </button>
                                        )}

                                        {gira.situation === "BASE_ABSENT" && (
                                            <button onClick={() => handleAction(gira.id, "DELETE")} disabled={isProcessing} className={`${btnOutlineClass} text-emerald-600 border-emerald-200 hover:bg-emerald-50 bg-white`} title="Quitar Ausente">
                                                {isProcessing ? <IconLoader className="animate-spin" size={14}/> : <IconRefresh size={14}/>}
                                                <span className="hidden sm:inline">Restaurar</span>
                                            </button>
                                        )}

                                        {gira.situation === "NONE" && (
                                            <button onClick={() => handleAction(gira.id, "SET_PRESENT")} disabled={isProcessing} className={`${btnSolidClass} bg-indigo-600 text-white hover:bg-indigo-700`}>
                                                {isProcessing ? <IconLoader className="animate-spin" size={14}/> : <IconPlus size={14}/>} 
                                                <span className="hidden sm:inline">Sumar Adicional</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    </div>
  );
}