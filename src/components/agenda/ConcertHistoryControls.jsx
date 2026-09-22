import { IconHistory } from "../ui/Icons";
import {
  formatConcertCreatedLine,
  isConcertHistoryEvent,
} from "../../utils/eventCreationLog";

export function ConcertCreatedLine({ event, className = "" }) {
  if (!isConcertHistoryEvent(event)) return null;
  const text = formatConcertCreatedLine(event);
  if (!text) return null;
  return (
    <p
      className={`text-[10px] text-slate-500 leading-tight ${className}`.trim()}
    >
      {text}
    </p>
  );
}

export function AgendaEventHistoryButton({
  event,
  onOpen,
  compact = false,
  prominent = false,
}) {
  if (!event || typeof onOpen !== "function") return null;
  const label = `${event.tipos_evento?.nombre || "Evento"} ${event.fecha || ""} ${String(event.hora_inicio || "").slice(0, 5)}`;
  const handleClick = (e) => {
    e.stopPropagation();
    onOpen({
      id: event.id,
      label,
      event,
    });
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={
          prominent
            ? "p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-full border border-indigo-200"
            : "p-1 text-slate-400 hover:text-indigo-500 rounded-full border border-transparent hover:border-indigo-100"
        }
        title="Ver historial"
        aria-label="Ver historial"
      >
        <IconHistory size={14} />
      </button>
    );
  }

  if (prominent) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-1 px-1.5 py-1 text-[10px] font-bold uppercase tracking-wide text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg border border-indigo-200"
        title="Ver historial"
      >
        <IconHistory size={14} />
        Historial
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-full"
      title="Ver historial de cambios"
      aria-label="Ver historial de cambios"
    >
      <IconHistory size={14} />
    </button>
  );
}
