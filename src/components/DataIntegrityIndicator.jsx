import React, { useMemo, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { IconAlertTriangle, IconCheckCircle } from "./ui/Icons";

/** Campos por defecto (modo Transportes / CNRT). */
export const TRANSPORT_DOC_FIELDS = [
  { key: "dni", label: "DNI" },
  { key: "fecha_nac", label: "Fecha Nac." },
  { key: "genero", label: "Género" },
];

/**
 * Campos alineados a la plantilla de carga masiva del roster
 * (sin Apellido/Nombre). Tras migración, alimentación vacía/null no debería existir;
 * si falta, se marca.
 */
export const ROSTER_DOC_FIELDS = [
  { key: "genero", label: "Género" },
  { key: "fecha_nac", label: "Fecha Nac." },
  { key: "dni", label: "DNI" },
  { key: "cuil", label: "CUIL" },
  { key: "telefono", label: "Teléfono" },
  { key: "mail", label: "Mail" },
  { key: "alimentacion", label: "Alimentación" },
  {
    key: "instrumento",
    label: "Instrumento",
    isEmpty: (p) =>
      !(
        p?.id_instr ||
        p?.instrumentos?.id ||
        p?.instrumentos?.instrumento
      ),
  },
];

function isFieldEmpty(person, field) {
  if (typeof field.isEmpty === "function") return field.isEmpty(person);
  return !String(person?.[field.key] ?? "").trim();
}

/** @returns {string[]} etiquetas de campos faltantes */
export function getMissingDocLabels(person, fields = ROSTER_DOC_FIELDS) {
  if (!person || person.es_simulacion) return [];
  const missing = [];
  for (const field of fields) {
    if (isFieldEmpty(person, field)) missing.push(field.label);
  }
  return missing;
}

function buildPassengerIssues(passengers, fields) {
  const list = [];
  (passengers || []).forEach((p) => {
    const missing = getMissingDocLabels(p, fields);
    if (missing.length > 0) {
      list.push({
        id: p.id,
        name: `${p.apellido || ""}, ${p.nombre || ""}`.trim(),
        missing,
      });
    }
  });
  return list;
}

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

  const tooltipContent =
    tooltip && typeof document !== "undefined" ? (
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
 * Popover con bridge de hover (padding superior) vía portal para poder
 * mover el mouse desde el trigger al listado sin que se cierre.
 */
function PassengerIntegrityPopover({ issues, title }) {
  const triggerRef = useRef(null);
  const closeTimerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const updatePos = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom,
      left: Math.min(rect.right, window.innerWidth - 12),
    });
  };

  const openPopover = () => {
    clearCloseTimer();
    updatePos();
    setOpen(true);
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => setOpen(false), 120);
  };

  useEffect(() => () => clearCloseTimer(), []);

  useEffect(() => {
    if (!open) return;
    const onScrollResize = () => updatePos();
    window.addEventListener("scroll", onScrollResize, true);
    window.addEventListener("resize", onScrollResize);
    return () => {
      window.removeEventListener("scroll", onScrollResize, true);
      window.removeEventListener("resize", onScrollResize);
    };
  }, [open]);

  const panel =
    open &&
    pos &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        className="fixed z-[110] w-72"
        style={{ top: pos.top, left: pos.left, transform: "translateX(-100%)" }}
        onMouseEnter={openPopover}
        onMouseLeave={scheduleClose}
      >
        {/* Bridge invisible entre trigger y panel */}
        <div className="h-2 w-full" aria-hidden />
        <div className="bg-white border border-red-200 shadow-xl rounded-lg flex flex-col max-h-60 overflow-hidden">
          <div className="bg-red-50 p-2 border-b border-red-100 rounded-t-lg shrink-0">
            <p className="text-[10px] font-bold text-red-800 uppercase tracking-wider">
              {title}
            </p>
          </div>
          <div className="overflow-y-auto p-2">
            <ul className="space-y-2">
              {issues.map((issue) => (
                <li
                  key={issue.id}
                  className="flex flex-col border-b border-slate-50 last:border-0 pb-1"
                >
                  <span className="text-xs font-semibold text-slate-700">
                    {issue.name}
                  </span>
                  <span className="text-[10px] text-red-500 flex gap-1 items-center">
                    <IconAlertTriangle size={8} /> {issue.missing.join(", ")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>,
      document.body,
    );

  return (
    <>
      <div
        ref={triggerRef}
        className="flex items-center gap-2 cursor-help select-none mr-2"
        role="status"
        aria-label={`Faltan datos en ${issues.length} persona${issues.length !== 1 ? "s" : ""}`}
        onMouseEnter={openPopover}
        onMouseLeave={scheduleClose}
      >
        <span className="flex h-3 w-3 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
        </span>
        <span className="text-xs font-bold text-red-600 animate-pulse">
          Faltan datos ({issues.length})
        </span>
      </div>
      {panel}
    </>
  );
}

/**
 * Indicador de integridad de datos. Soporta:
 * - issues: array de particellas huérfanas (Seating)
 * - passengers (+ fields opcional): faltantes de documentación
 *   (default Transportes: DNI, Fecha Nac., Género; Roster: ROSTER_DOC_FIELDS)
 */
function DataIntegrityIndicator({
  issues: issuesProp,
  passengers,
  fields,
  title = "Datos Personales Faltantes",
}) {
  const issues = useMemo(() => {
    if (issuesProp && Array.isArray(issuesProp) && issuesProp.length > 0) {
      return issuesProp;
    }
    if (passengers) {
      return buildPassengerIssues(passengers, fields || TRANSPORT_DOC_FIELDS);
    }
    return [];
  }, [issuesProp, passengers, fields]);

  const isSeatingMode = issuesProp !== undefined && Array.isArray(issuesProp);

  // Modo Seating sin issues: no mostrar nada
  if (isSeatingMode && issuesProp.length === 0) return null;

  // Modo Transportes/Roster sin issues: mostrar "Datos completos"
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
    return <SeatingIntegrityTooltip count={issuesProp.length} />;
  }

  return <PassengerIntegrityPopover issues={issues} title={title} />;
}

export default DataIntegrityIndicator;
