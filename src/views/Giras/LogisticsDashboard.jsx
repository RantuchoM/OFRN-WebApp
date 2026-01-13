import React, { useState } from "react";
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

import LogisticsManager from "./LogisticsManager";
import MealsManager from "./MealsManager";
import MealsAttendance from "./MealsAttendance";
import MealsReport from "./MealsReport";
import GirasTransportesManager from "./GirasTransportesManager";
import { useGiraRoster } from "../../hooks/useGiraRoster";
import RoomingManager from "./RoomingManager";
import ViaticosManager from "./Viaticos/ViaticosManager";

export default function LogisticsDashboard({ supabase, gira, onBack, onDataChange }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isMealsMenuOpen, setIsMealsMenuOpen] = useState(false);

  // Leemos la sub-pestaña de la URL. Por defecto "coverage" (Reglas)
  const activeTab = searchParams.get("subTab") || "coverage";

  // Hook Centralizado
  const { roster, loading: loadingRoster } = useGiraRoster(supabase, gira);

  // Función para cambiar de tab sin perder otros parámetros de la URL
  const handleTabChange = (newTab) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.set("subTab", newTab);
      return newParams;
    });
    setIsMealsMenuOpen(false); // Cerramos menú si estaba abierto
  };

  // Botón "Atrás": Si estamos en una pestaña profunda, volvemos a la principal. Si no, salimos.
  const handleBack = () => {
    if (activeTab !== "coverage") {
      handleTabChange("coverage");
    } else {
      onBack();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in fade-in">
      {/* HEADER DEL DASHBOARD */}
      <div className="bg-white border-b border-slate-200 shadow-sm px-4 py-3 flex flex-col gap- print:hidden">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="text-slate-400 hover:text-indigo-600 font-medium text-sm flex items-center gap-1"
            >
              <IconArrowLeft size={16} /> 
              {activeTab !== "coverage" ? "Volver a Reglas" : "Volver"}
            </button>
          </div>
          <div className="flex justify-between items-end mb-4 border-b border-slate-200">
            <div className="flex gap-6 text-sm font-medium overflow-visible">
              
              {/* 1. REGLAS */}
              <button
                onClick={() => handleTabChange("coverage")}
                className={`pb-2 flex items-center gap-2 transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === "coverage"
                    ? "border-indigo-600 text-indigo-700"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <IconClipboardCheck size={16} /> Reglas
              </button>

              {/* 2. TRANSPORTE */}
              <button
                onClick={() => handleTabChange("transporte")}
                className={`pb-2 flex items-center gap-2 transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === "transporte"
                    ? "border-slate-800 text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <IconBus size={16} /> Transporte
              </button>

              {/* 3. ROOMING */}
              <button
                onClick={() => handleTabChange("rooming")}
                className={`pb-2 flex items-center gap-2 transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === "rooming"
                    ? "border-blue-600 text-blue-700"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <IconHotel size={16} /> Rooming
              </button>

              {/* 4. VIÁTICOS */}
              <button
                onClick={() => handleTabChange("viaticos")}
                className={`pb-2 flex items-center gap-2 transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === "viaticos"
                    ? "border-emerald-600 text-emerald-700"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <IconCalculator size={16} /> Viáticos
              </button>

              {/* 5. COMIDAS (Dropdown) */}
              <div
                className="relative group"
                onMouseEnter={() => setIsMealsMenuOpen(true)}
                onMouseLeave={() => setIsMealsMenuOpen(false)}
              >
                <button
                  onClick={() => setIsMealsMenuOpen(!isMealsMenuOpen)}
                  className={`pb-2 flex items-center gap-2 transition-colors border-b-2 whitespace-nowrap ${
                    ["meals", "attendance", "report"].includes(activeTab)
                      ? "border-orange-500 text-orange-700"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <IconUtensils size={16} />
                  Comidas
                  <IconChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${
                      isMealsMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isMealsMenuOpen && (
                  <div className="absolute top-full left-0 mt-[-2px] bg-white border border-slate-200 rounded-b-lg shadow-xl z-50 flex flex-col min-w-[180px] py-1 animate-in fade-in zoom-in-95 duration-150">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTabChange("meals");
                      }}
                      className={`px-4 py-2 text-left text-xs flex items-center gap-2 hover:bg-orange-50 ${
                        activeTab === "meals"
                          ? "text-orange-700 font-bold bg-orange-50/50"
                          : "text-slate-600"
                      }`}
                    >
                      <IconCalendar size={14} /> Agenda
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTabChange("attendance");
                      }}
                      className={`px-4 py-2 text-left text-xs flex items-center gap-2 hover:bg-emerald-50 ${
                        activeTab === "attendance"
                          ? "text-emerald-700 font-bold bg-emerald-50/50"
                          : "text-slate-600"
                      }`}
                    >
                      <IconUsers size={14} /> Asistencia
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTabChange("report");
                      }}
                      className={`px-4 py-2 text-left text-xs flex items-center gap-2 hover:bg-slate-50 ${
                        activeTab === "report"
                          ? "text-slate-900 font-bold bg-slate-100"
                          : "text-slate-600"
                      }`}
                    >
                      <IconPrinter size={14} /> Reporte
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          {loadingRoster && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <IconLoader className="animate-spin" /> Cargando padrón...
            </div>
          )}
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === "coverage" && (
          <LogisticsManager supabase={supabase} gira={gira} onBack={null} />
        )}

        {activeTab === "meals" && (
          <MealsManager supabase={supabase} gira={gira} roster={roster} onDataChange={onDataChange} />
        )}
        {activeTab === "attendance" && (
          <MealsAttendance supabase={supabase} gira={gira} roster={roster} onDataChange={onDataChange}/>
        )}
        {activeTab === "report" && (
          <MealsReport supabase={supabase} gira={gira} roster={roster} onDataChange={onDataChange}/>
        )}
        
        {activeTab === "rooming" && (
          <RoomingManager supabase={supabase} program={gira} onDataChange={onDataChange}/>
        )}
        
        {activeTab === "transporte" && gira?.id && (
          <GirasTransportesManager supabase={supabase} gira={gira} onDataChange={onDataChange} />
        )}

        {/* --- CORRECCIÓN CRÍTICA AQUÍ --- */}
        {activeTab === "viaticos" && gira?.id && (
          <ViaticosManager 
            supabase={supabase} 
            giraId={gira.id} // <-- Se cambió 'gira={gira}' por 'giraId={gira.id}'
            onClose={handleBack} 
            onDataChange={onDataChange}
          />
        )}
      </div>
    </div>
  );
}