import React from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import StagePlotStandalonePage from "./StagePlotStandalonePage";

/**
 * Ruta compartida `/stage-plots/:plotId` para staff OFRN (editor / management / admin).
 * FIMBA editors deben usar `/fimba/edicion/:edicionId/escenario/:plotId`.
 */
export default function StagePlotOfrnStandalonePage() {
  const { plotId } = useParams();
  const { user, loading, isGuest, isEditor, isManagement, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center font-bold text-slate-400">
        Cargando...
      </div>
    );
  }

  if (!user || isGuest) {
    return <Navigate to="/" replace state={{ from: `/stage-plots/${plotId}` }} />;
  }

  const canEdit = Boolean(isEditor || isManagement || isAdmin);
  if (!canEdit) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="max-w-md text-sm font-medium text-slate-700">
          No tenés permiso para editar escenarios OFRN.
        </p>
        <Link
          to="/"
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
        >
          Ir al inicio
        </Link>
      </div>
    );
  }

  return (
    <StagePlotStandalonePage
      plotId={plotId}
      canEdit
      backTo="/"
      backLabel="Volver"
    />
  );
}
