import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconAlertTriangle } from "../ui/Icons";
import { isAlimentacionUnset } from "../../utils/dietOptions";
import { seatingApellidoNombre } from "../../utils/integranteDisplayName";

/**
 * Personas del roster de comidas sin alimentación cargada (null/vacío).
 * Excluye vacantes y ausentes/baja. Siguen contando como Estándar en matrices.
 */
export function getPeopleMissingAlimentacion(roster) {
  return (roster || []).filter(
    (p) =>
      !p?.es_simulacion &&
      p?.estado_gira !== "ausente" &&
      p?.estado_gira !== "baja" &&
      isAlimentacionUnset(p?.alimentacion),
  );
}

/**
 * Triángulo ámbar + popover (quiénes / cuántos) para toolbar de comidas.
 * No renderiza nada si no hay pendientes.
 */
export default function MissingAlimentacionIndicator({
  roster,
  className = "",
}) {
  const people = useMemo(
    () => getPeopleMissingAlimentacion(roster),
    [roster],
  );
  const namedPeople = useMemo(
    () =>
      people
        .map((p) => ({
          id: p.id,
          name: seatingApellidoNombre(p) || `#${p.id}`,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, "es")),
    [people],
  );

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

  if (people.length === 0) return null;

  const count = people.length;
  const title = `Alimentación sin cargar (${count})`;
  const aria = `${count} persona${count !== 1 ? "s" : ""} sin alimentación cargada; se cuentan como Estándar`;

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
        <div className="h-2 w-full" aria-hidden />
        <div className="bg-white border border-amber-200 shadow-xl rounded-lg flex flex-col max-h-60 overflow-hidden">
          <div className="bg-amber-50 p-2 border-b border-amber-100 rounded-t-lg shrink-0">
            <p className="text-[10px] font-bold text-amber-900 uppercase tracking-wider">
              {title}
            </p>
            <p className="text-[10px] text-amber-800/80 mt-0.5 normal-case font-medium tracking-normal">
              En comidas se tratan como Estándar hasta confirmar.
            </p>
          </div>
          <div className="overflow-y-auto p-2">
            <ul className="space-y-1.5">
              {namedPeople.map((p) => (
                <li
                  key={p.id}
                  className="text-xs font-semibold text-slate-700 border-b border-slate-50 last:border-0 pb-1"
                >
                  {p.name}
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
        className={`flex items-center gap-1.5 cursor-help select-none shrink-0 px-2 py-1 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors ${className}`}
        role="status"
        aria-label={aria}
        title={aria}
        onMouseEnter={openPopover}
        onMouseLeave={scheduleClose}
      >
        <IconAlertTriangle size={14} className="shrink-0" />
        <span className="text-[10px] font-bold whitespace-nowrap">
          Sin dieta ({count})
        </span>
      </div>
      {panel}
    </>
  );
}
