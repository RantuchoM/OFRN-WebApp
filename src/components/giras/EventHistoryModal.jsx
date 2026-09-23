import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  IconX,
  IconLoader,
  IconHistory,
  IconUser,
  IconClock,
  IconMapPin,
  IconArrowRight,
} from "../ui/Icons";
import { getEventHistory } from "../../services/giraService";
import {
  buildScheduleChangeGroups,
  creationSourceLabel,
  formatDateTimeEs,
  formatLogDate,
  formatLogTime,
  formatPersonNombre,
} from "../../utils/eventCreationLog";

function authorNameFrom(person) {
  return formatPersonNombre(person) || "";
}

function createdMetaFromLog(log) {
  const dateStr = formatDateTimeEs(log?.created_at);
  return {
    line: dateStr ? `Creado el ${dateStr}` : "Creado",
    name: authorNameFrom(log?.integrantes),
    source: creationSourceLabel(log?.valor_nuevo),
  };
}

/** «Concierto 2026-11-14 21:00» → fechas dd/mm/yyyy en el título. */
function formatEventLabelDates(label) {
  if (!label) return "Evento";
  return String(label).replace(
    /\b(\d{4})-(\d{2})-(\d{2})\b/g,
    (_, y, m, d) => `${d}/${m}/${y}`,
  );
}

function HighlightPart({ text, changed, side }) {
  const display = text || "—";
  if (!changed) {
    return (
      <span className="text-sm text-slate-600 font-medium tabular-nums">
        {display}
      </span>
    );
  }
  if (side === "before") {
    return (
      <span className="text-sm text-slate-500 font-medium tabular-nums line-through decoration-slate-400/80">
        {display}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md bg-emerald-50 px-1.5 py-0.5 text-sm font-semibold text-emerald-800 tabular-nums ring-1 ring-inset ring-emerald-200/80">
      {display}
    </span>
  );
}

function ScheduleStamp({ snap, changed, side }) {
  const date = formatLogDate(snap?.fecha);
  const time = formatLogTime(snap?.hora_inicio);
  return (
    <p className="text-sm font-medium flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 min-w-0">
      <HighlightPart
        text={date || "—"}
        changed={Boolean(changed?.fecha)}
        side={side}
      />
      {time || changed?.hora_inicio ? (
        <HighlightPart
          text={time || "—"}
          changed={Boolean(changed?.hora_inicio)}
          side={side}
        />
      ) : null}
    </p>
  );
}

function SideRow({ before, after, changed }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1">
      <HighlightPart text={before} changed={changed} side="before" />
      <IconArrowRight
        size={14}
        className={changed ? "text-emerald-500 shrink-0" : "text-slate-300 shrink-0"}
      />
      <HighlightPart text={after} changed={changed} side="after" />
    </div>
  );
}

export default function EventHistoryModal({
  supabase,
  eventId,
  eventLabel = "Evento",
  event: eventProp = null,
  nested = false,
  onClose,
}) {
  const [logs, setLogs] = useState([]);
  const [eventMeta, setEventMeta] = useState(eventProp);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase || eventId == null) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    getEventHistory(supabase, eventId).then(({ logs: data, event }) => {
      if (cancelled) return;
      setLogs(Array.isArray(data) ? data : []);
      if (event) setEventMeta((prev) => ({ ...(prev || {}), ...event }));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [supabase, eventId]);

  const createdLog = useMemo(
    () => logs.find((log) => log.campo === "created") || null,
    [logs],
  );
  const changeLogs = useMemo(
    () => logs.filter((log) => log.campo !== "created"),
    [logs],
  );
  const changeGroups = useMemo(
    () => buildScheduleChangeGroups(changeLogs, eventMeta),
    [changeLogs, eventMeta],
  );

  const createdMeta = useMemo(() => {
    if (createdLog) return createdMetaFromLog(createdLog);
    if (!eventMeta) return { line: "", name: "", source: "" };
    const dateStr = formatDateTimeEs(eventMeta.created_at);
    return {
      line: dateStr ? `Creado el ${dateStr}` : "",
      name:
        authorNameFrom(eventMeta.creador) ||
        authorNameFrom(eventMeta.created_by_integrante) ||
        authorNameFrom(eventMeta.integrantes),
      source: creationSourceLabel(eventMeta.creation_source),
    };
  }, [createdLog, eventMeta]);

  const createdSummary = createdMeta.line;
  const createdAuthor = createdMeta.name;
  const createdSource = createdMeta.source;
  const hasCreatedCard = Boolean(
    createdSummary || createdAuthor || createdSource,
  );

  const zClass = nested ? "z-[110]" : "z-[100]";
  const titleLabel = formatEventLabelDates(eventLabel);

  const content = (
    <div
      className={`fixed inset-0 ${zClass} flex items-center justify-center bg-black/50 backdrop-blur-sm p-4`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-history-title"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          <h2
            id="event-history-title"
            className="text-base font-bold text-slate-800 truncate pr-2 flex items-center gap-2"
          >
            <IconHistory size={18} className="text-indigo-600 shrink-0" />
            Historial — {titleLabel}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
            aria-label="Cerrar"
          >
            <IconX size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <IconLoader className="animate-spin text-indigo-500" size={32} />
            </div>
          ) : (
            <>
              {hasCreatedCard ? (
                <div className="border border-indigo-100 rounded-xl p-3 bg-indigo-50/60">
                  <span className="text-xs font-bold uppercase tracking-wide text-indigo-600 block mb-1">
                    Creado
                  </span>
                  <p className="text-sm font-medium text-slate-800">
                    {createdSummary}
                  </p>
                  {createdAuthor || createdSource ? (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-indigo-700">
                      {createdAuthor ? (
                        <IconUser size={14} className="shrink-0" />
                      ) : null}
                      <span>
                        {[createdAuthor, createdSource]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </p>
                  ) : null}
                </div>
              ) : null}

              {changeLogs.length === 0 && !hasCreatedCard ? (
                <p className="text-slate-500 text-sm text-center py-8">
                  No hay cambios registrados para este evento.
                </p>
              ) : changeLogs.length === 0 ? (
                <p className="text-slate-400 text-xs text-center py-2">
                  No hay cambios posteriores de fecha, hora o locación.
                </p>
              ) : (
                <ul className="space-y-3">
                  {changeGroups.map((group) => {
                    const who = authorNameFrom(group.integrantes);
                    const locChanged = Boolean(group.changed?.locacion);
                    const finChanged = Boolean(group.changed?.hora_fin);
                    const stampChanged =
                      Boolean(group.changed?.fecha) ||
                      Boolean(group.changed?.hora_inicio);
                    return (
                      <li
                        key={group.key}
                        className="border border-slate-200 rounded-xl overflow-hidden bg-white"
                      >
                        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-50 border-b border-slate-100">
                          <span className="text-[11px] text-slate-500">
                            {formatDateTimeEs(group.created_at) || "—"}
                          </span>
                          {who ? (
                            <span className="flex items-center gap-1 text-[11px] text-slate-600 truncate">
                              <IconUser
                                size={12}
                                className="text-slate-400 shrink-0"
                              />
                              {who}
                            </span>
                          ) : null}
                        </div>

                        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 px-3 pt-2 pb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Antes
                          </span>
                          <span className="w-4" aria-hidden="true" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                            Después
                          </span>
                        </div>

                        <div className="px-3 pb-3 space-y-2">
                          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1">
                            <ScheduleStamp
                              snap={group.before}
                              changed={group.changed}
                              side="before"
                            />
                            <IconArrowRight
                              size={14}
                              className={
                                stampChanged
                                  ? "text-emerald-500 shrink-0"
                                  : "text-slate-300 shrink-0"
                              }
                            />
                            <ScheduleStamp
                              snap={group.after}
                              changed={group.changed}
                              side="after"
                            />
                          </div>

                          {finChanged ? (
                            <div>
                              <div className="flex items-center gap-1.5 mb-1">
                                <IconClock
                                  size={14}
                                  className="text-indigo-500 shrink-0"
                                />
                                <span className="text-xs font-bold uppercase tracking-wide text-indigo-600">
                                  Hasta
                                </span>
                              </div>
                              <SideRow
                                before={
                                  formatLogTime(group.before.hora_fin) || "—"
                                }
                                after={
                                  formatLogTime(group.after.hora_fin) || "—"
                                }
                                changed={finChanged}
                              />
                            </div>
                          ) : null}

                          {locChanged ? (
                            <div>
                              <div className="flex items-center gap-1.5 mb-1">
                                <IconMapPin
                                  size={14}
                                  className="text-indigo-500 shrink-0"
                                />
                                <span className="text-xs font-bold uppercase tracking-wide text-indigo-600">
                                  Locación
                                </span>
                              </div>
                              <SideRow
                                before={group.before.locacion || "—"}
                                after={group.after.locacion || "—"}
                                changed={locChanged}
                              />
                            </div>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
