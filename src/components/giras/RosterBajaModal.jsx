import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IconAlertTriangle, IconX } from "../ui/Icons";
import {
  BAJA_MOTIVO_OPCIONES,
  resolveBajaMotivoText,
} from "../../utils/rosterBajaMotivos";

export { BAJA_MOTIVO_OPCIONES, resolveBajaMotivoText } from "../../utils/rosterBajaMotivos";

export default function RosterBajaModal({
  pendingBaja,
  canNotify,
  isEditor,
  onClose,
  onConfirm,
}) {
  const [selectedMotivo, setSelectedMotivo] = useState("");
  const [otroText, setOtroText] = useState("");
  const [confirmSkipNotify, setConfirmSkipNotify] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const musician = pendingBaja?.musician;
  const action = pendingBaja?.action;

  useEffect(() => {
    if (!pendingBaja) return;
    setSelectedMotivo("");
    setOtroText("");
    setConfirmSkipNotify(false);
    setSubmitting(false);
  }, [pendingBaja?.integranteId, pendingBaja?.action]);

  if (!pendingBaja || !musician) return null;

  const nombre =
    musician.nombre_completo ||
    `${musician.apellido || ""}, ${musician.nombre || ""}`.trim();

  const isDesconvocar = action === "desconvocar";
  const motivoText = resolveBajaMotivoText(selectedMotivo, otroText);
  const motivoValid =
    selectedMotivo &&
    (selectedMotivo !== "otro" || motivoText.length > 0);

  const title = isDesconvocar ? "Desconvocar de la gira" : "Marcar como ausente";
  const subtitle = isDesconvocar
    ? "Indicá el motivo de la desconvocatoria."
    : "Indicá el motivo de la baja.";

  const handleConfirm = async (notify) => {
    if (!isEditor || !motivoValid || submitting) return;
    setSubmitting(true);
    try {
      await onConfirm({ motivoText, motivoId: selectedMotivo, notify });
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-[100]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="roster-baja-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-100 bg-red-50/80">
          <div className="min-w-0">
            <h2
              id="roster-baja-title"
              className="text-sm font-bold text-slate-800"
            >
              {title}
            </h2>
            <p className="text-xs text-slate-600 truncate mt-0.5" title={nombre}>
              {nombre}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1 rounded-lg text-slate-500 hover:bg-white/80 hover:text-slate-800 transition-colors shrink-0 disabled:opacity-50"
            aria-label="Cerrar"
          >
            <IconX size={18} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-[11px] text-slate-500 leading-snug">{subtitle}</p>

          <fieldset className="space-y-2">
            <legend className="sr-only">Motivo de la baja</legend>
            {BAJA_MOTIVO_OPCIONES.map((opt) => (
              <label
                key={opt.id}
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                  selectedMotivo === opt.id
                    ? "border-red-300 bg-red-50/60"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/80"
                }`}
              >
                <input
                  type="radio"
                  name="baja-motivo"
                  value={opt.id}
                  checked={selectedMotivo === opt.id}
                  onChange={() => {
                    setSelectedMotivo(opt.id);
                    setConfirmSkipNotify(false);
                  }}
                  className="mt-0.5 text-red-600 focus:ring-red-400"
                />
                <span className="text-sm text-slate-800 font-medium">
                  {opt.label}
                  {opt.id === "otro" ? ":" : ""}
                </span>
              </label>
            ))}
          </fieldset>

          {selectedMotivo === "otro" && (
            <input
              type="text"
              value={otroText}
              onChange={(e) => setOtroText(e.target.value)}
              placeholder="Especificá el motivo…"
              className="w-full text-sm rounded-xl border border-slate-200 px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-red-400/30 focus:border-red-300 outline-none"
              autoFocus
            />
          )}

          {confirmSkipNotify && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
              <div className="flex items-start gap-2 text-amber-900">
                <IconAlertTriangle size={16} className="shrink-0 mt-0.5" />
                <p className="text-xs font-medium leading-snug">
                  ¿Confirmás {isDesconvocar ? "la desconvocatoria" : "marcar como ausente"}{" "}
                  sin enviar mail al músico?
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmSkipNotify(false)}
                  disabled={submitting}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg text-slate-600 hover:bg-amber-100 transition-colors"
                >
                  No, volver
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirm(false)}
                  disabled={!motivoValid || submitting}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50 transition-colors"
                >
                  Sí, sin notificar
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-xs font-semibold px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-200/80 transition-colors disabled:opacity-50"
          >
            Deshacer
          </button>
          {canNotify && !confirmSkipNotify && (
            <button
              type="button"
              onClick={() => setConfirmSkipNotify(true)}
              disabled={!motivoValid || submitting}
              className="text-xs font-semibold px-3 py-2 rounded-lg text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-200 transition-colors disabled:opacity-50"
            >
              Confirmar sin notificar
            </button>
          )}
          <button
            type="button"
            onClick={() => handleConfirm(canNotify)}
            disabled={!motivoValid || submitting || confirmSkipNotify}
            className="text-xs font-bold px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-sm disabled:opacity-50 transition-colors"
          >
            {submitting
              ? "Guardando…"
              : canNotify
                ? "Confirmar y notificar"
                : "Confirmar"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
