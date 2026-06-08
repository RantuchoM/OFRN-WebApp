import React from "react";
import { IconAlertTriangle, IconCalendar, IconMusic } from "../ui/Icons";
import { formatDisplayDate } from "../../utils/dates";
import ProgramTypeTag from "./ProgramTypeTag";
import GestionProgramaCellContent from "./GestionProgramaCellContent";
import GestionParticipantesCell from "./GestionParticipantesCell";

export function programLabel(p) {
  const line1 = [p.nomenclador, p.mes_letra].filter(Boolean).join(" - ");
  const line2 = p.nombre_gira || "";
  return [line1, line2].filter(Boolean).join(" · ") || `Programa #${p.id}`;
}

export function formatProgramaRango(p) {
  const desde = formatDisplayDate(p.fecha_desde) || p.fecha_desde || "—";
  const hasta = formatDisplayDate(p.fecha_hasta) || p.fecha_hasta || "—";
  return `${desde} → ${hasta}`;
}

function ProgramaSinConciertosContent({ programa, onOpenProgram, compact = false }) {
  const tipo = String(programa.tipo || "").trim();

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2 ${
        compact ? "gap-x-3" : ""
      }`}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-400 bg-amber-100 px-2 py-0.5 font-bold uppercase text-amber-900 ${
            compact ? "text-[10px]" : "text-[11px]"
          } animate-pulse`}
        >
          <IconAlertTriangle size={compact ? 12 : 14} />
          Sin conciertos
        </span>
        <span
          className={`font-semibold text-slate-800 ${compact ? "text-xs" : "text-sm"}`}
        >
          {programLabel(programa)}
        </span>
        {tipo ? <ProgramTypeTag tipo={tipo} /> : null}
        <span
          className={`font-medium text-amber-900/90 ${compact ? "text-[11px]" : "text-xs"}`}
        >
          {formatProgramaRango(programa)}
        </span>
      </div>
      {onOpenProgram ? (
        <button
          type="button"
          onClick={() => onOpenProgram(programa.id)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-amber-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-amber-800 transition-colors hover:bg-amber-100"
          title="Ir al programa"
        >
          <IconCalendar size={12} />
          Ver programa
        </button>
      ) : null}
    </div>
  );
}

/** Fila intercalada en la tabla de Gestión → Conciertos */
export function ProgramaSinConciertosGestionRow({
  row,
  onOpenProgram,
  onOpenRepertorio,
  onOpenObservaciones,
}) {
  if (!row) return null;

  return (
    <tr className="bg-amber-50/90 align-top text-slate-700">
      <td className="w-[1%] border-b border-amber-200 px-2 py-2 text-xs">
        <div className="flex flex-col items-start gap-1 leading-tight">
          <span className="whitespace-pre-line">{row.fecha}</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-400 bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-900 animate-pulse">
            <IconAlertTriangle size={10} />
            Sin conciertos
          </span>
        </div>
      </td>
      <td className="border-b border-amber-200 px-3 py-2 text-slate-400">{row.hora}</td>
      <td className="border-b border-amber-200 px-3 py-2">
        <GestionProgramaCellContent
          tipoPrograma={row.tipoPrograma}
          nomenclador={row.nomenclador}
          mesLetra={row.mesLetra}
          nombreGira={row.nombreGira}
          estadoPrograma={row.estadoPrograma}
          onOpenAgenda={onOpenProgram ? () => onOpenProgram(row.programId) : undefined}
          agendaDisabled={!row.programId}
        />
      </td>
      <td className="border-b border-amber-200 px-3 py-2">
        <GestionParticipantesCell
          participantesEnsamble={row.participantesEnsamble}
          participantesFamilia={row.participantesFamilia}
        />
      </td>
      <td className="border-b border-amber-200 px-3 py-2 text-slate-400">
        <div className="leading-tight">
          <div className="text-sm">-</div>
        </div>
      </td>
      <td className="border-b border-amber-200 px-3 py-2">
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500">
          Sin estado
        </span>
      </td>
      <td className="border-b border-amber-200 px-3 py-2">
        <button
          type="button"
          onClick={() => onOpenRepertorio?.(row)}
          className={`inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors ${
            row.repertorioLines.length > 0
              ? "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
              : "border-slate-200 bg-slate-100 text-slate-400 hover:bg-slate-200"
          }`}
          title={
            row.repertorioLines.length > 0
              ? "Ver repertorio del programa"
              : "Sin repertorio cargado"
          }
        >
          <IconMusic size={14} />
        </button>
      </td>
      <td className="border-b border-amber-200 px-3 py-2">
        <button
          type="button"
          onClick={() => {
            if (!row.difusionObservaciones) return;
            onOpenObservaciones?.(row);
          }}
          className={`h-4 w-4 rounded-[2px] border rotate-[-8deg] transition-transform hover:rotate-0 ${
            row.difusionObservaciones
              ? "border-amber-500/90 bg-amber-300 hover:bg-amber-200"
              : "cursor-default border-dashed border-amber-400/80 bg-amber-50"
          }`}
          title={
            row.difusionObservaciones
              ? "Ver observaciones de Redes/Difusión"
              : "Sin observaciones de Redes/Difusión"
          }
        />
      </td>
    </tr>
  );
}

/** Fila intercalada en la tabla de Difusión (escritorio) */
export function ProgramaSinConciertosDifusionTableRow({
  programa,
  onOpenProgram,
  colSpan,
}) {
  return (
    <tr className="bg-amber-50/90">
      <td colSpan={colSpan} className="border-t border-amber-200 p-2.5">
        <ProgramaSinConciertosContent
          programa={programa}
          onOpenProgram={onOpenProgram}
          compact
        />
      </td>
    </tr>
  );
}

/** Tarjeta intercalada en Difusión (móvil) */
export function ProgramaSinConciertosDifusionCard({ programa, onOpenProgram }) {
  return (
    <article className="rounded-lg border border-amber-300 bg-amber-50/90 p-2.5 shadow-sm">
      <ProgramaSinConciertosContent
        programa={programa}
        onOpenProgram={onOpenProgram}
        compact
      />
    </article>
  );
}

/**
 * @deprecated Usar filas intercaladas. Se mantiene por compatibilidad.
 */
export default function ProgramasSinConciertosBanner({
  programas = [],
  onOpenProgram,
  className = "",
}) {
  if (!programas.length) return null;

  return (
    <div
      className={`overflow-hidden rounded-lg border border-amber-300 bg-amber-50/80 ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-100/70 px-4 py-2.5">
        <IconAlertTriangle size={16} className="shrink-0 text-amber-700" />
        <p className="text-xs font-bold uppercase tracking-wide text-amber-900">
          Programas sin conciertos definidos
        </p>
        <span className="text-[10px] font-semibold text-amber-700/80">
          ({programas.length})
        </span>
      </div>
      <ul className="divide-y divide-amber-200/70">
        {programas.map((p) => (
          <li key={p.id} className="px-4 py-2.5">
            <ProgramaSinConciertosContent programa={p} onOpenProgram={onOpenProgram} />
          </li>
        ))}
      </ul>
    </div>
  );
}
