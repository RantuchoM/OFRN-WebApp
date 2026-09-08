import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  IconAlertTriangle,
  IconCopy,
  IconMail,
  IconUsers,
  IconX,
} from "../ui/Icons";

const BANNER_TEXT =
  "Tené en cuenta que a estos músicos se les agregaron obras a menos de dos semanas de la gira. Para notificarlos puedes copiar los mails";

async function copyText(text, { emptyMessage, successMessage }) {
  if (!text) {
    toast.error(emptyMessage);
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    toast.success(successMessage);
  } catch {
    toast.error("No se pudo copiar al portapapeles");
  }
}

function LateAssignmentChangesModal({ open, onClose, musicians, detalleText }) {
  useEffect(() => {
    if (!open || !onClose) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="late-assignment-title"
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 flex flex-col max-h-[80vh]"
      >
        <div className="px-4 py-3 border-b border-slate-200 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3
              id="late-assignment-title"
              className="text-sm font-bold text-slate-800 flex items-center gap-2"
            >
              <IconUsers size={16} className="text-amber-600 shrink-0" />
              Músicos y cambios ({musicians.length})
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Altas y cambios de particella de esta visita a Seating.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 shrink-0"
            aria-label="Cerrar"
          >
            <IconX size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 min-h-[120px]">
          {musicians.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              No hay cambios en esta visita.
            </p>
          ) : (
            <ul className="space-y-3">
              {musicians.map((m) => (
                <li key={m.id} className="text-sm">
                  <p className="font-bold text-slate-800">{m.displayName}</p>
                  {m.mail ? (
                    <p className="text-[11px] text-slate-400 truncate">{m.mail}</p>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">Sin mail</p>
                  )}
                  <ul className="mt-1 space-y-0.5">
                    {m.changes.map((c) => (
                      <li
                        key={`${m.id}-${c.obraId}-${c.fromLabel}-${c.toLabel}`}
                        className="text-xs text-slate-600 pl-2"
                      >
                        <span className="font-medium text-slate-700">
                          {c.obraTitle}
                        </span>
                        {": "}
                        <span>{c.fromLabel}</span>
                        {" → "}
                        <span className="font-medium text-amber-800">
                          {c.toLabel}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={() =>
              copyText(detalleText, {
                emptyMessage: "No hay detalle para copiar",
                successMessage: "Detalle copiado",
              })
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-950 hover:bg-amber-100"
          >
            <IconCopy size={14} />
            Copiar detalle
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function SeatingLateAssignmentBanner({
  musicians = [],
  detalleText = "",
  emails = [],
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const count = musicians.length;
  if (count === 0) return null;

  return (
    <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-2 sm:px-4 py-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <IconAlertTriangle
            size={16}
            className="mt-0.5 shrink-0 text-amber-600"
          />
          <p className="text-xs text-amber-950 leading-snug">{BANNER_TEXT}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-amber-950 hover:bg-amber-100"
          >
            <IconUsers size={14} />
            Ver músicos ({count}) y cambios
          </button>
          <button
            type="button"
            onClick={() =>
              copyText(emails.join(", "), {
                emptyMessage: "No hay mails para copiar",
                successMessage:
                  emails.length === 1
                    ? "1 mail copiado"
                    : `${emails.length} mails copiados`,
              })
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-amber-950 hover:bg-amber-100"
          >
            <IconMail size={14} />
            Copiar mails
          </button>
        </div>
      </div>
      <LateAssignmentChangesModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        musicians={musicians}
        detalleText={detalleText}
      />
    </div>
  );
}
