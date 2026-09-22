import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { IconX, IconLoader, IconHistory } from "../ui/Icons";
import { getEventHistory } from "../../services/giraService";
import {
  creationSourceLabel,
  formatConcertCreatedLine,
  formatDateTimeEs,
  formatPersonNombre,
} from "../../utils/eventCreationLog";

const FIELD_LABELS = {
  fecha: "Fecha",
  hora_inicio: "Hora inicio",
  hora_fin: "Hora fin",
  created: "Creado",
};

function createdLineFromLog(log) {
  const name = formatPersonNombre(log?.integrantes);
  const source = creationSourceLabel(log?.valor_nuevo);
  const dateStr = formatDateTimeEs(log?.created_at);
  let line = dateStr ? `Creado el ${dateStr}` : "Creado";
  if (name) line += ` por ${name}`;
  if (source) line += ` · ${source}`;
  return line;
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

  const createdSummary = useMemo(() => {
    if (createdLog) return createdLineFromLog(createdLog);
    if (eventMeta) return formatConcertCreatedLine(eventMeta);
    return "";
  }, [createdLog, eventMeta]);

  const zClass = nested ? "z-[110]" : "z-[100]";

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
            Historial — {eventLabel}
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
              {createdSummary ? (
                <div className="border border-indigo-100 rounded-xl p-3 bg-indigo-50/60">
                  <span className="text-xs font-bold uppercase tracking-wide text-indigo-600 block mb-1">
                    Creado
                  </span>
                  <p className="text-sm font-medium text-slate-800">
                    {createdSummary}
                  </p>
                </div>
              ) : null}

              {changeLogs.length === 0 && !createdSummary ? (
                <p className="text-slate-500 text-sm text-center py-8">
                  No hay cambios registrados para este evento.
                </p>
              ) : changeLogs.length === 0 ? (
                <p className="text-slate-400 text-xs text-center py-2">
                  No hay cambios posteriores de fecha u hora.
                </p>
              ) : (
                <ul className="space-y-3">
                  {changeLogs.map((log) => (
                    <li
                      key={log.id}
                      className="border border-slate-200 rounded-xl p-3 bg-slate-50/50"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-bold uppercase tracking-wide text-indigo-600">
                          {FIELD_LABELS[log.campo] || log.campo}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formatDateTimeEs(log.created_at) || "—"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-slate-400 text-xs block">
                            Anterior
                          </span>
                          <span className="text-slate-700 font-medium">
                            {log.valor_anterior ?? "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-xs block">
                            Nuevo
                          </span>
                          <span className="text-slate-800 font-medium">
                            {log.valor_nuevo ?? "—"}
                          </span>
                        </div>
                      </div>
                      {formatPersonNombre(log.integrantes) ? (
                        <p className="text-[10px] text-slate-400 mt-1">
                          Por {formatPersonNombre(log.integrantes)}
                        </p>
                      ) : null}
                    </li>
                  ))}
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
