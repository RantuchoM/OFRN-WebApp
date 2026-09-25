import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { IconHelpCircle, IconX } from "../ui/Icons";
import { explainCalendarioDiasViatico } from "../../utils/viaticosValorDiarioProporcional";

/** ? del valor diario: días en cero incluidos, sin cambiar el cálculo. */
export default function AnticipoDiasHelp({
  fechaSalida,
  horaSalida,
  fechaLlegada,
  horaLlegada,
  segmentos = [],
  fmtMoney,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const text = useMemo(
    () =>
      explainCalendarioDiasViatico({
        fechaSalida,
        horaSalida,
        fechaLlegada,
        horaLlegada,
        segmentos,
        fmtMoney,
      }),
    [fechaSalida, horaSalida, fechaLlegada, horaLlegada, segmentos, fmtMoney],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex shrink-0 items-center justify-center text-slate-400 hover:text-[#0054a6] ${className}`}
        aria-label="Cómo se calculan los días"
        title="Cómo se calculan los días"
      >
        <IconHelpCircle size={14} />
      </button>
      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4"
              onClick={() => setOpen(false)}
              role="presentation"
            >
              <div
                className="z-[110] w-full max-w-md border border-slate-200 bg-white p-4 shadow-xl"
                role="dialog"
                aria-modal="true"
                aria-label="Cómo se calculan los días"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-black text-slate-800">Cómo se calculan los días</h3>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="text-slate-400 hover:text-slate-700"
                    aria-label="Cerrar"
                  >
                    <IconX size={16} />
                  </button>
                </div>
                <p className="text-xs leading-relaxed text-slate-700">{text}</p>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
