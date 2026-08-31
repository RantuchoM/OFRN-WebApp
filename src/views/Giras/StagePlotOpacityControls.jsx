import React from "react";
import {
  clampStagePlotOpacity,
  readStagePlotLayerOpacities,
} from "../../utils/stagePlotPayload";

/**
 * Opacidades Lienzo (0–1). Misma semántica que popover Lienzo / técnico / export.
 * 0 = oculto (ex-OFF), 1 = opaco (ex-ON).
 */
export function readStagePlotOpacities(stage = {}) {
  return readStagePlotLayerOpacities(stage);
}

/** Convierte opacidades UI → patch de `stage` para `applyStagePlotStagePatch`. */
export function opacitiesToStagePatch(op) {
  return {
    gridOpacity: clampStagePlotOpacity(op?.gridOpacity, 1),
    radialOpacity: clampStagePlotOpacity(op?.radialOpacity, 0),
    formationGuidesOpacity: clampStagePlotOpacity(
      op?.formationGuidesOpacity,
      1,
    ),
    chairSquaresOpacity: clampStagePlotOpacity(op?.chairSquaresOpacity, 1),
  };
}

export const STAGE_PLOT_OPACITY_DEFS = [
  { key: "gridOpacity", label: "Cuadrícula" },
  { key: "radialOpacity", label: "Radial" },
  { key: "formationGuidesOpacity", label: "Formaciones" },
  { key: "chairSquaresOpacity", label: "Recuadros" },
];

/**
 * Cuatro deslizantes de opacidad Lienzo (Cuadrícula / Radial / Formaciones / Recuadros).
 * Compartido: técnico («Ver escenario») + modal export editor.
 */
export default function StagePlotOpacityControls({
  value,
  onChange,
  disabled = false,
}) {
  const op = value || readStagePlotOpacities();

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {STAGE_PLOT_OPACITY_DEFS.map(({ key, label }) => {
        const pct = Math.round(clampStagePlotOpacity(op[key], 0) * 100);
        return (
          <label
            key={key}
            className={`rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 ${
              disabled ? "cursor-not-allowed opacity-50" : ""
            }`}
          >
            <span className="mb-1 flex items-baseline justify-between gap-2">
              <span className="text-xs font-medium text-slate-700">{label}</span>
              <span className="tabular-nums text-[10px] text-slate-500">
                {pct}%
              </span>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={pct}
              disabled={disabled}
              aria-label={`${label} opacidad`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
              aria-valuetext={`${pct} por ciento`}
              onChange={(e) => {
                if (disabled || !onChange) return;
                const next = clampStagePlotOpacity(
                  Number(e.target.value) / 100,
                  0,
                );
                onChange({ ...op, [key]: next });
              }}
              className="h-1.5 w-full cursor-pointer accent-indigo-600 disabled:cursor-not-allowed"
            />
          </label>
        );
      })}
    </div>
  );
}
