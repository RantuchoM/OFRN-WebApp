import React from "react";
import { IconQr } from "../ui/Icons";
import { entradasTodasIngresadas, labelVerQrReserva, verQrReservaToneClass } from "../../utils/entradasMisReservas";

const SIZE = {
  sm: "px-3 py-2 text-sm",
  xs: "px-3 py-2 text-xs",
  lg: "w-full px-3 py-3.5 text-base",
};

/**
 * «Ver QR» de Mis entradas / catálogo / terceros.
 * Si todas las plazas ya ingresaron: gris + «Ver QR (ya ingresadas)»; sigue abriendo el modal.
 */
export default function EntradasVerQrButton({
  reserva,
  isDark = false,
  onClick,
  size = "sm",
  variant = "emerald",
  className = "",
  idleClassName,
  iconSize,
}) {
  const yaIngresadas = entradasTodasIngresadas(reserva);
  const label = labelVerQrReserva(reserva);
  const sizeCls = SIZE[size] || SIZE.sm;
  const usedCls = verQrReservaToneClass(isDark, reserva);

  let colorCls = usedCls;
  if (!colorCls) {
    if (idleClassName) {
      colorCls = idleClassName;
    } else if (variant === "primary") {
      colorCls = "entradas-btn-primary";
    } else if (variant === "secondary") {
      colorCls = isDark
        ? "border border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700"
        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50";
    } else {
      colorCls = isDark
        ? "bg-emerald-900/80 text-emerald-200 hover:bg-emerald-900"
        : "bg-emerald-700 text-white hover:bg-emerald-800";
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`entradas-interactive inline-flex items-center justify-center gap-1.5 rounded-lg font-bold ${sizeCls} ${colorCls} ${className}`}
      aria-label={yaIngresadas ? "Ver QR (ya ingresadas)" : "Ver QR de tu reserva"}
    >
      <IconQr size={iconSize ?? (size === "lg" ? 22 : 16)} />
      {label}
    </button>
  );
}
