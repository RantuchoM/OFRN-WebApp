// src/views/Giras/AgendaGeneral.jsx
import React from "react";
import UnifiedAgenda from "../../components/agenda/UnifiedAgenda";

export default function AgendaGeneral({ supabase }) {
  return <UnifiedAgenda supabase={supabase} title="Agenda General" />;
}