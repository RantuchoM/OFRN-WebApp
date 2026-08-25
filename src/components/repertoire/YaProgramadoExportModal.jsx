import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  IconX,
  IconDownload,
  IconFileText,
  IconLoader,
  IconPlus,
} from "../ui/Icons";
import { PROGRAM_TYPES, getProgramTypeColor } from "../../utils/giraUtils";
import {
  exportYaProgramadoExcel,
  exportYaProgramadoPdf,
  prepareYaProgramadoExportWorks,
} from "../../utils/repertoireYaProgramadoExport";

const PROGRAM_TYPE_OPTIONS = Object.keys(PROGRAM_TYPES).filter((k) => k !== "default");

const SORT_OPTIONS = [
  { key: "compositor", label: "Compositor" },
  { key: "pais", label: "País" },
  { key: "obra", label: "Obra" },
  { key: "arreglador", label: "Arreglador" },
  { key: "organico", label: "Orgánico" },
  { key: "duracion", label: "Duración" },
  { key: "programas", label: "Programas (fecha)" },
  { key: "fecha", label: "F. Esperada" },
  { key: "observaciones", label: "Observaciones" },
  { key: "tags", label: "Palabras clave" },
];

const TIME_SCOPE_OPTIONS = [
  { value: "todos", label: "Todos" },
  { value: "historico", label: "Solo histórico" },
  { value: "futuro", label: "Solo futuro" },
];

const DEFAULT_SORT_RULES = [{ key: "compositor", direction: "asc" }];

/**
 * Modal para exportar la vista «Ya programado»: tipo, tiempo, orden multicriterio.
 */
export default function YaProgramadoExportModal({
  isOpen,
  onClose,
  works = [],
  visibleColumns = {},
}) {
  const [selectedTypes, setSelectedTypes] = useState(
    () => new Set(PROGRAM_TYPE_OPTIONS),
  );
  const [timeScope, setTimeScope] = useState("todos");
  const [sortRules, setSortRules] = useState(() => [...DEFAULT_SORT_RULES]);
  const [exporting, setExporting] = useState(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const preparedWorks = useMemo(
    () =>
      prepareYaProgramadoExportWorks(works, {
        types: selectedTypes,
        timeScope,
        sortRules,
      }),
    [works, selectedTypes, timeScope, sortRules],
  );

  const usedSortKeys = useMemo(
    () => new Set(sortRules.map((r) => r.key)),
    [sortRules],
  );

  const availableToAdd = SORT_OPTIONS.filter((opt) => !usedSortKeys.has(opt.key));

  const toggleType = (tipo) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(tipo)) next.delete(tipo);
      else next.add(tipo);
      return next;
    });
  };

  const selectAllTypes = () => setSelectedTypes(new Set(PROGRAM_TYPE_OPTIONS));
  const clearTypes = () => setSelectedTypes(new Set());

  const updateSortRule = (index, patch) => {
    setSortRules((prev) =>
      prev.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)),
    );
  };

  const removeSortRule = (index) => {
    setSortRules((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const addSortRule = () => {
    const next = availableToAdd[0];
    if (!next) return;
    setSortRules((prev) => [...prev, { key: next.key, direction: "asc" }]);
  };

  const stamp = () => {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  };

  const handleExport = async (kind) => {
    if (selectedTypes.size === 0) {
      toast.error("Seleccioná al menos un tipo de programa.");
      return;
    }
    if (preparedWorks.length === 0) {
      toast.error("No hay obras que coincidan con los filtros.");
      return;
    }
    setExporting(kind);
    const fileName = `Obras_ya_programadas_${stamp()}`;
    try {
      if (kind === "excel") {
        await exportYaProgramadoExcel(preparedWorks, visibleColumns, fileName);
        toast.success("Excel descargado.");
      } else {
        exportYaProgramadoPdf(preparedWorks, visibleColumns, fileName);
        toast.success("PDF descargado.");
      }
      onClose();
    } catch (err) {
      toast.error(err.message || "No se pudo exportar.");
    } finally {
      setExporting(null);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ya-programado-export-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4">
          <div>
            <h2
              id="ya-programado-export-title"
              className="text-lg font-bold text-slate-800"
            >
              Descargar obras programadas
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Filtrá tipos y período; sumá columnas para ordenar.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
            aria-label="Cerrar"
          >
            <IconX size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <section>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                Tipos de programa
              </h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAllTypes}
                  className="text-[10px] font-bold text-indigo-600 hover:underline"
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={clearTypes}
                  className="text-[10px] font-bold text-slate-400 hover:underline"
                >
                  Ninguno
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {PROGRAM_TYPE_OPTIONS.map((tipo) => {
                const active = selectedTypes.has(tipo);
                const label = PROGRAM_TYPES[tipo]?.label || tipo;
                return (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => toggleType(tipo)}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition-colors ${
                      active
                        ? getProgramTypeColor(tipo)
                        : "border-slate-200 bg-white text-slate-400 opacity-60"
                    } ${active ? "ring-1 ring-offset-1 ring-indigo-200" : ""}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-[10px] font-black uppercase tracking-wide text-slate-400">
              Período
            </h3>
            <div className="flex overflow-hidden rounded-lg border border-slate-300">
              {TIME_SCOPE_OPTIONS.map((opt, idx) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTimeScope(opt.value)}
                  className={`flex-1 px-2 py-2 text-xs font-bold ${
                    idx > 0 ? "border-l border-slate-300" : ""
                  } ${
                    timeScope === opt.value
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                Ordenar por
              </h3>
              <button
                type="button"
                onClick={addSortRule}
                disabled={availableToAdd.length === 0}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline"
              >
                <IconPlus size={12} /> Añadir columna
              </button>
            </div>
            <div className="space-y-2">
              {sortRules.map((rule, index) => {
                const optionsForRow = SORT_OPTIONS.filter(
                  (opt) =>
                    opt.key === rule.key || !usedSortKeys.has(opt.key),
                );
                return (
                  <div
                    key={`${rule.key}-${index}`}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <span className="w-4 shrink-0 text-[10px] font-bold text-slate-400">
                      {index + 1}.
                    </span>
                    <select
                      className="min-w-[140px] flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500"
                      value={rule.key}
                      onChange={(e) =>
                        updateSortRule(index, { key: e.target.value })
                      }
                    >
                      {optionsForRow.map((opt) => (
                        <option key={opt.key} value={opt.key}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <div className="flex overflow-hidden rounded-lg border border-slate-300">
                      <button
                        type="button"
                        onClick={() =>
                          updateSortRule(index, { direction: "asc" })
                        }
                        className={`px-2.5 py-1.5 text-xs font-bold ${
                          rule.direction === "asc"
                            ? "bg-indigo-600 text-white"
                            : "bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        Asc
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateSortRule(index, { direction: "desc" })
                        }
                        className={`border-l border-slate-300 px-2.5 py-1.5 text-xs font-bold ${
                          rule.direction === "desc"
                            ? "bg-indigo-600 text-white"
                            : "bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        Desc
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSortRule(index)}
                      disabled={sortRules.length <= 1}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30"
                      title="Quitar criterio"
                      aria-label="Quitar criterio"
                    >
                      <IconX size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          <p className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-800">
            {preparedWorks.length} obra{preparedWorks.length === 1 ? "" : "s"} para
            exportar
            {timeScope !== "todos"
              ? ` · ${timeScope === "historico" ? "histórico" : "futuro"}`
              : ""}
            {selectedTypes.size < PROGRAM_TYPE_OPTIONS.length
              ? ` · ${selectedTypes.size} tipo(s)`
              : ""}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-white px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
            disabled={!!exporting}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => handleExport("excel")}
            disabled={!!exporting || preparedWorks.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-white px-4 py-2 text-sm font-bold text-indigo-800 hover:bg-indigo-50 disabled:opacity-50"
          >
            {exporting === "excel" ? (
              <IconLoader size={14} className="animate-spin" />
            ) : (
              <IconDownload size={14} />
            )}
            Excel
          </button>
          <button
            type="button"
            onClick={() => handleExport("pdf")}
            disabled={!!exporting || preparedWorks.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {exporting === "pdf" ? (
              <IconLoader size={14} className="animate-spin" />
            ) : (
              <IconFileText size={14} />
            )}
            PDF
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
