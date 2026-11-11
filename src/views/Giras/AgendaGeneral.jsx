// src/views/Giras/AgendaGeneral.jsx
import React, { useCallback } from "react";
import UnifiedAgenda from "../../components/agenda/UnifiedAgenda";

export default function AgendaGeneral({
  supabase,
  onOpenRepertoire = null,
  onViewChange = null,
}) {
  const openRepertoire = useCallback(
    (giraId) => {
      if (typeof onOpenRepertoire === "function") {
        onOpenRepertoire(giraId);
        return;
      }
      if (typeof onViewChange === "function") {
        onViewChange("GIRAS", giraId, "REPERTOIRE");
      }
    },
    [onOpenRepertoire, onViewChange],
  );

  return (
    <UnifiedAgenda
      supabase={supabase}
      title="Agenda General"
      onOpenRepertoire={
        onOpenRepertoire || onViewChange ? openRepertoire : null
      }
      onViewChange={onViewChange}
    />
  );
}
