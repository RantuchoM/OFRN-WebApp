import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconCheck, IconClock, IconEye, IconEyeOff, IconX } from "../../ui/Icons";
import {
  getTransportEventTypeMeta,
  TRANSPORT_EVENT_TYPES,
} from "../../../utils/giraTransportUtils";

export function TransportStopTypeTag({ typeId }) {
  const meta = getTransportEventTypeMeta(typeId);
  const label = meta?.nombre || (typeId != null ? `Tipo ${typeId}` : "Otro tipo");
  const accent = meta?.accent || "#475569";
  return (
    <span
      className="inline-flex max-w-full items-center rounded border bg-white px-1.5 py-0.5 text-[9px] font-bold leading-none"
      style={{ color: accent, borderColor: accent }}
      title={`Tipo de esta parada: ${label}`}
    >
      <span className="truncate">{label}</span>
    </span>
  );
}

const actionBtnClass =
  "inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:border-indigo-200 hover:bg-white disabled:opacity-50";

/**
 * Barra fija al tildar paradas. Portal a document.body, z-90
 * (modales z-100, tooltips z-110). Respeta el ancho del sidebar.
 */
export default function TransportSelectionBar({
  count = 0,
  allHidden = false,
  busy = false,
  activeTypeIds,
  onClear,
  onShift,
  onToggleVisibility,
  onChangeType,
}) {
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const barRef = useRef(null);
  const n = Math.max(0, Number(count) || 0);

  useEffect(() => {
    if (n < 1) setTypeMenuOpen(false);
  }, [n]);

  useEffect(() => {
    if (!typeMenuOpen) return undefined;
    const onDown = (event) => {
      if (barRef.current && !barRef.current.contains(event.target)) {
        setTypeMenuOpen(false);
      }
    };
    const onKey = (event) => {
      if (event.key === "Escape") setTypeMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [typeMenuOpen]);

  if (n < 1) return null;

  const countLabel =
    n === 1 ? "1 parada seleccionada" : `${n} paradas seleccionadas`;

  return createPortal(
    <div
      className="pointer-events-none fixed bottom-4 z-[90] flex justify-center px-3"
      style={{ left: "var(--app-sidebar-width, 0px)", right: "4.5rem" }}
    >
      <div
        ref={barRef}
        role="toolbar"
        aria-label="Acciones de paradas seleccionadas"
        className="pointer-events-auto relative flex max-w-3xl flex-wrap items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-xl"
      >
        {typeMenuOpen && (
          <div
            role="menu"
            aria-label="Tipo de evento"
            className="absolute bottom-full left-1/2 z-10 mb-2 w-56 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
          >
            {TRANSPORT_EVENT_TYPES.map((tipo) => {
              const selected = activeTypeIds?.has(tipo.id);
              return (
                <button
                  key={tipo.id}
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    setTypeMenuOpen(false);
                    onChangeType(tipo.id);
                  }}
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-sm border"
                    style={{
                      backgroundColor: tipo.rowBackground,
                      borderColor: tipo.accent,
                    }}
                  />
                  <span className="min-w-0 flex-1 truncate">{tipo.nombre}</span>
                  {selected ? (
                    <IconCheck size={12} className="shrink-0 text-slate-500" />
                  ) : null}
                </button>
              );
            })}
          </div>
        )}

        <span className="text-xs font-bold tabular-nums text-slate-700">
          {countLabel}
        </span>
        <button
          type="button"
          className={actionBtnClass}
          onClick={onShift}
          disabled={busy}
        >
          <IconClock size={14} /> Mover horarios
        </button>
        <button
          type="button"
          className={actionBtnClass}
          onClick={onToggleVisibility}
          disabled={busy}
          title={
            allHidden
              ? "Volver a mostrar estas paradas en la agenda"
              : "Ocultar estas paradas en la agenda"
          }
        >
          {allHidden ? <IconEye size={14} /> : <IconEyeOff size={14} />}
          {allHidden ? "Mostrar en agenda" : "Ocultar"}
        </button>
        <button
          type="button"
          className={actionBtnClass}
          onClick={() => setTypeMenuOpen((open) => !open)}
          disabled={busy}
          aria-expanded={typeMenuOpen}
          aria-haspopup="menu"
        >
          Cambiar tipo
        </button>
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          onClick={onClear}
          disabled={busy}
          title="Quitar selección"
          aria-label="Quitar selección"
        >
          <IconX size={14} />
        </button>
      </div>
    </div>,
    document.body,
  );
}
