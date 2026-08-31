import React, { createContext, useCallback, useContext, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Guarda de salida para Contrataciones → Google Sheets.
 * BrowserRouter no soporta useBlocker (data router); este contexto
 * intercepta NavLink/Link de FIMBA cuando hay cambios sin «Actualizar».
 */
const FimbaSheetLeaveGuardContext = createContext({
  /** @type {(to: string) => boolean} true = permitir navegación */
  tryNavigate: () => true,
  registerGuard: () => () => {},
});

function normalizePath(pathname) {
  const p = String(pathname || "");
  if (p.length > 1 && p.endsWith("/")) return p.slice(0, -1);
  return p;
}

export function FimbaSheetLeaveGuardProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const guardRef = useRef(null);
  const pendingToRef = useRef(null);

  const registerGuard = useCallback((api) => {
    guardRef.current = api;
    return () => {
      if (guardRef.current === api) guardRef.current = null;
    };
  }, []);

  const tryNavigate = useCallback(
    (to) => {
      const path = normalizePath(to);
      if (!path) return true;
      if (path === normalizePath(location.pathname)) return true;
      const guard = guardRef.current;
      if (!guard?.needsSync) return true;
      pendingToRef.current = path;
      guard.requestLeave?.({
        onStay: () => {
          pendingToRef.current = null;
        },
        onLeaveAfterSync: () => {
          const dest = pendingToRef.current;
          pendingToRef.current = null;
          if (dest) navigate(dest);
        },
      });
      return false;
    },
    [navigate, location.pathname],
  );

  const value = useMemo(
    () => ({ tryNavigate, registerGuard }),
    [tryNavigate, registerGuard],
  );

  return (
    <FimbaSheetLeaveGuardContext.Provider value={value}>
      {children}
    </FimbaSheetLeaveGuardContext.Provider>
  );
}

export function useFimbaSheetLeaveGuard() {
  return useContext(FimbaSheetLeaveGuardContext);
}
