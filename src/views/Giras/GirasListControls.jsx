import React from "react";
import {
  IconCalendar,
  IconColumns,
  IconInfo,
  IconList,
  IconEye,
  IconFilter,
  IconMusic,
  IconMap,
} from "../../components/ui/Icons";
import DateInput from "../../components/ui/DateInput";

export default function GirasListControls({
  mode,
  updateView,
  showRepertoireInCards,
  setShowRepertoireInCards,
  showFiltersMobile,
  setShowFiltersMobile,
  filterDateStart,
  setFilterDateStart,
  filterDateEnd,
  setFilterDateEnd,
  filterType,
  toggleFilterType,
  PROGRAM_TYPES,
  filterStatus, // <--- NUEVA PROP
  toggleFilterStatus, // <--- NUEVA PROP
}) {
  // --- SUB-COMPONENTES DE FILTRO ---
  const renderTypeFilterChips = (isMobile = false) => (
    <div className={`flex flex-wrap gap-2 ${isMobile ? "pt-2" : ""}`}>
      {PROGRAM_TYPES.map((type) => (
        <button
          key={type}
          onClick={() => toggleFilterType(type)}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${
            filterType.has(type)
              ? "bg-indigo-600 text-white border-indigo-700"
              : "bg-white text-slate-500 border-slate-300 hover:bg-slate-50"
          }`}
        >
          {type}
        </button>
      ))}
    </div>
  );

  const renderDateInputs = (isMobile = false) => (
    <div className="flex items-center gap-2">
      <div className={`${isMobile ? "w-full" : "w-32"}`}>
        <DateInput
          label={null}
          value={filterDateStart}
          onChange={setFilterDateStart}
          placeholder="Desde"
          className="w-full"
        />
      </div>
      <span className="text-slate-400 text-xs">-</span>
      <div className={`${isMobile ? "w-full" : "w-32"}`}>
        <DateInput
          label={null}
          value={filterDateEnd}
          onChange={setFilterDateEnd}
          placeholder="Hasta"
          className="w-full"
        />
      </div>
    </div>
  );

  return (
    <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
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
          <span className="hidden sm:inline">
            {mode === "CALENDAR"
              ? "Calendario Mensual"
              : mode === "WEEKLY"
              ? "Vista Semanal"
              : mode === "FULL_AGENDA"
              ? "Agenda Completa"
              : "Programas"}
          </span>
        </h2>

        {/* BOTONES DE CAMBIO DE VISTA (RECUPERADOS) */}
        <div className="flex bg-slate-100 p-0.5 rounded-lg ml-2">
          <button
            onClick={() => updateView("LIST")}
            className={`p-1.5 rounded-md transition-all ${
              ["LIST"].includes(mode)
                ? "bg-white shadow-sm text-indigo-600"
                : "text-slate-400 hover:text-slate-600"
            }`}
            title="Lista"
          >
            <IconList size={18} />
          </button>
          <button
            onClick={() => updateView("CALENDAR")}
            className={`p-1.5 rounded-md transition-all ${
              mode === "CALENDAR"
                ? "bg-white shadow-sm text-indigo-600"
                : "text-slate-400 hover:text-slate-600"
            }`}
            title="Mes"
          >
            <IconCalendar size={18} />
          </button>
          <button
            onClick={() => updateView("WEEKLY")}
            className={`p-1.5 rounded-md transition-all ${
              mode === "WEEKLY"
                ? "bg-white shadow-sm text-indigo-600"
                : "text-slate-400 hover:text-slate-600"
            }`}
            title="Semana"
          >
            <IconColumns size={18} />
          </button>
          <button
            onClick={() => updateView("FULL_AGENDA")}
            className={`p-1.5 rounded-md transition-all ${
              mode === "FULL_AGENDA"
                ? "bg-white shadow-sm text-indigo-600"
                : "text-slate-400 hover:text-slate-600"
            }`}
            title="Agenda"
          >
            <IconInfo size={24} />
          </button>
        </div>
      </div>

      {mode === "LIST" && (
        <>
          {/* BARRA DE FILTROS ESCRITORIO */}
          <div className="p-2 md:p-0 space-y-3 md:space-y-0 md:flex md:items-center md:gap-4">
            <button
              onClick={() => setShowRepertoireInCards(!showRepertoireInCards)}
              className={`hidden md:flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${
                showRepertoireInCards
                  ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                  : "bg-white text-slate-500 border-slate-200 hover:text-indigo-600"
              }`}
            >
              <IconEye size={16} />
              <span>
                {showRepertoireInCards ? "Ocultar Obras" : "Ver Obras"}
              </span>
            </button>
            
            <button
              className="md:hidden p-2 text-slate-500"
              onClick={() => setShowFiltersMobile(!showFiltersMobile)}
            >
              <IconFilter size={20} />
            </button>

            <div className="hidden md:flex items-center gap-4">
              {renderDateInputs()}
              {renderTypeFilterChips()}
            </div>
          </div>

          {/* BARRA DE FILTROS MÓVIL */}
          {showFiltersMobile && (
            <div className="w-full md:hidden px-4 pb-3 flex flex-col gap-2 border-t border-slate-100 mt-2 pt-2">
              <button
                onClick={() => setShowRepertoireInCards(!showRepertoireInCards)}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-colors border ${
                  showRepertoireInCards
                    ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                    : "bg-white text-slate-500 border-slate-200"
                }`}
              >
                <IconMusic size={16} />
                <span>
                  {showRepertoireInCards
                    ? "Ocultar Repertorio"
                    : "Ver Repertorio"}
                </span>
              </button>
              <div className="flex gap-2">{renderDateInputs(true)}</div>
              {renderTypeFilterChips(true)}
            </div>
          )}
          {/* --- NUEVO FILTRO DE ESTADO --- */}
      <div className="h-6 w-px bg-slate-300 mx-2 hidden md:block"></div>
      <div className="flex items-center gap-1">
         {['Vigente', 'Borrador', 'Pausada'].map(status => {
             const isActive = filterStatus.has(status);
             const colors = {
                 'Vigente': isActive ? 'bg-green-100 text-green-700 border-green-200' : 'text-slate-500 hover:bg-slate-100',
                 'Borrador': isActive ? 'bg-slate-200 text-slate-700 border-slate-300' : 'text-slate-500 hover:bg-slate-100',
                 'Pausada': isActive ? 'bg-amber-100 text-amber-700 border-amber-200' : 'text-slate-500 hover:bg-slate-100'
             };
             
             return (
                 <button
                    key={status}
                    onClick={() => toggleFilterStatus(status)}
                    className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${colors[status]} ${!isActive ? 'border-transparent' : ''}`}
                 >
                    {status}
                 </button>
             )
         })}
      </div>
        </>
      )}
    </div>
  );
}