// src/views/Giras/GiraAgenda.jsx
import React from 'react';
import UnifiedAgenda from '../../components/agenda/UnifiedAgenda';

export default function GiraAgenda({
  supabase,
  gira,
  onBack,
  giraGrupos,
  filterGrupoIds,
  setFilterGrupoIds,
  includeGeneralEvents,
  setIncludeGeneralEvents,
  hideGruposToolbarFilter = false,
}) {
    return (
        <UnifiedAgenda
            supabase={supabase}
            giraId={gira.id}
            onBack={onBack}
            title={gira.nombre_gira}
            includeAssociatedEnsembleRehearsals={gira.tipo === "Ensamble"}
            giraGruposProp={giraGrupos}
            filterGrupoIds={filterGrupoIds}
            setFilterGrupoIds={setFilterGrupoIds}
            includeGeneralEvents={includeGeneralEvents}
            setIncludeGeneralEvents={setIncludeGeneralEvents}
            hideGruposToolbarFilter={hideGruposToolbarFilter}
        />
    );
}
