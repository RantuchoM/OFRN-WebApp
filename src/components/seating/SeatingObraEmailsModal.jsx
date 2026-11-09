import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { IconMail, IconX } from "../ui/Icons";

/**
 * Modal para elegir instrumentos de una obra en seating y copiar los mails
 * de los músicos correspondientes.
 *
 * instruments: [{ id, label, emails: string[], memberCount }]
 */
export default function SeatingObraEmailsModal({
  isOpen,
  onClose,
  obraTitle = "",
  instruments = [],
}) {
  const [selected, setSelected] = useState(() => new Set());

  const sortedInstruments = useMemo(
    () =>
      [...(instruments || [])].sort((a, b) =>
        String(a.label || "").localeCompare(String(b.label || ""), "es"),
      ),
    [instruments],
  );

  useEffect(() => {
    if (!isOpen) return;
    setSelected(new Set(sortedInstruments.map((inst) => String(inst.id))));
  }, [isOpen, sortedInstruments]);

  useEffect(() => {
    if (!isOpen || !onClose) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const selectedEmails = useMemo(() => {
    const emails = new Set();
    sortedInstruments.forEach((inst) => {
      if (!selected.has(String(inst.id))) return;
      (inst.emails || []).forEach((mail) => {
        const trimmed = String(mail || "").trim();
        if (trimmed) emails.add(trimmed);
      });
    });
    return [...emails];
  }, [sortedInstruments, selected]);

  if (!isOpen || typeof document === "undefined") return null;

  const toggle = (id) => {
    const key = String(id);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === sortedInstruments.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sortedInstruments.map((inst) => String(inst.id))));
    }
  };

  const handleCopy = async () => {
    if (selectedEmails.length === 0) {
      toast.error("No hay correos en la selección.");
      return;
    }
    try {
      await navigator.clipboard.writeText(selectedEmails.join(", "));
      toast.success(
        selectedEmails.length === 1
          ? "1 correo copiado."
          : `${selectedEmails.length} correos copiados.`,
      );
    } catch {
      toast.error("No se pudo copiar al portapapeles.");
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="seating-obra-emails-title"
        className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-slate-200 flex flex-col max-h-[80vh]"
      >
        <div className="px-4 py-3 border-b border-slate-200 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3
              id="seating-obra-emails-title"
              className="text-sm font-bold text-slate-800 flex items-center gap-2"
            >
              <IconMail size={16} className="text-indigo-600 shrink-0" />
              Copiar mails
            </h3>
            {obraTitle ? (
              <p
                className="text-xs text-slate-500 mt-0.5 truncate"
                title={obraTitle}
                dangerouslySetInnerHTML={{ __html: obraTitle }}
              />
            ) : null}
            <p className="text-[11px] text-slate-500 mt-1">
              Elegí instrumentos con particella asignada en esta obra.
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

        <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={toggleAll}
            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
            disabled={sortedInstruments.length === 0}
          >
            {selected.size === sortedInstruments.length &&
            sortedInstruments.length > 0
              ? "Desmarcar todas"
              : "Marcar todas"}
          </button>
          <span className="text-[10px] text-slate-400 font-medium">
            {selected.size}/{sortedInstruments.length}
            {selectedEmails.length > 0
              ? ` · ${selectedEmails.length} mail${selectedEmails.length === 1 ? "" : "s"}`
              : ""}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2 min-h-[120px]">
          {sortedInstruments.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              Nadie tiene particella asignada en esta obra.
            </p>
          ) : (
            <ul className="space-y-1">
              {sortedInstruments.map((inst) => {
                const checked = selected.has(String(inst.id));
                const mailCount = (inst.emails || []).length;
                const withoutMail = Math.max(
                  0,
                  (inst.memberCount || 0) - mailCount,
                );
                return (
                  <li key={inst.id}>
                    <label className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        checked={checked}
                        onChange={() => toggle(inst.id)}
                      />
                      <span
                        className="text-sm text-slate-800 truncate flex-1 min-w-0"
                        title={inst.label}
                      >
                        {inst.label}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0 tabular-nums">
                        {mailCount} mail{mailCount === 1 ? "" : "s"}
                        {withoutMail > 0 ? ` · ${withoutMail} sin` : ""}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="px-4 py-3 border-t border-slate-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={handleCopy}
            disabled={selectedEmails.length === 0}
            className="px-3 py-1.5 text-xs font-bold text-white rounded-lg shadow-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
          >
            <IconMail size={14} />
            Copiar correos
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
