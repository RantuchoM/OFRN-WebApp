import React, { createContext, useContext, useMemo } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { useFimbaUserSession } from "../hooks/useFimbaUserSession";
import { useFimbaConsultaEdicionSession } from "../hooks/useFimbaConsultaEdicionSession";
import { useOfrnFimbaUsuarioOverride } from "../hooks/useOfrnFimbaUsuarioOverride";
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
  canSeeRider: false,
  allowed: true,
  source: "none",
  edicionId: null,
  overrideLoading: false,
});

/**
 * Acceso efectivo FIMBA en shell staff: OFRN management | editor | consulta (user/token).
 * Si el mail OFRN tiene `fimba_usuarios.consulta` para la edición, fuerza RO.
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

  const ofrnManagement = Boolean(user && !isGuest && isManagement);
  const { ofrnFimbaUsuario, loading: overrideLoading } =
    useOfrnFimbaUsuarioOverride(user?.mail, ofrnManagement, edicionId);

  const value = useMemo(() => {
    const access = resolveFimbaAccess({
      ofrnManagement,
      ofrnFimbaUsuario,
      fimbaUser,
      consultaTokenSession: consultaToken,
      edicionId,
    });
    return {
      ...access,
      edicionId,
      overrideLoading,
    };
  }, [
    ofrnManagement,
    ofrnFimbaUsuario,
    fimbaUser,
    consultaToken,
    edicionId,
    overrideLoading,
  ]);

  return (
    <FimbaAccessContext.Provider value={value}>
      {children}
    </FimbaAccessContext.Provider>
  );
}

export function useFimbaAccess() {
  return useContext(FimbaAccessContext);
}
