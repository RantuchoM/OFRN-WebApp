import { createPortal } from "react-dom";
import { IconHistory, IconX } from "../ui/Icons";
import {
  ROSTER_ACCION_LABEL,
  formatRosterStamp,
  rosterActorLabel,
} from "../../utils/rosterHistorial";

const ACCION_CLASS = {
  alta: "bg-emerald-50 text-emerald-800 border-emerald-200",
  baja: "bg-rose-50 text-rose-800 border-rose-200",
  ausente: "bg-slate-100 text-slate-700 border-slate-200",
  presente: "bg-indigo-50 text-indigo-800 border-indigo-200",
};

function personLine(event) {
  return rosterActorLabel(event.integrante_apellido, event.integrante_nombre);
}

export default function RosterHistorialModal({
  open,
  events = [],
  integranteId = null,
  personLabel = "",
  onClose,
}) {
  if (!open) return null;

  const rows =
    integranteId == null
      ? events
      : events.filter(
          (event) => String(event.id_integrante) === String(integranteId),
        );

  const title = integranteId == null ? "Historial del roster" : "Historial";
  const subtitle =
    integranteId == null
      ? "Altas, bajas, ausencias y vueltas a presente"
      : personLabel || personLine(rows[0]) || "Integrante";

  return createPortal(
    <div
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex: 100 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="roster-historial-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50">
          <div className="min-w-0">
            <h2
              id="roster-historial-title"
              className="text-sm font-bold text-slate-800 flex items-center gap-2"
            >
              <IconHistory size={16} />
              {title}
            </h2>
            <p className="text-xs text-slate-500 truncate mt-0.5" title={subtitle}>
              {subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:bg-white hover:text-slate-800"
            aria-label="Cerrar"
          >
            <IconX size={18} />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-2">
          {rows.length === 0 ? (
            <p className="text-xs text-slate-400 italic px-1 py-4 text-center">
              No hay movimientos registrados.
            </p>
          ) : (
            rows.map((event) => {
              const actor = rosterActorLabel(
                event.actor_apellido,
                event.actor_nombre,
              );
              const who = personLine(event);
              return (
                <div
                  key={event.id}
                  className="border border-slate-100 rounded-lg px-3 py-2 bg-white"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${
                        ACCION_CLASS[event.accion] ||
                        "bg-slate-50 text-slate-600 border-slate-200"
                      }`}
                    >
                      {ROSTER_ACCION_LABEL[event.accion] || event.accion}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {formatRosterStamp(event.created_at)}
                    </span>
                  </div>
                  {integranteId == null && who && (
                    <p className="text-xs font-semibold text-slate-700 mt-1">
                      {who}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {actor ? `Por ${actor}` : "Autor no registrado"}
                  </p>
                  {event.motivo ? (
                    <p className="text-[11px] text-slate-600 mt-1 whitespace-pre-wrap">
                      {event.motivo}
                    </p>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
