import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useFimbaUserSession } from "../../hooks/useFimbaUserSession";
import { useFimbaConsultaEdicionSession } from "../../hooks/useFimbaConsultaEdicionSession";
import { useOfrnFimbaUsuarioOverride } from "../../hooks/useOfrnFimbaUsuarioOverride";
import {
  FIMBA_ROLES,
  fimbaConsultaPathAllowed,
  fimbaConsultaAgendaOnlyRedirectTarget,
  fimbaConsultaTokenCanAccessPath,
  fimbaSessionCanAccessPath,
  resolveFimbaAccess,
} from "../../utils/fimbaUserSession";
import { parseFimbaSectionIds } from "./FimbaSectionToggle";

/**
 * Acceso shell FIMBA:
 * 1) OFRN isManagement → full /fimba, salvo fila `fimba_usuarios` consulta (RO)
 * 2) Sesión localStorage.fimba_user (editor_general o consulta) + match edición
 * 3) Sesión localStorage.fimba_consulta_edicion (enlace /fimba/c/:token) → RO;
 *    entry `/fimba/c/:token/agenda` → solo agenda (redirect fuera de /agenda)
 *
 * Documentado en docs/specs/fimba-plataforma.md
 */
export default function FimbaStaffGuard({ children }) {
  const { user, loading, isManagement, isGuest } = useAuth();
  const fimbaUser = useFimbaUserSession();
  const consultaToken = useFimbaConsultaEdicionSession();
  const location = useLocation();
  const fromPath = parseFimbaSectionIds(location.pathname);
  const edicionIdFromPath = fromPath.edicionId ?? null;

  const ofrnManagement = Boolean(user && !isGuest && isManagement);
  const { ofrnFimbaUsuario, loading: overrideLoading } =
    useOfrnFimbaUsuarioOverride(user?.mail, ofrnManagement, edicionIdFromPath);

  if (loading || (ofrnManagement && overrideLoading)) {
    return (
      <div className="flex h-screen items-center justify-center font-bold text-slate-400">
        Cargando...
      </div>
    );
  }

  const access = resolveFimbaAccess({
    ofrnManagement,
    ofrnFimbaUsuario,
    fimbaUser,
    consultaTokenSession: consultaToken,
    edicionId: edicionIdFromPath,
  });

  const agendaOnlyRedirect = fimbaConsultaAgendaOnlyRedirectTarget(
    location.pathname,
    consultaToken,
  );
  if (agendaOnlyRedirect) {
    return (
      <Navigate
        to={{
          pathname: agendaOnlyRedirect,
          search: location.search,
        }}
        replace
      />
    );
  }

  if (access.source === "ofrn" || access.source === "ofrn_fimba_consulta") {
    if (
      access.source === "ofrn_fimba_consulta" &&
      edicionIdFromPath != null &&
      !fimbaConsultaPathAllowed(location.pathname, edicionIdFromPath)
    ) {
      return (
        <ConsultaBlocked
          idEdicion={edicionIdFromPath || ofrnFimbaUsuario?.id_edicion}
        />
      );
    }
    return children;
  }

  const fimbaUserOk = fimbaSessionCanAccessPath(location.pathname, fimbaUser);
  if (fimbaUserOk) {
    return children;
  }

  const tokenOk = fimbaConsultaTokenCanAccessPath(location.pathname, consultaToken);
  if (tokenOk) {
    return children;
  }

  // Sesión FIMBA de usuario o token con path bloqueado (p.ej. usuarios en consulta)
  if (fimbaUser || consultaToken) {
    const idEdicion = fimbaUser?.id_edicion || consultaToken?.id_edicion;
    const isConsulta =
      fimbaUser?.rol_fimba === FIMBA_ROLES.CONSULTA || Boolean(consultaToken);
    const isAgendaOnlyConsulta = Boolean(consultaToken?.agenda_only);
    const wrongEdicion =
      fimbaUser?.rol_fimba === FIMBA_ROLES.EDITOR_GENERAL &&
      !fimbaSessionCanAccessPath(location.pathname, fimbaUser);

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: 420,
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: "1.5rem",
            background: "#fff",
          }}
        >
          <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.15rem", color: "#94216D" }}>
            Sin acceso a esta sección
          </h1>
          <p style={{ margin: 0, color: "#5c5c5c", fontSize: "0.9rem" }}>
            {isAgendaOnlyConsulta
              ? "Tu enlace es de consulta de agenda (solo lectura). No incluye otras secciones del festival."
              : isConsulta
              ? "Tu acceso es de consulta (solo lectura). No incluye Usuarios ni Contrataciones."
              : wrongEdicion
                ? "Tu usuario FIMBA está ligado a otra edición del festival."
                : "No tenés permiso para esta ruta FIMBA."}
          </p>
          <a
            href={
              idEdicion
                ? isAgendaOnlyConsulta
                  ? `/fimba/edicion/${idEdicion}/agenda`
                  : `/fimba/edicion/${idEdicion}`
                : "/fimba/login"
            }
            style={{
              display: "inline-block",
              marginTop: "1rem",
              color: "#00b1eb",
              fontWeight: 600,
              marginRight: "1rem",
            }}
          >
            Ir a la edición
          </a>
          <a
            href="/fimba/login"
            style={{
              display: "inline-block",
              marginTop: "1rem",
              color: "#5c5c5c",
              fontWeight: 600,
            }}
          >
            Login FIMBA
          </a>
        </div>
      </div>
    );
  }

  // Sin sesión OFRN management ni FIMBA → login FIMBA (externos) o OFRN
  if (!user) {
    return (
      <Navigate
        to="/fimba/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  // Usuario OFRN logueado pero no management
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 420,
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: "1.5rem",
          background: "#fff",
        }}
      >
        <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.15rem", color: "#94216D" }}>
          Sin acceso a FIMBA
        </h1>
        <p style={{ margin: 0, color: "#5c5c5c", fontSize: "0.9rem" }}>
          Se requiere un rol de gestión de OFRN (management), un usuario FIMBA de la
          edición o un enlace de consulta. Si te invitaron al festival,{" "}
          <a href="/fimba/login" style={{ color: "#00b1eb", fontWeight: 600 }}>
            ingresá acá
          </a>
          .
        </p>
        <a
          href="/"
          style={{
            display: "inline-block",
            marginTop: "1rem",
            color: "#00b1eb",
            fontWeight: 600,
          }}
        >
          Volver al inicio
        </a>
      </div>
    </div>
  );
}

function ConsultaBlocked({ idEdicion }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 420,
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: "1.5rem",
          background: "#fff",
        }}
      >
        <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.15rem", color: "#94216D" }}>
          Sin acceso a esta sección
        </h1>
        <p style={{ margin: 0, color: "#5c5c5c", fontSize: "0.9rem" }}>
          Tu acceso FIMBA es de consulta (solo lectura). No incluye Usuarios ni
          Contrataciones.
        </p>
        <a
          href={idEdicion ? `/fimba/edicion/${idEdicion}` : "/fimba"}
          style={{
            display: "inline-block",
            marginTop: "1rem",
            color: "#00b1eb",
            fontWeight: 600,
          }}
        >
          Ir a la edición
        </a>
      </div>
    </div>
  );
}
