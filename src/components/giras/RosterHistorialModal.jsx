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

export function RosterHistorialList({ events = [] }) {
  if (events.length === 0) {
    return (
      <p className="text-xs text-slate-400 italic px-1 py-3 text-center">
        No hay movimientos registrados.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {events.map((event) => {
        const actor = rosterActorLabel(event.actor_apellido, event.actor_nombre);
        return (
          <div
            key={event.id}
            className="border border-slate-100 rounded-lg px-3 py-2 bg-slate-50/60"
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
      })}
    </div>
  );
}
