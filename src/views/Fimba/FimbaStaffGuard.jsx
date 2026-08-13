import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useFimbaUserSession } from "../../hooks/useFimbaUserSession";
import { useFimbaConsultaEdicionSession } from "../../hooks/useFimbaConsultaEdicionSession";
import {
  FIMBA_ROLES,
  fimbaConsultaTokenCanAccessPath,
  fimbaSessionCanAccessPath,
} from "../../utils/fimbaUserSession";

/**
 * Acceso shell FIMBA:
 * 1) OFRN isManagement → full /fimba
 * 2) Sesión localStorage.fimba_user (editor_general o consulta) + match edición
 * 3) Sesión localStorage.fimba_consulta_edicion (enlace /fimba/c/:token) → RO sin Usuarios/Contrataciones/Rider
 *
 * Documentado en docs/specs/fimba-plataforma.md
 */
export default function FimbaStaffGuard({ children }) {
  const { user, loading, isManagement, isGuest } = useAuth();
  const fimbaUser = useFimbaUserSession();
  const consultaToken = useFimbaConsultaEdicionSession();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center font-bold text-slate-400">
        Cargando...
      </div>
    );
  }

  const ofrnStaff = Boolean(user && !isGuest && isManagement);
  if (ofrnStaff) {
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
            {isConsulta
              ? "Tu acceso es de consulta (solo lectura). No incluye Usuarios ni Contrataciones."
              : wrongEdicion
                ? "Tu usuario FIMBA está ligado a otra edición del festival."
                : "No tenés permiso para esta ruta FIMBA."}
          </p>
          <a
            href={idEdicion ? `/fimba/edicion/${idEdicion}` : "/fimba/login"}
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
