const AR_OFFSET = "-03:00";

function normalizeHoraInicio(hora: unknown): string {
  if (hora == null || hora === "") return "00:00:00";
  const s = String(hora).trim();
  const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return "00:00:00";
  return `${m[1].padStart(2, "0")}:${m[2]}:${(m[3] || "00").padStart(2, "0")}`;
}

export type EventoOfrnEmbed = {
  fecha?: string | null;
  hora_inicio?: string | null;
  locaciones?: { nombre?: string | null } | null;
};

export function fechaHoraDesdeEventoOfrn(evento: EventoOfrnEmbed | null | undefined): string | null {
  if (!evento?.fecha) return null;
  const dateStr = String(evento.fecha).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const timeStr = normalizeHoraInicio(evento.hora_inicio);
  const instant = new Date(`${dateStr}T${timeStr}${AR_OFFSET}`);
  if (Number.isNaN(instant.getTime())) return null;
  return instant.toISOString();
}

export function lugarNombreDesdeEventoOfrn(evento: EventoOfrnEmbed | null | undefined): string {
  return String(evento?.locaciones?.nombre ?? "").trim();
}

export const ENTRADA_CONCIERTO_EVENTO_SELECT =
  "evento:eventos!entrada_concierto_ofrn_evento_id_fkey(fecha, hora_inicio, locaciones(nombre))";
