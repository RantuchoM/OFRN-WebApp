import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { IconX } from "../ui/Icons";
import { formatEntradasConciertoFechaHora as formatConciertoFechaHoraEs } from "../../utils/entradasReservaCopy";
import MisReservasQrPanel from "./MisReservasQrPanel";

/**
 * Modal overlay (portal a document.body, z-[100]) para ver el QR de una reserva.
 */
export default function MisReservasQrModal({ reserva, onClose, isDark = false, ui }) {
  useEffect(() => {
    if (!reserva) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [reserva, onClose]);

  if (!reserva) return null;

  const cardClass = ui?.cardInner
    || (isDark
      ? "rounded-xl border border-slate-600 bg-slate-800"
      : "rounded-xl border border-slate-200 bg-white");
  const iconBtn = ui?.btnIcon
    || (isDark
      ? "text-slate-300 hover:bg-slate-700"
      : "text-slate-600 hover:bg-slate-100");
  const titleClass = ui?.textStrong || (isDark ? "text-slate-100" : "text-slate-900");
  const mutedClass = ui?.textMuted || (isDark ? "text-slate-400" : "text-slate-500");

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className={`w-full max-w-md max-h-[min(90vh,42rem)] overflow-y-auto p-5 shadow-2xl animate-in zoom-in-95 duration-200 ${cardClass}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="entradas-qr-modal-titulo"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0 pr-2">
            <h3 id="entradas-qr-modal-titulo" className={`text-sm font-bold ${titleClass}`}>
              {reserva.concierto?.nombre || "Concierto"}
            </h3>
            <p className={`text-xs mt-0.5 ${mutedClass}`}>
              Reserva {reserva.codigo_reserva}
              {reserva.concierto?.fecha_hora
                ? ` · ${formatConciertoFechaHoraEs(reserva.concierto.fecha_hora)}`
                : ""}
            </p>
          </div>
          <button
            type="button"
            className={`shrink-0 rounded p-1 ${iconBtn}`}
            aria-label="Cerrar"
            onClick={onClose}
          >
            <IconX size={20} />
          </button>
        </div>
        <MisReservasQrPanel reserva={reserva} isDark={isDark} />
      </div>
    </div>,
    document.body,
  );
}
