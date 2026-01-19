import React, { useState, useMemo } from "react";
import {
  IconUtensils,
  IconLoader,
  IconUsers,
  IconPrinter,
  IconBus,
  IconHotel,
  IconChevronDown,
  IconCalendar,
  IconClipboardCheck,
  IconCalculator,
  IconArrowLeft
} from "../../components/ui/Icons";
import { useSearchParams } from "react-router-dom";

// Hooks
import { useLogistics } from "../../hooks/useLogistics";

// Sub-vistas
import LogisticsManager from "./LogisticsManager";
import MealsManager from "./MealsManager";
import MealsAttendance from "./MealsAttendance";
import MealsReport from "./MealsReport";
import GirasTransportesManager from "./GirasTransportesManager";
import RoomingManager from "./RoomingManager";
import ViaticosManager from "./Viaticos/ViaticosManager";

export default function LogisticsDashboard({ supabase, gira, onBack, onDataChange }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isMealsMenuOpen, setIsMealsMenuOpen] = useState(false);

  // Pestaña activa desde URL
  const activeTab = searchParams.get("subTab") || "coverage";

  // Hook de Logística
  const { summary, loading } = useLogistics(supabase, gira);

  // --- ESTADÍSTICAS MATRIZ DOBLE ENTRADA ---
  const stats = useMemo(() => {
    const data = {
        m_local: 0, m_viajero: 0,
        f_local: 0, f_viajero: 0,
        total: 0
    };

    if (!summary || summary.length === 0) return data;

    // IDs de localidades sede (extraídos de la metadata que useLogistics adjunta al array)
    const sedeIds = summary.viaticosMeta?.sedeIds || [];

    summary.forEach((curr) => {
      // ---------------------------------------------------------
      // CORRECCIÓN: Usar 'estado_gira' en lugar de 'estado'
      // ---------------------------------------------------------
      const estado = (curr.estado_gira || "").toUpperCase();
      
      // Filtrar bajas o ausentes
      if (estado === "BAJA" || estado === "AUSENTE") return;

      data.total++;
      
      // 1. Determinar Localía (Comparando ID localidad vs Sedes)
      const pLoc = curr.id_localidad ? parseInt(curr.id_localidad) : null;
      const isLocal = pLoc && sedeIds.includes(pLoc);

      // 2. Determinar Género
      const g = (curr.genero || "").toUpperCase();
      const isMale = g.startsWith("M");
      const isFemale = g.startsWith("F");

      // 3. Llenar Matriz
      if (isMale) {
          if (isLocal) data.m_local++;
          else data.m_viajero++;
      } else if (isFemale) {
          if (isLocal) data.f_local++;
          else data.f_viajero++;
      }
      // (Otros géneros suman al total pero no entran en la matriz binaria M/F visual)
    });

    return data;
  }, [summary]);

  const handleTabChange = (newTab) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.set("subTab", newTab);
      return newParams;
    });
    setIsMealsMenuOpen(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in fade-in">
      
      {/* HEADER UNIFICADO */}
      <div className="bg-white border-b border-slate-200 shadow-sm px-4 pt-3 pb-0 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 shrink-0 print:hidden relative z-20 min-h-[3.5rem]">
        
        {/* IZQUIERDA: Botón Volver + Loader */}
        <div className="flex items-center gap-4 mb-3">
          <button
            onClick={onBack}
            className="text-slate-400 hover:text-indigo-600 font-bold text-xs flex items-center gap-1 transition-colors uppercase tracking-wider"
            title="Salir del Dashboard"
          >
            <IconArrowLeft size={16} /> Volver
          </button>
          
          {loading && (
            <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
              <IconLoader className="animate-spin" size={12} /> Actualizando...
            </div>
          )}
        </div>

        {/* DERECHA: Cuadro Resumen + Pestañas */}
        <div className="flex flex-wrap items-end justify-end gap-4 h-full">
            
            {/* CUADRO RESUMEN (DOBLE ENTRADA) */}
            {!loading && (
              <div className="hidden lg:grid grid-cols-4 gap-x-2 gap-y-0.5 bg-slate-50 border border-slate-200 rounded-md p-1.5 mb-2 shadow-sm select-none text-[9px] leading-none">
                  {/* Headers Columnas */}
                  <div className="text-transparent">.</div>
                  <div className="font-bold text-slate-400 text-center" title="Locales (Sede)">Loc</div>
                  <div className="font-bold text-slate-400 text-center" title="Viajeros (No Sede)">Viaj</div>
                  <div className="font-bold text-slate-300 text-center">Tot</div>

                  {/* Fila Masculino */}
                  <div className="font-bold text-slate-500">Masc</div>
                  <div className="font-bold text-slate-700 text-center">{stats.m_local}</div>
                  <div className="font-bold text-slate-700 text-center">{stats.m_viajero}</div>
                  <div className="text-slate-400 text-center">{stats.m_local + stats.m_viajero}</div>

                  {/* Fila Femenino */}
                  <div className="font-bold text-slate-500">Fem</div>
                  <div className="font-bold text-slate-700 text-center">{stats.f_local}</div>
                  <div className="font-bold text-slate-700 text-center">{stats.f_viajero}</div>
                  <div className="text-slate-400 text-center">{stats.f_local + stats.f_viajero}</div>

                  {/* Fila Totales */}
                  <div className="font-bold text-indigo-500 pt-1 border-t border-slate-200">Total</div>
                  <div className="font-bold text-indigo-600 text-center pt-1 border-t border-slate-200">{stats.m_local + stats.f_local}</div>
                  <div className="font-bold text-indigo-600 text-center pt-1 border-t border-slate-200">{stats.m_viajero + stats.f_viajero}</div>
                  <div className="font-bold text-indigo-600 text-center pt-1 border-t border-slate-200">{stats.total}</div>
              </div>
            )}

            {/* PESTAÑAS */}
            <div className="flex gap-1 h-full overflow-visible items-end pb-[1px]"> 
              
              <TabButton 
                active={activeTab === "coverage"} 
                onClick={() => handleTabChange("coverage")} 
                icon={<IconClipboardCheck size={16} />} 
                label="Reglas" 
              />

              <TabButton 
                active={activeTab === "transporte"} 
                onClick={() => handleTabChange("transporte")} 
                icon={<IconBus size={16} />} 
                label="Transporte" 
              />

              <TabButton 
                active={activeTab === "rooming"} 
                onClick={() => handleTabChange("rooming")} 
                icon={<IconHotel size={16} />} 
                label="Rooming" 
              />

              <TabButton 
                active={activeTab === "viaticos"} 
                onClick={() => handleTabChange("viaticos")} 
                icon={<IconCalculator size={16} />} 
                label="Viáticos" 
              />

              {/* Dropdown Comidas */}
              <div
                className="relative h-full flex items-end"
                onMouseEnter={() => setIsMealsMenuOpen(true)}
                onMouseLeave={() => setIsMealsMenuOpen(false)}
              >
                <button
                  className={`px-4 pb-3 pt-2 text-sm font-bold border-b-[3px] flex items-center gap-2 transition-colors whitespace-nowrap ${
                    ["meals", "attendance", "report"].includes(activeTab)
                      ? "border-orange-500 text-orange-600 bg-gradient-to-t from-orange-50/50 to-transparent"
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <IconUtensils size={16} />
                  Comidas
                  <IconChevronDown size={12} className={`transition-transform ${isMealsMenuOpen ? "rotate-180" : ""}`} />
                </button>

                {isMealsMenuOpen && (
                  <div className="absolute top-full right-0 mt-[-2px] bg-white border border-slate-200 rounded-b-lg shadow-xl z-50 flex flex-col min-w-[160px] py-1 animate-in fade-in zoom-in-95">
                    <DropdownItem 
                      active={activeTab === "meals"} 
                      onClick={() => handleTabChange("meals")} 
                      icon={<IconCalendar size={14} />} 
                      label="Agenda / Menú" 
                      colorClass="text-orange-700 bg-orange-50"
                    />
                    <DropdownItem 
                      active={activeTab === "attendance"} 
                      onClick={() => handleTabChange("attendance")} 
                      icon={<IconUsers size={14} />} 
                      label="Asistencia" 
                      colorClass="text-emerald-700 bg-emerald-50"
                    />
                    <DropdownItem 
                      active={activeTab === "report"} 
                      onClick={() => handleTabChange("report")} 
                      icon={<IconPrinter size={14} />} 
                      label="Reporte" 
                      colorClass="text-slate-900 bg-slate-100"
                    />
                  </div>
                )}
              </div>
            </div>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === "coverage" && (
          <LogisticsManager supabase={supabase} gira={gira} onBack={null} />
        )}

        {activeTab === "meals" && (
          <MealsManager supabase={supabase} gira={gira} roster={summary} onDataChange={onDataChange} />
        )}
        {activeTab === "attendance" && (
          <MealsAttendance supabase={supabase} gira={gira} roster={summary} onDataChange={onDataChange}/>
        )}
        {activeTab === "report" && (
          <MealsReport supabase={supabase} gira={gira} roster={summary} onDataChange={onDataChange}/>
        )}
        
        {activeTab === "rooming" && (
          <RoomingManager supabase={supabase} program={gira} onDataChange={onDataChange}/>
        )}
        
        {activeTab === "transporte" && gira?.id && (
          <GirasTransportesManager supabase={supabase} gira={gira} onDataChange={onDataChange} />
        )}

        {activeTab === "viaticos" && gira?.id && (
          <ViaticosManager 
            supabase={supabase} 
            giraId={gira.id}
            onClose={onBack} 
            onDataChange={onDataChange}
          />
        )}
      </div>
    </div>
  );
}

// --- SUB-COMPONENTES ---

const TabButton = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`px-4 pb-3 pt-2 text-sm font-bold border-b-[3px] flex items-center gap-2 transition-colors whitespace-nowrap ${
      active
        ? "border-indigo-600 text-indigo-700 bg-gradient-to-t from-indigo-50/50 to-transparent"
        : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
    }`}
  >
    {icon} {label}
  </button>
);

const DropdownItem = ({ active, onClick, icon, label, colorClass }) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className={`px-4 py-2 text-left text-xs flex items-center gap-2 w-full hover:bg-slate-50 transition-colors ${
      active ? `${colorClass} font-bold` : "text-slate-600"
    }`}
  >
    {icon} {label}
  </button>
);