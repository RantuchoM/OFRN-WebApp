/** Misma regla que `entrada_admin_upsert_concierto` en Supabase (AR, sin DST). */
const AR_TZ_OFFSET = "-03:00";

export const ENTRADA_CONCIERTO_EVENTO_EMBED =
  "evento:eventos!entrada_concierto_ofrn_evento_id_fkey(id, fecha, hora_inicio, locaciones(id, nombre, localidades(localidad)))";

function normalizeHoraInicio(hora) {
  if (hora == null || hora === "") return "00:00:00";
  const s = String(hora).trim();
  const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return "00:00:00";
  return `${m[1].padStart(2, "0")}:${m[2]}:${(m[3] || "00").padStart(2, "0")}`;
}

/** Instant ISO desde fila `eventos` (fecha + hora_inicio en Argentina). */
export function fechaHoraDesdeEventoOfrn(evento) {
  if (!evento?.fecha) return null;
  const dateStr = String(evento.fecha).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const timeStr = normalizeHoraInicio(evento.hora_inicio);
  const instant = new Date(`${dateStr}T${timeStr}${AR_TZ_OFFSET}`);
  if (Number.isNaN(instant.getTime())) return null;
  return instant.toISOString();
}

/** Nombre de la locación/sala desde `eventos` → `locaciones`. */
export function lugarNombreDesdeEventoOfrn(evento) {
  return String(evento?.locaciones?.nombre ?? "").trim();
}

/** Ciudad (`localidades.localidad`), no el nombre de la sala. */
export function localidadDesdeConciertoEntrada(concierto) {
  const loc = concierto?.evento?.locaciones?.localidades?.localidad;
  return String(loc || "").trim();
}

/** Fecha/hora de cartel desde el evento OFRN vinculado (`ofrn_evento_id`). */
export function fechaHoraDesdeConciertoEntrada(concierto) {
  return fechaHoraDesdeEventoOfrn(concierto?.evento);
}

/** Lugar (sala) desde `eventos` → `locaciones`. */
export function lugarNombreDesdeConciertoEntrada(concierto) {
  return lugarNombreDesdeEventoOfrn(concierto?.evento);
}

/** Campos virtuales `fecha_hora` y `lugar_nombre` para la UI (no existen en `entrada_concierto`). */
export function aplicarDatosEventoAConciertoEntrada(concierto) {
  if (!concierto || typeof concierto !== "object") return concierto;
  return {
    ...concierto,
    fecha_hora: fechaHoraDesdeConciertoEntrada(concierto),
    lugar_nombre: lugarNombreDesdeConciertoEntrada(concierto),
  };
}

export function compareConciertosPorFechaHora(a, b) {
  const ta = new Date(fechaHoraDesdeConciertoEntrada(a) || 0).getTime();
  const tb = new Date(fechaHoraDesdeConciertoEntrada(b) || 0).getTime();
  return ta - tb;
}

export function localidadLabelDesdeProgramaEntrada(programa, conciertos = null) {
  const lista = conciertos ?? programa?.entrada_concierto ?? [];
  const locs = new Set();
  for (const c of lista) {
    const loc = localidadDesdeConciertoEntrada(c);
    if (loc) locs.add(loc);
  }
  return [...locs].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" })).join(" · ");
}
