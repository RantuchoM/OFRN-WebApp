import React from "react";
import { IconChevronDown, IconChevronUp } from "../../components/ui/Icons";

/**
 * Control encima de la primera fila/día visible: revela u oculta eventos ya terminados.
 */
export default function FimbaAgendaPastToggle({
  showPast,
  pastCount,
  onToggle,
}) {
  const n = Number(pastCount) || 0;
  if (n <= 0) return null;
  return (
    <button
      type="button"
      className="fimba-agenda-past-toggle"
      onClick={onToggle}
      aria-expanded={showPast}
    >
      {showPast ? (
        <IconChevronUp size={16} aria-hidden />
      ) : (
        <IconChevronDown size={16} aria-hidden />
      )}
      {showPast ? "Ocultar eventos anteriores" : "Ver eventos anteriores"}
    </button>
  );
}
