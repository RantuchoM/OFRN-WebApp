import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { IconCheck, IconChevronDown } from "../ui/Icons";
import { getFixedMenuPosition } from "../../utils/fixedMenuPosition";
import { SEGUIMIENTO_COLOR_OPTIONS } from "../../services/viaticosSeguimientoService";

export const SEGUIMIENTO_COLOR_SWATCH_CLASS = {
  amarillo: "bg-yellow-300 border-yellow-500",
  verde: "bg-green-400 border-green-600",
  celeste: "bg-sky-300 border-sky-500",
  rojo: "bg-red-400 border-red-600",
};

export const SEGUIMIENTO_COLOR_TRIGGER_CLASS = {
  amarillo: "border-yellow-400 bg-yellow-100 text-yellow-950",
  verde: "border-green-400 bg-green-100 text-green-950",
  celeste: "border-sky-400 bg-sky-100 text-sky-950",
  rojo: "border-red-400 bg-red-100 text-red-950",
};

/** Fondo de fila / celda según `giras_viaticos_detalle.seguimiento_color`. */
export function seguimientoColorRowBgClass(color) {
  if (color === "amarillo") return "bg-yellow-200/90";
  if (color === "verde") return "bg-green-200/90";
  if (color === "celeste") return "bg-sky-200/90";
  if (color === "rojo") return "bg-red-200/90";
  return "bg-white";
}

export function ColorSwatch({ color, className = "h-3.5 w-3.5" }) {
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 rounded-sm border ${className} ${
        color && SEGUIMIENTO_COLOR_SWATCH_CLASS[color]
          ? SEGUIMIENTO_COLOR_SWATCH_CLASS[color]
          : "border-dashed border-slate-300 bg-white"
      }`}
    />
  );
}

/**
 * Desplegable de marca de color (amarillo | verde | celeste | rojo | null).
 * Portal a document.body, z-[100]. Mismo control en Gestión y en la gira.
 */
export default function SeguimientoColorSelect({
  value,
  disabled,
  onChange,
  compact = false,
  /** En edición masiva: "" = no tocar el color (distinto de null = Sin marca). */
  allowUnchanged = false,
}) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const current = allowUnchanged
    ? value === "" || value === undefined
      ? ""
      : value || null
    : value || null;
  const currentLabel =
    allowUnchanged && current === ""
      ? "Sin cambiar"
      : SEGUIMIENTO_COLOR_OPTIONS.find((opt) => (opt.value || null) === current)
          ?.label || "Sin marca";

  const updateMenuPosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setMenuStyle(
      getFixedMenuPosition(rect, {
        width: Math.max(rect.width, 168),
        estimatedHeight: allowUnchanged ? 260 : 220,
        measuredHeight: menuRef.current?.offsetHeight,
        gap: 4,
      }),
    );
  }, [allowUnchanged]);

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return undefined;
    }
    updateMenuPosition();
    const frame = requestAnimationFrame(updateMenuPosition);
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (buttonRef.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (next) => {
    onChange(next);
    setOpen(false);
  };

  const tint =
    current === ""
      ? "border-slate-200 bg-slate-50 text-slate-500"
      : current && SEGUIMIENTO_COLOR_TRIGGER_CLASS[current]
        ? SEGUIMIENTO_COLOR_TRIGGER_CLASS[current]
        : "border-slate-200 bg-white/90 text-slate-500";

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Color de fila"
        title={compact ? `Marca de color: ${currentLabel}` : "Marca de color"}
        className={
          compact
            ? `inline-flex w-full items-center justify-center gap-0.5 rounded-md border px-0.5 py-1 outline-none transition-colors disabled:opacity-60 ${tint}`
            : `inline-flex w-full min-w-[7.5rem] items-center gap-1.5 rounded-md border px-1.5 py-1 text-left text-[11px] font-semibold outline-none transition-colors disabled:opacity-60 ${tint}`
        }
      >
        <ColorSwatch
          color={current}
          className={compact ? "h-4 w-4 rounded" : "h-3.5 w-3.5"}
        />
        {!compact && (
          <span className="min-w-0 flex-1 truncate">{currentLabel}</span>
        )}
        <IconChevronDown
          size={compact ? 10 : 12}
          className={`shrink-0 opacity-70 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open &&
        menuStyle &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            aria-label="Marca de color"
            style={{
              top: menuStyle.top,
              left: menuStyle.left,
              width: menuStyle.width,
              maxHeight: menuStyle.maxHeight,
            }}
            className="fixed z-[100] space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl"
          >
            {allowUnchanged ? (
              <button
                type="button"
                role="option"
                aria-selected={current === ""}
                onClick={() => pick("")}
                className={`flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left text-[11px] font-semibold border-slate-200 bg-slate-50 text-slate-600 ${
                  current === "" ? "ring-2 ring-slate-400 ring-offset-1" : ""
                }`}
              >
                <ColorSwatch color={null} className="h-5 w-5 rounded" />
                <span className="min-w-0 flex-1">Sin cambiar</span>
                {current === "" ? (
                  <IconCheck size={12} className="shrink-0 opacity-80" />
                ) : null}
              </button>
            ) : null}
            {SEGUIMIENTO_COLOR_OPTIONS.map((opt) => {
              const optValue = opt.value || null;
              const selected = optValue === current;
              const optionTint = optValue
                ? SEGUIMIENTO_COLOR_TRIGGER_CLASS[optValue]
                : "border-slate-200 bg-white text-slate-600";
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => pick(optValue)}
                  className={`flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left text-[11px] font-semibold ${optionTint} ${
                    selected ? "ring-2 ring-slate-400 ring-offset-1" : ""
                  }`}
                >
                  <ColorSwatch
                    color={optValue}
                    className="h-5 w-5 rounded"
                  />
                  <span className="min-w-0 flex-1">{opt.label}</span>
                  {selected ? (
                    <IconCheck size={12} className="shrink-0 opacity-80" />
                  ) : null}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
