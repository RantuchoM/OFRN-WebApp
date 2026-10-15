import React, { useState, useMemo, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
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
  IconArrowLeft,
  IconPencil,
  IconHelpCircle,
  IconX,
} from "../../components/ui/Icons";
import { useSearchParams } from "react-router-dom";
// Hooks
import { useLogistics } from "../../hooks/useLogistics";
import { useGiraSegmentos } from "../../hooks/useGiraSegmentos";
import {
  buildSegmentSpecs,
  formatTramoTitle,
  isLocalForTramoIndex,
} from "../../utils/giraTramos";

// Sub-vistas
import LogisticsManager from "./LogisticsManager";
import MealsManager from "./MealsManager";
import MealsAttendance from "./MealsAttendance";
import MealsReport from "./MealsReport";
import GirasTransportesManager from "./GirasTransportesManager";
import RoomingManager from "./RoomingManager";
import ViaticosManager from "./Viaticos/ViaticosManager";
import GiraTramosEditModal from "./GiraTramosEditModal";
import { createDefaultMealFilters } from "../../utils/mealLogistics";
import { seatingApellidoNombre } from "../../utils/integranteDisplayName";

const EMPTY_HOSPEDAJE_EXCLUIDOS = Object.freeze([]);

function formatHeadcountLine(person) {
  const name = seatingApellidoNombre(person) || "Sin nombre";
  const residencia =
    person?.localidades_residencia?.localidad ||
    person?._loc_residencia?.localidad ||
    "S/D";
  return `${name} (${residencia})`;
}

function compareHeadcountLines(a, b) {
  return a.label.localeCompare(b.label, "es", { sensitivity: "base" });
}

function NumberedPeople({ people }) {
  if (!people.length) {
    return <p className="text-[11px] italic text-slate-400">Nadie</p>;
  }
  return (
    <ol className="list-decimal space-y-0.5 pl-4 text-[11px] leading-snug text-slate-700">
      {people.map((person) => (
        <li key={person.key} className="pl-0.5 marker:text-slate-400">
          {person.label}
        </li>
      ))}
    </ol>
  );
}

function HeadcountCell({ title, people, tone = "slate" }) {
  const toneClass =
    tone === "indigo"
      ? "border-indigo-200 bg-indigo-50/60"
      : "border-slate-200 bg-white";
  return (
    <div className={`min-w-0 rounded-lg border p-2 ${toneClass}`}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
          {title}
        </span>
        <span className="text-[11px] font-black tabular-nums text-slate-700">
          {people.length}
        </span>
      </div>
      <NumberedPeople people={people} />
    </div>
  );
}

export default function LogisticsDashboard({
  supabase,
  gira,
  onBack,
  onDataChange,
  hospedajeExcluidosIds = EMPTY_HOSPEDAJE_EXCLUIDOS,
  giraGrupos = [],
  filterGrupoIds = [],
  includeGeneralEvents = false,
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isMealsMenuOpen, setIsMealsMenuOpen] = useState(false);
  const [activeTramoIdx, setActiveTramoIdx] = useState(0);
  const [showTramosModal, setShowTramosModal] = useState(false);
  const [showHeadcountDetail, setShowHeadcountDetail] = useState(false);
  /** Filtros compartidos Manager ↔ Asistencia ↔ Reporte (exports usan el set filtrado). */
  const [mealFilters, setMealFilters] = useState(() => createDefaultMealFilters());

  // Pestaña activa desde URL
  const activeTab = searchParams.get("subTab") || "coverage";

  // Hook de Logística
  const { summary, loading, segments, cortesCount, refresh: refreshLogistics } =
    useLogistics(supabase, gira);
  const {
    segmentRows,
    cortes,
    invalidateSegmentos,
    refreshSegmentos,
  } = useGiraSegmentos(supabase, gira, {
    enabled: Boolean(gira?.id),
  });
  const segmentSpecs = useMemo(
    () => buildSegmentSpecs(gira, cortes),
    [gira, cortes],
  );
  const showTramoSelector = cortesCount > 0 && segmentSpecs.length > 1;
  const canEditTramos = Boolean(gira?.id && gira?.fecha_desde && gira?.fecha_hasta);

  const handleTramosSaved = useCallback(() => {
    invalidateSegmentos();
    refreshSegmentos();
    refreshLogistics();
    onDataChange?.();
  }, [
    invalidateSegmentos,
    refreshSegmentos,
    refreshLogistics,
    onDataChange,
  ]);

  useEffect(() => {
    if (activeTramoIdx >= segmentSpecs.length && segmentSpecs.length > 0) {
      setActiveTramoIdx(Math.max(0, segmentSpecs.length - 1));
    }
  }, [segmentSpecs.length, activeTramoIdx]);

  const [showMealsPrint, setShowMealsPrint] = useState(false);
  // --- ESTADÍSTICAS MATRIZ DOBLE ENTRADA (por tramo activo) ---
  const stats = useMemo(() => {
    const buckets = {
      m_local: [],
      m_viajero: [],
      f_local: [],
      f_viajero: [],
      other: [],
    };

    if (!summary || summary.length === 0) {
      return {
        m_local: 0,
        m_viajero: 0,
        f_local: 0,
        f_viajero: 0,
        total: 0,
        vacantes: 0,
        buckets,
      };
    }

    let vacantes = 0;

    summary.forEach((curr, index) => {
      const estado = (curr.estado_gira || "").toUpperCase();
      if (estado === "BAJA" || estado === "AUSENTE") return;
      if (curr.es_simulacion === true || curr.integrantes?.es_simulacion === true) {
        vacantes += 1;
        return;
      }

      const entry = {
        key: String(curr.id ?? curr.id_integrante ?? index),
        label: formatHeadcountLine(curr),
      };
      const g = (curr.genero || "").toUpperCase();
      const isMale = g.startsWith("M");
      const isFemale = g.startsWith("F");
      const isLocal =
        showTramoSelector && segments?.length
          ? isLocalForTramoIndex(
              curr,
              segments,
              activeTramoIdx,
              segmentRows,
            )
          : Boolean(curr.is_local);

      if (isMale) {
        (isLocal ? buckets.m_local : buckets.m_viajero).push(entry);
      } else if (isFemale) {
        (isLocal ? buckets.f_local : buckets.f_viajero).push(entry);
      } else {
        buckets.other.push(entry);
      }
    });

    Object.values(buckets).forEach((list) => list.sort(compareHeadcountLines));

    return {
      m_local: buckets.m_local.length,
      m_viajero: buckets.m_viajero.length,
      f_local: buckets.f_local.length,
      f_viajero: buckets.f_viajero.length,
      total:
        buckets.m_local.length +
        buckets.m_viajero.length +
        buckets.f_local.length +
        buckets.f_viajero.length +
        buckets.other.length,
      vacantes,
      buckets,
    };
  }, [summary, showTramoSelector, segments, activeTramoIdx, segmentRows]);

  const [mealNavEpoch, setMealNavEpoch] = useState(0);

  const handleTabChange = (newTab) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.set("subTab", newTab);
      return newParams;
    });
    setIsMealsMenuOpen(false);
    if (["meals", "attendance", "report"].includes(newTab)) {
      setMealNavEpoch((n) => n + 1);
    }
  };

  // Cobertura usa su propio useLogistics; al ir a comidas/asistencia/reporte
  // (y al pasar entre esas subpestañas) hay que recalcular reglas.
  // Una vez por cambio de pestaña, no por fila.
  useEffect(() => {
    if (["meals", "attendance", "report"].includes(activeTab)) {
      refreshLogistics();
    }
    // Una vez por subTab (o re-click). refreshLogistics no es identidad estable.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tab / epoch only
  }, [activeTab, mealNavEpoch]);

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in fade-in">
      {/* HEADER UNIF ICADO */}
      <div className={`bg-white border-b border-slate-200 shadow-sm px-2.5 sm:px-4 pt-1.5 sm:pt-2.5 pb-0.5 sm:pb-1 flex flex-row items-center justify-between gap-1.5 sm:gap-4 shrink-0 print:hidden relative min-h-[2.75rem] sm:min-h-[3.25rem] ${isMealsMenuOpen ? "z-[100]" : "z-[60]"}`}>
        {/* IZQUIERDA: Botón Volver + Loader */}
        <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
          <button
            onClick={onBack}
            className="text-slate-400 hover:text-indigo-600 font-bold text-[10px] sm:text-xs flex items-center gap-1 transition-colors uppercase tracking-wider"
            title="Salir del Dashboard"
          >
            <IconArrowLeft size={16} />
            <span className="hidden sm:inline">Volver</span>
          </button>

          {loading && (
            <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
              <IconLoader className="animate-spin" size={12} /> Actualizando...
            </div>
          )}

          {showTramoSelector && (
            <div className="flex lg:hidden items-center gap-0.5 overflow-x-auto max-w-[140px] sm:max-w-none">
              {segmentSpecs.map((spec, idx) => (
                <button
                  key={spec?.id ?? idx}
                  type="button"
                  onClick={() => setActiveTramoIdx(idx)}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold border shrink-0 ${
                    activeTramoIdx === idx
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-600 border-slate-200"
                  }`}
                >
                  T{idx + 1}
                </button>
              ))}
              {canEditTramos && (
                <button
                  type="button"
                  onClick={() => setShowTramosModal(true)}
                  title="Editar tramos, localías y cortes"
                  className="p-1 rounded border border-slate-200 bg-white text-slate-500 hover:text-indigo-600 hover:border-indigo-300 shrink-0"
                >
                  <IconPencil size={11} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* DERECHA: Cuadro Resumen + Pestañas */}
        <div className="flex items-end justify-end gap-1.5 sm:gap-4 h-full min-w-0 flex-1 ml-2 sm:ml-8">
          {/* Selector de tramo + CUADRO RESUMEN */}
          {!loading && (
            <div className="flex flex-col items-end gap-1 mb-2 shrink-0">
              {showTramoSelector && (
                <div className="hidden lg:flex items-center gap-1 overflow-x-auto max-w-[320px]">
                  {segmentSpecs.map((spec, idx) => {
                    const label =
                      spec?.fecha_desde && spec?.fecha_hasta
                        ? formatTramoTitle(
                            idx,
                            spec.fecha_desde,
                            spec.fecha_hasta,
                          )
                        : `Tramo ${idx + 1}`;
                    return (
                      <button
                        key={spec?.id ?? idx}
                        type="button"
                        onClick={() => setActiveTramoIdx(idx)}
                        title={label}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold whitespace-nowrap border transition-colors ${
                          activeTramoIdx === idx
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        T{idx + 1}
                      </button>
                    );
                  })}
                  {canEditTramos && (
                    <button
                      type="button"
                      onClick={() => setShowTramosModal(true)}
                      title="Editar tramos, localías y cortes"
                      className="p-1 rounded border border-slate-200 bg-white text-slate-500 hover:text-indigo-600 hover:border-indigo-300 shrink-0"
                    >
                      <IconPencil size={11} />
                    </button>
                  )}
                </div>
              )}
              <div className="flex items-start gap-1">
              <button
                type="button"
                onClick={() => setShowHeadcountDetail(true)}
                title="Ver quiénes integran el cuadro"
                className="lg:hidden inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 hover:border-indigo-300 hover:text-indigo-600"
              >
                <IconHelpCircle size={12} />
              </button>
              <div className="hidden lg:grid grid-cols-4 gap-x-2 gap-y-0.5 bg-slate-50 border border-slate-200 rounded-md p-1.5 shadow-sm select-none text-[9px] leading-none">
              <button
                type="button"
                onClick={() => setShowHeadcountDetail(true)}
                title="Ver quiénes integran el cuadro"
                className="inline-flex items-center justify-center text-slate-400 hover:text-indigo-600"
              >
                <IconHelpCircle size={11} />
              </button>
              <div
                className="font-bold text-slate-400 text-center"
                title={
                  showTramoSelector
                    ? "Locales en el tramo seleccionado"
                    : "Locales (Sede)"
                }
              >
                Loc
              </div>
              <div
                className="font-bold text-slate-400 text-center"
                title={
                  showTramoSelector
                    ? "Viajeros en el tramo seleccionado"
                    : "Viajeros (No Sede)"
                }
              >
                Viaj
              </div>
              <div className="font-bold text-slate-300 text-center">Tot</div>

              {/* Fila Masculino */}
              <div className="font-bold text-slate-500">Masc</div>
              <div className="font-bold text-slate-700 text-center">
                {stats.m_local}
              </div>
              <div className="font-bold text-slate-700 text-center">
                {stats.m_viajero}
              </div>
              <div className="text-slate-400 text-center">
                {stats.m_local + stats.m_viajero}
              </div>

              {/* Fila Femenino */}
              <div className="font-bold text-slate-500">Fem</div>
              <div className="font-bold text-slate-700 text-center">
                {stats.f_local}
              </div>
              <div className="font-bold text-slate-700 text-center">
                {stats.f_viajero}
              </div>
              <div className="text-slate-400 text-center">
                {stats.f_local + stats.f_viajero}
              </div>

              {/* Fila Totales */}
              <div className="font-bold text-indigo-500 pt-1 border-t border-slate-200">
                Total
              </div>
              <div className="font-bold text-indigo-600 text-center pt-1 border-t border-slate-200">
                {stats.m_local + stats.f_local}
              </div>
              <div className="font-bold text-indigo-600 text-center pt-1 border-t border-slate-200">
                {stats.m_viajero + stats.f_viajero}
              </div>
              <div
                className="font-bold text-indigo-600 text-center pt-1 border-t border-slate-200 whitespace-nowrap"
                title={
                  stats.vacantes > 0
                    ? `${stats.total} personas + ${stats.vacantes} vacantes`
                    : undefined
                }
              >
                {stats.total}
                {stats.vacantes > 0 && (
                  <span className="text-amber-500"> +{stats.vacantes}</span>
                )}
              </div>
            </div>
              </div>
            </div>
          )}

          {/* PESTAÑAS */}
          <div className="flex-1 min-w-0">
            <div className="flex gap-0.5 sm:gap-1 h-full overflow-x-auto items-end pb-0 scrollbar-none lg:overflow-visible">
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
              <div className="relative h-full flex items-end">
                <button
                  type="button"
                  onClick={() => setIsMealsMenuOpen((open) => !open)}
                  className={`px-2 sm:px-4 pb-1.5 sm:pb-3 pt-1 sm:pt-2 text-[10px] sm:text-sm font-bold border-b-[3px] flex items-center gap-1 sm:gap-2 transition-colors whitespace-nowrap ${
                    ["meals", "attendance", "report"].includes(activeTab)
                      ? "border-orange-500 text-orange-600 bg-gradient-to-t from-orange-50/50 to-transparent"
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <IconUtensils size={16} />
                  <span className="hidden sm:inline">Comidas</span>
                  <IconChevronDown
                    size={12}
                    className={`transition-transform ${isMealsMenuOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Dropdown pegado al botón: solo escritorio */}
                {isMealsMenuOpen && (
                  <div className="hidden lg:flex lg:flex-col absolute top-full right-0 mt-[-2px] bg-white border border-slate-200 rounded-b-lg shadow-xl z-[120] min-w-[160px] py-1 animate-in fade-in zoom-in-95">
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
      </div>

      {/* DROPDOWN COMIDAS - SOLO MÓVIL (overlay pequeño, alineado a la derecha) */}
      {isMealsMenuOpen && (
        <div className="lg:hidden fixed right-3 top-[3.6rem] z-[100]">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl flex flex-col min-w-[160px] py-1">
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
        </div>
      )}

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
          {activeTab === "coverage" && (
            <LogisticsManager
              supabase={supabase}
              gira={gira}
              onBack={null}
              activeTramoIdx={activeTramoIdx}
              onLogisticsChange={refreshLogistics}
            />
          )}

          {activeTab === "meals" && (
            <MealsManager
              supabase={supabase}
              gira={gira}
              roster={summary}
              onDataChange={onDataChange}
              hospedajeExcluidosIds={hospedajeExcluidosIds}
              giraGrupos={giraGrupos}
              filterGrupoIds={filterGrupoIds}
              includeGeneralEvents={includeGeneralEvents}
              mealFilters={mealFilters}
              onMealFiltersChange={setMealFilters}
              mealNavEpoch={mealNavEpoch}
              onLogisticsRefresh={refreshLogistics}
            />
          )}
          {activeTab === "attendance" && (
            <MealsAttendance
              supabase={supabase}
              gira={gira}
              roster={summary}
              onDataChange={onDataChange}
              hospedajeExcluidosIds={hospedajeExcluidosIds}
              giraGrupos={giraGrupos}
              mealFilters={mealFilters}
              onMealFiltersChange={setMealFilters}
            />
          )}
          {activeTab === "report" && (
            <MealsReport
              supabase={supabase}
              gira={gira}
              roster={summary}
              onDataChange={onDataChange}
              hospedajeExcluidosIds={hospedajeExcluidosIds}
              giraGrupos={giraGrupos}
              mealFilters={mealFilters}
              onMealFiltersChange={setMealFilters}
              mealNavEpoch={mealNavEpoch}
            />
          )}

          {activeTab === "rooming" && (
            <RoomingManager
              supabase={supabase}
              program={gira}
              onDataChange={onDataChange}
            />
          )}

          {activeTab === "transporte" && gira?.id && (
            <GirasTransportesManager
              supabase={supabase}
              gira={gira}
              onDataChange={onDataChange}
              giraGrupos={giraGrupos}
              filterGrupoIds={filterGrupoIds}
              includeGeneralEvents={includeGeneralEvents}
            />
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

      <GiraTramosEditModal
        supabase={supabase}
        gira={gira}
        isOpen={showTramosModal}
        onClose={() => setShowTramosModal(false)}
        onSaved={handleTramosSaved}
      />
      {showHeadcountDetail && (
        <HeadcountDetailModal
          stats={stats}
          tramoLabel={
            showTramoSelector
              ? segmentSpecs[activeTramoIdx]?.fecha_desde
                ? formatTramoTitle(
                    activeTramoIdx,
                    segmentSpecs[activeTramoIdx].fecha_desde,
                    segmentSpecs[activeTramoIdx].fecha_hasta,
                  )
                : `Tramo ${activeTramoIdx + 1}`
              : null
          }
          onClose={() => setShowHeadcountDetail(false)}
        />
      )}
      </div>
    
  );
}

// --- SUB-COMPONENTES ---

function TabButton({ active, onClick, icon, label }) {
  const baseClasses =
    "px-2 sm:px-4 pb-1.5 sm:pb-3 pt-1 sm:pt-2 text-[10px] sm:text-sm font-bold border-b-[3px] flex items-center gap-1 sm:gap-2 transition-colors whitespace-nowrap";
  const stateClasses = active
    ? "border-indigo-600 text-indigo-700 bg-gradient-to-t from-indigo-50/50 to-transparent"
    : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50";

  return (
    <button onClick={onClick} className={`${baseClasses} ${stateClasses}`}>
      {icon}
      <span
        className={`max-w-[6rem] truncate ${
          active ? "inline" : "hidden sm:inline"
        }`}
      >
        {label}
      </span>
    </button>
  );
}

const DropdownItem = ({ active, onClick, icon, label, colorClass }) => {
  const baseClasses =
    "px-4 py-2 text-left text-xs flex items-center gap-2 w-full hover:bg-slate-50 transition-colors";
  const stateClasses = active ? `${colorClass} font-bold` : "text-slate-600";

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`${baseClasses} ${stateClasses}`}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
};

function HeadcountDetailModal({ stats, tramoLabel, onClose }) {
  const { buckets } = stats;
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm animate-in fade-in sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-xl border border-slate-200 bg-white shadow-2xl sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-800">
              Quiénes integran el cuadro
            </h3>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Apellido, Nombre (localidad de residencia)
              {tramoLabel ? ` · ${tramoLabel}` : ""}. Cada lista está numerada.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
            title="Cerrar"
          >
            <IconX size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          {buckets.other.length > 0 && (
            <div className="mb-3">
              <HeadcountCell
                title="Sin género"
                people={buckets.other}
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Loc
            </div>
            <div className="text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Viaj
            </div>

            <HeadcountCell title="Masc" people={buckets.m_local} />
            <HeadcountCell title="Masc" people={buckets.m_viajero} />

            <HeadcountCell title="Fem" people={buckets.f_local} />
            <HeadcountCell title="Fem" people={buckets.f_viajero} />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
