import React, { useEffect, useMemo, useRef, useState } from "react";
import { getConciertosFullData } from "../../services/giraService";
import { exportAudienceReportToPDF } from "../../utils/agendaPdfExporter";
import { getTodayDateStringLocal, formatDisplayDate } from "../../utils/dates";
import { getProgramStyle } from "../../utils/giraUtils";
import { IconDownload, IconLoader, IconSave } from "../../components/ui/Icons";

const normalize = (val) => String(val || "").trim().toLowerCase();
const formatHora = (raw) => (raw ? String(raw).slice(0, 5) : "-");
const getStartOfYearString = () => {
  const year = new Date().getFullYear();
  return `${year}-01-01`;
};

export default function AudienceView({ supabase }) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [dateFrom, setDateFrom] = useState(getTodayDateStringLocal());
  const [dateTo, setDateTo] = useState("");
  const [selectedProgramTypes, setSelectedProgramTypes] = useState(new Set());
  const [selectedEnsembles, setSelectedEnsembles] = useState(new Set());
  const [draftAudienceById, setDraftAudienceById] = useState({});
  const [savingIds, setSavingIds] = useState(new Set());
  const [recentlySavedIds, setRecentlySavedIds] = useState(new Set());
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

  const programTypes = useMemo(() => {
    const types = new Set();
    rows.forEach((row) => {
      if (row.tipo_programa) types.add(row.tipo_programa);
    });
    return Array.from(types).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  useEffect(() => {
    setSelectedProgramTypes((prev) => {
      const hasPrev = prev.size > 0;
      const next = new Set();
      programTypes.forEach((type) => {
        if (hasPrev) {
          if (prev.has(type)) next.add(type);
        } else if (normalize(type) !== "comisión" && normalize(type) !== "comision") {
          next.add(type);
        }
      });
      return next;
    });
  }, [programTypes]);

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
    return rows.filter((row) => {
      if (selectedProgramTypes.size > 0 && !selectedProgramTypes.has(row.tipo_programa)) {
        return false;
      }
      if (dateFrom && row.fecha && row.fecha < dateFrom) return false;
      if (dateTo && row.fecha && row.fecha > dateTo) return false;
      if (selectedEnsembles.size === 0) return true;
      return (row.ensambles || []).some((ens) => selectedEnsembles.has(String(ens.id)));
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
        return {
          id: row.id,
          fecha: formatDisplayDate(row.fecha) || row.fecha || "-",
          hora: formatHora(row.hora_inicio),
          programa: programaLabel || "-",
          tipo_programa: row.tipo_programa || "-",
          tipo_programa_color: getProgramStyle(row.tipo_programa).color,
          ensamblesNombres: ensambleLines,
          ensamblesLabel: ensambleLines.join(", ") || "-",
          locacionLocalidad: [row.locacion || "-", row.localidad || "-"].join("\n"),
          audiencia: draftAudienceById[row.id] ?? "",
          audienciaPersistida:
            row.audiencia == null || row.audiencia === "" ? "" : Math.max(0, Number(row.audiencia) || 0),
        };
      }),
    [filteredRows, draftAudienceById],
  );

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

  const handleSetThisYear = () => {
    setDateFrom(getStartOfYearString());
    setDateTo(getTodayDateStringLocal());
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">
              Rango de fechas
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
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
              <button
                type="button"
                onClick={handleSetThisYear}
                className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
              >
                Este año
              </button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">
              Tipo de programa
            </p>
            <div className="max-h-28 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
              {programTypes.length === 0 && (
                <p className="text-xs text-slate-400">Sin tipos disponibles</p>
              )}
              {programTypes.map((type) => (
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
                const draftValue =
                  row.audiencia === "" || row.audiencia == null
                    ? ""
                    : Math.max(0, Number(row.audiencia) || 0);
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
                return (
                  <tr key={row.id} className={`align-top ${row.tipo_programa_color}`}>
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
  );
}
