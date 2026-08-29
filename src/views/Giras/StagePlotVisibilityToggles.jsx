import React from "react";

/**
 * Flags de visibilidad Lienzo (misma semántica que popover Lienzo / técnico).
 * ON = visible.
 */
export function readStagePlotVisibility(stage = {}) {
  return {
    showGrid: stage.showGrid !== false,
    showRadial: !!stage.showRadial,
    showFormations: !stage.hideFormationGuides,
    showChairs: !stage.hideChairSquares,
  };
}

/** Convierte flags UI → patch de `stage` para `applyStagePlotStagePatch`. */
export function visibilityToStagePatch(vis) {
  return {
    showGrid: !!vis?.showGrid,
    showRadial: !!vis?.showRadial,
    hideFormationGuides: !vis?.showFormations,
    hideChairSquares: !vis?.showChairs,
  };
}

const TOGGLE_DEFS = [
  { key: "showGrid", label: "Cuadrícula" },
  { key: "showRadial", label: "Radial" },
  { key: "showFormations", label: "Formaciones" },
  { key: "showChairs", label: "Recuadros" },
];

/**
 * Cuatro toggles Lienzo (Cuadrícula / Radial / Formaciones / Recuadros).
 * Estilo técnico («Ver escenario») para no divergir del export.
 */
export default function StagePlotVisibilityToggles({
  value,
  onChange,
  disabled = false,
}) {
  const vis = value || readStagePlotVisibility();

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {TOGGLE_DEFS.map(({ key, label }) => {
        const on = !!vis[key];
        return (
          <button
            key={key}
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={label}
            disabled={disabled}
            onClick={() => {
              if (disabled || !onChange) return;
              onChange({ ...vis, [key]: !on });
            }}
            className={`rounded-lg border px-2 py-2 text-left text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
              on
                ? "border-indigo-200 bg-indigo-50 text-indigo-800"
                : "border-slate-200 bg-slate-50 text-slate-500"
            }`}
          >
            <span className="block text-[10px] uppercase tracking-wide opacity-70">
              Lienzo
            </span>
            {label}: {on ? "ON" : "OFF"}
          </button>
        );
      })}
    </div>
  );
}
