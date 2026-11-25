import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { IconAlignLeft, IconX } from "../../components/ui/Icons";
import {
  isStagePlotFooterNoteEmpty,
  sanitizeStagePlotFooterNoteHtml,
} from "../../utils/stagePlotFooterNote";

const TOOLBAR = [
  ["bold", "italic"],
  [{ list: "ordered" }, { list: "bullet" }],
  ["clean"],
];

const FORMATS = ["bold", "italic", "list"];

/**
 * Modal para editar la nota al pie del lienzo activo (HTML mínimo Quill).
 */
export default function StagePlotFooterNoteModal({
  open,
  value = "",
  canEdit = true,
  onClose,
  onSave,
  zIndex = 100,
}) {
  const [draft, setDraft] = useState(value || "");
  const modules = useMemo(
    () => ({
      toolbar: TOOLBAR,
      clipboard: { matchVisual: false },
    }),
    [],
  );

  useEffect(() => {
    if (!open) return;
    setDraft(value || "");
  }, [open, value]);

  if (!open) return null;

  const handleSave = () => {
    const clean = sanitizeStagePlotFooterNoteHtml(draft);
    onSave?.(clean);
    onClose?.();
  };

  const empty = isStagePlotFooterNoteEmpty(draft);

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-slate-900/50 p-3 sm:p-4"
      style={{ zIndex }}
      role="dialog"
      aria-modal="true"
      aria-label="Nota al pie del escenario"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-800">
              <IconAlignLeft size={18} className="text-indigo-600" />
              Nota al pie
            </h2>
            <p className="text-xs text-slate-500">
              Se guarda con este lienzo y puede incluirse al exportar PDF/JPG.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar"
          >
            <IconX size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {canEdit ? (
            <div className="stage-plot-footer-note-quill rounded border border-slate-200">
              <ReactQuill
                theme="snow"
                value={draft}
                onChange={setDraft}
                modules={modules}
                formats={FORMATS}
                placeholder="Instrucciones técnicas, contactos, notas de montaje…"
              />
            </div>
          ) : isStagePlotFooterNoteEmpty(value) ? (
            <p className="rounded border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-400">
              Sin nota
            </p>
          ) : (
            <div
              className="prose prose-sm max-w-none rounded border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700"
              dangerouslySetInnerHTML={{
                __html: sanitizeStagePlotFooterNoteHtml(value),
              }}
            />
          )}
          <p className="mt-2 text-[10px] text-slate-400">
            Negrita, cursiva y listas. Sin imágenes ni links.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-white px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 rounded border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
            >
              Guardar{empty ? " (vacía)" : ""}
            </button>
          )}
        </div>
      </div>
      <style>{`
        .stage-plot-footer-note-quill .ql-container {
          min-height: 140px;
          font-size: 13px;
        }
        .stage-plot-footer-note-quill .ql-editor {
          min-height: 140px;
        }
        .stage-plot-footer-note-quill .ql-toolbar {
          border-top: 0;
          border-left: 0;
          border-right: 0;
        }
        .stage-plot-footer-note-quill .ql-container {
          border-bottom: 0;
          border-left: 0;
          border-right: 0;
        }
      `}</style>
    </div>,
    document.body,
  );
}
