import React, { createContext, useContext, useMemo } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { useFimbaUserSession } from "../hooks/useFimbaUserSession";
import { useFimbaConsultaEdicionSession } from "../hooks/useFimbaConsultaEdicionSession";
import {
  parseFimbaSectionIds,
} from "../views/Fimba/FimbaSectionToggle";
import {
  resolveFimbaAccess,
} from "../utils/fimbaUserSession";

const FimbaAccessContext = createContext({
  readOnly: false,
  canManageUsers: false,
  canSeeUsuarios: false,
  canSeeContrataciones: false,
  canEditPropuestaMeta: false,
  allowed: true,
  source: "none",
  edicionId: null,
});

/**
 * Acceso efectivo FIMBA en shell staff: OFRN management | editor | consulta (user/token).
 */
export function FimbaAccessProvider({ children }) {
  const { user, isManagement, isGuest } = useAuth();
  const fimbaUser = useFimbaUserSession();
  const consultaToken = useFimbaConsultaEdicionSession();
  const params = useParams();
  const location = useLocation();
  const fromPath = parseFimbaSectionIds(location.pathname);
  const edicionId =
    params.edicionId ?? fromPath.edicionId ?? null;

  const value = useMemo(() => {
    const ofrnManagement = Boolean(user && !isGuest && isManagement);
    const access = resolveFimbaAccess({
      ofrnManagement,
      fimbaUser,
      consultaTokenSession: consultaToken,
      edicionId,
    });
    return {
      ...access,
      edicionId,
    };
  }, [user, isGuest, isManagement, fimbaUser, consultaToken, edicionId]);

  return (
    <FimbaAccessContext.Provider value={value}>
      {children}
    </FimbaAccessContext.Provider>
  );
}

export function useFimbaAccess() {
  return useContext(FimbaAccessContext);
}
