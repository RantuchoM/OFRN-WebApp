import React, { useState, useRef, useEffect, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import SectionStatusControl from "../../components/giras/SectionStatusControl";
import {
  IconClock, IconCheck, IconArrowRight, IconUsers, IconAlertCircle,
  IconBed, IconBus, IconUtensils, IconMusic, IconMegaphone,
  IconCalculator, IconSettings, IconLayers, IconFileText,
  IconMap, IconCalendar, IconLoader, IconRefresh, IconX
} from "../../components/ui/Icons";

import { useLogistics } from "../../hooks/useLogistics";
import { calculateStatsFromData, hasCalculator } from "../../utils/giraStatsCalculators";

const TOUR_SECTIONS = [
  {
    id: "artistic", label: "Artística", colorClass: "text-purple-600 border-purple-100",
    items: [
      { label: "Repertorio", view: "REPERTOIRE", subTab: null, icon: IconMusic, statusKey: "REPERTOIRE" },
      { label: "Seating", view: "REPERTOIRE", subTab: "seating", icon: IconLayers, statusKey: "SEATING" },
      { label: "Mis Partes", view: "REPERTOIRE", subTab: "my_parts", icon: IconFileText, statusKey: null },
    ],
  },
  {
    id: "logistics", label: "Logística", colorClass: "text-orange-600 border-orange-100",
    items: [
      { label: "Rooming", view: "LOGISTICS", subTab: "rooming", icon: IconBed, statusKey: "ROOMING" },
      { label: "Transporte", view: "LOGISTICS", subTab: "transporte", icon: IconBus, statusKey: "TRANSPORTE" },
      { label: "Viáticos", view: "LOGISTICS", subTab: "viaticos", icon: IconCalculator, statusKey: "VIATICOS" },
      { label: "Comidas", view: "LOGISTICS", subTab: "meals", icon: IconUtensils, statusKey: "MEALS" },
      { label: "Reglas Gral.", view: "LOGISTICS", subTab: "coverage", icon: IconMap, statusKey: "LOGISTICA_GRAL" },
    ],
  },
  {
    id: "staff", label: "Gestión", colorClass: "text-blue-600 border-blue-100",
    items: [
      { label: "Staff / Nómina", view: "ROSTER", subTab: null, icon: IconUsers, statusKey: "ROSTER" }, // checkVacancies ya no es necesario como flag especial
      { label: "Agenda", view: "AGENDA", subTab: null, icon: IconCalendar, statusKey: "AGENDA" },
      { label: "Difusión", view: "DIFUSION", subTab: null, icon: IconMegaphone, statusKey: "DIFUSION" },
    ],
  },
  {
    id: "admin", label: "Config", colorClass: "text-slate-500 border-slate-100",
    items: [
      { label: "Edición", view: "EDICION", subTab: null, icon: IconSettings, statusKey: null },
    ],
  },
];

const getTypeColor = (tipo) => {
  switch (tipo) {
    case "Sinfónico": return "border-l-indigo-500 bg-indigo-50/30";
    case "Camerata Filarmónica": return "border-l-purple-500 bg-purple-50/30";
    case "Ensamble": return "border-l-emerald-500 bg-emerald-50/30";
    case "Jazz Band": return "border-l-amber-500 bg-amber-50/30";
    default: return "border-l-slate-400 bg-white";
  }
};

const InteractiveSectionItem = ({
  item, gira, go, supabase, userId, onStatusChange,
  roster, onRequestRefresh, isRosterLoading, externalStats
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [childStats, setChildStats] = useState(null);
  const popoverRef = useRef(null);
  const status = item.statusKey ? gira.statusMap[item.statusKey] : null;
  const isExcluded = status === "NOT_APPLICABLE";
  const ItemIcon = item.icon;

  const currentStats = useMemo(() => {
    if (isExcluded) return null;
    if (externalStats) return externalStats;
    if (childStats) return childStats;
    
    // Cálculo local fallback: Pasamos vacantesCount también
    if (item.statusKey && hasCalculator(item.statusKey)) {
        return calculateStatsFromData(item.statusKey, { 
            roster, 
            vacantesCount: gira.vacantesCount // Dato clave para Staff/Nómina
        });
    }
    return null;
  }, [externalStats, childStats, roster, item.statusKey, isExcluded, gira.vacantesCount]);

  const stripColorClass = useMemo(() => {
    if (isExcluded) return "border-l-4 border-slate-200 bg-slate-50 opacity-60";
    if (!currentStats || !currentStats.kpi?.[0]) return "border-transparent";
    switch (currentStats.kpi[0].color) {
      case "red": return "border-l-4 border-rose-500 bg-rose-50/50";
      case "green": return "border-l-4 border-emerald-500 bg-emerald-50/50";
      case "amber": return "border-l-4 border-amber-500 bg-amber-50/50";
      default: return "border-l-4 border-slate-300";
    }
  }, [currentStats, isExcluded]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleTogglePopover = (e) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
    if (!roster && !isRosterLoading && !isExcluded) {
       onRequestRefresh();
    }
  };

  const handleUpdate = (newStatus) => {
    if (onStatusChange && item.statusKey) onStatusChange(gira.id, item.statusKey, newStatus);
  };

  const handleChildStatsChange = (newStats) => {
    setChildStats(prev => JSON.stringify(prev) !== JSON.stringify(newStats) ? newStats : prev);
  };

  const renderBadge = () => {
    // ELIMINADO: Ya no bloqueamos la renderización si hay vacantes.
    // if (item.checkVacancies && gira.vacantesCount > 0) { ... }
    
    if (!item.statusKey) return null;
    
    let colorClass = "bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100";
    let icon = <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />;
    let text = "Pendiente";
    
    if (status === "IN_PROGRESS") { 
        colorClass = "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"; 
        icon = <IconClock size={10} />; 
        text = "En curso"; 
    } else if (status === "COMPLETED") { 
        colorClass = "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"; 
        icon = <IconCheck size={10} />; 
        text = "OK"; 
    } else if (status === "NOT_APPLICABLE") {
        colorClass = "bg-slate-100 text-slate-400 border-slate-200 opacity-75"; 
        icon = <IconX size={10} />; 
        text = "N/A";
    }
    
    return (
      <button onClick={handleTogglePopover} className={`flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${colorClass}`}>
        {icon}<span>{text}</span>
      </button>
    );
  };

  return (
    <div className="relative group/item">
      <div onClick={() => go(item.view, item.subTab)} className={`w-full text-left flex items-center justify-between p-1.5 rounded-r-lg hover:bg-slate-50 transition-colors cursor-pointer ${stripColorClass} ${stripColorClass === 'border-transparent' ? 'pl-2 rounded-l-lg' : 'pl-2'}`}>
        <div className="flex items-center gap-2 min-w-0 mr-2">
          <ItemIcon size={14} className={`group-hover/item:text-indigo-500 transition-colors shrink-0 ${isExcluded ? 'text-slate-300' : 'text-slate-400'}`} />
          <span className={`text-xs font-medium group-hover/item:text-slate-900 truncate ${isExcluded ? 'text-slate-400 decoration-slate-300' : 'text-slate-600'}`}>{item.label}</span>
        </div>
        <div className="flex items-center gap-2">
            {/* KPI Badge (Ahora incluye Vacantes si es 'ROSTER') */}
            {currentStats?.kpi?.[0] && !isExcluded && (
                <span className={`text-[9px] font-bold px-1 rounded ${
                    currentStats.kpi[0].color === 'red' ? 'text-rose-600 bg-rose-50' : 
                    currentStats.kpi[0].color === 'amber' ? 'text-amber-600 bg-amber-50' : 
                    'text-emerald-600 bg-emerald-50'
                }`}>{currentStats.kpi[0].value} {item.statusKey === 'ROSTER' ? 'Vacantes' : ''}</span>
            )}
            <div className="shrink-0 relative z-10">{renderBadge()}</div>
        </div>
      </div>
      {isOpen && (
        <div ref={popoverRef} className="absolute right-0 top-full mt-1 z-50 bg-white rounded-lg shadow-xl border border-slate-200 p-2 min-w-[240px] animate-in fade-in zoom-in-95 origin-top-right" onClick={(e) => e.stopPropagation()}>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1 flex justify-between items-center">
            <span>Control: {item.label}</span>
            {isRosterLoading && <IconLoader size={10} className="animate-spin text-indigo-500" />}
          </div>
          <SectionStatusControl
            supabase={supabase} giraId={gira.id} sectionKey={item.statusKey} sectionLabel={item.label}
            currentUserId={userId} onUpdate={handleUpdate} onStatsChange={handleChildStatsChange}
            roster={roster} 
            onRefreshRequest={onRequestRefresh} 
            // Inyectamos vacantesCount en la data de cálculo
            calculationData={{ vacantesCount: gira.vacantesCount }}
          />
        </div>
      )}
    </div>
  );
};

export default function DashboardTourCard({ gira, onViewChange, supabase, onStatusChange }) {
  const { user } = useAuth();
  
  const { summary: roster, loading: isRosterLoading, refresh } = useLogistics(supabase, gira);
  
  const [calculationResults, setCalculationResults] = useState({});
  const go = (view, subTab) => onViewChange("GIRAS", gira.id, view, subTab);

  // Cálculo Global al cargar/refrescar
  useEffect(() => {
    if (roster && roster.length > 0) {
        const results = {};
        TOUR_SECTIONS.forEach(section => {
            section.items.forEach(item => {
                const isExcluded = gira.statusMap && gira.statusMap[item.statusKey] === "NOT_APPLICABLE";
                if (!isExcluded && item.statusKey && hasCalculator(item.statusKey)) {
                    const res = calculateStatsFromData(item.statusKey, { 
                        roster,
                        vacantesCount: gira.vacantesCount // Pasamos dato al global también
                    });
                    if(res) results[item.statusKey] = res;
                }
            });
        });
        setCalculationResults(results);
    }
  }, [roster, gira.statusMap, gira.vacantesCount]); 

  const handleAnalyzeGira = (e) => {
    if(e) e.stopPropagation();
    refresh(); 
  };

  const progressStats = useMemo(() => {
    let total = 0, completed = 0, inProgress = 0;
    TOUR_SECTIONS.forEach((section) => {
      section.items.forEach((item) => {
        if (item.statusKey) {
          const st = gira.statusMap[item.statusKey];
          if (st === "NOT_APPLICABLE") return;

          total++;
          if (st === "COMPLETED") completed++; 
          else if (st === "IN_PROGRESS") inProgress++;
        }
      });
    });
    return { total, completed, inProgress, percentage: total === 0 ? 0 : Math.round((completed / total) * 100) };
  }, [gira.statusMap]);

  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 w-full flex flex-col border-l-4 ${getTypeColor(gira.tipo)}`}>
      <div className="p-4 border-b border-slate-100 flex justify-between items-start gap-4">
        <div className="flex items-center gap-4 w-full">
          <div className="flex flex-col items-center justify-center bg-white border border-slate-200 rounded-lg h-12 w-12 shadow-sm shrink-0">
            <span className="text-[10px] font-bold text-rose-600 uppercase">{new Date(gira.fecha_desde).toLocaleString("es-ES", { month: "short" }).replace(".", "")}</span>
            <span className="text-lg font-bold text-slate-800 leading-none">{new Date(gira.fecha_desde).getDate()}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-bold text-slate-800 text-lg truncate">{`${gira.nomenclador} | ${gira.mes_letra}`}</h3>
                  <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100">{gira.zona}</span>
                </div>
                <p className="text-xs text-slate-500 font-medium truncate mb-2">{gira.tipo} • {gira.nombre_gira}</p>
              </div>
              <div className="flex items-center gap-2">
                  <button onClick={handleAnalyzeGira} disabled={isRosterLoading} title="Refrescar datos y recalcular" className={`hidden sm:flex shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border items-center gap-1 shadow-sm transition-all ${isRosterLoading ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100 hover:text-indigo-800'}`}>
                    <IconRefresh size={14} className={isRosterLoading ? "animate-spin" : ""} />{isRosterLoading ? "Cargando..." : "Analizar"}
                  </button>
                  <button onClick={() => go("AGENDA")} className="hidden sm:flex shrink-0 text-xs font-bold text-slate-600 hover:text-indigo-600 hover:bg-slate-50 bg-white px-3 py-1.5 rounded-full border border-slate-200 items-center gap-1 shadow-sm transition-all">Agenda <IconArrowRight size={14} /></button>
              </div>
            </div>
            <div className="w-full max-w-md">
              <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider"><span>Progreso - {progressStats.percentage}%</span><span>{progressStats.completed}/{progressStats.total}</span></div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex"><div style={{ width: `${(progressStats.completed / progressStats.total) * 100}%` }} className="bg-emerald-500 h-full transition-all duration-500" /><div style={{ width: `${(progressStats.inProgress / progressStats.total) * 100}%` }} className="bg-amber-400 h-full transition-all duration-500" /></div>
            </div>
          </div>
        </div>
      </div>
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {TOUR_SECTIONS.map((section) => (
          <div key={section.id} className="flex flex-col gap-2">
            <h4 className={`text-[10px] font-bold uppercase tracking-wider mb-1 border-b pb-1 ${section.colorClass}`}>{section.label}</h4>
            <div className="space-y-1">{section.items.map((item, idx) => (
                <InteractiveSectionItem 
                    key={`${section.id}-${idx}`} 
                    item={item} gira={gira} go={go} supabase={supabase} userId={user?.id} 
                    onStatusChange={onStatusChange} 
                    roster={roster} 
                    onRequestRefresh={refresh}
                    isRosterLoading={isRosterLoading}
                    externalStats={calculationResults[item.statusKey]} 
                />
              ))}</div>
          </div>
        ))}
      </div>
    </div>
  );
}