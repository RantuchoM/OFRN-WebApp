import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import DateInput from "./DateInput";
import { IconLoader } from "./Icons";
import { formatDisplayDate, getTodayDateStringLocal } from "../../utils/dates";
import { toIsoDateString } from "../../utils/ensembleMembership";

/**
 * Campo de baja: botón «Cargar baja» si no hay fecha; DateInput editable si ya existe.
 * Misma UX que la baja de membresía en EnsemblesView.
 */
export function BajaDateField({
  value,
  label = "Baja",
  wrapperClassName = "w-[124px] shrink-0",
  dateInputClassName,
  onOpenBajaModal,
  onChange,
}) {
  const hasBaja = value != null && value !== "";

  if (hasBaja) {
    return (
      <div className={wrapperClassName}>
        <DateInput
          label={label}
          showDayName={false}
          showCalendarPicker
          value={toIsoDateString(value) || ""}
          onChange={(iso) => onChange(iso === "" ? null : iso)}
          className={dateInputClassName}
        />
      </div>
    );
  }

  return (
    <div className={`${wrapperClassName} flex flex-col`}>
      <span className="text-[10px] font-bold uppercase text-slate-500 mb-0.5 leading-none">
        {label}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenBajaModal?.();
        }}
        className="border border-dashed border-red-200 bg-red-50/60 text-xs py-0.5 px-2 min-h-[2rem] rounded text-red-600 hover:border-red-300 hover:text-red-700 hover:bg-red-50 transition-colors text-center w-full"
      >
        Cargar baja
      </button>
    </div>
  );
}

/**
 * Modal portal: Hoy (local) o fecha personalizada.
 */
export function BajaDateModal({
  isOpen,
  subjectLabel,
  description = "Elegí la fecha de baja:",
  title = "Cargar baja",
  busy = false,
  children,
  onClose,
  onConfirm,
}) {
  const hoy = getTodayDateStringLocal();
  const [showCustom, setShowCustom] = useState(false);
  const [customDate, setCustomDate] = useState(hoy);

  useEffect(() => {
    if (isOpen) {
      setShowCustom(false);
      setCustomDate(hoy);
    }
  }, [isOpen, hoy]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5 border border-slate-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="baja-date-modal-title"
      >
        <h3
          id="baja-date-modal-title"
          className="text-lg font-bold text-slate-800"
        >
          {title}
        </h3>
        {subjectLabel ? (
          <p className="text-sm text-slate-500 mt-1">{subjectLabel}</p>
        ) : null}
        <p className="text-sm text-slate-500 mt-3">{description}</p>
        {children}

        {!showCustom ? (
          <div className="mt-4 space-y-2">
            <button
              type="button"
              onClick={() => void onConfirm(hoy)}
              disabled={busy}
              className="w-full px-4 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {busy ? <IconLoader size={16} className="animate-spin" /> : null}
              {busy ? "Guardando…" : `Hoy (${formatDisplayDate(hoy)})`}
            </button>
            <button
              type="button"
              onClick={() => setShowCustom(true)}
              disabled={busy}
              className="w-full px-4 py-2.5 text-sm font-bold text-indigo-700 border border-indigo-200 hover:bg-indigo-50 rounded-lg disabled:opacity-60"
            >
              Fecha personalizada
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <DateInput
              label="Fecha de baja"
              showDayName={false}
              showCalendarPicker
              value={customDate}
              onChange={setCustomDate}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCustom(false)}
                disabled={busy}
                className="flex-1 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-60"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={() => void onConfirm(customDate)}
                disabled={busy || !customDate}
                className="flex-1 px-3 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {busy ? (
                  <IconLoader size={16} className="animate-spin" />
                ) : null}
                Confirmar
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="mt-4 w-full px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg disabled:opacity-60"
        >
          Cancelar
        </button>
      </div>
    </div>,
    document.body,
  );
}
