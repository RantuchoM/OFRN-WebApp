import React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  IconMapPin,
  IconMusic,
  IconUserPlus,
  IconUserX,
  IconX,
} from "../../components/ui/Icons";
import { formatProgramSelectLabel } from "../../utils/giraUtils";
import { stripHtml } from "../../utils/eventDisplayUtils";
import { programRowLabel } from "../../utils/ensayosPorProgramaReport";

function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  const parts = String(dateStr).slice(0, 10).split("-").map(Number);
  const [y, m, d] = parts;
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateBox(dateStr) {
  if (!dateStr) return { day: "-", num: "-", month: "-" };
  try {
    const date = parseLocalDate(dateStr);
    if (!date) return { day: "-", num: "-", month: "-" };
    return {
      day: format(date, "EEE", { locale: es }).toUpperCase().replace(".", ""),
      num: format(date, "d"),
      month: format(date, "MMM", { locale: es }).toUpperCase().replace(".", ""),
    };
  } catch {
    return { day: "-", num: "-", month: "-" };
  }
}

function formatTime(timeStr) {
  return timeStr ? String(timeStr).slice(0, 5) : "--:--";
}

function getLinkedPrograms(evt) {
  const programs = [];
  const seen = new Set();
  const add = (prog) => {
    if (prog?.id == null || seen.has(prog.id)) return;
    seen.add(prog.id);
    programs.push(prog);
  };
  if (evt.programas) add(evt.programas);
  (evt.eventos_programas_asociados || []).forEach((row) => {
    if (row.programas) add(row.programas);
  });
  return programs;
}

function EnsayoListCard({ evt, highlightEnsembleName }) {
  const { day, num, month } = formatDateBox(evt.fecha);
  const eventColor = evt.tipos_evento?.color || "#64748b";
  const tagStyle = {
    color: eventColor,
    backgroundColor: `${eventColor}15`,
    borderColor: `${eventColor}30`,
  };
  const linkedPrograms = getLinkedPrograms(evt);
  const locationStr = evt.locaciones
    ? `${evt.locaciones.nombre}${
        evt.locaciones.localidades?.localidad
          ? ` (${evt.locaciones.localidades.localidad})`
          : ""
      }`
    : "TBA";
  const customs = evt.eventos_asistencia_custom || [];
  const guests = customs.filter(
    (c) => c.tipo === "invitado" || c.tipo === "adicional",
  );
  const absents = customs.filter((c) => c.tipo === "ausente");
  const isDeleted = evt.is_deleted === true;

  return (
    <article
      className={`flex items-start rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm transition-all ${
        isDeleted ? "line-through opacity-50 grayscale" : ""
      }`}
    >
      <div className="mr-3 flex w-12 shrink-0 flex-col items-center justify-center rounded-md border border-slate-100 bg-slate-50 p-1">
        <span className="mb-0.5 text-[9px] font-bold uppercase leading-none text-slate-400">
          {day}
        </span>
        <span className="text-xl font-bold leading-none text-slate-700">
          {num}
        </span>
        <span className="mt-0.5 text-[9px] font-bold uppercase leading-none text-slate-400">
          {month}
        </span>
      </div>

      <div
        className="relative min-w-0 flex-1 border-l-2 pl-3"
        style={{ borderLeftColor: eventColor }}
      >
        <div className="mb-1 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-slate-100 px-1.5 font-mono text-xs font-bold text-slate-600">
                {formatTime(evt.hora_inicio)} - {formatTime(evt.hora_fin)}
              </span>
              <span
                className="max-w-[140px] truncate rounded border px-1.5 py-px text-[9px] font-bold uppercase tracking-wider"
                style={tagStyle}
              >
                {evt.tipos_evento?.nombre || "Ensayo de ensamble"}
              </span>
            </div>
            <h3 className="mt-1 truncate text-sm font-bold text-slate-800">
              {stripHtml(evt.descripcion) || "Ensayo de ensamble"}
            </h3>
            {isDeleted && (
              <span className="mt-0.5 block text-[10px] font-medium text-amber-600">
                Se elimina definitivamente en 24 h
              </span>
            )}
          </div>
        </div>

        {linkedPrograms.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {linkedPrograms.map((prog) => (
              <span
                key={prog.id}
                className="flex max-w-full items-center gap-1 truncate rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-600"
              >
                <IconMusic size={10} className="shrink-0 text-slate-400" />
                <span className="truncate">
                  {formatProgramSelectLabel(prog)}
                </span>
              </span>
            ))}
          </div>
        )}

        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span className="flex max-w-[200px] items-center gap-1 truncate">
            <IconMapPin size={12} className="shrink-0 text-slate-400" />
            {locationStr}
          </span>
          {evt.eventos_ensambles?.length > 0 && (
            <div className="flex max-w-full flex-wrap items-center gap-1 border-l border-slate-200 pl-2">
              {evt.eventos_ensambles.map((ee) => {
                const name = ee.ensambles?.ensamble;
                const isHighlight =
                  highlightEnsembleName &&
                  name === highlightEnsembleName;
                return (
                  <span
                    key={ee.ensambles?.id ?? ee.id_ensamble}
                    className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                      isHighlight
                        ? "border border-indigo-200 bg-indigo-50 text-indigo-800"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {name}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {(guests.length > 0 || absents.length > 0) && (
          <div className="mt-2 flex flex-wrap gap-1 border-t border-dashed border-slate-100 pt-2">
            {guests.map((g) => (
              <span
                key={g.id_integrante}
                className="inline-flex items-center gap-1 rounded border border-emerald-100 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700"
              >
                <IconUserPlus size={10} />
                {g.integrantes?.apellido}{" "}
                {g.integrantes?.nombre?.charAt(0)}.
              </span>
            ))}
            {absents.map((a) => (
              <span
                key={a.id_integrante}
                className="inline-flex items-center gap-1 rounded border border-rose-100 bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700"
              >
                <IconUserX size={10} />
                {a.integrantes?.apellido}{" "}
                {a.integrantes?.nombre?.charAt(0)}.
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

export default function EnsayoCellDetailModal({
  isOpen,
  onClose,
  program,
  ensemble,
  events = [],
}) {
  if (!isOpen || !program || !ensemble) return null;

  const title = programRowLabel(program);
  const ensembleName = ensemble.ensamble || `Ensamble ${ensemble.id}`;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-3 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(88vh,680px)] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-800">
              Ensayos de ensamble
            </h2>
            <p className="mt-0.5 truncate text-xs text-slate-600">{title}</p>
            <p className="text-[11px] font-bold text-indigo-700">
              {ensembleName} · {events.length}{" "}
              {events.length === 1 ? "ensayo" : "ensayos"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Cerrar"
          >
            <IconX size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-3">
          {events.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No hay ensayos en esta celda.
            </p>
          ) : (
            <ul className="space-y-2">
              {events.map((evt) => (
                <li key={evt.id}>
                  <EnsayoListCard
                    evt={evt}
                    highlightEnsembleName={ensembleName}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
