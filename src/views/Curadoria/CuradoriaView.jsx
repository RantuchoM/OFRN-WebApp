import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { RepertoireCyclesTab } from "../Ensembles/EnsembleCoordinatorView";
import { IconMusic, IconAlertTriangle } from "../../components/ui/Icons";

export default function CuradoriaView({ supabase }) {
  const { isAdmin, isCurador } = useAuth();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(true);
  const [ensembles, setEnsembles] = useState([]);
  const [programasOptions, setProgramasOptions] = useState([]);
  const [repertoireYear, setRepertoireYear] = useState(
    () => new Date().getFullYear(),
  );
  const [adminFilterIds, setAdminFilterIds] = useState([]);

  const adminOptions = useMemo(
    () => ensembles.map((e) => ({ id: e.id, label: e.ensamble })),
    [ensembles],
  );

  const activeEnsembles = useMemo(() => {
    if (adminFilterIds.length === 0) return ensembles;
    const filterSet = new Set(adminFilterIds);
    return ensembles.filter((e) => filterSet.has(e.id));
  }, [ensembles, adminFilterIds]);

  useEffect(() => {
    if (!supabase || (!isAdmin && !isCurador)) return;

    const fetchContext = async () => {
      setLoading(true);
      try {
        const [{ data: globalEnsembles }, { data: programasData }] =
          await Promise.all([
            supabase
              .from("ensambles")
              .select("id, ensamble, descripcion")
              .order("ensamble"),
            supabase
              .from("programas")
              .select("id, nombre_gira, fecha_desde, estado")
              .order("fecha_desde", { ascending: false })
              .limit(200),
          ]);

        setEnsembles(globalEnsembles || []);

        setProgramasOptions(
          (programasData || []).map((p) => ({
            id: p.id,
            label: p.nombre_gira || `Programa ${p.id}`,
            subLabel: p.fecha_desde || "",
            estado: p.estado || "Borrador",
          })),
        );
      } finally {
        setLoading(false);
      }
    };

    fetchContext();
  }, [supabase, isAdmin, isCurador]);

  if (!isAdmin && !isCurador) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50">
        <div className="max-w-md mx-auto text-center bg-white shadow-sm border border-slate-200 rounded-xl p-6">
          <IconAlertTriangle
            size={32}
            className="text-amber-500 mx-auto mb-3"
          />
          <h2 className="text-sm font-bold text-slate-800 mb-1">
            Acceso restringido
          </h2>
          <p className="text-xs text-slate-500">
            Solo usuarios con rol <strong>curador</strong> o{" "}
            <strong>admin</strong> pueden acceder a la Curaduría de Repertorio.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <IconMusic className="animate-spin text-indigo-600" size={20} />
          Cargando contexto de curaduría...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 p-4 md:p-6 gap-3 overflow-auto">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <IconMusic size={18} className="text-fixed-indigo-600" />
          <h1 className="text-sm md:text-base font-bold text-slate-800">
            Curaduría de Repertorio (Todos los Ensambles)
          </h1>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 shadow-sm overflow-auto">
        <RepertoireCyclesTab
          supabase={supabase}
          activeEnsembles={activeEnsembles}
          programasOptions={programasOptions}
          repertoireYear={repertoireYear}
          setRepertoireYear={setRepertoireYear}
          queryClient={queryClient}
          onCreateProgramFromProposal={null}
          onEditProgram={null}
          isGlobalEditor={true}
          adminOptions={adminOptions}
          adminFilterIds={adminFilterIds}
          onChangeAdminFilterIds={setAdminFilterIds}
        />
      </div>
    </div>
  );
}

