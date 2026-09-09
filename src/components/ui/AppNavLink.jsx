import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { buildAppTo } from "../../utils/appNavigation";
import {
  destinationLeavesSeating,
  isModifiedClick,
  requestSeatingLeave,
} from "../../utils/seatingLateMailLeaveGuard";

/**
 * Link de navegación interna OFRN con href real (rueda / Ctrl+clic → nueva pestaña).
 * Pasá `to` listo o { mode, tab, giraId, view, subTab, seatingView, stagePlotId }.
 */
export default function AppNavLink({
  to = null,
  mode = null,
  tab = null,
  giraId = null,
  view = null,
  subTab = null,
  seatingView = null,
  stagePlotId = null,
  className = "",
  children,
  onClick = null,
  ...rest
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const resolvedTo =
    to ??
    buildAppTo({
      mode,
      tab,
      giraId,
      view,
      subTab,
      seatingView,
      stagePlotId,
    });

  return (
    <Link
      to={resolvedTo}
      className={className}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || isModifiedClick(e)) return;
        if (!destinationLeavesSeating(location, resolvedTo)) return;
        if (!requestSeatingLeave(() => navigate(resolvedTo))) {
          e.preventDefault();
        }
      }}
      {...rest}
    >
      {children}
    </Link>
  );
}
