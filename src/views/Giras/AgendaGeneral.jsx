// src/views/Giras/AgendaGeneral.jsx
import React from "react";
import UnifiedAgenda from "../../components/agenda/UnifiedAgenda";

// CORRECCIÓN: Agregar onOpenRepertoire aquí abajo ↓↓↓
export default function AgendaGeneral({ supabase, onOpenRepertoire }) {
  return (
    <UnifiedAgenda 
        supabase={supabase} 
        title="Agenda General" 
        onOpenRepertoire={onOpenRepertoire} // Ahora sí existe la variable
    />
  );
}