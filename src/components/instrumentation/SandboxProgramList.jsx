import React from "react";
import SandboxProgramCard from "./SandboxProgramCard";

export default function SandboxProgramList({
  programs,
  ensambleLabels,
  programMetrics,
  draftsByGiraId,
  emptyHint,
  supabase,
  sandboxId,
  sandboxDisabled,
  ensemblesList,
  familiesList,
  integrantesList,
  onDraftSaved,
  onRequestApply,
  onDiscarded,
  refreshingGiraIds,
  onOrganicoSave,
}) {
  if (!programs?.length) {
    return (
      <div className="text-xs text-slate-500 p-3">
        {emptyHint || "No hay programas en el filtro seleccionado."}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 p-2">
      {programs.map((p) => (
        <SandboxProgramCard
          key={p.id}
          program={p}
          metrics={programMetrics?.[p.id]}
          ensambleLabels={ensambleLabels}
          hasDraft={!!programMetrics?.[p.id]?.hasPendingChanges}
          draftEntry={draftsByGiraId?.[p.id] ?? null}
          supabase={supabase}
          sandboxId={sandboxId}
          sandboxDisabled={sandboxDisabled}
          ensemblesList={ensemblesList}
          familiesList={familiesList}
          integrantesList={integrantesList}
          onDraftSaved={onDraftSaved}
          onRequestApply={onRequestApply}
          onDiscarded={onDiscarded}
          onOrganicoSave={onOrganicoSave}
          isRefreshing={refreshingGiraIds?.has(Number(p.id))}
        />
      ))}
    </div>
  );
}
