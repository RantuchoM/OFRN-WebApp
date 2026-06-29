import React from "react";
import { createPortal } from "react-dom";
import {
  IconCheck,
  IconCopy,
  IconDrive,
  IconEdit,
  IconFolder,
  IconLoader,
  IconTrash,
  IconX,
} from "../ui/Icons";
import DateInput from "../ui/DateInput";

function stripHtml(html) {
  return (html || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

function formatFechaCorta(fechaStr) {
  if (!fechaStr) return null;
  const d = fechaStr.includes("T") ? new Date(fechaStr) : new Date(`${fechaStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function getDiasRestantesInfo(work) {
  if (!work?.fecha_esperada) return null;
  const estado = (work.estado || "").toLowerCase();
  if (estado === "entregado" || estado === "oficial") return null;

  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const target = new Date(`${work.fecha_esperada}T00:00:00`);
  const diffDays = Math.round((target.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return { kind: "hoy" };
  if (diffDays > 0) return { kind: "faltan", days: diffDays };
  return { kind: "vencio", days: Math.abs(diffDays) };
}

function FieldBlock({ label, children }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">{label}</p>
      {children}
    </div>
  );
}

export default function ArregloMobileDetailModal({
  isOpen,
  onClose,
  work,
  draft,
  fieldStatus,
  fieldStatusKey,
  getFieldStatusClass,
  canEditFields,
  canEditDelivery,
  myCompositorId,
  refCount,
  isSaving,
  onFechaChange,
  onInstrumentacionBlur,
  onDificultadBlur,
  onObservacionesBlur,
  onDraftChange,
  onOpenRefs,
  onOpenEntrega,
  onEdit,
  onDelete,
  onNewVersion,
}) {
  if (!isOpen || !work) return null;

  const isParaArreglar = work.estado === "Para arreglar";
  const diasInfo = getDiasRestantesInfo(work);
  const fechaEntregaFmt = formatFechaCorta(work.fecha_entrega);
  const observaciones =
    draft.observaciones !== undefined
      ? draft.observaciones
      : stripHtml(work.observaciones || "");
  const instrumentacion =
    draft.instrumentacion !== undefined ? draft.instrumentacion : work.instrumentacion || "";
  const dificultad = draft.dificultad !== undefined ? draft.dificultad : work.dificultad || "";
  const fechaValue =
    draft.fecha_esperada !== undefined ? draft.fecha_esperada : work.fecha_esperada || "";
  const link = (work.link_drive || "").trim();
  const notaEntrega = (work.nota_entrega_guardada || "").trim();

  const estadoBadgeClass =
    work.estado === "Para arreglar"
      ? "bg-amber-100 text-amber-800 border-amber-200"
      : work.estado === "Oficial"
        ? "bg-emerald-100 text-emerald-800 border-emerald-200"
        : "bg-sky-100 text-sky-800 border-sky-200";

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-3">
      <div
        className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="arreglo-mobile-detail-title"
      >
        <div className="flex items-start justify-between gap-2 px-4 py-3 border-b border-slate-200 shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${estadoBadgeClass}`}>
                {work.estado}
              </span>
              {fechaEntregaFmt && !isParaArreglar ? (
                <span className="text-[10px] text-slate-500 font-mono">Entregado {fechaEntregaFmt}</span>
              ) : null}
            </div>
            <h3
              id="arreglo-mobile-detail-title"
              className="text-base font-bold text-slate-800 leading-snug"
              dangerouslySetInnerHTML={{
                __html: draft.titulo !== undefined ? draft.titulo : work.titulo || "Sin título",
              }}
            />
            {work.compositor_full ? (
              <p className="text-xs text-slate-500 mt-0.5">{work.compositor_full}</p>
            ) : null}
            {work.arreglador_label ? (
              <p className="text-xs text-slate-600 mt-0.5">
                {work.arreglador_label}
                {myCompositorId === work.id_integrante_arreglador ? (
                  <span className="text-indigo-500 ml-1">(vos)</span>
                ) : null}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg shrink-0"
            aria-label="Cerrar"
          >
            <IconX size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
          <FieldBlock label="Fecha estimada">
            {canEditFields && isParaArreglar ? (
              <DateInput
                label=""
                value={fechaValue}
                onChange={onFechaChange}
                className={`border rounded-lg text-sm w-full ${getFieldStatusClass(
                  fieldStatus[fieldStatusKey(work.id, "fecha_esperada")] || "idle",
                )}`}
              />
            ) : (
              <p className="text-sm font-mono text-slate-700">
                {formatFechaCorta(work.fecha_esperada) || "Sin fecha"}
              </p>
            )}
            {isParaArreglar && diasInfo ? (
              <p className="text-[11px] text-slate-500 mt-1">
                {diasInfo.kind === "hoy" && "Vence hoy"}
                {diasInfo.kind === "faltan" &&
                  `Faltan ${diasInfo.days} día${diasInfo.days === 1 ? "" : "s"}`}
                {diasInfo.kind === "vencio" &&
                  `Venció hace ${diasInfo.days} día${diasInfo.days === 1 ? "" : "s"}`}
              </p>
            ) : null}
            {work.solicitante_label ? (
              <p className="text-[10px] text-violet-600 mt-1">Solicitado por {work.solicitante_label}</p>
            ) : null}
          </FieldBlock>

          <FieldBlock label="Orgánico">
            {canEditFields && isParaArreglar ? (
              <textarea
                rows={2}
                value={instrumentacion}
                onChange={(e) => onDraftChange("instrumentacion", e.target.value)}
                onBlur={(e) => onInstrumentacionBlur(e.target.value)}
                className={`w-full text-sm font-mono border rounded-lg px-2 py-2 resize-y ${getFieldStatusClass(
                  fieldStatus[fieldStatusKey(work.id, "instrumentacion")] || "idle",
                )}`}
              />
            ) : (
              <p className="text-sm font-mono text-slate-700 bg-slate-50 rounded-lg px-2 py-1.5">
                {work.instrumentacion || "—"}
              </p>
            )}
          </FieldBlock>

          <FieldBlock label="Dificultad">
            {canEditFields && isParaArreglar ? (
              <input
                type="text"
                value={dificultad}
                onChange={(e) => onDraftChange("dificultad", e.target.value)}
                onBlur={(e) => onDificultadBlur(e.target.value)}
                className={`w-full text-sm border rounded-lg px-2 py-2 ${getFieldStatusClass(
                  fieldStatus[fieldStatusKey(work.id, "dificultad")] || "idle",
                )}`}
              />
            ) : (
              <p className="text-sm text-slate-700">{work.dificultad || "—"}</p>
            )}
          </FieldBlock>

          <FieldBlock label="Observación del pedido">
            {canEditFields && isParaArreglar ? (
              <textarea
                rows={3}
                value={observaciones}
                onChange={(e) => onDraftChange("observaciones", e.target.value)}
                onBlur={(e) => onObservacionesBlur(e.target.value)}
                className={`w-full text-sm border border-amber-200 bg-amber-50/40 rounded-lg px-2 py-2 resize-y ${getFieldStatusClass(
                  fieldStatus[fieldStatusKey(work.id, "observaciones")] || "idle",
                )}`}
              />
            ) : observaciones ? (
              <p className="text-sm text-yellow-950 bg-yellow-50 border border-yellow-100 rounded-lg px-2 py-1.5">
                {observaciones}
              </p>
            ) : (
              <p className="text-sm text-slate-400 italic">—</p>
            )}
          </FieldBlock>

          {notaEntrega ? (
            <FieldBlock label="Nota de entrega">
              <p className="text-sm text-yellow-950 bg-yellow-50 border border-yellow-100 rounded-lg px-2 py-1.5">
                {notaEntrega}
              </p>
            </FieldBlock>
          ) : null}

          <button
            type="button"
            onClick={onOpenRefs}
            className="w-full flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-indigo-50 hover:border-indigo-200"
          >
            <span className="flex items-center gap-2">
              <IconDrive size={16} className="text-amber-600" />
              Referencias de material
            </span>
            <span className="text-xs font-bold tabular-nums text-indigo-600">
              {refCount > 0 ? refCount : "+"}
            </span>
          </button>

          {link ? (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-bold text-amber-800 hover:bg-amber-100"
            >
              <IconFolder size={16} />
              Abrir carpeta en Drive
            </a>
          ) : null}
        </div>

        <div className="shrink-0 px-4 py-3 border-t border-slate-200 flex flex-col gap-2">
          {isParaArreglar ? (
            <>
              {canEditFields && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="w-full text-sm font-bold px-3 py-2.5 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 flex items-center justify-center gap-1"
                >
                  <IconEdit size={14} />
                  Editar obra completa
                </button>
              )}
              {canEditDelivery && (
                <button
                  type="button"
                  onClick={onOpenEntrega}
                  disabled={isSaving}
                  className="w-full text-sm font-bold px-3 py-2.5 rounded-lg bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {isSaving ? <IconLoader size={14} className="animate-spin" /> : <IconCheck size={14} />}
                  Entregar
                </button>
              )}
              {canEditFields && (
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={isSaving}
                  className="w-full text-sm font-bold px-3 py-2.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  <IconTrash size={14} />
                  Eliminar encargo
                </button>
              )}
            </>
          ) : (
            <>
              {canEditFields && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="w-full text-sm font-bold px-3 py-2.5 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 flex items-center justify-center gap-1"
                >
                  <IconEdit size={14} />
                  Editar obra
                </button>
              )}
              {(work.estado === "Entregado" || work.estado === "Oficial") && (
                <button
                  type="button"
                  onClick={onNewVersion}
                  className="w-full text-sm font-bold px-3 py-2.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center gap-1"
                >
                  <IconCopy size={14} />
                  Nueva versión
                </button>
              )}
            </>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-full text-sm font-bold px-3 py-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
