/**
 * Hora “de cartel” de los conciertos OFRN (mails en Edge = UTC; sin esto hay desfase).
 * Coincide con el uso en Google Calendar del proyecto.
 */
export const ENTRADAS_CONCIERTO_TIMEZONE = "America/Argentina/Buenos_Aires";

/**
 * Fecha/hora de cartel del concierto: día de semana en MAYÚSCULAS, mes por extenso (es-AR), hora.
 * @param {string|Date|number|null|undefined} value ISO o instante
 * @returns {string}
 */
export function formatEntradasConciertoFechaHora(value) {
  if (value == null || value === "") return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const tz = ENTRADAS_CONCIERTO_TIMEZONE;
  const weekday = (
    new Intl.DateTimeFormat("es-AR", { timeZone: tz, weekday: "long" }).formatToParts(date).find((p) => p.type === "weekday")?.value || ""
  ).toUpperCase();
  const datePart = new Intl.DateTimeFormat("es-AR", {
    timeZone: tz,
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
  const timePart = new Intl.DateTimeFormat("es-AR", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  return `${weekday}, ${datePart} · ${timePart}`;
}

/** Texto legal / operativo para mail y PDF de reserva de entradas. */
export const ENTRADAS_NOTA_ASISTENCIA_HTML =
  "Les solicitamos presentarse con la entrada <strong>10 minutos antes del inicio del concierto</strong>. Luego de ese horario, los lugares no ocupados podrán ser cedidos a asistentes que no cuenten con reserva previa.";

/** Misma nota en líneas para PDF (texto nativo, legible). */
export const ENTRADAS_NOTA_ASISTENCIA_PDF = {
  /** Párrafo 1 (normal). */
  p1: "Les solicitamos presentarse con la entrada",
  /** Párrafo 2 (negrita en PDF). */
  p2Bold: "10 minutos antes del inicio del concierto.",
  /** Párrafo 3 (normal). */
  p3: "Luego de ese horario, los lugares no ocupados podrán ser cedidos a asistentes que no cuenten con entrada previa.",
};
