import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IconDownload, IconLoader, IconX } from "../../components/ui/Icons";
import { HORAS_MESES } from "../../utils/horasNominaReport";

const MONTHS = HORAS_MESES.map((label, i) => ({
  value: i + 1,
  label: label.charAt(0).toUpperCase() + label.slice(1),
}));

const EXPORT_MODES = [
  {
    id: "unico",
    label: "Un único PDF",
    hint: "Todo el rango en un solo archivo. Cultura y Educación en secciones separadas.",
  },
  {
    id: "consolidados",
    label: "2 PDFs consolidados",
    hint: "Un PDF de Cultura y uno de Educación, cada uno con todos los meses. Se descargan los dos archivos, sin ZIP.",
  },
  {
    id: "individuales",
    label: "PDFs individuales",
    hint: "Un PDF por mes y por área (Cultura y Educación separados), en el ZIP de siempre.",
  },
  {
    id: "novedades",
    label: "Solo novedades",
    hint: "Dos PDFs, uno de Cultura y otro de Educación, con las novedades del rango. Se descargan los dos archivos, sin ZIP. Sin la tabla.",
  },
];

/**
 * Rango de meses y detalle de novedades para el ZIP de nómina
 * (Cultura y Educación en PDF separados).
 */
export default function HorasNominaExportModal({
  isOpen,
  onClose,
  defaultMonth,
  defaultYear,
  busy = false,
  onExport,
}) {
  const [fromMonth, setFromMonth] = useState(defaultMonth);
  const [fromYear, setFromYear] = useState(defaultYear);
  const [toMonth, setToMonth] = useState(defaultMonth);
  const [toYear, setToYear] = useState(defaultYear);
  const [includeDetalle, setIncludeDetalle] = useState(true);
  const [mode, setMode] = useState("individuales");

  useEffect(() => {
    if (!isOpen) return undefined;
    setFromMonth(defaultMonth);
    setFromYear(defaultYear);
    setToMonth(defaultMonth);
    setToYear(defaultYear);
    setIncludeDetalle(true);
    setMode("individuales");
    return undefined;
  }, [isOpen, defaultMonth, defaultYear]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, busy, onClose]);

  if (!isOpen) return null;

  const yearInput = (value, setValue, id) => (
    <input
      id={id}
      type="number"
      min="2000"
      max="2040"
      disabled={busy}
      value={value}
      onChange={(e) => setValue(parseInt(e.target.value, 10))}
      className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-bold text-slate-800 outline-none focus:ring-2 ring-indigo-100"
    />
  );

  const monthSelect = (value, setValue, id) => (
    <select
      id={id}
      disabled={busy}
      value={value}
      onChange={(e) => setValue(parseInt(e.target.value, 10))}
      className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-bold text-slate-800 outline-none focus:ring-2 ring-indigo-100 bg-white"
    >
      {MONTHS.map((m) => (
        <option key={m.value} value={m.value}>
          {m.label}
        </option>
      ))}
    </select>
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40"
      onMouseDown={() => {
        if (!busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="horas-export-title"
        className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-slate-200"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h3
            id="horas-export-title"
            className="font-black text-slate-800 text-sm uppercase tracking-tight"
          >
            Exportar nómina
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Cerrar"
            className="text-slate-400 hover:text-slate-700 disabled:opacity-40"
          >
            <IconX size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            Elegí el rango y el formato. En los PDF de un área, Cultura y
            Educación no se mezclan. En el PDF único van en el mismo archivo,
            en secciones rotuladas. Se respetan la búsqueda y el filtro de
            ensambles de la pantalla.
          </p>

          <fieldset className="space-y-2">
            <legend className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
              Formato
            </legend>
            {EXPORT_MODES.map((opt) => (
              <label
                key={opt.id}
                className={`flex items-start gap-2 rounded-lg border px-3 py-2 cursor-pointer ${
                  mode === opt.id
                    ? "border-indigo-300 bg-indigo-50"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="horas-export-mode"
                  className="mt-0.5 accent-indigo-600"
                  checked={mode === opt.id}
                  disabled={busy}
                  onChange={() => setMode(opt.id)}
                />
                <span>
                  <span className="block text-sm font-bold text-slate-800">{opt.label}</span>
                  <span className="block text-xs text-slate-500 leading-snug">{opt.hint}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Desde
              </span>
              {monthSelect(fromMonth, setFromMonth, "horas-export-from-month")}
              {yearInput(fromYear, setFromYear, "horas-export-from-year")}
            </div>
            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Hasta
              </span>
              {monthSelect(toMonth, setToMonth, "horas-export-to-month")}
              {yearInput(toYear, setToYear, "horas-export-to-year")}
            </div>
          </div>

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 accent-indigo-600"
              checked={mode === "novedades" ? true : includeDetalle}
              disabled={busy || mode === "novedades"}
              onChange={(e) => setIncludeDetalle(e.target.checked)}
            />
            <span>
              <span className="block text-sm font-bold text-slate-700">
                Detalle de novedades
              </span>
              <span className="block text-xs text-slate-500 leading-snug">
                {mode === "novedades"
                  ? "En Solo novedades cada PDF es ese detalle, uno por área."
                  : "Debajo del listado de cada PDF, una línea por integrante con cambio respecto del mes anterior."}
              </span>
            </span>
          </label>
        </div>

        <div className="px-4 py-3 border-t border-slate-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              onExport({
                fromMonth,
                fromYear,
                toMonth,
                toYear,
                includeDetalle,
                mode,
              })
            }
            className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {busy ? <IconLoader size={14} className="animate-spin" /> : <IconDownload size={14} />}
            {mode === "unico"
              ? "Descargar PDF"
              : mode === "individuales"
                ? "Descargar ZIP"
                : "Descargar PDFs"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
