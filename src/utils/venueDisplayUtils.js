import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export function formatVenueStageDims(loc) {
  const w = Number(loc?.escenario_ancho_cm);
  const d = Number(loc?.escenario_profundo_cm);
  if (Number.isFinite(w) && w > 0 && Number.isFinite(d) && d > 0) {
    return `${Math.round(w)} × ${Math.round(d)} cm`;
  }
  return null;
}

export function formatVenueEventDate(fechaRaw) {
  if (!fechaRaw) return "";
  try {
    const d = parseISO(fechaRaw);
    const s = format(d, "EEEE, dd/MM/yyyy", { locale: es });
    return s.charAt(0).toUpperCase() + s.slice(1);
  } catch {
    return fechaRaw;
  }
}

export function extractEventGrupos(evt) {
  return (evt.eventos_grupos || [])
    .map((eg) => eg.giras_grupos)
    .filter(Boolean);
}

export function extractEventArtistas(evt) {
  return (evt.eventos_fimba_propuestas || [])
    .map((row) => row.fimba_propuestas)
    .filter(Boolean)
    .sort((a, b) =>
      String(a.nombre || "").localeCompare(String(b.nombre || ""), "es", {
        sensitivity: "base",
      }),
    );
}

export function groupEventsByLocacion(events) {
  const byLoc = new Map();
  (events || []).forEach((evt) => {
    const loc = evt.locaciones;
    const locId = loc?.id ?? evt.id_locacion ?? null;
    if (locId == null) return;
    if (!byLoc.has(locId)) {
      byLoc.set(locId, { locacion: loc, events: [] });
    }
    byLoc.get(locId).events.push(evt);
  });
  return Array.from(byLoc.values()).sort((a, b) => {
    const nameA = a.locacion?.nombre || "";
    const nameB = b.locacion?.nombre || "";
    return nameA.localeCompare(nameB, "es");
  });
}
