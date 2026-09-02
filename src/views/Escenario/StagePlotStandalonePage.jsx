import React, { Suspense, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { IconLoader } from "../../components/ui/Icons";
import { supabase } from "../../services/supabase";
import {
  getDefaultStagePlotForPrograma,
  loadStagePlotStandaloneContext,
} from "../../services/stagePlotService";

const ProgramStagePlot = React.lazy(() =>
  import("../Giras/ProgramStagePlot"),
);

/**
 * Shell fullscreen del editor Escenario, sin chrome Giras/Repertorio/Seating.
 * Carga plot + programa mínimos por `plotId` (o primer plot del `programId`).
 *
 * @param {object} props
 * @param {string|number|null} [props.plotId]
 * @param {string|number|null} [props.programId] — si no hay plotId, usa el primer plot del programa
 * @param {boolean} [props.canEdit=false]
 * @param {string} [props.backTo="/"]
 * @param {string} [props.backLabel="Volver"]
 */
export default function StagePlotStandalonePage({
  plotId = null,
  programId = null,
  canEdit = false,
  backTo = "/",
  backLabel = "Volver",
}) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [program, setProgram] = useState(null);
  const [resolvedPlotId, setResolvedPlotId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        let targetPlotId = plotId != null && plotId !== "" ? String(plotId) : null;

        if (!targetPlotId && programId != null && programId !== "") {
          const { data: def, error: defErr } = await getDefaultStagePlotForPrograma(
            supabase,
            programId,
          );
          if (defErr) throw defErr;
          if (!def?.id) {
            throw new Error(
              "Esta gira aún no tiene un escenario. Creá uno desde Backline.",
            );
          }
          targetPlotId = String(def.id);
          if (!cancelled && plotId == null) {
            // Canonicalize URL when opened without plotId (optional replace by parent).
          }
        }

        if (!targetPlotId) {
          throw new Error("Falta el identificador del escenario");
        }

        const { plot, program: prog, error: ctxErr } =
          await loadStagePlotStandaloneContext(supabase, targetPlotId);
        if (ctxErr) throw ctxErr;
        if (
          programId != null &&
          programId !== "" &&
          String(plot.id_programa) !== String(programId)
        ) {
          throw new Error(
            "El escenario no pertenece a la gira de esta edición",
          );
        }
        if (cancelled) return;
        setProgram(prog);
        setResolvedPlotId(plot.id);
      } catch (err) {
        if (!cancelled) {
          console.error("[StagePlotStandalonePage]", err);
          setError(err?.message || "No se pudo abrir el escenario");
          setProgram(null);
          setResolvedPlotId(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [plotId, programId]);

  useEffect(() => {
    const prev = document.title;
    const name = program?.nombre_gira || program?.nomenclador || "";
    document.title = name
      ? `Escenario · ${name} · OFRN`
      : "Escenario · OFRN";
    return () => {
      document.title = prev;
    };
  }, [program]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <IconLoader className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  if (error || !program || !resolvedPlotId) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-4 text-center">
        <p className="max-w-md text-sm font-medium text-slate-700">
          {error || "Escenario no disponible"}
        </p>
        <Link
          to={backTo}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
        >
          {backLabel}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-screen min-h-0 w-screen flex-col overflow-hidden bg-slate-100">
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center">
            <IconLoader className="animate-spin text-indigo-600" size={32} />
          </div>
        }
      >
        <ProgramStagePlot
          supabase={supabase}
          program={program}
          readOnly={!canEdit}
          canEditOverride={canEdit}
          initialPlotId={resolvedPlotId}
          onBack={() => navigate(backTo)}
          embedded={false}
        />
      </Suspense>
    </div>
  );
}
