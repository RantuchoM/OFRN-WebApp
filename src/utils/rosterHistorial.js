export const ROSTER_HISTORIAL_ZONA = "America/Argentina/Salta";

export const ROSTER_ACCION_LABEL = {
  alta: "Alta",
  baja: "Baja",
  ausente: "Ausente",
  presente: "Presente",
};

export function formatRosterStamp(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("es-AR", {
    timeZone: ROSTER_HISTORIAL_ZONA,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const pick = (type) => parts.find((part) => part.type === type)?.value || "";
  const month = pick("month").replace(".", "");
  return `${pick("day")} ${month} ${pick("year")}, ${pick("hour")}:${pick("minute")}`;
}

export function rosterActorLabel(apellido, nombre) {
  const a = String(apellido || "").trim();
  const n = String(nombre || "").trim();
  if (a && n) return `${a}, ${n}`;
  return a || n || "";
}
