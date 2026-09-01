import React, { useEffect, useState } from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";
import { IconAlertCircle, IconLoader } from "../../components/ui/Icons";
import { getFimbaEdicionByTokenConsulta } from "../../services/fimbaService";
import {
  writeFimbaConsultaEdicionSession,
} from "../../utils/fimbaUserSession";
import FimbaLayout from "./FimbaLayout";

/**
 * Entry point enlace consulta general de edición: /fimba/c/:token
 * Valida token, persiste sesión RO en localStorage y redirige al shell.
 */
export default function FimbaEdicionConsultaEntry() {
  const { token } = useParams();
  const location = useLocation();
  const openAgenda = /\/agenda\/?$/.test(location.pathname);
  const [state, setState] = useState({
    loading: true,
    edicionId: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const t = String(token || "").trim();
      if (!t) {
        if (!cancelled) {
          setState({
            loading: false,
            edicionId: null,
            error: "Enlace incompleto.",
          });
        }
        return;
      }
      const { edicion, error } = await getFimbaEdicionByTokenConsulta(t);
      if (cancelled) return;
      if (error || !edicion) {
        setState({
          loading: false,
          edicionId: null,
          error: error?.message || "Enlace inválido o regenerado.",
        });
        return;
      }
      try {
        writeFimbaConsultaEdicionSession({
          token: t,
          id_edicion: edicion.id,
        });
      } catch (e) {
        setState({
          loading: false,
          edicionId: null,
          error: e?.message || "No se pudo abrir la sesión de consulta",
        });
        return;
      }
      setState({ loading: false, edicionId: edicion.id, error: null });
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (state.loading) {
    return (
      <FimbaLayout mode="token" subtitle="Consulta">
        <div
          className="fimba-card fimba-muted"
          style={{ display: "flex", gap: 8, alignItems: "center" }}
        >
          <IconLoader size={18} className="animate-spin" /> Validando enlace de
          consulta…
        </div>
      </FimbaLayout>
    );
  }

  if (state.error || !state.edicionId) {
    return (
      <FimbaLayout mode="token" subtitle="FIMBA">
        <div
          className="fimba-error"
          style={{ display: "flex", gap: 8, alignItems: "flex-start" }}
        >
          <IconAlertCircle size={18} />
          <div>
            <strong style={{ display: "block", marginBottom: 4 }}>
              No se puede abrir el enlace
            </strong>
            {state.error || "Enlace inválido."}
          </div>
        </div>
      </FimbaLayout>
    );
  }

  return (
    <Navigate
      to={`/fimba/edicion/${state.edicionId}${openAgenda ? "/agenda" : ""}${location.search}`}
      replace
    />
  );
}
