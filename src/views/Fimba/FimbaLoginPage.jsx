import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { IconLoader, IconLock, IconMail } from "../../components/ui/Icons";
import {
  getFimbaEdicionById,
  loginFimbaUsuario,
  loginFimbaUsuarioByToken,
} from "../../services/fimbaService";
import {
  clearFimbaUserSession,
  FIMBA_ROLES,
  writeFimbaUserSession,
} from "../../utils/fimbaUserSession";
import { useFimbaUserSession } from "../../hooks/useFimbaUserSession";
import FimbaLayout from "./FimbaLayout";

/**
 * Login externo FIMBA (mail + clave). Sesión en localStorage.fimba_user.
 * Magic link opcional: ?token=<token_login>
 */
export default function FimbaLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const existing = useFimbaUserSession();

  const [mail, setMail] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [boot, setBoot] = useState(true);

  const fromPath = location.state?.from || null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = String(searchParams.get("token") || "").trim();
      if (token) {
        setBoot(true);
        setError(null);
        const { user, error: err } = await loginFimbaUsuarioByToken(token);
        if (cancelled) return;
        if (err || !user) {
          setError(err?.message || "Enlace inválido");
          setBoot(false);
          return;
        }
        if (user.rol_fimba !== FIMBA_ROLES.EDITOR_GENERAL) {
          setError(
            "Tu rol es «consulta». Por ahora el acceso de edición requiere editor general.",
          );
          setBoot(false);
          return;
        }
        writeFimbaUserSession(user);
        navigate(`/fimba/edicion/${user.id_edicion}`, { replace: true });
        return;
      }

      if (existing?.rol_fimba === FIMBA_ROLES.EDITOR_GENERAL && existing.id_edicion) {
        navigate(`/fimba/edicion/${existing.id_edicion}`, { replace: true });
        return;
      }
      setBoot(false);
    })();
    return () => {
      cancelled = true;
    };
    // Solo al montar / cambio de token
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      const { user, error: err } = await loginFimbaUsuario({ mail, clave });
      if (err || !user) {
        setError(err?.message || "No se pudo iniciar sesión");
        return;
      }
      if (user.rol_fimba !== FIMBA_ROLES.EDITOR_GENERAL) {
        setError(
          "Tu rol es «consulta». Por ahora el acceso completo de la edición requiere editor general.",
        );
        return;
      }
      writeFimbaUserSession(user);

      let target = `/fimba/edicion/${user.id_edicion}`;
      if (fromPath && String(fromPath).startsWith("/fimba/edicion/")) {
        const m = String(fromPath).match(/^\/fimba\/edicion\/([^/]+)/);
        if (m && String(m[1]) === String(user.id_edicion)) {
          target = fromPath;
        }
      }

      try {
        const { edicion } = await getFimbaEdicionById(user.id_edicion);
        if (edicion?.nombre) {
          setMessage(`Entrando a ${edicion.nombre}…`);
        }
      } catch {
        /* ignore */
      }

      navigate(target, { replace: true });
    } finally {
      setSubmitting(false);
    }
  };

  if (boot) {
    return (
      <FimbaLayout mode="token" subtitle="Acceso">
        <div className="fimba-card fimba-muted" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <IconLoader size={18} className="animate-spin" /> Verificando acceso…
        </div>
      </FimbaLayout>
    );
  }

  return (
    <FimbaLayout mode="token" subtitle="Acceso">
      <div style={{ maxWidth: 420, margin: "1.5rem auto 0" }}>
        <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
          <div
            className="fimba-logo"
            style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "0.04em" }}
          >
            FI<em style={{ fontStyle: "normal", color: "var(--fimba-cyan)" }}>M</em>BA
          </div>
          <h1
            style={{
              margin: "0.65rem 0 0.25rem",
              fontSize: "1.25rem",
              color: "var(--fimba-deep)",
            }}
          >
            Ingreso a la edición
          </h1>
          <p className="fimba-muted" style={{ margin: 0, fontSize: "0.9rem" }}>
            Usuarios externos del festival. El staff OFRN entra con su cuenta habitual.
          </p>
        </div>

        <form className="fimba-card" onSubmit={handleSubmit}>
          {error && (
            <div className="fimba-error" style={{ marginBottom: "0.85rem" }}>
              {error}
            </div>
          )}
          {message && (
            <p className="fimba-muted" style={{ marginTop: 0, fontSize: "0.85rem" }}>
              {message}
            </p>
          )}

          <div className="fimba-field">
            <label className="fimba-label" htmlFor="fimba-login-mail">
              Mail
            </label>
            <div style={{ position: "relative" }}>
              <IconMail
                size={16}
                style={{
                  position: "absolute",
                  left: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--fimba-muted)",
                  pointerEvents: "none",
                }}
              />
              <input
                id="fimba-login-mail"
                className="fimba-input"
                type="email"
                autoComplete="username"
                value={mail}
                onChange={(e) => setMail(e.target.value)}
                required
                style={{ paddingLeft: 34 }}
                placeholder="nombre@ejemplo.com"
              />
            </div>
          </div>

          <div className="fimba-field">
            <label className="fimba-label" htmlFor="fimba-login-clave">
              Contraseña
            </label>
            <div style={{ position: "relative" }}>
              <IconLock
                size={16}
                style={{
                  position: "absolute",
                  left: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--fimba-muted)",
                  pointerEvents: "none",
                }}
              />
              <input
                id="fimba-login-clave"
                className="fimba-input"
                type="password"
                autoComplete="current-password"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                required
                style={{ paddingLeft: 34 }}
                placeholder="Clave de acceso"
              />
            </div>
          </div>

          <button
            type="submit"
            className="fimba-btn fimba-btn-primary"
            disabled={submitting}
            style={{ width: "100%", justifyContent: "center", marginTop: 4 }}
          >
            {submitting ? (
              <>
                <IconLoader size={16} className="animate-spin" /> Entrando…
              </>
            ) : (
              "Entrar"
            )}
          </button>

          {existing && (
            <button
              type="button"
              className="fimba-btn fimba-btn-ghost"
              style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
              onClick={() => {
                clearFimbaUserSession();
                setMessage("Sesión FIMBA cerrada.");
              }}
            >
              Cerrar sesión FIMBA actual
            </button>
          )}
        </form>

        <p className="fimba-muted" style={{ textAlign: "center", marginTop: "1.25rem", fontSize: "0.82rem" }}>
          ¿Sos staff OFRN?{" "}
          <Link to="/login" style={{ color: "var(--fimba-cyan)", fontWeight: 600 }}>
            Ingresá a la intranet
          </Link>
          {" · "}
          <Link to="/" style={{ color: "var(--fimba-cyan)", fontWeight: 600 }}>
            Inicio
          </Link>
        </p>
      </div>
    </FimbaLayout>
  );
}
