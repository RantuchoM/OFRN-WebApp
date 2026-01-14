import React from "react";
import {
  IconCalendar,
  IconColumns,
  IconInfo,
  IconList,
  IconEye,
  IconMusic,
  IconMap,
  IconFilter,
  
} from "../../components/ui/Icons";
import DateInput from "../../components/ui/DateInput";

export default function GirasListControls({
  mode,
  updateView,
  showRepertoireInCards,
  setShowRepertoireInCards,
  filterDateStart,
  setFilterDateStart,
  filterDateEnd,
  setFilterDateEnd,
  filterType,
  toggleFilterType,
  filterStatus,
  toggleFilterStatus,
}) {
  // --- LÓGICA DE GRUPOS UNIFICADOS ---

  // 1. Sinfónico + Camerata
  const isSinfonicoActive =
    filterType.has("Sinfónico") || filterType.has("Camerata Filarmónica");
  const toggleSinfonicoGroup = () => {
    // Alternamos ambos valores para que funcionen como un solo bloque
    toggleFilterType("Sinfónico");
    toggleFilterType("Camerata Filarmónica");
  };

  // 2. Cámara (Ensamble)
  const isCamaraActive = filterType.has("Ensamble");
  const toggleCamaraGroup = () => {
    toggleFilterType("Ensamble");
  };

  // 3. Jazz Band (Directo)
  const isJazzActive = filterType.has("Jazz Band");

  return (
    <div className="flex flex-wrap items-center gap-3 w-full">
      {/* 1. TÍTULO Y VISTAS */}
      <div className="flex items-center gap-2 mr-auto sm:mr-0">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          {mode === "CALENDAR" ? (
            <IconCalendar className="text-indigo-600" />
          ) : mode === "WEEKLY" ? (
            <IconColumns className="text-indigo-600" />
          ) : mode === "FULL_AGENDA" ? (
            <IconMusic className="text-indigo-600" />
          ) : (
            <IconMap className="text-indigo-600" />
          )}
          <span className="hidden xl:inline">
            {mode === "CALENDAR"
              ? "Calendario"
              : mode === "WEEKLY"
              ? "Semanal"
              : mode === "FULL_AGENDA"
              ? "Agenda"
              : "Programas"}
          </span>
        </h2>
       
        {/* Selector de Vistas Compacto */}
        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          {[
            { id: "LIST", icon: IconList, title: "Lista" },
            { id: "CALENDAR", icon: IconCalendar, title: "Mes" },
            { id: "WEEKLY", icon: IconColumns, title: "Semana" },
            { id: "FULL_AGENDA", icon: IconInfo, title: "Info" },
          ].map((v) => (
            <button
              key={v.id}
              onClick={() => updateView(v.id)}
              className={`p-1 rounded-md transition-all ${
                mode === v.id
                  ? "bg-white shadow-sm text-indigo-600"
                  : "text-slate-400 hover:text-slate-600"
              }`}
              title={v.title}
            >
              <v.icon size={16} />
            </button>
          ))}
        </div>
      </div>
 {/* VER OBRAS (Al final) */}
        <button
          onClick={() => setShowRepertoireInCards(!showRepertoireInCards)}
          className={`ml-auto px-2 py-1 rounded-md border transition-all flex items-center gap-1.5 ${
            showRepertoireInCards
              ? "bg-indigo-150 border-indigo-300 text-indigo-600"
              : "bg-white border-slate-200 text-slate-400 hover:text-slate-600"
          }`}
          title="Ver Repertorio en tarjetas"
        >
          <IconMusic size={16} />
        </button>
      {/* SEPARADOR */}
      <div className="h-6 w-px bg-slate-200 hidden md:block"></div>

      {/* 2. CONTROLES DE FILTRO (Solo en modo Lista) */}
      {mode === "LIST" && (
        <div className="flex flex-1 items-center gap-3 overflow-x-auto no-scrollbar pb-1 md:pb-0">
          {/* FECHAS COMPACTAS */}
          <div className="flex items-center gap-1 min-w-fit">
            <div className="w-24">
              <DateInput
                value={filterDateStart}
                onChange={setFilterDateStart}
                placeholder="Desde"
                className="h-7 text-xs py-0"
              />
            </div>
            <span className="text-slate-300 text-[10px]">➜</span>
            <div className="w-24">
              <DateInput
                value={filterDateEnd}
                onChange={setFilterDateEnd}
                placeholder="Hasta"
                className="h-7 text-xs py-0"
              />
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200 hidden lg:block"></div>

          {/* TIPOS UNIFICADOS */}
          <div className="flex bg-slate-50 p-0.5 rounded-lg border border-slate-200 min-w-fit">
            <button
              onClick={toggleSinfonicoGroup}
              className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all ${
                isSinfonicoActive
                  ? "bg-white text-indigo-600 shadow-sm border border-slate-100"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              Sinfónico
            </button>
            <div className="w-px bg-slate-200 my-1"></div>
            <button
              onClick={toggleCamaraGroup}
              className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all ${
                isCamaraActive
                  ? "bg-white text-emerald-600 shadow-sm border border-slate-100"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              Cámara
            </button>
            <div className="w-px bg-slate-200 my-1"></div>
            <button
              onClick={() => toggleFilterType("Jazz Band")}
              className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all ${
                isJazzActive
                  ? "bg-white text-amber-600 shadow-sm border border-slate-100"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              Jazz
            </button>
          </div>

          <div className="h-6 w-px bg-slate-200 hidden lg:block"></div>

          {/* ESTADOS */}
          <div className="flex gap-1 min-w-fit">
            {["Vigente", "Borrador", "Pausada"].map((status) => {
              const isActive = filterStatus.has(status);
              const activeClasses = {
                Vigente: "bg-green-100 text-green-700 border-green-200",
                Borrador: "bg-slate-200 text-slate-700 border-slate-300",
                Pausada: "bg-amber-100 text-amber-700 border-amber-200",
              };
              return (
                <button
                  key={status}
                  onClick={() => toggleFilterStatus(status)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border transition-all ${
                    isActive
                      ? activeClasses[status]
                      : "bg-white border-slate-200 text-slate-300 hover:border-slate-300"
                  }`}
                  title={`Filtrar ${status}`}
                >
                  {status.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
