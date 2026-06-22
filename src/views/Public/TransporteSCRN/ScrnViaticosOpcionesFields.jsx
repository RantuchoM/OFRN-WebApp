import React, { useState } from "react";
import {
  EMPTY_VIATICOS_OPCIONES,
  normalizeViaticosOpciones,
} from "../../../utils/scrnViaticoPrefill";

const GASTO_FIELDS = [
  { key: "gasto_alojamiento", label: "Alojamiento" },
  { key: "gasto_pasajes", label: "Pasajes / movilidad" },
  { key: "gasto_combustible", label: "Combustible" },
  { key: "gasto_otros", label: "Otros" },
  { key: "gastos_capacit", label: "Capacitación" },
  { key: "gastos_movil_otros", label: "Movilidad otros" },
  { key: "gasto_ceremonial", label: "Ceremonial" },
];

const lbl = "text-[10px] font-bold uppercase tracking-wide text-slate-500";
const inp =
  "w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm bg-white";

/**
 * @param {{ value, onChange, compact?, title?, defaultOpen? }} props
 */
export default function ScrnViaticosOpcionesFields({
  value,
  onChange,
  compact = false,
  title = "Datos para viático (opcional)",
  defaultOpen = false,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const opts = normalizeViaticosOpciones(value);

  const patch = (partial) => {
    onChange?.(normalizeViaticosOpciones({ ...opts, ...partial }));
  };

  const setGasto = (key) => (event) => {
    const raw = event.target.value;
    const n = raw === "" ? 0 : parseFloat(String(raw).replace(",", "."));
    patch({ [key]: Number.isFinite(n) ? n : 0 });
  };

  return (
    <div
      className={
        compact
          ? "rounded-lg border border-slate-200 bg-white"
          : "rounded-xl border border-slate-200 bg-slate-50/60"
      }
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-2 text-left ${
          compact ? "px-2.5 py-2" : "px-3 py-2.5"
        }`}
      >
        <span
          className={`font-extrabold text-slate-700 uppercase tracking-wide ${
            compact ? "text-[10px]" : "text-xs"
          }`}
        >
          {title}
        </span>
        <span className="text-[10px] font-bold text-slate-500 shrink-0">
          {open ? "Ocultar" : "Mostrar"}
        </span>
      </button>

      {open ? (
        <div
          className={`border-t border-slate-200 space-y-3 ${
            compact ? "px-2.5 py-2" : "px-3 py-3"
          }`}
        >
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Estos valores pre-completan la planilla de viáticos si la persona abre el viático desde
            su reserva.
          </p>

          <div className={`grid gap-2 ${compact ? "grid-cols-1" : "sm:grid-cols-2"}`}>
            <div className="space-y-1">
              <label className={lbl}>% viático</label>
              <select
                value={String(opts.porcentaje)}
                onChange={(e) => patch({ porcentaje: Number(e.target.value) })}
                className={inp}
              >
                <option value="100">100%</option>
                <option value="80">80%</option>
                <option value="0">0%</option>
              </select>
            </div>
            <div className="space-y-1 flex items-end">
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer pb-1.5">
                <input
                  type="checkbox"
                  checked={Boolean(opts.temporada_alta)}
                  onChange={(e) => patch({ temporada_alta: e.target.checked })}
                  className="rounded border-slate-300"
                />
                <span className="text-xs font-semibold">Temporada alta (+30%)</span>
              </label>
            </div>
          </div>

          <div className={`grid gap-2 ${compact ? "grid-cols-1" : "sm:grid-cols-2"}`}>
            {GASTO_FIELDS.map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <label className={lbl} htmlFor={`scrn-viatico-${key}`}>
                  {label}
                </label>
                <input
                  id={`scrn-viatico-${key}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={opts[key] === 0 ? "" : opts[key]}
                  onChange={setGasto(key)}
                  placeholder="0"
                  className={inp}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export { EMPTY_VIATICOS_OPCIONES, normalizeViaticosOpciones };
