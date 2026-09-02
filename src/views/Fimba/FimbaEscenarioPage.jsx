import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { IconLoader } from "../../components/ui/Icons";
import { useFimbaAccess } from "../../context/FimbaAccessContext";
import { getFimbaEdicionById } from "../../services/fimbaService";
import StagePlotStandalonePage from "../Escenario/StagePlotStandalonePage";

/**
 * Editor Escenario en contexto FIMBA (fuera del layout de secciones).
 * Auth: FimbaStaffGuard + canEdit = !readOnly (editor_general / OFRN management).
 * Valida que el plot pertenezca a `fimba_ediciones.id_gira`.
 */
export default function FimbaEscenarioPage() {
  const { edicionId, plotId } = useParams();
  const { readOnly, overrideLoading } = useFimbaAccess();
  const [edicion, setEdicion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const backTo = `/fimba/edicion/${edicionId}/backline`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { edicion: ed, error: eEd } = await getFimbaEdicionById(edicionId);
        if (eEd) throw eEd;
        if (!ed?.id) throw new Error("Edición no encontrada");
        if (ed.id_gira == null) {
          throw new Error("La edición no tiene gira OFRN enlazada");
        }
        if (!cancelled) setEdicion(ed);
      } catch (err) {
        if (!cancelled) {
          console.error("[FimbaEscenarioPage]", err);
          setError(err?.message || "No se pudo abrir Escenario");
          setEdicion(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [edicionId]);

  if (loading || overrideLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <IconLoader className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  if (error || !edicion) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-4 text-center">
        <p className="max-w-md text-sm font-medium text-slate-700">
          {error || "Edición no disponible"}
        </p>
        <Link
          to={backTo}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
        >
          Volver a Backline
        </Link>
      </div>
    );
  }

  return (
    <StagePlotStandalonePage
      plotId={plotId || null}
      programId={edicion.id_gira}
      canEdit={!readOnly}
      backTo={backTo}
      backLabel="Volver a Backline"
    />
  );
}
