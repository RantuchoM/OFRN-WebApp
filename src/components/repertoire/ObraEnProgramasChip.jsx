import { IconHistory } from "../ui/Icons";
import {
  formatObraProgramPresenceLabel,
  obraHasProgramHistory,
} from "../../services/obraProgramHistoryService";

/**
 * Chip compacto «En programas» + botón Historial opcional.
 */
export default function ObraEnProgramasChip({
  presence,
  onOpenHistory,
  className = "",
  showHistoryButton = true,
  size = "sm",
}) {
  if (!obraHasProgramHistory(presence)) return null;
  const label = formatObraProgramPresenceLabel(presence);
  const textCls =
    size === "xs"
      ? "text-[8px] px-1 py-0.5"
      : "text-[10px] px-1.5 py-0.5";
  const btnCls =
    size === "xs" ? "p-0.5" : "p-1";

  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      <span
        className={`inline-flex items-center rounded border border-indigo-200 bg-indigo-50 text-indigo-800 font-bold leading-none ${textCls}`}
        title="Esta obra ya figura en uno o más programas (vivos o legacy)"
      >
        {label}
      </span>
      {showHistoryButton && onOpenHistory ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onOpenHistory();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className={`inline-flex items-center justify-center rounded border border-indigo-200 bg-white text-indigo-600 hover:bg-indigo-100 ${btnCls}`}
          title="Ver historial de programas"
          aria-label="Ver historial de programas"
        >
          <IconHistory size={size === "xs" ? 10 : 12} />
        </button>
      ) : null}
    </span>
  );
}
