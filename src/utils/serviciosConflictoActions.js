import { notifyEnsayoEventoSoftDeleted } from "./ensayoCheckinLifecycle";
import { integranteKey } from "./integranteIds";

/** Tutti-N: asiste al ensayo pese a estar convocado a una gira. */
export const ENSAYO_CUSTOM_TIPO_ASISTE_IGUAL = "asiste_igual";

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

export function normalizeEnsayoPeseJustificacion(value) {
  const text = String(value ?? "").trim();
  if (!text) {
    throw new Error(
      "La justificación es obligatoria para marcar «Se ensayó igual».",
    );
  }
  return text;
}

export async function markEnsayoPeseConflicto(
  supabase,
  eventId,
  justificacion,
) {
  const text = normalizeEnsayoPeseJustificacion(justificacion);
  const { error } = await supabase
    .from("eventos")
    .update({
      ensayo_pese_conflicto: true,
      ensayo_pese_conflicto_justificacion: text,
    })
    .eq("id", eventId);
  if (error) throw error;
}

export function asisteIgualIdsFromCustomRows(rows) {
  const ids = new Set();
  for (const row of rows || []) {
    if (row?.tipo !== ENSAYO_CUSTOM_TIPO_ASISTE_IGUAL) continue;
    const key = integranteKey(row.id_integrante);
    if (key) ids.add(key);
  }
  return ids;
}

export async function fetchEnsayoAsisteIgualIds(supabase, eventId) {
  if (!supabase || eventId == null) return new Set();
  const { data, error } = await supabase
    .from("eventos_asistencia_custom")
    .select("id_integrante")
    .eq("id_evento", eventId)
    .eq("tipo", ENSAYO_CUSTOM_TIPO_ASISTE_IGUAL);
  if (error) throw error;
  return asisteIgualIdsFromCustomRows(
    (data || []).map((row) => ({
      ...row,
      tipo: ENSAYO_CUSTOM_TIPO_ASISTE_IGUAL,
    })),
  );
}

export async function setEnsayoTuttiNAsisteIgual(
  supabase,
  eventId,
  integranteId,
  asiste,
) {
  const eid = Number(eventId);
  const iid = Number(integranteId);
  if (!supabase || !Number.isFinite(eid) || !Number.isFinite(iid)) {
    throw new Error("Integrante o ensayo inválido.");
  }
  const { error: delError } = await supabase
    .from("eventos_asistencia_custom")
    .delete()
    .eq("id_evento", eid)
    .eq("id_integrante", iid)
    .eq("tipo", ENSAYO_CUSTOM_TIPO_ASISTE_IGUAL);
  if (delError) throw delError;
  if (!asiste) return;
  const { error: insError } = await supabase
    .from("eventos_asistencia_custom")
    .insert({
      id_evento: eid,
      id_integrante: iid,
      tipo: ENSAYO_CUSTOM_TIPO_ASISTE_IGUAL,
      nota: "Tutti-N: asiste igual al ensayo pese a gira",
    });
  if (insError) throw insError;
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
