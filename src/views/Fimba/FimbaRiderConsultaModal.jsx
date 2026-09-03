import React, { useMemo } from "react";
import { createPortal } from "react-dom";
import { IconFileText, IconX } from "../../components/ui/Icons";
import {
  isFimbaRiderEmpty,
  sanitizeFimbaRiderHtml,
} from "../../utils/fimbaRider";
import {
  resolveEventFimbaPropuestas,
  resolveEventRidersForConsulta,
} from "../../utils/fimbaAgendaConsulta";
import { formatVenueEventDate } from "../../utils/venueDisplayUtils";

/**
 * Modal consulta (solo lectura) de Rider(s) FIMBA asociados al evento.
 * Una card por artista/propuesta con rider. Portal a document.body, z-[100].
 */
export default function FimbaRiderConsultaModal({ open, onClose, evento }) {
  const riders = useMemo(
    () => (evento ? resolveEventRidersForConsulta(evento) : []),
    [evento],
  );
  const allTagged = useMemo(
    () => (evento ? resolveEventFimbaPropuestas(evento) : []),
    [evento],
  );
  const fechaFormatted = formatVenueEventDate(evento?.fecha);
  const hora = evento?.hora_inicio ? String(evento.hora_inicio).slice(0, 5) : "";

  if (!open || !evento) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white w-full max-w-2xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="fimba-rider-consulta-title"
      >
        <div className="px-4 py-3 border-b border-slate-200 flex items-start justify-between gap-3 bg-slate-50 shrink-0">
          <div className="min-w-0 flex items-start gap-2">
            <span className="mt-0.5 text-fuchsia-700 shrink-0">
              <IconFileText size={18} />
            </span>
            <div className="min-w-0">
              <h3
                id="fimba-rider-consulta-title"
                className="font-bold text-slate-800 text-base"
              >
                Rider
              </h3>
              <p className="text-xs text-slate-500 truncate">
                {[fechaFormatted, hora ? `${hora} hs` : null]
                  .filter(Boolean)
                  .join(" · ") || "Consulta"}
                {allTagged.length > 0
                  ? ` · ${allTagged.map((p) => p.nombre).filter(Boolean).join(", ")}`
                  : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            aria-label="Cerrar"
          >
            <IconX size={18} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex flex-col gap-3">
          {riders.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              {allTagged.length === 0
                ? "Este evento no tiene artistas FIMBA asociados."
                : "Los artistas asociados no tienen rider cargado."}
            </div>
          ) : (
            riders.map((p) => (
              <article
                key={p.id}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm flex flex-col gap-2"
              >
                <header className="flex flex-wrap items-center gap-2">
                  <span
                    className="fimba-badge fimba-badge-fimba"
                    style={
                      p.color
                        ? {
                            backgroundColor: `${p.color}22`,
                            borderColor: `${p.color}55`,
                            color: "#222",
                          }
                        : undefined
                    }
                  >
                    {p.nombre || `Artista ${p.id}`}
                  </span>
                </header>
                {isFimbaRiderEmpty(p.rider) ? (
                  <p className="text-sm text-slate-400 italic m-0">Sin rider</p>
                ) : (
                  <div
                    className="fimba-rider-html"
                    style={{ fontSize: "0.88rem", lineHeight: 1.5 }}
                    dangerouslySetInnerHTML={{
                      __html: sanitizeFimbaRiderHtml(p.rider),
                    }}
                  />
                )}
              </article>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
