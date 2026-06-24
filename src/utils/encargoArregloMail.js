/** Persiste la marca de envío exitoso del mail encargo_arreglo. */
export async function markEncargoArregloMailSent(supabase, obraId) {
  const sentAt = new Date().toISOString();
  const { error } = await supabase
    .from("obras")
    .update({ encargo_arreglo_mail_enviado_at: sentAt })
    .eq("id", obraId);
  if (error) throw error;
  return sentAt;
}

export function formatEncargoMailSentAt(isoString) {
  if (!isoString) return null;
  try {
    return new Date(isoString).toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}
