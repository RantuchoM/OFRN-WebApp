import React, { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { CircleDot, Repeat, X } from "lucide-react";
import {
  normalizeRepeticion,
  normalizeRima,
  REPETICION_OPTIONS,
  RIMA_OPTIONS,
} from "../../utils/musicTranslationPoetics";

function clampMenuPosition(clientX, clientY, menuW = 240, menuH = 280) {
  const pad = 8;
  let left = clientX;
  let top = clientY;
  if (left + menuW > window.innerWidth - pad) {
    left = Math.max(pad, window.innerWidth - menuW - pad);
  }
  if (top + menuH > window.innerHeight - pad) {
    top = Math.max(pad, window.innerHeight - menuH - pad);
  }
  return { left: Math.max(pad, left), top: Math.max(pad, top) };
}

/**
 * Menú contextual (portal) para asignar rima y repetición a un segmento.
 */
export default function MusicTranslationSegmentContextMenu({
  open,
  x,
  y,
  segmentName,
  rimaCurrent,
  repeticionCurrent,
  onClose,
  onSetRima,
  onSetRepeticion,
}) {
  const ref = useRef(null);

  const { left, top } = useMemo(
    () => (open ? clampMenuPosition(x, y) : { left: 0, top: 0 }),
    [open, x, y],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current?.contains(e.target)) return;
      onClose();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, onClose]);

  if (!open) return null;

  const rSel = normalizeRima(rimaCurrent);
  const repSel = normalizeRepeticion(repeticionCurrent);

  const pill =
    "rounded-md px-2 py-1 text-sm font-bold transition hover:brightness-110 dark:hover:brightness-125";

  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-label="Análisis poético del segmento"
      className="fixed z-[9999] w-[min(240px,calc(100vw-16px))] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-2xl dark:border-slate-600 dark:bg-slate-900"
      style={{ left, top }}
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-2 py-1.5 dark:border-slate-800">
        <span className="truncate text-sm font-semibold text-slate-600 dark:text-slate-300">
          {segmentName || "Segmento"}
        </span>
        <button
          type="button"
          className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label="Cerrar"
          onClick={onClose}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="px-2 py-1.5">
        <div className="mb-1 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <CircleDot className="h-3.5 w-3.5" />
          Rima
        </div>
        <div className="flex flex-wrap gap-1">
          {RIMA_OPTIONS.map((r) => (
            <button
              key={r}
              type="button"
              role="menuitem"
              className={`${pill} border ${
                rSel === r
                  ? "border-violet-500 bg-violet-100 text-violet-900 dark:bg-violet-950/80 dark:text-violet-100"
                  : "border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              }`}
              onClick={() => {
                onSetRima(r);
                onClose();
              }}
            >
              {r}
            </button>
          ))}
        </div>
        <button
          type="button"
          role="menuitem"
          className="mt-1 w-full rounded-lg py-1 text-center text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400"
          onClick={() => {
            onSetRima(null);
            onClose();
          }}
        >
          Eliminar rima
        </button>
      </div>

      <div className="border-t border-slate-100 px-2 py-1.5 dark:border-slate-800">
        <div className="mb-1 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <Repeat className="h-3.5 w-3.5" />
          Repetición
        </div>
        <div className="flex flex-wrap gap-1">
          {REPETICION_OPTIONS.map((r) => (
            <button
              key={r}
              type="button"
              role="menuitem"
              className={`${pill} border ${
                repSel === r
                  ? "border-violet-500 bg-violet-100 text-violet-900 dark:bg-violet-950/80 dark:text-violet-100"
                  : "border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              }`}
              onClick={() => {
                onSetRepeticion(r);
                onClose();
              }}
            >
              {r}
            </button>
          ))}
        </div>
        <button
          type="button"
          role="menuitem"
          className="mt-1 w-full rounded-lg py-1 text-center text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400"
          onClick={() => {
            onSetRepeticion(null);
            onClose();
          }}
        >
          Eliminar repetición
        </button>
      </div>
    </div>,
    document.body,
  );
}
