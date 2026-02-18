import React, { useMemo, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { IconAlertTriangle, IconCheckCircle } from "./ui/Icons";

/** Tooltip en Portal para evitar clipping por overflow de contenedores padre */
function SeatingIntegrityTooltip({ count }) {
  const [tooltip, setTooltip] = useState(null);
  const triggerRef = useRef(null);

  const getPos = () => {
    if (!triggerRef.current) return null;
    const rect = triggerRef.current.getBoundingClientRect();
    return { top: rect.top - 8, left: rect.left + rect.width / 2 };
  };

  const showTooltip = () => {
    const p = getPos();
    if (p) setTooltip(p);
  };

  const hideTooltip = () => setTooltip(null);

  useEffect(() => {
    if (!tooltip) return;
    const onScrollResize = () => {
      const p = getPos();
      if (p) setTooltip(p);
    };
    window.addEventListener("scroll", onScrollResize, true);
    window.addEventListener("resize", onScrollResize);
    return () => {
      window.removeEventListener("scroll", onScrollResize, true);
      window.removeEventListener("resize", onScrollResize);
    };
  }, [tooltip]);

  const tooltipContent = tooltip && typeof document !== "undefined" ? (
    <div
      className="fixed z-[9999] -translate-x-1/2 -translate-y-full px-3 py-2 whitespace-nowrap bg-slate-800 text-white text-xs font-medium rounded-lg shadow-lg border border-slate-700 animate-in fade-in duration-150"
      style={{ top: tooltip.top, left: tooltip.left }}
      role="tooltip"
    >
      Hay {count} particella{count !== 1 ? "s" : ""} sin músico asignado
      <div
        className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-slate-800"
        aria-hidden
      />
    </div>
  ) : null;

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        className="inline-flex items-center justify-center text-amber-500 hover:text-amber-600 transition-colors cursor-help select-none"
        role="status"
        aria-label={`Hay ${count} particella${count !== 1 ? "s" : ""} sin músico asignado`}
        tabIndex={0}
      >
        <IconAlertTriangle size={18} />
      </span>
      {tooltipContent && createPortal(tooltipContent, document.body)}
    </>
  );
}

/**
 * Indicador de integridad de datos. Soporta dos modos:
 * - issues: array de particellas huérfanas (Seating) → mensaje "Hay X particellas sin músico asignado"
 * - passengers: lista de pasajeros (Transportes) → calcula faltantes DNI, Fecha Nac., Género
 */
function DataIntegrityIndicator({ issues: issuesProp, passengers }) {
  const issues = useMemo(() => {
    if (issuesProp && Array.isArray(issuesProp) && issuesProp.length > 0) {
      return issuesProp;
    }
    if (passengers) {
      const list = [];
      passengers.forEach((p) => {
        const missing = [];
        if (!p.dni) missing.push("DNI");
        if (!p.fecha_nac) missing.push("Fecha Nac.");
        if (!p.genero) missing.push("Género");
        if (missing.length > 0) {
          list.push({ id: p.id, name: `${p.apellido}, ${p.nombre}`, missing });
        }
      });
      return list;
    }
    return [];
  }, [issuesProp, passengers]);

  const isSeatingMode = issuesProp !== undefined && Array.isArray(issuesProp);

  // Modo Seating sin issues: no mostrar nada
  if (isSeatingMode && issuesProp.length === 0) return null;

  // Modo Transportes sin issues: mostrar "Datos completos"
  if (issues.length === 0 && !isSeatingMode) {
    return (
      <div
        className="flex items-center gap-1.5 text-emerald-600 px-3 py-1.5 bg-emerald-50 rounded border border-emerald-100 transition-all select-none"
        role="status"
        aria-label="Datos completos"
      >
        <IconCheckCircle size={14} />
        <span className="text-xs font-bold">Datos completos</span>
      </div>
    );
  }

  // Modo Seating: icono + tooltip vía Portal (evita clipping por overflow de padres)
  if (isSeatingMode) {
    return (
      <SeatingIntegrityTooltip count={issuesProp.length} />
    );
  }

  // Modo Transportes: indicador completo con tooltip detallado
  return (
    <div
      className="group relative flex items-center gap-2 cursor-help select-none mr-2"
      role="status"
      aria-label={`Faltan datos en ${issues.length} persona${issues.length !== 1 ? "s" : ""}`}
    >
      <span className="flex h-3 w-3 relative">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
      </span>
      <span className="text-xs font-bold text-red-600 animate-pulse">
        Faltan datos ({issues.length})
      </span>

      {/* Tooltip: invisible hasta hover, z-[110] para aparecer sobre modales */}
      <div
        className="absolute top-full right-0 mt-2 w-64 bg-white border border-red-200 shadow-xl rounded-lg p-0
          invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-[110]
          flex flex-col max-h-60 group-hover:pointer-events-auto pointer-events-none"
      >
        <div className="bg-red-50 p-2 border-b border-red-100 rounded-t-lg">
          <p className="text-[10px] font-bold text-red-800 uppercase tracking-wider">
            Datos Personales Faltantes
          </p>
        </div>
        <div className="overflow-y-auto p-2">
          <ul className="space-y-2">
            {issues.map((issue) => (
              <li
                key={issue.id}
                className="flex flex-col border-b border-slate-50 last:border-0 pb-1"
              >
                <span className="text-xs font-semibold text-slate-700">{issue.name}</span>
                <span className="text-[10px] text-red-500 flex gap-1 items-center">
                  <IconAlertTriangle size={8} /> {issue.missing.join(", ")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default DataIntegrityIndicator;
