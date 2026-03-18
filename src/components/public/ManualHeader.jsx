import React from "react";
import { Link, useLocation } from "react-router-dom";

const Tab = ({ to, active, children }) => (
  <Link
    to={to}
    className={`px-3 py-2 text-xs font-black transition-colors outline-none focus:ring-2 focus:ring-indigo-500/30 ${
      active
        ? "bg-indigo-600 text-white"
        : "bg-transparent text-slate-600 hover:bg-slate-50"
    }`}
  >
    {children}
  </Link>
);

export default function ManualHeader({ rightActions = null }) {
  const location = useLocation();
  const path = location?.pathname || "";
  const isViaticos = path.startsWith("/viaticos-manual");
  const isRendiciones = path.startsWith("/rendiciones-manual");

  return (
    <div className="sticky top-0 z-30 border-b border-slate-100 bg-slate-50/95 backdrop-blur">
      <div className="px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 md:gap-4 items-start">
          <div className="inline-flex rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden w-fit">
            <Tab to="/viaticos-manual" active={isViaticos}>
              Viáticos
            </Tab>
            <div className="w-px bg-slate-200" />
            <Tab to="/rendiciones-manual" active={isRendiciones}>
              Rendiciones
            </Tab>
          </div>
          {rightActions && <div className="shrink-0">{rightActions}</div>}
          <div className="text-[11px] text-slate-500 md:col-span-2">
            Herramienta pública · datos persistentes entre pestañas
          </div>
        </div>
      </div>
    </div>
  );
}

