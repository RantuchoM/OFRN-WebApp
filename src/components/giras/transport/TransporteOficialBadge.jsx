import React from "react";
import { IconVerifiedBadge } from "../../ui/Icons";

/** Check azul estilo verificación (Instagram) para vehículos oficiales. */
export default function TransporteOficialBadge({
  visible,
  size = 12,
  className = "",
}) {
  if (!visible) return null;
  return (
    <span
      title="Vehículo oficial"
      className={`inline-flex shrink-0 items-center text-sky-500 ${className}`}
    >
      <IconVerifiedBadge size={size} />
      <span className="sr-only">Oficial</span>
    </span>
  );
}
