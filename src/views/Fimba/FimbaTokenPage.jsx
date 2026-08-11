import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { IconLoader, IconAlertCircle } from "../../components/ui/Icons";
import { getFimbaPropuestaByToken } from "../../services/fimbaService";
import FimbaArtistaPage from "./FimbaArtistaPage";
import FimbaLayout from "./FimbaLayout";

/**
 * Shell para tokens externos: consulta (/fimba/a/:token) o edición (/fimba/e/:token).
 */
export default function FimbaTokenPage({ kind }) {
  const { token } = useParams();
  const [state, setState] = useState({ loading: true, propuesta: null, error: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { propuesta, error } = await getFimbaPropuestaByToken(token, kind);
      if (cancelled) return;
      if (error) {
        setState({ loading: false, propuesta: null, error: error.message || "Error" });
        return;
      }
      if (!propuesta) {
        setState({
          loading: false,
          propuesta: null,
          error: "Enlace inválido o expirado.",
        });
        return;
      }
      setState({ loading: false, propuesta, error: null });
    })();
    return () => {
      cancelled = true;
    };
  }, [token, kind]);

  if (state.loading) {
    return (
      <FimbaLayout mode="token" subtitle={kind === "edicion" ? "Edición" : "Consulta"}>
        <div className="fimba-card fimba-muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <IconLoader size={18} className="animate-spin" /> Validando enlace…
        </div>
      </FimbaLayout>
    );
  }

  if (state.error || !state.propuesta) {
    return (
      <FimbaLayout mode="token" subtitle="FIMBA">
        <div className="fimba-error" style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <IconAlertCircle size={18} />
          <div>
            <strong style={{ display: "block", marginBottom: 4 }}>No se puede abrir el enlace</strong>
            {state.error || "Enlace inválido."}
          </div>
        </div>
      </FimbaLayout>
    );
  }

  const readOnly = kind === "consulta";
  const edicionNombre = state.propuesta.fimba_ediciones?.nombre;

  return (
    <FimbaLayout
      mode="token"
      subtitle={edicionNombre || (readOnly ? "Consulta" : "Edición")}
    >
      <FimbaArtistaPage
        readOnly={readOnly}
        propuestaOverride={state.propuesta}
        modeLabel={readOnly ? "Solo lectura" : "Edición externa"}
      />
    </FimbaLayout>
  );
}
