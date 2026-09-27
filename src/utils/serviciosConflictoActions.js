import { notifyEnsayoEventoSoftDeleted } from "./ensayoCheckinLifecycle";

/** Misma marca que UnifiedAgenda / IndependentRehearsalForm. */
export async function softDeleteEnsayoEvento(supabase, eventId) {
  const { error } = await supabase
    .from("eventos")
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
    })
    .eq("id", eventId);
  if (error) throw error;
  notifyEnsayoEventoSoftDeleted(eventId);
}

export async function markEnsayoPeseConflicto(supabase, eventId) {
  const { error } = await supabase
    .from("eventos")
    .update({ ensayo_pese_conflicto: true })
    .eq("id", eventId);
  if (error) throw error;
}

const ENSAYO_EDIT_SELECT = `
  id, fecha, hora_inicio, hora_fin, descripcion, id_locacion, id_gira, id_tipo_evento,
  eventos_ensambles ( id_ensamble ),
  eventos_programas_asociados ( id_programa ),
  eventos_asistencia_custom ( id_integrante, tipo, nota ),
  eventos_grupos ( id_grupo )
`;

export async function fetchEnsayoForAgendaEdit(supabase, eventId) {
  const { data, error } = await supabase
    .from("eventos")
    .select(ENSAYO_EDIT_SELECT)
    .eq("id", eventId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
