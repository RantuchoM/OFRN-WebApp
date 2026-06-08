import React from "react";
import { IconCalendar } from "../ui/Icons";
import { PROGRAM_TYPES, getProgramTypeColor } from "../../utils/giraUtils";

function getTypeStyleTokens(tipo) {
  const base = getProgramTypeColor(tipo);
  return {
    border: base.match(/border-[\w-]+-\d+/)?.[0] || "border-slate-300",
    text: base.match(/text-[\w-]+-\d+/)?.[0] || "text-slate-700",
  };
}

/** Bloque programa en tablas de Gestión → Conciertos (alineado con GiraCard). */
export default function GestionProgramaCellContent({
  tipoPrograma = "",
  nomenclador = "",
  mesLetra = "",
  nombreGira = "",
  estadoPrograma = "Vigente",
  onOpenAgenda,
  agendaDisabled = false,
}) {
  const tipo = String(tipoPrograma || "").trim();
  const { border, text } = getTypeStyleTokens(tipo);
  const typeColor = getProgramTypeColor(tipo);
  const typeLabel = (PROGRAM_TYPES[tipo] || PROGRAM_TYPES.default).label || tipo;
  const nomenBadge = [mesLetra, nomenclador].filter(Boolean).join(" ");
  const estado = String(estadoPrograma || "Borrador").trim();

  return (
    <div className="space-y-1">
      {tipo || nomenBadge || onOpenAgenda ? (
        <div
          className={`inline-flex w-full max-w-full items-stretch overflow-hidden rounded border ${border}`}
        >
          {tipo ? (
            <span
              className={`inline-flex shrink-0 items-center px-1.5 py-0.5 text-[9px] font-black uppercase leading-tight ${typeColor}`}
            >
              {typeLabel}
            </span>
          ) : null}
          <span
            className={`flex min-w-0 flex-1 items-center ${tipo ? `border-l ${border}` : ""} bg-white/40 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide ${text}`}
          >
            {nomenBadge || "\u00a0"}
          </span>
          {onOpenAgenda ? (
            <button
              type="button"
              onClick={onOpenAgenda}
              disabled={agendaDisabled}
              className={`inline-flex shrink-0 items-center justify-center border-l px-1.5 py-0.5 text-indigo-700 transition-colors hover:bg-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 ${border}`}
              title="Ir a agenda del programa"
            >
              <IconCalendar size={13} />
            </button>
          ) : null}
        </div>
      ) : null}
      {nombreGira ? (
        <span className="block whitespace-pre-wrap text-sm">{nombreGira}</span>
      ) : null}
      {estado !== "Vigente" ? (
        <span
          className={`inline-block rounded border border-current px-1 text-[9px] font-bold uppercase ${text}`}
        >
          {estado}
        </span>
      ) : null}
    </div>
  );
}
