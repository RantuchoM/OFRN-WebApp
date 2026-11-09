import React, { useState } from "react";
import { createPortal } from "react-dom";
import { IconAlertTriangle, IconX } from "../ui/Icons";
import { seatingApellidoNombre } from "../../utils/integranteDisplayName";
import { coberturaLabelFromMusician } from "../../utils/coberturaGira";

/**
 * Modal al pulsar «A» sobre un ausente con cobertura.
 * - restituir: alta del titular + baja de quien cubre
 * - baja_ambos: baja del titular y de quien cubre
 */
export default function RosterCoberturaResolucionModal({
  pendingBaja,
  canNotify,
  isEditor,
  onClose,
  onConfirm,
}) {
  const [option, setOption] = useState(null); // 'restituir' | 'baja_ambos'
  const [confirmSkipNotify, setConfirmSkipNotify] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!pendingBaja || pendingBaja.action !== "resolucion_cobertura") {
    return null;
  }

  const musician = pendingBaja.musician;
  const nombre =
    musician?.nombre_completo || seatingApellidoNombre(musician) || "—";
  const coverLabel = coberturaLabelFromMusician(musician) || "quien cubre";
  const notifyEnabled = Boolean(canNotify);

  const handleConfirm = async (notify) => {
    if (!isEditor || !option || submitting) return;
    setSubmitting(true);
    try {
      await onConfirm({
        option,
        notify,
        motivoText: "",
        motivoId: "",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-4 py-3 border-b border-slate-100 bg-amber-50/80 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-800">
              Ausente con cobertura
            </h2>
            <p className="text-xs text-slate-600 mt-0.5 truncate">
              {nombre}
              {coverLabel ? (
                <span className="text-slate-500"> · Te cubre {coverLabel}</span>
              ) : null}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1 rounded-lg text-slate-400 hover:bg-white/80 hover:text-slate-700"
            aria-label="Cerrar"
          >
            <IconX size={16} />
          </button>
        </div>

        <div className="px-4 py-3 space-y-3 overflow-y-auto">
          <p className="text-[11px] text-slate-600 leading-snug">
            Elegí cómo resolver la cobertura. En ambos casos se notifica a las
            personas con mail (titular y quien cubre, si aplica).
          </p>

          <fieldset className="space-y-2">
            <legend className="sr-only">Opción</legend>
            <label
              className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${
                option === "restituir"
                  ? "border-emerald-400 bg-emerald-50/80"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <input
                type="radio"
                name="cobertura-resolucion"
                className="mt-1"
                checked={option === "restituir"}
                onChange={() => {
                  setOption("restituir");
                  setConfirmSkipNotify(false);
                }}
              />
              <span className="min-w-0">
                <span className="block text-xs font-bold text-emerald-900">
                  Restituir al titular
                </span>
                <span className="block text-[11px] text-slate-600 leading-snug mt-0.5">
                  Dar de alta a {nombre.split(",")[0] || "quien estaba ausente"} y
                  quitar a {coverLabel} (arrepentimiento de la cobertura).
                </span>
              </span>
            </label>

            <label
              className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${
                option === "baja_ambos"
                  ? "border-red-400 bg-red-50/80"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <input
                type="radio"
                name="cobertura-resolucion"
                className="mt-1"
                checked={option === "baja_ambos"}
                onChange={() => {
                  setOption("baja_ambos");
                  setConfirmSkipNotify(false);
                }}
              />
              <span className="min-w-0">
                <span className="block text-xs font-bold text-red-900">
                  Baja a ambos
                </span>
                <span className="block text-[11px] text-slate-600 leading-snug mt-0.5">
                  Dar de baja al titular y a quien cubre: no se requiere ese
                  servicio.
                </span>
              </span>
            </label>
          </fieldset>

          {!option && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 flex items-start gap-2 text-amber-900">
              <IconAlertTriangle size={14} className="shrink-0 mt-0.5" />
              <p className="text-[11px] font-medium leading-snug">
                Elegí una de las dos opciones para continuar.
              </p>
            </div>
          )}

          {confirmSkipNotify && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
              <div className="flex items-start gap-2 text-amber-900">
                <IconAlertTriangle size={16} className="shrink-0 mt-0.5" />
                <p className="text-xs font-medium leading-snug">
                  ¿Confirmás{" "}
                  {option === "restituir"
                    ? "restituir al titular y dar de baja a quien cubre"
                    : "dar de baja a ambos"}{" "}
                  sin enviar mails?
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmSkipNotify(false)}
                  disabled={submitting}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg text-slate-600 hover:bg-amber-100"
                >
                  No, volver
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirm(false)}
                  disabled={!option || submitting}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50"
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
            className="text-xs font-semibold px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-200/80 disabled:opacity-50"
          >
            Deshacer
          </button>
          {notifyEnabled && !confirmSkipNotify && (
            <button
              type="button"
              onClick={() => setConfirmSkipNotify(true)}
              disabled={!option || submitting}
              className="text-xs font-semibold px-3 py-2 rounded-lg text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-200 disabled:opacity-50"
            >
              Confirmar sin notificar
            </button>
          )}
          <button
            type="button"
            onClick={() => handleConfirm(notifyEnabled)}
            disabled={!option || submitting || confirmSkipNotify}
            className={`text-xs font-bold px-4 py-2 rounded-lg text-white shadow-sm disabled:opacity-50 ${
              option === "baja_ambos"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {submitting
              ? "Guardando…"
              : notifyEnabled
                ? "Confirmar y notificar"
                : "Confirmar"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
