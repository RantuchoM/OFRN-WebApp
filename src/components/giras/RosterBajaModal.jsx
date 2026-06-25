import React, { useEffect, useMemo, useState } from "react";
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
  const [desconvocateById, setDesconvocateById] = useState({});

  const musician = pendingBaja?.musician;
  const action = pendingBaja?.action;
  const affectedMembers = pendingBaja?.affectedMembers || [];

  useEffect(() => {
    if (!pendingBaja) return;
    setSelectedMotivo("");
    setOtroText("");
    setConfirmSkipNotify(false);
    setSubmitting(false);
    if (pendingBaja.action === "exclusion_ensamble") {
      const initial = {};
      (pendingBaja.affectedMembers || []).forEach((a) => {
        initial[a.member.id] = a.defaultDesconvocate;
      });
      setDesconvocateById(initial);
    } else {
      setDesconvocateById({});
    }
  }, [
    pendingBaja?.integranteId,
    pendingBaja?.action,
    pendingBaja?.affectedMembers,
  ]);

  const isExclusionEnsamble = action === "exclusion_ensamble";

  const desconvocateCount = useMemo(() => {
    if (!isExclusionEnsamble) return 0;
    return affectedMembers.filter((a) => desconvocateById[a.member.id]).length;
  }, [isExclusionEnsamble, affectedMembers, desconvocateById]);

  const manualAffectedCount = useMemo(() => {
    if (!isExclusionEnsamble) return 0;
    return affectedMembers.filter((a) => a.isAlreadyManual).length;
  }, [isExclusionEnsamble, affectedMembers]);

  const effectiveCanNotify = useMemo(() => {
    if (!isExclusionEnsamble) return canNotify;
    return (
      canNotify &&
      affectedMembers.some(
        (a) => desconvocateById[a.member.id] && a.member?.mail,
      )
    );
  }, [isExclusionEnsamble, canNotify, affectedMembers, desconvocateById]);

  if (!pendingBaja || (!musician && !isExclusionEnsamble)) return null;
  if (isExclusionEnsamble && affectedMembers.length === 0) return null;

  const ensembleLabels = [
    ...new Set(affectedMembers.map((r) => r.ensLabel).filter(Boolean)),
  ];

  const nombre = isExclusionEnsamble
    ? `${desconvocateCount} de ${affectedMembers.length} integrante(s)`
    : musician.nombre_completo ||
      `${musician.apellido || ""}, ${musician.nombre || ""}`.trim();

  const isDesconvocar = action === "desconvocar";
  const motivoText = resolveBajaMotivoText(selectedMotivo, otroText);
  const motivoValid =
    selectedMotivo &&
    (selectedMotivo !== "otro" || motivoText.length > 0);

  const title = isExclusionEnsamble
    ? "Exclusión de ensamble"
    : isDesconvocar
      ? "Desconvocar de la gira"
      : "Marcar como ausente";
  const subtitle = isExclusionEnsamble
    ? `Por exclusión de: ${ensembleLabels.join(", ") || "ensamble"}. Las personas marcadas se desconvocarán; las destildadas quedarán como convocatoria manual sin notificación.`
    : isDesconvocar
      ? "Indicá el motivo de la desconvocatoria."
      : "Indicá el motivo de la baja.";

  const toggleDesconvocate = (memberId) => {
    setDesconvocateById((prev) => ({
      ...prev,
      [memberId]: !prev[memberId],
    }));
    setConfirmSkipNotify(false);
  };

  const handleConfirm = async (notify) => {
    if (!isEditor || !motivoValid || submitting) return;
    setSubmitting(true);
    try {
      await onConfirm({
        motivoText,
        motivoId: selectedMotivo,
        notify,
        desconvocateById: isExclusionEnsamble ? desconvocateById : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const notifyEnabled = isExclusionEnsamble ? effectiveCanNotify : canNotify;

  return createPortal(
    <div
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-[100]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="roster-baja-title"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-100 bg-red-50/80 shrink-0">
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

        <div className="p-4 space-y-3 overflow-y-auto flex-1 min-h-0">
          <p className="text-[11px] text-slate-500 leading-snug">{subtitle}</p>

          {isExclusionEnsamble && (
            <div className="space-y-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2">
                <p className="text-xs font-semibold text-slate-700">
                  Se desconvocará a {desconvocateCount} persona
                  {desconvocateCount === 1 ? "" : "s"}
                </p>
                {manualAffectedCount > 0 && (
                  <p className="text-[11px] text-amber-800 mt-1 leading-snug">
                    {manualAffectedCount === 1
                      ? "Hay 1 persona convocada manualmente en este ensamble: no se desconvocará salvo que actives su casilla."
                      : `Hay ${manualAffectedCount} personas convocadas manualmente en este ensamble: no se desconvocarán salvo que actives su casilla.`}
                  </p>
                )}
              </div>

              <ul className="rounded-xl border border-slate-200 divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {affectedMembers.map((a) => {
                  const m = a.member;
                  const checked = Boolean(desconvocateById[m.id]);
                  const label =
                    m.nombre_completo ||
                    `${m.apellido || ""}, ${m.nombre || ""}`.trim();
                  return (
                    <li key={m.id}>
                      <label
                        className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                          checked ? "bg-red-50/50" : "hover:bg-slate-50/80"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleDesconvocate(m.id)}
                          className="rounded border-slate-300 text-red-600 focus:ring-red-400 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-medium text-slate-800 block truncate">
                            {label}
                          </span>
                          <span className="text-[10px] text-slate-500 truncate block">
                            {m.instrumentos?.instrumento || "—"}
                            {a.isAlreadyManual && (
                              <span className="ml-1.5 text-amber-700 font-semibold">
                                · Convocado manualmente
                              </span>
                            )}
                            {!checked && !a.isAlreadyManual && (
                              <span className="ml-1.5 text-fixed-indigo-700 font-semibold">
                                · Quedará como manual
                              </span>
                            )}
                          </span>
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

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
              autoFocus={!isExclusionEnsamble}
            />
          )}

          {confirmSkipNotify && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
              <div className="flex items-start gap-2 text-amber-900">
                <IconAlertTriangle size={16} className="shrink-0 mt-0.5" />
                <p className="text-xs font-medium leading-snug">
                  ¿Confirmás{" "}
                  {isExclusionEnsamble
                    ? "la exclusión del ensamble"
                    : isDesconvocar
                      ? "la desconvocatoria"
                      : "marcar como ausente"}{" "}
                  sin enviar mail{isExclusionEnsamble ? " a los músicos" : " al músico"}?
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

        <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-xs font-semibold px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-200/80 transition-colors disabled:opacity-50"
          >
            Deshacer
          </button>
          {notifyEnabled && !confirmSkipNotify && (
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
            onClick={() => handleConfirm(notifyEnabled)}
            disabled={!motivoValid || submitting || confirmSkipNotify}
            className="text-xs font-bold px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-sm disabled:opacity-50 transition-colors"
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
