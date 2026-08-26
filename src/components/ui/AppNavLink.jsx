import React from "react";
import { Link } from "react-router-dom";
import { buildAppTo } from "../../utils/appNavigation";

/**
 * Link de navegación interna OFRN con href real (rueda / Ctrl+clic → nueva pestaña).
 * Pasá `to` listo o { mode, tab, giraId, view, subTab }.
 */
export default function AppNavLink({
  to = null,
  mode = null,
  tab = null,
  giraId = null,
  view = null,
  subTab = null,
  className = "",
  children,
  onClick = null,
  ...rest
}) {
  const resolvedTo =
    to ??
    buildAppTo({
      mode,
      tab,
      giraId,
      view,
      subTab,
    });

  return (
    <Link
      to={resolvedTo}
      className={className}
      onClick={(e) => {
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </Link>
  );
}
