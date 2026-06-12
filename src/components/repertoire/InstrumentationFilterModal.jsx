import React, { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconPlus, IconTrash, IconX } from "../ui/Icons";
import {
  INSTRUMENTATION_FILTER_PRESETS,
  findMatchingInstrumentationPreset,
} from "../../utils/instrumentationFilterPresets";

const PANEL_WIDTH = 320;
const VIEWPORT_PADDING = 12;
const ANCHOR_GAP = 8;
const MIN_PANEL_HEIGHT = 200;

const BASE_INSTRUMENTS = [
  { id: "fl", label: "Flautas" },
  { id: "ob", label: "Oboes" },
  { id: "cl", label: "Clarinetes" },
  { id: "bn", label: "Fagotes" },
  { id: "hn", label: "Cornos" },
  { id: "tpt", label: "Trompetas" },
  { id: "tbn", label: "Trombones" },
  { id: "tba", label: "Tubas" },
];

const INSTRUMENTS_OPTS = [
  { label: "Percusión", value: "perc" },
  { label: "Timbal", value: "timp" },
  { label: "Arpa", value: "harp" },
  { label: "Piano/Cel", value: "key" },
  { label: "Cuerdas", value: "str" },
];

const buildRulesState = (activeRules = []) => {
  const existingMap = {};
  activeRules.forEach((r) => {
    existingMap[r.instrument] = r;
  });
  return BASE_INSTRUMENTS.map((base) => {
    if (existingMap[base.id]) {
      return { ...existingMap[base.id], isBase: true, label: base.label };
    }
    return {
      id: base.id,
      instrument: base.id,
      operator: "eq",
      value: "",
      isBase: true,
      label: base.label,
    };
  }).concat(
    activeRules.filter((r) => !BASE_INSTRUMENTS.some((b) => b.id === r.instrument)),
  );
};

const computeAnchoredPosition = (anchorEl) => {
  const rect = anchorEl.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom - ANCHOR_GAP - VIEWPORT_PADDING;
  const spaceAbove = rect.top - ANCHOR_GAP - VIEWPORT_PADDING;
  const openBelow = spaceBelow >= MIN_PANEL_HEIGHT || spaceBelow >= spaceAbove;

  let top;
  let maxHeight;
  if (openBelow) {
    top = rect.bottom + ANCHOR_GAP;
    maxHeight = spaceBelow;
  } else {
    maxHeight = spaceAbove;
    top = Math.max(VIEWPORT_PADDING, rect.top - ANCHOR_GAP - maxHeight);
  }

  maxHeight = Math.max(
    MIN_PANEL_HEIGHT,
    Math.min(maxHeight, window.innerHeight - top - VIEWPORT_PADDING),
  );

  const left = Math.min(
    Math.max(VIEWPORT_PADDING, rect.left),
    window.innerWidth - PANEL_WIDTH - VIEWPORT_PADDING,
  );

  return { top, left, maxHeight };
};

export default function InstrumentationFilterModal({
  onClose,
  onApply,
  currentFilters,
  stringsFilter,
  setStringsFilter,
  strictMode,
  setStrictMode,
  anchorRef,
}) {
  const panelRef = useRef(null);
  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    maxHeight: "min(70vh, calc(100dvh - 2rem))",
  });
  const [rules, setRules] = useState(() => buildRulesState(currentFilters));

  const updatePosition = () => {
    if (anchorRef?.current) {
      setPosition(computeAnchoredPosition(anchorRef.current));
    }
  };

  useLayoutEffect(() => {
    if (!anchorRef?.current) return undefined;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [anchorRef, rules.length]);

  const activePreset = findMatchingInstrumentationPreset(
    currentFilters,
    stringsFilter,
    strictMode,
  );

  const addRule = () =>
    setRules([
      ...rules,
      { id: Date.now(), instrument: "perc", operator: "eq", value: 0, isBase: false },
    ]);
  const removeRule = (id) => setRules(rules.filter((r) => r.id !== id));
  const updateRule = (id, field, val) =>
    setRules(rules.map((r) => (r.id === id ? { ...r, [field]: val } : r)));

  const handleApply = () =>
    onApply(rules.filter((r) => r.value !== "" && r.value !== null));

  const applyPreset = (preset) => {
    setStringsFilter(preset.stringsFilter);
    setStrictMode(preset.strictMode);
    setRules(buildRulesState(preset.rules));
    onApply(preset.rules);
  };

  const clearFilters = () => {
    setRules(
      BASE_INSTRUMENTS.map((base) => ({
        id: base.id,
        instrument: base.id,
        operator: "eq",
        value: "",
        isBase: true,
        label: base.label,
      })),
    );
    setStringsFilter("all");
    setStrictMode(false);
    onApply([]);
  };

  const panelStyle = anchorRef
    ? { position: "fixed", top: position.top, left: position.left, maxHeight: position.maxHeight }
    : { maxHeight: "min(70vh, calc(100dvh - 2rem))" };

  const content = (
    <div
      ref={panelRef}
      className={`w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-[10000] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 ${!anchorRef ? "absolute top-full left-0 mt-2" : ""}`}
      style={panelStyle}
    >
      <div className="shrink-0 px-4 pt-4 pb-2 border-b border-slate-100">
        <h4 className="text-xs font-bold text-slate-500 uppercase flex justify-between items-center">
          Filtro por Orgánico
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <IconX size={14} />
          </button>
        </h4>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 pr-3 custom-scrollbar">
        <div className="mb-3">
          <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1.5">
            Predeterminados
          </label>
          <div className="flex flex-wrap gap-1">
            {INSTRUMENTATION_FILTER_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`text-[10px] font-bold px-2 py-1 rounded border transition-colors ${
                  activePreset?.id === preset.id
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-indigo-50 hover:border-indigo-200"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <label
            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer border transition-colors ${
              strictMode
                ? "bg-indigo-50 border-indigo-200 text-indigo-800"
                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${strictMode ? "bg-indigo-500" : "bg-slate-300"}`}
              />
              <span className="text-xs font-bold">Modo Estricto</span>
            </div>
            <span className="text-[9px] uppercase tracking-wider font-bold">
              {strictMode ? "Solo Selección" : "Admitir Otros"}
            </span>
            <input
              type="checkbox"
              className="hidden"
              checked={strictMode}
              onChange={(e) => setStrictMode(e.target.checked)}
            />
          </label>
        </div>

        <div className="mb-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
          <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
            Sección Cuerdas
          </label>
          <div className="flex gap-1">
            {["all", "with", "without"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setStringsFilter(m)}
                className={`flex-1 text-[10px] font-bold py-1 px-2 rounded border ${
                  stringsFilter === m
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {m === "all" ? "Indif." : m === "with" ? "Con" : "Sin"}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          {rules.map((rule) => {
            const isActive = rule.value !== "" && rule.value !== null;
            return (
              <div
                key={rule.id}
                className={`flex gap-2 items-center text-xs p-1 rounded transition-colors ${
                  isActive ? "bg-indigo-50 border border-indigo-100" : ""
                }`}
              >
                <div className="w-24 font-bold text-slate-600 truncate flex items-center">
                  {rule.isBase ? (
                    <span className="capitalize">{rule.label}</span>
                  ) : (
                    <select
                      className="w-full bg-transparent border-none outline-none p-0 cursor-pointer"
                      value={rule.instrument}
                      onChange={(e) => updateRule(rule.id, "instrument", e.target.value)}
                    >
                      {INSTRUMENTS_OPTS.map((i) => (
                        <option key={i.value} value={i.value}>
                          {i.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <select
                  className={`border rounded p-1 outline-none text-center w-14 ${
                    isActive ? "border-indigo-300 bg-white" : "border-slate-200 bg-slate-50"
                  }`}
                  value={rule.operator}
                  onChange={(e) => updateRule(rule.id, "operator", e.target.value)}
                >
                  <option value="eq">=</option>
                  <option value="gte">≥</option>
                  <option value="lte">≤</option>
                </select>
                <input
                  type="number"
                  min={0}
                  className={`border rounded p-1 w-12 text-center outline-none focus:border-indigo-500 ${
                    isActive
                      ? "border-indigo-300 bg-white font-bold text-indigo-700"
                      : "border-slate-200"
                  }`}
                  placeholder="-"
                  value={rule.value}
                  onChange={(e) => updateRule(rule.id, "value", e.target.value)}
                />
                {!rule.isBase && (
                  <button
                    type="button"
                    onClick={() => removeRule(rule.id)}
                    className="text-slate-300 hover:text-red-500"
                  >
                    <IconTrash size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="shrink-0 flex justify-between items-center border-t border-slate-100 px-4 py-3 bg-white">
        <button
          type="button"
          onClick={addRule}
          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
        >
          <IconPlus size={10} /> Extra
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={clearFilters}
            className="text-[10px] text-red-600 hover:text-red-700 hover:bg-red-50 font-bold px-2 py-1.5 rounded-lg flex items-center gap-1"
          >
            Limpiar <IconTrash size={12} />
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-indigo-700 font-bold"
          >
            Filtrar
          </button>
        </div>
      </div>
    </div>
  );

  return anchorRef ? createPortal(content, document.body) : content;
}
