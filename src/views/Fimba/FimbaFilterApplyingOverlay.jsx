import React from "react";
import { IconLoader } from "../../components/ui/Icons";

/**
 * Non-blocking overlay for planilla scroll regions while filters recompute.
 * Parent should be `position: relative` (see `.fimba-filter-pending-host`).
 */
export default function FimbaFilterApplyingOverlay({
  show,
  label = "Aplicando filtro…",
}) {
  if (!show) return null;
  return (
    <div
      className="fimba-filter-applying"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="fimba-filter-applying-pill">
        <IconLoader size={14} />
        {label}
      </span>
    </div>
  );
}
