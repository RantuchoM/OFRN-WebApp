import React from "react";
import ManualStorageToolbar from "./ManualStorageToolbar";
import OficinaExternaNav from "./OficinaExternaNav";

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
  const displayName = profile
    ? `${profile.nombre || ""} ${profile.apellido || ""}`.trim() || profile.email
    : session?.user?.email || "";

  return (
    <div className="scrn-header sticky top-0 z-30">
      <div className="px-4 sm:px-6 py-3">
        <div className="flex items-center gap-2 sm:gap-3 min-h-[40px] overflow-x-auto">
          <OficinaExternaNav tone="scrn" />

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
                <span className="inline-flex items-center whitespace-nowrap border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800 sm:text-[11px]">
                  Invitado
                </span>
                <button
                  type="button"
                  onClick={onLogin}
                  className="scrn-btn-primary whitespace-nowrap px-2.5 py-1.5 text-xs sm:px-3"
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
