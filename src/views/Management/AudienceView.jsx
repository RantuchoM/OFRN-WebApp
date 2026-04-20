import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  getConciertosFullData,
  TIPOS_PROGRAMA_ASISTENCIA_MATRIZ,
} from "../../services/giraService";
import { exportAudienceReportToPDF } from "../../utils/agendaPdfExporter";
import {
  getTodayDateStringLocal,
  formatDisplayDate,
  getLastFifteenDaysDateRangeLocal,
} from "../../utils/dates";
import { getProgramStyle } from "../../utils/giraUtils";
import { IconDownload, IconFilter, IconLoader, IconSave } from "../../components/ui/Icons";

/** Tipos con conciertos en audiencia (Comisión no lleva conciertos). */
const TIPOS_PROGRAMA_AUDIENCIA = TIPOS_PROGRAMA_ASISTENCIA_MATRIZ.filter(
  (t) => t !== "Comisión",
);

const formatHora = (raw) => (raw ? String(raw).slice(0, 5) : "-");
const getStartOfYearString = () => {
  const year = new Date().getFullYear();
  return `${year}-01-01`;
};

/** Concierto ya ocurrido (fecha estrictamente anterior a hoy) sin audiencia cargada (vacío o 0). */
function isPastConcertWithoutAudience(fechaIso, draftValue) {
  if (!fechaIso || typeof fechaIso !== "string") return false;
  const today = getTodayDateStringLocal();
  if (fechaIso >= today) return false;
  if (draftValue === "" || draftValue == null) return true;
  const n = Number(draftValue);
  return !Number.isFinite(n) || n === 0;
}

export default function AudienceView({ supabase }) {
  const defaultRange = useMemo(() => getLastFifteenDaysDateRangeLocal(), []);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [dateFrom, setDateFrom] = useState(defaultRange.dateFrom);
  const [dateTo, setDateTo] = useState(defaultRange.dateTo);
  const [selectedProgramTypes, setSelectedProgramTypes] = useState(
    () => new Set(TIPOS_PROGRAMA_AUDIENCIA),
  );
  const [selectedEnsembles, setSelectedEnsembles] = useState(new Set());
  const [draftAudienceById, setDraftAudienceById] = useState({});
  const [savingIds, setSavingIds] = useState(new Set());
  const [recentlySavedIds, setRecentlySavedIds] = useState(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const savedTimersRef = useRef(new Map());

  const loadConciertos = async () => {
    setLoading(true);
    try {
      const data = await getConciertosFullData(supabase, {
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
      });
      const safeData = data || [];
      setRows(safeData);
      const nextDrafts = {};
      safeData.forEach((row) => {
        const audience = Number.isFinite(Number(row?.audiencia)) ? Number(row.audiencia) : "";
        nextDrafts[row.id] = audience;
      });
      setDraftAudienceById(nextDrafts);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConciertos();
  }, [dateFrom, dateTo]);

  useEffect(
    () => () => {
      savedTimersRef.current.forEach((timerId) => clearTimeout(timerId));
      savedTimersRef.current.clear();
    },
    [],
  );

  const ensembles = useMemo(() => {
    const map = new Map();
    rows.forEach((row) => {
      (row.ensambles || []).forEach((ens) => {
        if (ens?.id == null) return;
        if (!map.has(ens.id)) map.set(ens.id, ens.nombre || `Ensamble ${ens.id}`);
      });
    });
    return Array.from(map.entries())
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [rows]);

  useEffect(() => {
    setSelectedEnsembles((prev) => {
      const available = new Set(ensembles.map((e) => String(e.id)));
      return new Set(Array.from(prev).filter((id) => available.has(String(id))));
    });
  }, [ensembles]);

  const filteredRows = useMemo(() => {
    const filtered = rows.filter((row) => {
      if (row.tipo_programa === "Comisión") return false;
      if (selectedProgramTypes.size > 0) {
        const t = row.tipo_programa;
        if (t && TIPOS_PROGRAMA_AUDIENCIA.includes(t)) {
          if (!selectedProgramTypes.has(t)) return false;
        } else {
          const allCanonicalSelected = TIPOS_PROGRAMA_AUDIENCIA.every((c) =>
            selectedProgramTypes.has(c),
          );
          if (!allCanonicalSelected) return false;
        }
      }
      if (dateFrom && row.fecha && row.fecha < dateFrom) return false;
      if (dateTo && row.fecha && row.fecha > dateTo) return false;
      if (selectedEnsembles.size === 0) return true;
      return (row.ensambles || []).some((ens) => selectedEnsembles.has(String(ens.id)));
    });
    // Más reciente primero (hoy → pasado); mismo día: hora más tarde primero
    return filtered.sort((a, b) => {
      const fa = String(a.fecha || "");
      const fb = String(b.fecha || "");
      if (fa !== fb) return fb.localeCompare(fa);
      const ha = String(a.hora_inicio || "");
      const hb = String(b.hora_inicio || "");
      return hb.localeCompare(ha);
    });
  }, [rows, selectedProgramTypes, selectedEnsembles, dateFrom, dateTo]);

  const totalAudience = useMemo(
    () =>
      filteredRows.reduce((acc, row) => {
        const value = Number(draftAudienceById[row.id]);
        return acc + (Number.isFinite(value) ? value : 0);
      }, 0),
    [filteredRows, draftAudienceById],
  );

  const tableRows = useMemo(
    () =>
      filteredRows.map((row) => {
        const ensambleLines = (row.ensambles || [])
          .map((ens) => ens.nombre)
          .filter(Boolean);
        const primeraLineaPrograma = [row.nomenclador, row.mes_letra].filter(Boolean).join(" - ");
        const segundaLineaPrograma = row.nombre_gira || "";
        const programaLabel = [primeraLineaPrograma, segundaLineaPrograma]
          .filter(Boolean)
          .join("\n");
        const fechaIso = row.fecha || "";
        return {
          id: row.id,
          fechaIso,
          fecha: formatDisplayDate(row.fecha) || row.fecha || "-",
          hora: formatHora(row.hora_inicio),
          programa: programaLabel || "-",
          programaLine1: primeraLineaPrograma || row.nombre_gira || "Programa",
          programaSubtitulo: segundaLineaPrograma || "",
          tipo_programa: row.tipo_programa || "-",
          tipo_programa_color: getProgramStyle(row.tipo_programa).color,
          ensamblesNombres: ensambleLines,
          ensamblesLabel: ensambleLines.join(", ") || "-",
          locacionLocalidad: [row.locacion || "-", row.localidad || "-"].join("\n"),
          locacionCorta: [row.locacion, row.localidad].filter(Boolean).join(" · ") || "-",
          audiencia: draftAudienceById[row.id] ?? "",
          audienciaPersistida:
            row.audiencia == null || row.audiencia === "" ? "" : Math.max(0, Number(row.audiencia) || 0),
        };
      }),
    [filteredRows, draftAudienceById],
  );

  const isPresetFifteenDays = useMemo(() => {
    const r = getLastFifteenDaysDateRangeLocal();
    return dateFrom === r.dateFrom && dateTo === r.dateTo;
  }, [dateFrom, dateTo]);

  const isPresetThisYear = useMemo(() => {
    const today = getTodayDateStringLocal();
    return dateFrom === getStartOfYearString() && dateTo === today;
  }, [dateFrom, dateTo]);

  const handleToggleProgramType = (type) => {
    setSelectedProgramTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const handleToggleEnsamble = (id) => {
    const sid = String(id);
    setSelectedEnsembles((prev) => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid);
      else next.add(sid);
      return next;
    });
  };

  const handleAudienceDraftChange = (eventId, nextValue) => {
    const normalized = nextValue === "" ? "" : Math.max(0, Number.parseInt(nextValue, 10) || 0);
    setDraftAudienceById((prev) => ({
      ...prev,
      [eventId]: normalized,
    }));
  };

  const markSavedFlash = (eventId) => {
    const existingTimer = savedTimersRef.current.get(eventId);
    if (existingTimer) clearTimeout(existingTimer);
    setRecentlySavedIds((prev) => new Set(prev).add(eventId));
    const timerId = setTimeout(() => {
      setRecentlySavedIds((prev) => {
        const next = new Set(prev);
        next.delete(eventId);
        return next;
      });
      savedTimersRef.current.delete(eventId);
    }, 2200);
    savedTimersRef.current.set(eventId, timerId);
  };

  const handleSaveAudience = async (eventId) => {
    const rawValue = draftAudienceById[eventId];
    const normalized = rawValue === "" ? null : Math.max(0, Number(rawValue) || 0);
    setSavingIds((prev) => new Set(prev).add(eventId));
    try {
      const { error } = await supabase
        .from("eventos")
        .update({ audiencia: normalized })
        .eq("id", eventId);
      if (error) throw error;
      setRows((prev) =>
        prev.map((row) => (row.id === eventId ? { ...row, audiencia: normalized } : row)),
      );
      setDraftAudienceById((prev) => ({
        ...prev,
        [eventId]: normalized == null ? "" : normalized,
      }));
      markSavedFlash(eventId);
    } catch (err) {
      console.error("Error guardando audiencia:", err);
      alert("No se pudo guardar la audiencia del concierto.");
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(eventId);
        return next;
      });
    }
  };

  const handleExportPdf = () => {
    exportAudienceReportToPDF(tableRows, {
      title: "Gestión de Audiencia",
      subTitle: `${tableRows.length} concierto(s) filtrado(s) · Total: ${totalAudience}`,
    });
  };

  const handleSetFifteenDays = () => {
    const r = getLastFifteenDaysDateRangeLocal();
    setDateFrom(r.dateFrom);
    setDateTo(r.dateTo);
  };

  const handleSetThisYear = () => {
    setDateFrom(getStartOfYearString());
    setDateTo(getTodayDateStringLocal());
  };

  const renderDateRangePresetToggle = () => (
    <div
      className="inline-flex shrink-0 rounded-lg border border-slate-200 bg-slate-100 p-0.5"
      role="group"
      aria-label="Rango de fechas rápido"
    >
      <button
        type="button"
        onClick={handleSetFifteenDays}
        aria-pressed={isPresetFifteenDays}
        className={`rounded-md px-2.5 py-1.5 text-xs font-bold whitespace-nowrap transition-colors sm:px-3 ${
          isPresetFifteenDays
            ? "bg-white text-indigo-800 shadow-sm ring-1 ring-slate-200/80"
            : "text-slate-600 hover:bg-slate-50"
        }`}
      >
        2 semanas
      </button>
      <button
        type="button"
        onClick={handleSetThisYear}
        aria-pressed={isPresetThisYear}
        className={`rounded-md px-2.5 py-1.5 text-xs font-bold whitespace-nowrap transition-colors sm:px-3 ${
          isPresetThisYear
            ? "bg-white text-indigo-800 shadow-sm ring-1 ring-slate-200/80"
            : "text-slate-600 hover:bg-slate-50"
        }`}
      >
        Este año
      </button>
    </div>
  );

  const renderInputState = (row) => {
    const draftValue =
      row.audiencia === "" || row.audiencia == null ? "" : Math.max(0, Number(row.audiencia) || 0);
    const persistedValue =
      row.audienciaPersistida === "" || row.audienciaPersistida == null
        ? ""
        : Math.max(0, Number(row.audienciaPersistida) || 0);
    const isDirty = draftValue !== persistedValue;
    const isSavedRecently = recentlySavedIds.has(row.id);
    const inputStateClasses = isSavedRecently
      ? "border-green-400 bg-green-50 text-green-700"
      : isDirty
        ? "border-orange-400 bg-orange-50 text-orange-700"
        : "border-slate-300 bg-white text-slate-800";
    const pastSinAudiencia = isPastConcertWithoutAudience(row.fechaIso, row.audiencia);
    return { draftValue, persistedValue, isDirty, isSavedRecently, inputStateClasses, pastSinAudiencia };
  };

  const filtersPanel = (
    <div
      className={`rounded-lg border border-slate-200 bg-white p-4 ${
        filtersOpen ? "block" : "hidden"
      } lg:block`}
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">
            Rango de fechas
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <input
              type="date"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <input
              type="date"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <div className="mt-3 hidden lg:block">{renderDateRangePresetToggle()}</div>
        </div>

        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">
            Tipo de programa
          </p>
          <div className="max-h-28 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
            {TIPOS_PROGRAMA_AUDIENCIA.map((type) => (
              <label
                key={type}
                className="flex cursor-pointer items-center gap-2 text-xs text-slate-700"
              >
                <input
                  type="checkbox"
                  checked={selectedProgramTypes.has(type)}
                  onChange={() => handleToggleProgramType(type)}
                />
                <span>{type}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">
            Ensambles
          </p>
          <div className="max-h-28 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
            {ensembles.length === 0 && (
              <p className="text-xs text-slate-400">Sin ensambles disponibles</p>
            )}
            {ensembles.map((ens) => (
              <label
                key={ens.id}
                className="flex cursor-pointer items-center gap-2 text-xs text-slate-700"
              >
                <input
                  type="checkbox"
                  checked={selectedEnsembles.has(String(ens.id))}
                  onChange={() => handleToggleEnsamble(ens.id)}
                />
                <span>{ens.nombre}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={loadConciertos}
          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
          disabled={loading}
        >
          {loading ? "Actualizando..." : "Actualizar"}
        </button>
        <button
          type="button"
          onClick={handleExportPdf}
          className="inline-flex items-center gap-2 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
          disabled={tableRows.length === 0}
        >
          <IconDownload size={14} />
          Exportar PDF
        </button>
        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          Total filtrado: {totalAudience}
        </span>
      </div>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-3 lg:gap-4">
      {/* Filtros (solo móvil) + rango rápido + resumen — siempre visibles */}
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border lg:hidden ${
            filtersOpen
              ? "border-indigo-400 bg-indigo-100 text-indigo-800"
              : "border-slate-300 bg-white text-slate-700"
          }`}
          aria-expanded={filtersOpen}
          aria-label={filtersOpen ? "Ocultar filtros" : "Mostrar filtros"}
        >
          <IconFilter size={20} />
        </button>
        <div className="lg:hidden">{renderDateRangePresetToggle()}</div>
        <span className="min-w-0 flex-1 text-right text-xs font-semibold leading-tight text-slate-600">
          {tableRows.length} concierto(s) · Total {totalAudience}
        </span>
      </div>

      {filtersPanel}

      {/* Escritorio: tabla */}
      <div className="hidden min-h-0 flex-1 flex-col overflow-hidden lg:flex">
        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase tracking-wider text-slate-600">
              <tr>
                <th className="border-b border-slate-200 px-3 py-2 text-left">Fecha</th>
                <th className="border-b border-slate-200 px-3 py-2 text-left">Hora</th>
                <th className="border-b border-slate-200 px-3 py-2 text-left">Programa</th>
                <th className="border-b border-slate-200 px-3 py-2 text-left">Tipo</th>
                <th className="border-b border-slate-200 px-3 py-2 text-left">Ensambles</th>
                <th className="border-b border-slate-200 px-3 py-2 text-left">Locación/Localidad</th>
                <th className="border-b border-slate-200 px-3 py-2 text-left">Audiencia</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-500">
                    Cargando conciertos...
                  </td>
                </tr>
              )}
              {!loading && tableRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-500">
                    No hay conciertos para los filtros seleccionados.
                  </td>
                </tr>
              )}
              {!loading &&
                tableRows.map((row) => {
                  const isSaving = savingIds.has(row.id);
                  const { inputStateClasses, pastSinAudiencia } = renderInputState(row);
                  const rowRing = pastSinAudiencia ? " ring-2 ring-inset ring-orange-400" : "";
                  return (
                    <tr
                      key={row.id}
                      className={`align-top ${row.tipo_programa_color}${rowRing}`}
                    >
                      <td className="border-b border-slate-100 px-3 py-2">{row.fecha}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{row.hora}</td>
                      <td className="whitespace-pre-wrap border-b border-slate-100 px-3 py-2">
                        {row.programa}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">{row.tipo_programa}</td>
                      <td className="whitespace-pre-wrap border-b border-slate-100 px-3 py-2">
                        {row.ensamblesLabel}
                      </td>
                      <td className="whitespace-pre-wrap border-b border-slate-100 px-3 py-2">
                        {row.locacionLocalidad}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            className={`w-24 rounded-lg border px-2 py-1.5 text-sm transition-colors ${inputStateClasses}`}
                            value={row.audiencia}
                            onChange={(e) => handleAudienceDraftChange(row.id, e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveAudience(row.id)}
                            disabled={isSaving}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isSaving ? (
                              <IconLoader size={13} className="animate-spin" />
                            ) : (
                              <IconSave size={13} />
                            )}
                            Guardar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Móvil: lista con scroll + tarjetas */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:hidden">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-0 pb-6 pt-1">
          {loading && (
            <p className="py-8 text-center text-sm text-slate-500">Cargando conciertos...</p>
          )}
          {!loading && tableRows.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">
              No hay conciertos para los filtros seleccionados.
            </p>
          )}
          {!loading && (
            <ul className="space-y-2">
              {tableRows.map((row) => {
                const isSaving = savingIds.has(row.id);
                const { inputStateClasses, pastSinAudiencia } = renderInputState(row);
                const cardRing = pastSinAudiencia ? " ring-2 ring-orange-400" : "";
                return (
                  <li key={row.id}>
                    <div
                      className={`flex items-center gap-2 rounded-xl border border-slate-200/80 p-2.5 shadow-sm ${row.tipo_programa_color}${cardRing}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-slate-600">
                          {row.fecha} · {row.hora}
                        </p>
                        <p className="line-clamp-2 text-sm font-semibold leading-tight text-slate-900">
                          {row.programaLine1}
                          {row.programaSubtitulo ? (
                            <span className="block truncate text-xs font-normal text-slate-600">
                              {row.programaSubtitulo}
                            </span>
                          ) : null}
                        </p>
                        <p className="truncate text-[11px] text-slate-500">{row.locacionCorta}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          inputMode="numeric"
                          className={`w-[4.5rem] rounded-lg border px-2 py-1.5 text-right text-sm font-semibold transition-colors ${inputStateClasses}`}
                          value={row.audiencia}
                          onChange={(e) => handleAudienceDraftChange(row.id, e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveAudience(row.id)}
                          disabled={isSaving}
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label="Guardar audiencia"
                        >
                          {isSaving ? (
                            <IconLoader size={18} className="animate-spin" />
                          ) : (
                            <IconSave size={18} />
                          )}
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
