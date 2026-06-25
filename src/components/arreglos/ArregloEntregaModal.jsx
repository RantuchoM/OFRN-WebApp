import React from "react";
import { createPortal } from "react-dom";
import { IconCheck, IconDrive, IconLoader, IconX } from "../ui/Icons";

function stripHtml(html) {
  return (html || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

export default function ArregloEntregaModal({
  isOpen,
  onClose,
  work,
  linkValue,
  onLinkChange,
  notaValue,
  onNotaChange,
  canEditDelivery,
  canMarkEntregado,
  isSaving,
  onSaveLink,
  onEntregado,
}) {
  if (!isOpen || !work) return null;

  const titulo = stripHtml(work.titulo) || `Obra #${work.id}`;
  const isParaArreglar = work.estado === "Para arreglar";

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-3">
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-slate-200 flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="arreglo-entrega-title"
      >
        <div className="flex items-start justify-between gap-2 px-4 py-3 border-b border-slate-200">
          <div className="min-w-0">
            <h3 id="arreglo-entrega-title" className="text-sm font-bold text-slate-800">
              Entrega de arreglo
            </h3>
            <p className="text-xs text-slate-500 truncate mt-0.5" title={titulo}>
              {titulo}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg disabled:opacity-40"
            aria-label="Cerrar"
          >
            <IconX size={18} />
          </button>
        </div>

        <div className="px-4 py-3 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                work.estado === "Para arreglar"
                  ? "bg-amber-100 text-amber-800 border-amber-200"
                  : "bg-sky-100 text-sky-800 border-sky-200"
              }`}
            >
              {work.estado}
            </span>
            {work.fecha_esperada && (
              <span className="text-[11px] text-slate-600 font-mono">
                F. est.{" "}
                {new Date(`${work.fecha_esperada}T12:00:00`).toLocaleDateString("es-AR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "2-digit",
                })}
              </span>
            )}
          </div>

          {isParaArreglar && canEditDelivery ? (
            <>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">
                  Link Drive
                </label>
                <input
                  type="url"
                  value={linkValue}
                  onChange={(e) => onLinkChange(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full text-sm border border-slate-300 rounded-lg px-2.5 py-2 focus:ring-2 focus:ring-indigo-500"
                />
                {work.link_drive && (
                  <a
                    href={work.link_drive}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-green-600 hover:underline mt-1"
                  >
                    <IconDrive size={12} /> Abrir carpeta guardada
                  </a>
                )}
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">
                  Nota de entrega (opc.)
                </label>
                <textarea
                  rows={3}
                  value={notaValue}
                  onChange={(e) => onNotaChange(e.target.value)}
                  placeholder="Mensaje al archivista al entregar…"
                  className="w-full text-sm border border-amber-200 bg-amber-50/50 rounded-lg px-2.5 py-2 resize-y focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </>
          ) : (
            <div className="space-y-2 text-sm">
              {work.link_drive ? (
                <a
                  href={work.link_drive}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs font-bold hover:bg-amber-100"
                >
                  <IconDrive size={16} /> Abrir carpeta en Drive
                </a>
              ) : (
                <p className="text-xs text-slate-400 italic">Sin carpeta de Drive.</p>
              )}
            </div>
          )}
        </div>

        {isParaArreglar && canEditDelivery ? (
          <div className="px-4 py-3 border-t border-slate-200 flex flex-wrap gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="text-xs font-bold px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={onSaveLink}
              disabled={isSaving || !linkValue.trim()}
              className="text-xs font-bold px-3 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
            >
              {isSaving ? <IconLoader size={12} className="animate-spin inline" /> : "Guardar link"}
            </button>
            {canMarkEntregado && (
              <button
                type="button"
                onClick={onEntregado}
                disabled={isSaving || !linkValue.trim()}
                className="text-xs font-bold px-3 py-2 rounded-lg bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50 flex items-center gap-1"
              >
                {isSaving ? (
                  <IconLoader size={12} className="animate-spin" />
                ) : (
                  <IconCheck size={12} />
                )}
                Marcar entregado
              </button>
            )}
          </div>
        ) : (
          <div className="px-4 py-3 border-t border-slate-200 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
