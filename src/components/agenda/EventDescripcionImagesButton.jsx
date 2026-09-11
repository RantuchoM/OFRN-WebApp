import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  IconChevronLeft,
  IconChevronRight,
  IconImage,
  IconX,
} from "../ui/Icons";

/**
 * Chip compacto negro (ícono + conteo) + modal galería (portal → document.body, z-[100])
 * para imágenes embebidas en descripción / Detalle de agenda.
 */
export default function EventDescripcionImagesButton({
  srcs = [],
  className = "",
  buttonClassName = "",
  title,
}) {
  const list = Array.isArray(srcs) ? srcs.filter(Boolean) : [];
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
        return;
      }
      if (list.length < 2) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setIndex((i) => (i - 1 + list.length) % list.length);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setIndex((i) => (i + 1) % list.length);
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, list.length]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!list.length) return null;

  const safeIndex = Math.min(Math.max(index, 0), list.length - 1);
  const current = list[safeIndex];
  const multi = list.length > 1;
  const count = list.length;
  const label =
    title ||
    (multi
      ? `Ver ${count} imágenes de la descripción`
      : "Ver imagen de la descripción");

  const close = () => setOpen(false);

  return (
    <span className={className || "fimba-detalle-images-chip shrink-0 ml-auto"}>
      <button
        type="button"
        className={
          buttonClassName ||
          "fimba-detalle-images-btn inline-flex items-center justify-center gap-0.5 shrink-0 h-[18px] min-w-[18px] px-1 rounded-[4px] bg-black text-white hover:bg-neutral-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-black"
        }
        title={label}
        aria-label={label}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIndex(0);
          setOpen(true);
        }}
        onDoubleClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <IconImage size={12} className="text-white" />
        <span className="text-[9px] font-bold leading-none text-white tabular-nums">
          {count}
        </span>
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4"
              onClick={close}
              role="presentation"
            >
              <div
                className="bg-white w-full max-w-3xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-slate-200"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label={label}
              >
                <div className="px-3 py-2.5 border-b border-slate-200 flex items-center justify-between gap-2 bg-slate-50 shrink-0">
                  <div className="min-w-0 flex items-center gap-2 text-slate-700">
                    <IconImage size={16} className="shrink-0 text-fuchsia-700" />
                    <span className="text-sm font-semibold truncate">
                      {multi
                        ? `Imagen ${safeIndex + 1} de ${count}`
                        : "Imagen"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={close}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                    aria-label="Cerrar"
                  >
                    <IconX size={18} />
                  </button>
                </div>

                <div className="relative flex-1 min-h-0 flex items-center justify-center bg-slate-950/95 p-3 sm:p-4 overflow-auto">
                  {multi ? (
                    <button
                      type="button"
                      className="absolute left-2 sm:left-3 z-10 p-2 rounded-full bg-white/90 text-slate-700 shadow hover:bg-white"
                      aria-label="Anterior"
                      onClick={() =>
                        setIndex((i) => (i - 1 + list.length) % list.length)
                      }
                    >
                      <IconChevronLeft size={20} />
                    </button>
                  ) : null}
                  <img
                    src={current}
                    alt=""
                    className="max-w-full max-h-[min(70vh,36rem)] object-contain rounded"
                    referrerPolicy="no-referrer"
                  />
                  {multi ? (
                    <button
                      type="button"
                      className="absolute right-2 sm:right-3 z-10 p-2 rounded-full bg-white/90 text-slate-700 shadow hover:bg-white"
                      aria-label="Siguiente"
                      onClick={() =>
                        setIndex((i) => (i + 1) % list.length)
                      }
                    >
                      <IconChevronRight size={20} />
                    </button>
                  ) : null}
                </div>

                {multi ? (
                  <div className="px-3 py-2 border-t border-slate-200 flex justify-center gap-1.5 flex-wrap bg-slate-50 shrink-0">
                    {list.map((src, i) => (
                      <button
                        key={`${i}-${src.slice(0, 48)}`}
                        type="button"
                        className={`h-1.5 w-1.5 rounded-full transition-colors ${
                          i === safeIndex
                            ? "bg-fuchsia-600"
                            : "bg-slate-300 hover:bg-slate-400"
                        }`}
                        aria-label={`Ir a imagen ${i + 1}`}
                        aria-current={i === safeIndex ? "true" : undefined}
                        onClick={() => setIndex(i)}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}
