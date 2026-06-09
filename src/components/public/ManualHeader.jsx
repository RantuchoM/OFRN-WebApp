import React from "react";
import { Link, useLocation } from "react-router-dom";
import ManualStorageToolbar from "./ManualStorageToolbar";

const Tab = ({ to, active, children }) => (
  <Link
    to={to}
    className={`px-3 py-2 text-xs font-black transition-colors outline-none focus:ring-2 focus:ring-indigo-500/30 whitespace-nowrap ${
      active
        ? "bg-indigo-600 text-white"
        : "bg-transparent text-slate-600 hover:bg-slate-50"
    }`}
  >
    {children}
  </Link>
);

export default function ManualHeader({
  trailingActions = null,
  session = null,
  profile = null,
  isGuest = true,
  onLogin,
  onLogout,
  onOpenSaved,
  onImport,
  onExport,
  importInput = null,
  isCloudSaving = false,
}) {
  const location = useLocation();
  const path = location?.pathname || "";
  const isViaticos = path.startsWith("/viaticos-manual");
  const isRendiciones = path.startsWith("/rendiciones-manual");

  const displayName = profile
    ? `${profile.nombre || ""} ${profile.apellido || ""}`.trim() || profile.email
    : session?.user?.email || "";

  return (
    <div className="sticky top-0 z-30 border-b border-slate-100 bg-slate-50/95 backdrop-blur">
      <div className="px-4 sm:px-6 py-3">
        <div className="flex items-center gap-2 sm:gap-3 min-h-[40px] overflow-x-auto">
          <div className="inline-flex shrink-0 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <Tab to="/viaticos-manual" active={isViaticos}>
              Viáticos
            </Tab>
            <div className="w-px bg-slate-200" />
            <Tab to="/rendiciones-manual" active={isRendiciones}>
              Rendiciones
            </Tab>
          </div>

          <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
            <ManualStorageToolbar
              onOpenSaved={onOpenSaved}
              isGuest={isGuest}
              onLogin={onLogin}
              onImport={onImport}
              onExport={onExport}
              importInput={importInput}
              isCloudSaving={isCloudSaving}
            />
            {trailingActions}
          </div>

          <div className="inline-flex items-center gap-2 shrink-0 border-l border-slate-200 pl-2 sm:pl-3">
            {isGuest ? (
              <>
                <span className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap">
                  Invitado
                </span>
                <button
                  type="button"
                  onClick={onLogin}
                  className="px-2.5 sm:px-3 py-1.5 text-xs font-black bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition whitespace-nowrap"
                >
                  Iniciar sesión
                </button>
              </>
            ) : (
              <>
                <span
                  className="hidden md:inline text-[11px] text-slate-600 font-semibold max-w-[140px] truncate"
                  title={displayName}
                >
                  {displayName}
                </span>
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-2.5 sm:px-3 py-1.5 text-xs font-black text-slate-600 hover:text-slate-800 transition whitespace-nowrap"
                >
                  Salir
                </button>
              </>
            )}
          </div>
        </div>

        <p className="mt-2 text-[10px] sm:text-[11px] text-slate-500 truncate">
          {isGuest
            ? "Invitado · guardado automático en este navegador. Nube: iniciá sesión."
            : isCloudSaving
              ? "Guardando automáticamente en la nube…"
              : "Sesión activa · guardado automático en la nube y en este navegador."}
        </p>
      </div>
    </div>
  );
}
