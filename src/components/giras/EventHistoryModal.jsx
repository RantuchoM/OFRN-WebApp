import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { IconX, IconLoader } from "../ui/Icons";
import { getEventLogs } from "../../services/giraService";

const FIELD_LABELS = {
  fecha: "Fecha",
  hora_inicio: "Hora inicio",
  hora_fin: "Hora fin",
};

function formatDateTime(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("es-AR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function EventHistoryModal({
  supabase,
  eventId,
  eventLabel = "Evento",
  onClose,
}) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase || eventId == null) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    getEventLogs(supabase, eventId).then((data) => {
      if (!cancelled) {
        setLogs(Array.isArray(data) ? data : []);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [supabase, eventId]);

  const content = (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
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
            className="text-base font-bold text-slate-800 truncate pr-2"
          >
            Historial de cambios — {eventLabel}
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
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <IconLoader className="animate-spin text-indigo-500" size={32} />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">
              No hay cambios registrados para este evento.
            </p>
          ) : (
            <ul className="space-y-3">
              {logs.map((log) => (
                <li
                  key={log.id}
                  className="border border-slate-200 rounded-xl p-3 bg-slate-50/50"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wide text-indigo-600">
                      {FIELD_LABELS[log.campo] || log.campo}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {formatDateTime(log.created_at)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-slate-400 text-xs block">Anterior</span>
                      <span className="text-slate-700 font-medium">
                        {log.valor_anterior ?? "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs block">Nuevo</span>
                      <span className="text-slate-800 font-medium">
                        {log.valor_nuevo ?? "—"}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
