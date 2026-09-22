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

  const className = prominent
    ? `${compact ? "p-1" : "p-1.5"} text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-full border border-indigo-200`
    : compact
      ? "p-1 text-slate-400 hover:text-indigo-500 rounded-full border border-transparent hover:border-indigo-100"
      : "p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-full";

  return (
    <button
      type="button"
      onClick={handleClick}
      className={className}
      title="Ver historial"
      aria-label="Ver historial"
    >
      <IconHistory size={14} />
    </button>
  );
}
